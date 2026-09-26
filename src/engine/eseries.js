const SERIES = {
  E12: [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82],
  E24: [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91],
};

export function nearestSeries(value, series = 'E24') {
  const bases = SERIES[series];
  if (!bases || !Number.isFinite(value) || value <= 0) return NaN;

  const exponent = Math.floor(Math.log10(value));
  let nearest = NaN;
  let distance = Infinity;

  for (let decade = exponent - 1; decade <= exponent + 1; decade += 1) {
    const scale = 10 ** (decade - 1);
    for (const base of bases) {
      // base * scale can pick up binary floating-point noise (e.g. 11 * 1e-4
      // = 0.0010999999999999998) even though every value here is a round
      // decimal. Snap back to 12 significant figures, same as seriesValues.
      const candidate = Number((base * scale).toPrecision(12));
      const candidateDistance = Math.abs(Math.log(candidate / value));
      if (candidateDistance < distance) {
        nearest = candidate;
        distance = candidateDistance;
      }
    }
  }

  return nearest;
}

export function seriesValues(series = 'E24', min = 1, max = 1e6) {
  const bases = SERIES[series];
  if (!bases) return [];

  const values = [];
  for (let decade = -1; decade <= 6; decade += 1) {
    const scale = 10 ** decade;
    for (const base of bases) {
      const value = Number((base * scale).toPrecision(12));
      if (value >= min && value <= max) values.push(value);
    }
  }
  return values;
}

export const seriesNames = Object.freeze(Object.keys(SERIES));