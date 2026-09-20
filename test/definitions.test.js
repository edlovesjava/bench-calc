import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calculators } from '../src/calc/index.js';
import { parse, identifiers, evaluate } from '../src/engine/expr.js';
import { runDefinition } from '../src/engine/formula.js';
import { dimOf, dimMul, dimDiv, dimPow, dimEq, dimString, isDimensionless } from '../src/engine/units.js';

const CONSTANTS = new Set(['pi', 'e']);
const KNOWN_GROUPS = new Set([
  'units-parts', 'resistors', 'leds', 'linear-supplies', 'capacitors-inductors',
  'buck', 'comparators-references', 'transistor-switches', 'signals',
]);

function close(a, b, tol = 1e-6) {
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)),
    `expected ${a} to be within ${tol} of ${b}`);
}

/** Dimension of an expression AST, given each identifier's dimension. Throws
 * a descriptive error on a mismatch, rather than a bare assertion failure. */
function dimensionOf(node, dimByName) {
  switch (node.type) {
    case 'number':
      return dimOf('');

    case 'identifier': {
      if (CONSTANTS.has(node.name)) return dimOf('');
      if (!Object.hasOwn(dimByName, node.name)) {
        throw new Error(`unknown identifier in dimension check: ${node.name}`);
      }
      return dimByName[node.name];
    }

    case 'unary':
      return dimensionOf(node.arg, dimByName);

    case 'assign':
      return dimensionOf({ type: 'binary', op: '=', left: node.left, right: node.right }, dimByName);

    case 'binary': {
      const left = dimensionOf(node.left, dimByName);
      const right = dimensionOf(node.right, dimByName);
      switch (node.op) {
        case '+':
        case '-':
        case '=':
          if (!dimEq(left, right)) {
            throw new Error(`dimension mismatch across '${node.op}': ${dimString(left)} vs ${dimString(right)}`);
          }
          return left;
        case '*':
          return dimMul(left, right);
        case '/':
          return dimDiv(left, right);
        case '^':
          if (node.right.type !== 'number') {
            throw new Error("dimension check only supports a literal numeric exponent for '^'");
          }
          return dimPow(left, node.right.value);
        default:
          throw new Error(`dimension check does not support comparison operator '${node.op}'`);
      }
    }

    case 'call': {
      const argDims = node.args.map((arg) => dimensionOf(arg, dimByName));
      switch (node.name) {
        case 'sqrt':
          return dimPow(argDims[0], 0.5);
        case 'abs':
          return argDims[0];
        case 'min':
        case 'max':
          for (const d of argDims) {
            if (!dimEq(d, argDims[0])) throw new Error(`${node.name}() arguments have mismatched dimensions`);
          }
          return argDims[0];
        case 'ln':
        case 'log10':
        case 'exp':
          if (!isDimensionless(argDims[0])) throw new Error(`${node.name}() requires a dimensionless argument`);
          return dimOf('');
        default:
          throw new Error(`dimension check does not support function '${node.name}'`);
      }
    }

    default:
      throw new Error(`dimension check: unknown AST node '${node.type}'`);
  }
}

test('every calculator has a unique id and a known group', () => {
  const ids = new Set();
  for (const definition of calculators) {
    assert.ok(!ids.has(definition.id), `duplicate calculator id: ${definition.id}`);
    ids.add(definition.id);
    assert.ok(KNOWN_GROUPS.has(definition.group), `${definition.id} has an unrecognised group: ${definition.group}`);
  }
});

for (const definition of calculators) {
  if (definition.kind === 'procedure') {
    test(`${definition.id} definition is internally consistent`, () => {
      const knownIds = new Set([...Object.keys(definition.vars ?? {}), ...(definition.outputs ?? []).map((o) => o.id)]);

      for (const check of definition.checks ?? []) {
        for (const name of identifiers(parse(check.when))) {
          assert.ok(CONSTANTS.has(name) || knownIds.has(name), `${definition.id} check 'when' uses unknown identifier ${name}`);
        }
        for (const [, name] of String(check.text).matchAll(/\{(\w+)\}/g)) {
          assert.ok(knownIds.has(name), `${definition.id} check text interpolates unknown identifier ${name}`);
        }
      }

      for (const example of definition.examples) {
        const result = runDefinition(definition, example.given);
        for (const [key, expected] of Object.entries(example.expect)) {
          assert.ok(Object.hasOwn(result.derived, key) || Object.hasOwn(result.values, key),
            `${definition.id} did not produce ${key}`);
          close(result.derived[key] ?? result.values[key], expected);
        }
      }
    });
    continue;
  }

  test(`${definition.id} definition is internally consistent`, () => {
    const varDims = Object.fromEntries(
      Object.entries(definition.vars).map(([name, meta]) => [name, dimOf(meta.unit ?? '')])
    );

    const ast = parse(definition.relation);
    assert.equal(ast.type, 'assign', `${definition.id} relation must be an equation`);

    for (const name of identifiers(ast)) {
      assert.ok(Object.hasOwn(definition.vars, name), `${definition.id} relation uses unknown variable ${name}`);
    }
    dimensionOf(ast, varDims);

    for (const [key, expr] of Object.entries(definition.closedForm ?? {})) {
      assert.ok(Object.hasOwn(definition.vars, key), `${definition.id} closedForm key ${key} is not a declared var`);
      for (const name of identifiers(parse(expr))) {
        assert.ok(CONSTANTS.has(name) || Object.hasOwn(definition.vars, name),
          `${definition.id} closedForm.${key} uses unknown variable ${name}`);
      }
    }

    const knownIds = new Set(Object.keys(definition.vars));
    const dimByName = { ...varDims };
    for (const item of definition.derived ?? []) {
      for (const name of identifiers(parse(item.expr))) {
        assert.ok(CONSTANTS.has(name) || knownIds.has(name),
          `${definition.id} derived.${item.id} uses unknown or not-yet-declared identifier ${name}`);
      }
      const dim = dimensionOf(parse(item.expr), dimByName);
      assert.ok(dimEq(dim, dimOf(item.unit ?? '')),
        `${definition.id} derived.${item.id} is declared as ${item.unit || 'dimensionless'} but the expression evaluates to ${dimString(dim)}`);
      assert.ok(!knownIds.has(item.id), `${definition.id} derived id ${item.id} shadows an existing var or derived name`);
      knownIds.add(item.id);
      dimByName[item.id] = dim;
    }

    for (const check of definition.checks ?? []) {
      for (const name of identifiers(parse(check.when))) {
        assert.ok(CONSTANTS.has(name) || knownIds.has(name), `${definition.id} check 'when' uses unknown identifier ${name}`);
      }
      for (const [, name] of String(check.text).matchAll(/\{(\w+)\}/g)) {
        assert.ok(knownIds.has(name), `${definition.id} check text interpolates unknown identifier ${name}`);
      }
    }

    for (const example of definition.examples) {
      const result = runDefinition(definition, example.given);

      for (const [key, expected] of Object.entries(example.expect)) {
        if (Object.hasOwn(result.values, key)) {
          close(result.values[key], expected);
        } else if (Object.hasOwn(result.derived, key)) {
          close(result.derived[key], expected);
        } else {
          assert.fail(`${definition.id} did not produce ${key}`);
        }
      }

      const scope = { ...result.values, ...result.derived };
      for (const [key, expr] of Object.entries(definition.closedForm ?? {})) {
        if (!Object.hasOwn(scope, key)) continue;
        const computed = evaluate(parse(expr), scope);
        close(computed, scope[key], 1e-4);
      }
    }
  });
}
