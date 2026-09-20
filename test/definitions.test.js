import { test } from 'node:test';
import assert from 'node:assert/strict';

import ohm from '../src/calc/ohm.js';
import ledResistor from '../src/calc/led-resistor.js';
import divider from '../src/calc/divider.js';
import { parse } from '../src/engine/expr.js';
import { runDefinition } from '../src/engine/formula.js';

const definitions = [ohm, ledResistor, divider];

function close(a, b, tol = 1e-9) {
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)),
    `expected ${a} to be within ${tol} of ${b}`);
}

for (const definition of definitions) {
  test(`${definition.id} definition is internally consistent`, () => {
    const ast = parse(definition.relation);
    const ids = new Set();
    const walk = (node) => {
      if (!node) return;
      if (node.type === 'identifier') {
        ids.add(node.name);
        return;
      }
      if (node.type === 'binary' || node.type === 'assign') {
        walk(node.left);
        walk(node.right);
        return;
      }
      if (node.type === 'unary') {
        walk(node.arg);
        return;
      }
      if (node.type === 'call') {
        for (const arg of node.args) walk(arg);
      }
    };
    walk(ast);

    for (const name of ids) {
      assert.ok(Object.hasOwn(definition.vars, name), `${definition.id} uses unknown variable ${name}`);
    }

    for (const example of definition.examples) {
      const result = runDefinition(definition, example.given);

      for (const [key, expected] of Object.entries(example.expect)) {
        if (Object.hasOwn(result.values, key)) {
          close(result.values[key], expected, 1e-6);
        } else if (Object.hasOwn(result.derived, key)) {
          close(result.derived[key], expected, 1e-6);
        } else {
          assert.fail(`${definition.id} did not produce ${key}`);
        }
      }
    }
  });
}
