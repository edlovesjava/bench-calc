/**
 * Run a calculator definition against a set of inputs.
 *
 * This is the layer that turns a definition object into a single result object:
 * the solved variable values, the derived expressions, and the checks. The UI
 * then renders that object without knowing anything about the calculator itself.
 */

import { parse as parseValue } from './units.js';
import { parse, evaluate } from './expr.js';
import { solveFor } from './solve.js';

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

function resolveValue(name, scope, definition) {
  if (Object.hasOwn(scope, name)) return scope[name];
  const defaults = definition.vars[name];
  if (defaults && !isBlank(defaults.default)) {
    return parseValue(String(defaults.default));
  }
  return undefined;
}

export function runDefinition(definition, input = {}, options = {}) {
  const values = {};
  const target = options.solveFor ?? definition.solveFor ?? Object.keys(definition.vars ?? {})[0];

  for (const [name, meta] of Object.entries(definition.vars ?? {})) {
    if (name === target) continue;
    if (!isBlank(input[name])) {
      values[name] = parseValue(String(input[name]));
    } else if (!isBlank(meta.default)) {
      values[name] = parseValue(String(meta.default));
    }
  }

  if (target && !Object.hasOwn(values, target)) {
    const solved = solveFor(definition.relation, target, values, { min: -1e6, max: 1e6 });
    if (Number.isFinite(solved)) {
      values[target] = solved;
    }
  }

  if (target && !Object.hasOwn(values, target)) {
    for (const [name, meta] of Object.entries(definition.vars ?? {})) {
      if (name !== target && Object.hasOwn(values, name)) {
        const solved = solveFor(definition.relation, target, values, { min: -1e6, max: 1e6 });
        if (Number.isFinite(solved)) {
          values[target] = solved;
          break;
        }
      }
    }
  }

  const derived = {};
  const scope = { ...values };
  for (const item of definition.derived ?? []) {
    derived[item.id] = evaluate(parse(item.expr), scope);
    scope[item.id] = derived[item.id];
  }

  const checks = (definition.checks ?? []).flatMap((check) => {
    const triggered = evaluate(parse(check.when), scope);
    return triggered === true ? [{ ...check, triggered: true }] : [];
  });

  return {
    definition,
    values,
    derived,
    relation: definition.relation,
    target,
    checks,
  };
}
