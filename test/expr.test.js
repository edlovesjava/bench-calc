import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parse,
  evaluate,
  substitute,
  identifiers,
} from '../src/engine/expr.js';

function close(a, b, tol = 1e-9) {
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)),
    `expected ${a} to be within ${tol} of ${b}`);
}

test('arithmetic precedence is respected', () => {
  const ast = parse('2 + 3 * 4');
  close(evaluate(ast, {}), 14);
  close(evaluate(parse('10 / 2 + 3'), {}), 8);
  close(evaluate(parse('(2 + 3) * 4'), {}), 20);
  close(evaluate(parse('2 ^ 3 ^ 2'), {}), 512);
});

test('unary minus and functions work', () => {
  close(evaluate(parse('-3 + 2'), {}), -1);
  close(evaluate(parse('sqrt(9)'), {}), 3);
  close(evaluate(parse('ln(exp(2))'), {}), 2);
  close(evaluate(parse('max(1, 5, 3)'), {}), 5);
  close(evaluate(parse('abs(-4.5)'), {}), 4.5);
});

test('variables resolve from scope and constants are available', () => {
  const ast = parse('R * I');
  close(evaluate(ast, { R: 100, I: 0.05 }), 5);
  close(evaluate(parse('pi * 2'), {}), Math.PI * 2);
});

test('comparisons and equality are supported for checks', () => {
  assert.equal(evaluate(parse('5 > 3'), {}), true);
  assert.equal(evaluate(parse('2 <= 2'), {}), true);
  assert.equal(evaluate(parse('7 == 7'), {}), true);
  assert.equal(evaluate(parse('If > 25m'), { If: 0.03 }), true);
});

test('substitute prints the worked arithmetic from the same AST', () => {
  const ast = parse('R = (Vs - Vf) / If');
  const text = substitute(ast, { Vs: 5, Vf: 2, If: 0.003 }, (n) => String(n));
  assert.match(text, /5/);
  assert.match(text, /2/);
  assert.match(text, /0\.003/);
  assert.ok(text.includes('('));
  assert.ok(text.includes('='));
});

test('substitute passes the identifier name to fmt for per-variable formatting', () => {
  const ast = parse('R = (Vs - Vf) / If');
  const text = substitute(ast, { Vs: 5, Vf: 2, If: 0.003 }, (n, name) => `${name ?? '?'}:${n}`);
  assert.match(text, /Vs:5/);
  assert.match(text, /Vf:2/);
  assert.match(text, /If:0\.003/);
});

test('identifier extraction finds every variable used', () => {
  const set = identifiers(parse('R = (Vs - Vf) / If'));
  assert.deepEqual([...set].sort(), ['If', 'R', 'Vf', 'Vs']);
});
