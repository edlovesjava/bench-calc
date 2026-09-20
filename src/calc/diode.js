export default {
  id: 'diode',
  group: 'linear-supplies',
  title: 'Diode drop and dissipation',
  blurb: 'Voltage lost and heat made by a series diode, and what a Schottky ' +
         'would have saved.',

  vars: {
    Vbefore: { unit: 'V', label: 'Voltage before', default: '9' },
    Vf: { unit: 'V', label: 'Vf at this current', default: '0.8' },
    If: { unit: 'A', label: 'Current', default: '200m' },
    Irated: { unit: 'A', label: 'Part rating If(AV)', default: '1' },
    Vafter: { unit: 'V', label: 'Voltage after', default: '' },
  },

  relation: 'Vafter = Vbefore - Vf',
  solveFor: 'Vafter',

  closedForm: {
    Vafter: 'Vbefore - Vf',
    Vbefore: 'Vafter + Vf',
    Vf: 'Vbefore - Vafter',
  },

  derived: [
    { id: 'P', unit: 'W', expr: 'Vf * If', label: 'Power in the diode' },
    { id: 'frac', unit: '', expr: 'If / Irated', label: 'Fraction of rating' },
    { id: 'saved', unit: 'W', expr: '(Vf - 0.35) * If', label: 'What a Schottky would save' },
  ],

  checks: [
    { when: 'If > Irated', level: 'warn', text: '{If} is over the part rating {Irated}.' },
  ],

  symbols: {
    Vf: 'forward voltage at this current, not a fixed constant (V)',
    Irated: 'If(AV), the average forward current rating (A)',
  },
  datasheet: ['Vf @ If', 'If(AV) max'],

  examples: [
    { given: { Vbefore: 9, Vf: 0.8, If: 0.2 }, expect: { Vafter: 8.2, P: 0.16 } },
  ],
};
