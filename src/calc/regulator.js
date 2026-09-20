export default {
  id: 'regulator',
  group: 'linear-supplies',
  title: 'Linear regulator heat',
  blurb: 'How much power a linear regulator has to burn off, and how hot that ' +
         'makes the junction — bare, and with a heatsink.',

  vars: {
    Vs: { unit: 'V', label: 'Supply in', default: '9' },
    Vd: { unit: 'V', label: 'Series diode drop', default: '0.8' },
    Vout: { unit: 'V', label: 'Regulated out', default: '5' },
    Iout: { unit: 'A', label: 'Load current', default: '200m' },
    Ta: { unit: 'degC', label: 'Ambient', default: '25' },
    Rja: { unit: 'degC/W', label: 'Rthja, bare part', default: '50' },
    Rjc: { unit: 'degC/W', label: 'Rthjc', default: '5' },
    Rsa: { unit: 'degC/W', label: 'Rcs + Rsa, with sink', default: '11' },
    Vdrop: { unit: 'V', label: 'Dropout', default: '2' },
    Tjmax: { unit: 'degC', label: 'Tj max', default: '125' },
    P: { unit: 'W', label: 'Dissipated power', default: '' },
  },

  relation: 'P = (Vs - Vd - Vout) * Iout',
  solveFor: 'P',

  closedForm: {
    P: '(Vs - Vd - Vout) * Iout',
  },

  derived: [
    { id: 'Vin', unit: 'V', expr: 'Vs - Vd', label: 'Input to the regulator' },
    { id: 'head', unit: 'V', expr: 'Vin - Vout', label: 'Headroom' },
    { id: 'Tj', unit: 'degC', expr: 'Ta + P * Rja', label: 'Junction temp, bare' },
    { id: 'Rsink', unit: 'degC/W', expr: 'Rjc + Rsa', label: 'Rthj-a with sink' },
    { id: 'Tjsink', unit: 'degC', expr: 'Ta + P * Rsink', label: 'Junction temp, with sink' },
    { id: 'Imax', unit: 'A', expr: '(Tjmax - Ta) / (Rja * head)', label: 'Max Iout before thermal shutdown, bare' },
    { id: 'effReg', unit: '', expr: 'Vout / Vin', label: 'Regulator efficiency' },
    { id: 'effBoard', unit: '', expr: 'Vout / Vs', label: 'Board efficiency' },
  ],

  checks: [
    { when: 'head < Vdrop', level: 'warn',
      text: 'Only {head} of headroom against a {Vdrop} dropout. The output will ' +
            'sag and follow the input, ripple and all.' },
    { when: 'Tj > Tjmax', level: 'warn',
      text: 'Junction at {Tj} is past {Tjmax} — thermal shutdown will cycle it.' },
    { when: 'Tj > Tjmax - 25', level: 'warn',
      text: 'Junction at {Tj} is within 25 °C of {Tjmax}; a warm day takes it over.' },
  ],

  symbols: {
    Vs: 'supply rail before any series diode (V)',
    Vd: 'drop across a series protection diode, 0 if none (V)',
    Rja: 'Rthja for the bare part in free air (°C/W)',
  },
  datasheet: ['Rthja', 'Rthjc', 'Vdropout', 'Tj max (usually 125 °C)'],

  examples: [
    {
      given: { Vs: 9, Vd: 0.8, Vout: 5, Iout: 0.2, Ta: 25, Rja: 50 },
      expect: { Vin: 8.2, head: 3.2, P: 0.64, Tj: 57 },
    },
    {
      given: { Vs: 9, Vd: 0.8, Vout: 5, Iout: 0.5, Ta: 25, Rja: 50, Rjc: 5, Rsa: 11 },
      expect: { P: 1.6, Tj: 105, Tjsink: 50.6 },
    },
  ],
};
