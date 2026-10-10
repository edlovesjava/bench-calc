import { bestPair } from '../engine/eseries.js';

export default {
  id: 'ecombo',
  kind: 'procedure',
  group: 'units-parts',
  title: 'E-series combos',
  blurb: 'Combine two standard parts in series or parallel to land closer to ' +
         'a target than any single value — often exactly.',

  vars: {
    t: { unit: 'ohm', label: 'Target resistance', default: '4780' },
    series: { kind: 'mode', label: 'Series', options: ['E24', 'E12'], default: 'E24' },
    topology: { kind: 'mode', label: 'Topology', options: ['series', 'parallel'], default: 'series' },
  },

  run({ t, series, topology }) {
    const pair = bestPair(t, series, topology);
    if (!Number.isFinite(pair.value)) return {};
    const other = bestPair(t, series, topology === 'series' ? 'parallel' : 'series');
    return { a: pair.a, b: pair.b, value: pair.value, error: pair.error, otherError: other.error };
  },

  outputs: [
    { id: 'a', unit: 'ohm', label: 'Ra' },
    { id: 'b', unit: 'ohm', label: 'Rb' },
    { id: 'value', unit: 'ohm', label: 'Combined value' },
    { id: 'error', unit: '', label: 'Error from target' },
    { id: 'otherError', unit: '', label: 'Error with the other topology' },
  ],

  diagram: {
    kind: 'resistors',
    topology: 'topology',
    parts: [{ id: 'a', label: 'Ra' }, { id: 'b', label: 'Rb' }],
    total: { id: 'value', label: 'Rtotal' },
  },

  checks: [
    { when: 'abs(error) < 0.000000001', level: 'info',
      text: 'Exact: {a} and {b} make {t}.' },
    { when: 'abs(error) > 0.01', level: 'warn',
      text: 'The best pair is still more than 1% off {t} — check the decade.' },
    { when: 'abs(otherError) < abs(error) - 0.000000001', level: 'info',
      text: 'The other topology gets closer to {t} — switch to compare.' },
  ],

  examples: [
    { given: { t: 4780, series: 'E24', topology: 'series' }, expect: {
      a: 4700, b: 82, value: 4782,
    } },
    { given: { t: 4780, series: 'E24', topology: 'parallel' }, expect: {
      a: 75000, b: 5100, value: 4775.2808988764045,
    } },
    { given: { t: 6800, series: 'E12', topology: 'series' }, expect: {
      a: 5600, b: 1200, error: 0,
    } },
    { given: { t: 2350, series: 'E24', topology: 'parallel' }, expect: {
      a: 4700, b: 4700, error: 0,
    } },
  ],
};
