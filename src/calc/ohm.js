export default {
  id: 'ohm',
  group: 'resistors',
  title: 'Ohm\'s law and power',
  blurb: 'Basic resistor math with voltage, current, resistance, and rating.',

  vars: {
    V: { unit: 'V', label: 'V (across R)', default: '5' },
    I: { unit: 'A', label: 'I (through R)', default: '50m' },
    R: { unit: 'ohm', label: 'R', default: '100' },
    Prated: { unit: 'W', label: 'Part rating', default: '0.25' },
  },

  relation: 'V = I * R',
  solveFor: 'V',

  closedForm: {
    V: 'I * R',
    I: 'V / R',
    R: 'V / I',
  },

  derived: [
    { id: 'P', unit: 'W', expr: 'V * I', label: 'Power' },
    { id: 'frac', unit: '', expr: 'P / Prated', label: 'Fraction of rating' },
  ],

  checks: [
    { when: 'P > Prated', level: 'warn', text: 'Over the part rating; it will run hot.' },
    { when: 'P > Prated / 2', level: 'warn', text: 'Running hot enough to drift.' },
  ],

  examples: [
    { given: { V: 5, R: 100 }, expect: { I: 0.05, P: 0.25 } },
  ],
};
