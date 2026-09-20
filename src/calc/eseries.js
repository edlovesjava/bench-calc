import { nearestSeries } from '../engine/eseries.js';

/**
 * Tolerance for each series, so the band is shown alongside the nearest
 * value: a 5 % 4.7k can legitimately measure 4.47k-4.94k.
 */
const TOLERANCE = { E12: 0.10, E24: 0.05 };

export default {
  id: 'eseries',
  kind: 'procedure',
  group: 'units-parts',
  title: 'E-series and combos',
  blurb: 'Snap a target resistance to the nearest standard value, with the ' +
         'tolerance band that comes with it.',

  vars: {
    t: { unit: 'ohm', label: 'Target resistance', default: '4780' },
    series: { kind: 'mode', label: 'Series', options: ['E24', 'E12'], default: 'E24' },
  },

  run({ t, series }) {
    const nearest = nearestSeries(t, series);
    if (!Number.isFinite(nearest)) return {};
    const tol = TOLERANCE[series] ?? 0;
    return {
      nearest,
      error: (nearest - t) / t,
      bandLow: nearest * (1 - tol),
      bandHigh: nearest * (1 + tol),
    };
  },

  outputs: [
    { id: 'nearest', unit: 'ohm', label: 'Nearest series value' },
    { id: 'error', unit: '', label: 'Error from target' },
    { id: 'bandLow', unit: 'ohm', label: 'Tolerance band, low' },
    { id: 'bandHigh', unit: 'ohm', label: 'Tolerance band, high' },
  ],

  checks: [
    { when: 'abs(error) > 0.1', level: 'warn',
      text: '{nearest} is more than 10% off {t} — check the series and decade.' },
  ],

  examples: [
    { given: { t: 4780, series: 'E24' }, expect: { nearest: 4700, error: -0.016736401673640166 } },
  ],
};
