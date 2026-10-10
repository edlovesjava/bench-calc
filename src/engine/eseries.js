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
  for (let decade = -2; decade <= 6; decade += 1) {
    const scale = 10 ** decade;
    for (const base of bases) {
      const value = Number((base * scale).toPrecision(12));
      if (value >= min && value <= max) values.push(value);
    }
  }
  return values;
}

export const seriesNames = Object.freeze(Object.keys(SERIES));

/**
 * Two series values combined to land closer to `target` than any single part.
 *
 *   'series'   -> Ra + Rb        both parts no larger than the target
 *   'parallel' -> Ra*Rb/(Ra+Rb)  both parts no smaller than the target
 *
 * Minimises the absolute error over every pair drawn from three decades
 * either side of the target. Ra >= Rb in the result. Ties go to the pair with
 * the larger Rb (the more balanced split: less sensitive to either part's
 * tolerance). Returns NaN fields when no pair exists — a target outside the
 * series table, or a non-positive one — rather than a plausible guess.
 */
export function bestPair(target, series = 'E24', topology = 'series') {
  const none = { a: NaN, b: NaN, value: NaN, error: NaN };
  if (!SERIES[series] || !Number.isFinite(target) || target <= 0) return none;

  const combine = topology === 'parallel'
    ? (a, b) => (a * b) / (a + b)
    : topology === 'series' ? (a, b) => a + b : null;
  if (!combine) return none;

  const candidates = topology === 'parallel'
    ? seriesValues(series, target, target * 1000)
    : seriesValues(series, target / 1000, target);

  let best = none;
  let distance = Infinity;
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      // Candidates ascend, so a >= b without sorting.
      const a = candidates[i];
      const b = candidates[j];
      const value = combine(a, b);
      const d = Math.abs(value - target);
      // Relative slack so float noise in 1.2e3 + 3.3e3 does not pick a winner.
      if (d < distance - target * 1e-12 || (Math.abs(d - distance) <= target * 1e-12 && b > best.b)) {
        best = { a, b, value, error: (value - target) / target };
        distance = d;
      }
    }
  }
  return best;
}
