export default {
  id: 'divider',
  group: 'resistors',
  title: 'Voltage divider and loading',
  blurb: 'A resistor divider with optional load resistance.',

  vars: {
    Vin: { unit: 'V', label: 'Vin', default: '5' },
    Vout: { unit: 'V', label: 'Vout', default: '' },
    R1: { unit: 'ohm', label: 'R1 (top)', default: '10k', series: true },
    R2: { unit: 'ohm', label: 'R2 (bottom)', default: '10k', series: true },
    RL: { unit: 'ohm', label: 'Load resistance', default: '', series: true },
  },

  relation: 'Vout = Vin * R2 / (R1 + R2)',
  solveFor: 'Vout',

  closedForm: {
    Vout: 'Vin * R2 / (R1 + R2)',
    Vin: 'Vout * (R1 + R2) / R2',
    R2: 'Vout * R1 / (Vin - Vout)',
    R1: 'R2 * (Vin / Vout - 1)',
  },

  derived: [
    { id: 'Rsource', unit: 'ohm', expr: 'R1 * R2 / (R1 + R2)', label: 'Thevenin resistance' },
    { id: 'Idiv', unit: 'A', expr: 'Vin / (R1 + R2)', label: 'Divider current' },
  ],

  checks: [
    { when: 'RL < 10 * Rsource', level: 'warn', text: 'The load is now part of the divider.' },
  ],

  examples: [
    { given: { Vin: 5, R1: 10000, R2: 10000 }, expect: { Vout: 2.5, Rsource: 5000, Idiv: 0.00025 } },
  ],
};
