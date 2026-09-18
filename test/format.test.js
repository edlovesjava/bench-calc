import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sigFigs, eng, pct, ratio, DASH } from '../src/engine/format.js';
import { parse } from '../src/engine/units.js';

test('significant figures, not decimal places', () => {
  assert.equal(sigFigs(1234), '1230');
  assert.equal(sigFigs(0.25), '0.25');
  assert.equal(sigFigs(5), '5');
  assert.equal(sigFigs(63.24), '63.2');
  assert.equal(sigFigs(0.001), '0.001');
  assert.equal(sigFigs(2.495, 4), '2.495');
  assert.equal(sigFigs(0), '0');
  assert.equal(sigFigs(-0.05), '-0.05');
});

test('non-numbers print as a dash, never as NaN', () => {
  assert.equal(sigFigs(NaN), DASH);
  assert.equal(sigFigs(Infinity), DASH);
  assert.equal(eng(NaN, 'V'), DASH);
  assert.equal(pct(NaN), DASH);
});

test('engineering prefixes across the range', () => {
  assert.equal(eng(4700, 'ohm'), '4.7 kΩ');
  assert.equal(eng(0.00044, 'A'), '440 µA');
  assert.equal(eng(0.25, 'W'), '250 mW');
  assert.equal(eng(1, 'V'), '1 V');
  assert.equal(eng(5, 'V'), '5 V');
  assert.equal(eng(1e6, 'Hz'), '1 MHz');
  assert.equal(eng(33e-12, 'F'), '33 pF');
  assert.equal(eng(1e9, 'Hz'), '1 GHz');
  assert.equal(eng(0, 'A'), '0 A');
});

test('the prefix steps at exactly the decade boundary', () => {
  assert.equal(eng(999, 'Hz'), '999 Hz');
  assert.equal(eng(1000, 'Hz'), '1 kHz');
  assert.equal(eng(0.001, 'A'), '1 mA');
  assert.equal(eng(0.000999, 'A'), '999 µA');
  // 999.9 uA at 3 s.f. IS 1.00 mA, so it climbs a step rather than printing 1000 uA.
  assert.equal(eng(0.0009999, 'A'), '1 mA');
});

test('rounding does not leave a four-digit mantissa', () => {
  // 999.9 Hz at 3 s.f. rounds to 1000, which must climb a step.
  assert.equal(eng(999.9, 'Hz'), '1 kHz');
  assert.equal(eng(999999, 'Hz'), '1 MHz');
});

test('temperature and thermal resistance never take a prefix', () => {
  assert.equal(eng(57.32, 'degC'), '57.3 °C');
  assert.equal(eng(0.5, 'degC'), '0.5 °C');
  assert.equal(eng(50, 'degC/W'), '50 °C/W');
  assert.equal(eng(105, 'degC'), '105 °C');
});

test('below pico and above giga it stays readable', () => {
  assert.equal(eng(1e-13, 'F'), '0.1 pF');
  assert.equal(eng(2.5e10, 'Hz'), '25 GHz');
});

test('percentages and ratios', () => {
  assert.equal(pct(55.5555), '55.6 %');
  assert.equal(ratio(0.5556, 3), '0.556');
  assert.equal(ratio(12.44, 3, 'x'), '12.4x');
});

test('parse and eng round-trip the values on the reference page', () => {
  const cases = [
    ['4k7', 'ohm', '4.7 kΩ'],
    ['100n', 'F', '100 nF'],
    ['220u', 'F', '220 µF'],
    ['100u', 'H', '100 µH'],
    ['50k', 'Hz', '50 kHz'],
    ['500m', 'A', '500 mA'],
    ['29n', 'C', '29 nC'],
    ['2.495', 'V', '2.5 V'],
  ];
  for (const [text, unit, want] of cases) {
    assert.equal(eng(parse(text), unit), want, `${text} as ${unit}`);
  }
});
