/**
 * Units and dimensions.
 *
 * Every quantity in this app is a plain JS number in SI base units. A resistance
 * is ohms, a capacitance is farads, a time is seconds — always, everywhere,
 * with no exceptions. Prefixes exist only at the two edges: the parser that
 * reads "4k7" off an input field, and the formatter that prints "440 uA" back.
 *
 * Units carry a dimension vector so the test suite can check that a formula's
 * two sides balance. That check runs in `node --test`, never at the bench:
 * at the bench everything is already a number.
 *
 * Base dimensions, in order: [kg, m, s, A, K]
 */

/** @typedef {number[]} Dim */

/** @returns {Dim} */
function dim(kg = 0, m = 0, s = 0, a = 0, k = 0) {
  return [kg, m, s, a, k];
}

/**
 * The units this app actually uses. Deliberately short: a unit earns its place
 * by appearing in a real bench formula, not by existing in SI.
 */
export const UNITS = {
  '':        { dim: dim(),                symbol: '',      name: 'dimensionless' },
  'V':       { dim: dim(1, 2, -3, -1),    symbol: 'V',     name: 'volt' },
  'A':       { dim: dim(0, 0, 0, 1),      symbol: 'A',     name: 'amp' },
  'ohm':     { dim: dim(1, 2, -3, -2),    symbol: 'Ω', name: 'ohm' },
  'W':       { dim: dim(1, 2, -3),        symbol: 'W',     name: 'watt' },
  'F':       { dim: dim(-1, -2, 4, 2),    symbol: 'F',     name: 'farad' },
  'H':       { dim: dim(1, 2, -2, -2),    symbol: 'H',     name: 'henry' },
  'Hz':      { dim: dim(0, 0, -1),        symbol: 'Hz',    name: 'hertz' },
  's':       { dim: dim(0, 0, 1),         symbol: 's',     name: 'second' },
  'C':       { dim: dim(0, 0, 1, 1),      symbol: 'C',     name: 'coulomb' },
  'J':       { dim: dim(1, 2, -2),        symbol: 'J',     name: 'joule' },
  'degC':    { dim: dim(0, 0, 0, 0, 1),   symbol: '°C', name: 'degree Celsius' },
  'degC/W':  { dim: dim(-1, -2, 3, 0, 1), symbol: '°C/W', name: 'degree Celsius per watt' },
};

/** Spellings that mean the same unit. Keys are what a human might type. */
const ALIASES = {
  'Ω': 'ohm', 'Ω': 'ohm', 'Ohm': 'ohm', 'ohms': 'ohm', 'R': 'ohm',
  '°C': 'degC', 'C°': 'degC', 'degc': 'degC',
  '°C/W': 'degC/W', 'degc/w': 'degC/W', 'K/W': 'degC/W',
  'sec': 's', 'hz': 'Hz', 'v': 'V', 'a': 'A', 'w': 'W', 'f': 'F', 'j': 'J',
};

/**
 * "Ohm" -> "ohm". Unknown spellings come back unchanged so the caller can
 * decide whether that is an error.
 */
export function normalizeUnit(u) {
  if (u === undefined || u === null) return '';
  const t = String(u).trim();
  if (t === '') return '';
  if (Object.hasOwn(UNITS, t)) return t;
  if (Object.hasOwn(ALIASES, t)) return ALIASES[t];
  return t;
}

export function isUnit(u) {
  return Object.hasOwn(UNITS, normalizeUnit(u));
}

/** Dimension vector of a unit. Throws on a unit that is not declared above. */
export function dimOf(u) {
  const key = normalizeUnit(u);
  if (!Object.hasOwn(UNITS, key)) throw new Error(`unknown unit: ${u}`);
  return UNITS[key].dim.slice();
}

/** Display symbol: 'ohm' -> 'Omega', 'degC' -> '°C'. */
export function symbolOf(u) {
  const key = normalizeUnit(u);
  return Object.hasOwn(UNITS, key) ? UNITS[key].symbol : String(u ?? '');
}

