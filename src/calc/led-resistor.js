export default {
  id: 'led-resistor',
  group: 'leds',
  title: 'LED series resistor',
  blurb: 'Choose the current, then set the resistor to hold it.',

  vars: {
    Vs: { unit: 'V', label: 'Supply rail', default: '5' },
    Vf: {
      unit: 'V',
      label: 'LED Vf',
      default: '2.0',
      presets: [
        { label: 'Red / yellow', value: '2.0' },
        { label: 'Green', value: '2.2' },
        { label: 'Blue / white', value: '3.2' },
        { label: 'Infrared', value: '1.2' },
      ],
    },
    If: { unit: 'A', label: 'Forward current', default: '3m' },
    R: { unit: 'ohm', label: 'Series resistor', default: '1k', series: true },
    dVfSpread: { unit: 'V', label: 'Assumed Vf spread', default: '100m' },
  },

  relation: 'R = (Vs - Vf) / If',
  solveFor: 'R',
  adjustments: [
    { id: 'standard-resistor', target: 'R', label: 'Adjust to nearest', modes: ['E12', 'E24'] },
  ],

  closedForm: {
    R: '(Vs - Vf) / If',
    If: '(Vs - Vf) / R',
    Vs: 'Vf + If * R',
    Vf: 'Vs - If * R',
  },

  derived: [
    { id: 'head', unit: 'V', expr: 'Vs - Vf', label: 'Headroom' },
    { id: 'Pr', unit: 'W', expr: 'If^2 * R', label: 'Power in the resistor' },
    { id: 'Pled', unit: 'W', expr: 'Vf * If', label: 'Power in the LED' },
    { id: 'sens', unit: '', expr: 'dVfSpread / head', label: 'Fractional current shift from the assumed Vf spread' },
  ],

  checks: [
    { when: 'head <= 0', level: 'fail',
      text: '{Vf} is at or above the rail ({Vs}); nothing lights.' },
    { when: 'If > 25m', level: 'warn', text: 'Well above the usual 20 mA design point.' },
    { when: 'head < 0.5', level: 'warn', text: 'Only {head} of headroom; current will move around.' },
  ],

  examples: [
    { given: { Vs: 5, Vf: 2.0, If: 0.003 }, expect: { R: 1000, Pr: 0.009, Pled: 0.006 } },
  ],
};
