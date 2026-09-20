/**
 * Run a calculator definition against a set of inputs.
 *
 * This is the layer that turns a definition object into a single result object:
 * the solved variable values, the derived expressions, the checks, and the
 * worked-arithmetic trace. The UI then renders that object without knowing
 * anything about the calculator itself.
 *
 * Two kinds of definition are supported:
 *  - relation-based (the default): a single equation, solved for a target var
 *    via `closedForm` first, falling back to a numeric root-find bounded by
 *    the target's declared `domain`, refusing rather than guessing if neither
 *    works.
 *  - `kind: 'procedure'`: an algorithm rather than a relation (E-series
 *    nearest-value, capacitor code decode). It supplies a plain `run(values)`
 *    function and a list of `outputs` instead of a `relation`/`closedForm`.
 *    See CLAUDE.md's "procedures that are not a single relation."
 */

import { parseInto } from './units.js';
import { parse, evaluate, substitute } from './expr.js';
import { solveFor } from './solve.js';
import { eng } from './format.js';

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

/** Name -> declared unit, across both top-level vars and derived/output entries. */
function unitLookup(definition) {
  const units = {};
  for (const [name, meta] of Object.entries(definition.vars ?? {})) {
    units[name] = meta.unit ?? '';
  }
  for (const item of definition.derived ?? definition.outputs ?? []) {
    units[item.id] = item.unit ?? '';
  }
  return (name) => units[name] ?? '';
}

/** Replace every `{name}` in check text with its formatted, unit-aware value. */
function interpolate(text, scope, unitForName) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (match, name) => (
    Object.hasOwn(scope, name) ? eng(scope[name], unitForName(name)) : match
  ));
}

function runChecks(definition, scope, unitForName) {
  return (definition.checks ?? []).flatMap((check) => {
    const triggered = evaluate(parse(check.when), scope) === true;
    if (!triggered) return [];
    return [{ ...check, triggered: true, text: interpolate(check.text, scope, unitForName) }];
  });
}

/**
 * Parse every declared var against its unit. Values present in `input` win
 * over the definition's default. A value that parses but names the wrong
 * dimension (volts into an ohms field) is reported, never silently accepted.
 */
function resolveVars(definition, input, skip) {
  const values = {};
  const fieldErrors = [];

  for (const [name, meta] of Object.entries(definition.vars ?? {})) {
    if (name === skip) continue;
    if (meta.kind === 'mode') {
      values[name] = !isBlank(input[name]) ? String(input[name]) : meta.default;
      continue;
    }

    const provided = !isBlank(input[name]);
    const raw = provided ? String(input[name]) : (!isBlank(meta.default) ? String(meta.default) : undefined);
    if (raw === undefined) continue;

    const parsed = parseInto(raw, meta.unit);
    if (!parsed.ok) {
      fieldErrors.push({ name, message: parsed.message });
      continue;
    }
    values[name] = parsed.value;
  }

  return { values, fieldErrors };
}

/** closedForm first (exact), else a numeric root bounded by the declared domain, else refuse. */
function solveTarget(definition, target, values) {
  const closed = definition.closedForm?.[target];
  if (closed) {
    const value = evaluate(parse(closed), values);
    if (Number.isFinite(value)) return value;
  }

  const domain = definition.vars?.[target]?.domain;
  const range = domain ? { min: domain[0], max: domain[1] } : { min: -1e6, max: 1e6 };
  const solved = solveFor(definition.relation, target, values, range);
  return Number.isFinite(solved) ? solved : undefined;
}

function runRelation(definition, input, options) {
  const target = options.solveFor ?? definition.solveFor ?? Object.keys(definition.vars ?? {})[0];
  const { values, fieldErrors } = resolveVars(definition, input, target);
  const unitForName = unitLookup(definition);

  if (fieldErrors.length > 0) {
    return {
      definition, values, derived: {}, relation: definition.relation, target,
      checks: [], trace: [], fieldErrors, valid: false,
    };
  }

  if (target && !Object.hasOwn(values, target)) {
    const solved = solveTarget(definition, target, values);
    if (solved !== undefined) values[target] = solved;
  }

  const derived = {};
  const scope = { ...values };
  const trace = [];

  if (target && Object.hasOwn(values, target)) {
    const relationAst = parse(definition.relation);
    trace.push({
      label: definition.title,
      expr: definition.relation,
      substituted: substitute(relationAst, scope, (v, name) => eng(v, unitForName(name))),
      value: values[target],
      unit: unitForName(target),
    });
  }

  for (const item of definition.derived ?? []) {
    const ast = parse(item.expr);
    derived[item.id] = evaluate(ast, scope);
    scope[item.id] = derived[item.id];
    trace.push({
      label: item.label,
      expr: item.expr,
      substituted: substitute(ast, scope, (v, name) => eng(v, unitForName(name))),
      value: derived[item.id],
      unit: item.unit,
    });
  }

  const checks = runChecks(definition, scope, unitForName);
  const valid = !checks.some((check) => check.level === 'fail');

  return {
    definition, values, derived, relation: definition.relation, target,
    checks, trace, fieldErrors, valid,
  };
}

function runProcedure(definition, input) {
  const { values, fieldErrors } = resolveVars(definition, input, null);
  const unitForName = unitLookup(definition);

  if (fieldErrors.length > 0) {
    return {
      definition, values, derived: {}, relation: null, target: null,
      checks: [], trace: [], fieldErrors, valid: false,
    };
  }

  const outputs = definition.run(values) ?? {};
  const derived = {};
  for (const item of definition.outputs ?? []) {
    if (Object.hasOwn(outputs, item.id)) derived[item.id] = outputs[item.id];
  }

  const scope = { ...values, ...derived };
  const checks = runChecks(definition, scope, unitForName);
  const valid = !checks.some((check) => check.level === 'fail');

  return {
    definition, values, derived, relation: null, target: null,
    checks, trace: [], fieldErrors, valid,
  };
}

export function runDefinition(definition, input = {}, options = {}) {
  return definition.kind === 'procedure'
    ? runProcedure(definition, input)
    : runRelation(definition, input, options);
}
