import { test } from 'node:test';
import assert from 'node:assert/strict';

import ohm from '../src/calc/ohm.js';
import ledResistor from '../src/calc/led-resistor.js';
import { runDefinition } from '../src/engine/formula.js';

function close(a, b, tol = 1e-9) {
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)),
    `expected ${a} to be within ${tol} of ${b}`);
}

test('formula runner evaluates Ohm\'s law with derived values', () => {
  const result = runDefinition(ohm, { V: 5, R: 100 });
  assert.ok(Object.hasOwn(result.values, 'I'));
  close(result.values.I, 0.05);
  close(result.derived.P, 0.25);
  close(result.derived.frac, 1);
});

test('formula runner returns triggered checks', () => {
  const result = runDefinition(ohm, { I: '100m', R: 100, Prated: 0.25 });
  assert.equal(result.checks.length, 2);
  assert.equal(result.checks[0].level, 'warn');
});

test('formula runner can solve Ohm\'s law for each closed-form target', () => {
  const inputs = { V: 5, I: '50m', R: 100, Prated: 0.25 };

  close(runDefinition(ohm, inputs, { solveFor: 'V' }).values.V, 5);
  close(runDefinition(ohm, inputs, { solveFor: 'I' }).values.I, 0.05);
  close(runDefinition(ohm, inputs, { solveFor: 'R' }).values.R, 100);
});

test('formula runner evaluates LED resistor with derived values', () => {
  const result = runDefinition(ledResistor, { Vs: 5, Vf: 2, If: 0.003 });
  assert.ok(Object.hasOwn(result.values, 'R'));
  close(result.values.R, 1000);
  close(result.derived.Pr, 0.009);
  close(result.derived.Pled, 0.006);
});
