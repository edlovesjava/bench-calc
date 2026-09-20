import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveFor } from '../src/engine/solve.js';

function close(a, b, tol = 1e-9) {
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)),
    `expected ${a} to be within ${tol} of ${b}`);
}

test('solveFor resolves a closed-form equation for the target variable', () => {
  const result = solveFor('V = I * R', 'I', { V: 5, R: 100 });
  close(result, 0.05);
});

test('solveFor finds a numeric root when no explicit closed form is available', () => {
  const result = solveFor('x^2 = 9', 'x', {}, { min: 0, max: 10 });
  close(result, 3);
});

test('solveFor refuses to guess when the function never changes sign', () => {
  const result = solveFor('x^2 + 1 = 0', 'x', {}, { min: -5, max: 5 });
  assert.equal(result, null);
});
