import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parse, parseInto, scan, dimOf, dimMul, dimDiv, dimPow, dimEq, dimString,
  unitFor, normalizeUnit, isUnit, UNITS,
} from '../src/engine/units.js';

const close = (a, b, tol = 1e-12) =>
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)),
    `expected ${a} to be within ${tol} of ${b}`);

test('plain numbers', () => {
  assert.equal(parse('5'), 5);
  assert.equal(parse('0.25'), 0.25);
  assert.equal(parse('.5'), 0.5);
  assert.equal(parse('5.'), 5);
  assert.equal(parse('-3'), -3);
  assert.equal(parse('1e-6'), 1e-6);
  assert.equal(parse('2.2E3'), 2200);
  assert.equal(parse(47), 47);
});

test('SI prefixes', () => {
  assert.equal(parse('4k'), 4000);
  close(parse('100n'), 1e-7);
  close(parse('2.2u'), 2.2e-6);
  assert.equal(parse('10M'), 1e7);
  assert.equal(parse('50m'), 0.05);
  assert.equal(parse('1G'), 1e9);
  close(parse('33p'), 33e-12);
});

test('M and m are not the same prefix', () => {
  assert.equal(parse('1M'), 1e6);
  assert.equal(parse('1m'), 1e-3);
  assert.equal(parse('1M') / parse('1m'), 1e9);
});

test('K is kilo, by bench convention', () => {
  // 4K7 and 4k7 are the same resistor. Documented trade: no input is in kelvin.
  assert.equal(parse('4K7'), 4700);
  assert.equal(parse('10K'), 10000);
});

test('infix notation puts the prefix where the decimal point goes', () => {
  assert.equal(parse('4k7'), 4700);
  assert.equal(parse('1M5'), 1.5e6);
  close(parse('2u2'), 2.2e-6);
  close(parse('4n7'), 4.7e-9);
  assert.equal(parse('2R2'), 2.2);      // R marks ohms and a decimal point
  assert.equal(parse('0R47'), 0.47);
});

test('units may be spelled out, and micro has three spellings', () => {
  assert.equal(parse('50 mA'), 0.05);
  assert.equal(parse('4.7 kohm'.replace('kohm', 'k')), 4700);
  assert.equal(parse('100 MHz'), 1e8);
  assert.equal(parse('5 V'), 5);
  assert.equal(parse('1 Hz'), 1);
  close(parse('10 uF'), 1e-5);
  close(parse('10 µF'), 1e-5);   // micro sign
  close(parse('10 μF'), 1e-5);   // greek mu
  assert.equal(parse('1 kΩ'), 1000);
});

test('whitespace, commas and unicode minus', () => {
  assert.equal(parse('  5  '), 5);
  assert.equal(parse('1,000'), 1000);
  assert.equal(parse('−3'), -3);
});

test('junk is NaN, not a lucky guess', () => {
  for (const bad of ['', '   ', 'banana', 'k', '5 bananas', 'V', '--5', null, undefined, {}]) {
    assert.ok(Number.isNaN(parse(bad)), `expected NaN for ${JSON.stringify(bad)}`);
  }
});

test('scan reports the unit it found', () => {
  assert.deepEqual(scan('50 mA'), { value: 0.05, unit: 'A' });
  assert.deepEqual(scan('4k7'), { value: 4700, unit: '' });
  assert.deepEqual(scan('2R2'), { value: 2.2, unit: 'ohm' });
  assert.equal(scan('nope'), null);
});

test('parseInto rejects a unit of the wrong dimension', () => {
  const ok = parseInto('4k7', 'ohm');
  assert.equal(ok.ok, true);
  close(ok.value, 4700);

  const bad = parseInto('5 V', 'ohm');
  assert.equal(bad.ok, false);
  assert.match(bad.message, /wants/);

  // A bare number is always accepted: the field already knows its unit.
  assert.equal(parseInto('100', 'ohm').ok, true);
  // And the right unit spelled out is fine.
  assert.equal(parseInto('100 ohm', 'ohm').ok, true);
});

test('unit spellings normalise', () => {
  assert.equal(normalizeUnit('Ω'), 'ohm');
  assert.equal(normalizeUnit('Ohm'), 'ohm');
  assert.equal(normalizeUnit('°C'), 'degC');
  assert.equal(normalizeUnit('°C/W'), 'degC/W');
  assert.ok(isUnit('V'));
  assert.ok(!isUnit('parsec'));
});

test('dimensions of the units we ship are internally consistent', () => {
  const V = dimOf('V'), A = dimOf('A'), R = dimOf('ohm'), W = dimOf('W');
  const F = dimOf('F'), H = dimOf('H'), s = dimOf('s'), Hz = dimOf('Hz');
  const C = dimOf('C'), J = dimOf('J');

  assert.ok(dimEq(dimMul(A, R), V), 'V = A * ohm');
  assert.ok(dimEq(dimMul(V, A), W), 'W = V * A');
  assert.ok(dimEq(dimMul(dimPow(A, 2), R), W), 'W = A^2 * ohm');
  assert.ok(dimEq(dimMul(R, F), s), 's = ohm * F  (tau = RC)');
  assert.ok(dimEq(dimDiv(H, R), s), 's = H / ohm  (tau = L/R)');
  assert.ok(dimEq(dimDiv(dimOf(''), s), Hz), 'Hz = 1/s');
  assert.ok(dimEq(dimMul(F, V), C), 'C = F * V  (Q = CV)');
  assert.ok(dimEq(dimMul(dimMul(F, dimPow(V, 2)), dimOf('')), J), 'J = F * V^2');
  assert.ok(dimEq(dimMul(dimPow(A, 2), dimMul(H, dimOf(''))), J), 'J = H * A^2');
  assert.ok(dimEq(dimMul(dimOf('degC/W'), W), dimOf('degC')), 'degC = degC/W * W');
});

test('dimString names what it can', () => {
  assert.equal(dimString(dimMul(dimOf('A'), dimOf('ohm'))), 'V');
  assert.equal(dimString(dimOf('')), '1');
  assert.equal(unitFor(dimOf('W')), 'W');
});

test('every declared unit has a symbol and a 5-slot dimension', () => {
  for (const [key, u] of Object.entries(UNITS)) {
    assert.equal(u.dim.length, 5, `${key} dimension vector`);
    assert.equal(typeof u.symbol, 'string', `${key} symbol`);
    assert.ok(u.dim.every(Number.isFinite), `${key} exponents are numbers`);
  }
});