export function dimMul(a, b) { return a.map((x, i) => x + b[i]); }
export function dimDiv(a, b) { return a.map((x, i) => x - b[i]); }
export function dimPow(a, n) { return a.map((x) => x * n); }
export function dimEq(a, b) { return a.length === b.length && a.every((x, i) => x === b[i]); }
export function isDimensionless(d) { return d.every((x) => x === 0); }

/** Reverse lookup, for readable failures in the dimension tests. */
export function unitFor(d) {
  for (const [key, u] of Object.entries(UNITS)) {
    if (dimEq(u.dim, d)) return key;
  }
  return null;
}

/** "kg.m2.s-3.A-1", or a unit name when one matches. */
export function dimString(d) {
  const known = unitFor(d);
  if (known !== null) return known === '' ? '1' : known;
  const names = ['kg', 'm', 's', 'A', 'K'];
  const parts = d.map((e, i) => (e === 0 ? null : e === 1 ? names[i] : `${names[i]}${e}`))
    .filter(Boolean);
  return parts.length ? parts.join('.') : '1';
}

/* ------------------------------------------------------------------ parsing */

/**
 * SI prefixes accepted in input. 'K' is here as well as 'k' because bench
 * notation has always been sloppy about it — 4K7 and 4k7 are the same resistor.
 * The cost is that a bare "1 K" reads as 1000, not one kelvin; nothing in this
 * app takes an input in kelvin, so that trade is fine.
 */
export const PREFIXES = {
  p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9,
};

const INFIX = /^([+-]?\d+)([pnumkKMGR])(\d+)$/;
const NUMBER = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([pnumkKMG])?(.*)$/;

/**
 * Split an input string into a number and whatever unit text followed it.
 * Returns null when it is not a number at all.
 *
 * @returns {{value: number, unit: string} | null}
 */
export function scan(text) {
  if (typeof text === 'number') {
    return Number.isFinite(text) ? { value: text, unit: '' } : null;
  }
  if (text === null || text === undefined) return null;

  const t = String(text)
    .trim()
    .replace(/[\s ,]/g, '')
    .replace(/[−–]/g, '-')
    .replace(/[µμ]/g, 'u');
  if (t === '') return null;

  // 4k7 / 2R2 / 1M5: the prefix letter stands in for the decimal point.
  const infix = t.match(INFIX);
  if (infix) {
    const mult = infix[2] === 'R' ? 1 : PREFIXES[infix[2]];
    const value = Number(`${infix[1]}.${infix[3]}`);
    if (!Number.isFinite(value)) return null;
    return { value: value * mult, unit: infix[2] === 'R' ? 'ohm' : '' };
  }

  const m = t.match(NUMBER);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;

  const mult = m[2] ? PREFIXES[m[2]] : 1;
  const rest = m[3];
  if (rest !== '' && !isUnit(rest)) return null;

  return { value: value * mult, unit: rest === '' ? '' : normalizeUnit(rest) };
}

/**
 * Read a field. Returns the value in SI base units, or NaN.
 *
 *   parse('4k7')     -> 4700
 *   parse('100n')    -> 1e-7
 *   parse('50 mA')   -> 0.05
 *   parse('1e-6')    -> 1e-6
 *   parse('banana')  -> NaN
 */
export function parse(text) {
  const s = scan(text);
  return s === null ? NaN : s.value;
}

/**
 * Read a field that is supposed to hold a particular unit. If the text spells
 * out a unit of the wrong dimension — volts typed into an ohms field — this
 * says so instead of silently accepting the number.
 *
 * @returns {{ok: boolean, value: number, message?: string}}
 */
export function parseInto(text, unit) {
  const want = normalizeUnit(unit);
  const s = scan(text);
  if (s === null) return { ok: false, value: NaN, message: 'not a number' };
  if (s.unit !== '' && want !== '' && !dimEq(dimOf(s.unit), dimOf(want))) {
    return {
      ok: false,
      value: NaN,
      message: `that is ${symbolOf(s.unit)}, this field wants ${symbolOf(want)}`,
    };
  }
  return { ok: true, value: s.value };
}
