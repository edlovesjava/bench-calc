/**
 * Turning numbers back into something you can read at the bench.
 *
 * Two rules the whole app follows:
 *
 *  1. Engineering notation, not scientific. 440 uA, never 4.4e-4 A. The prefix
 *     is how you actually talk about the value, and it is how the part is
 *     marked.
 *
 *  2. Three significant figures by default. Rthja is a typical value with 20 %
 *     spread behind it; printing "57.3184 degC" claims a precision that does
 *     not exist. Decimals are a claim about how well you know something.
 */

import { normalizeUnit, symbolOf } from './units.js';

/**
 * Units that never take a prefix. A temperature of 57 degrees is not
 * "57 millikilodegrees", and a thermal resistance is quoted plain.
 */
const NO_PREFIX = new Set(['degC', 'degC/W', '']);

const STEPS = [
  [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''],
  [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'],
];

export const DASH = '—';

/**
 * Round to n significant figures and print it without an exponent where that
 * is reasonable. Trailing zeros are dropped: 0.250 -> "0.25".
 */
export function sigFigs(v, n = 3) {
  if (!Number.isFinite(v)) return DASH;
  if (v === 0) return '0';

  const rounded = Number(v.toPrecision(n));
  const a = Math.abs(rounded);
  if (a < 1e-4 || a >= 1e15) return String(rounded);

  const places = Math.max(0, n - 1 - Math.floor(Math.log10(a)));
  let s = rounded.toFixed(places);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

/**
 * Format a value in SI base units for display.
 *
 *   eng(4700, 'ohm')   -> "4.7 kOhm"
 *   eng(0.00044, 'A')  -> "440 uA"
 *   eng(0.25, 'W')     -> "250 mW"
 *   eng(57.3, 'degC')  -> "57.3 degC"
 */
export function eng(v, unit = '', n = 3) {
  const key = normalizeUnit(unit);
  const sym = symbolOf(key);
  const tail = sym === '' ? '' : ' ' + sym;

  if (!Number.isFinite(v)) return DASH;
  if (NO_PREFIX.has(key)) return sigFigs(v, n) + tail;
  if (v === 0) return '0' + tail;

  const a = Math.abs(v);
  let i = STEPS.length - 1;
  for (let k = 0; k < STEPS.length; k++) {
    if (a >= STEPS[k][0]) { i = k; break; }
  }

  // Rounding can push the mantissa up a decade: 999.9 Hz at 3 s.f. is 1000,
  // which should read 1.00 kHz rather than "1000 Hz".
  let mantissa = v / STEPS[i][0];
  if (Math.abs(Number(mantissa.toPrecision(n))) >= 1000 && i > 0) {
    i -= 1;
    mantissa = v / STEPS[i][0];
  }

  return sigFigs(mantissa, n) + ' ' + STEPS[i][1] + sym;
}

/** Percentages are dimensionless and always want their own sign. */
export function pct(v, n = 3) {
  if (!Number.isFinite(v)) return DASH;
  return sigFigs(v, n) + ' %';
}

/** A bare ratio: "0.556", "12.4x". */
export function ratio(v, n = 3, suffix = '') {
  if (!Number.isFinite(v)) return DASH;
  return sigFigs(v, n) + suffix;
}
