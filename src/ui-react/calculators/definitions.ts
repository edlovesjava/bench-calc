// The only file allowed to import src/calc/*.js directly. Everything else
// in src/ui-react imports a calculator's definition from here.

import type { CalculatorDefinition } from '../types';

// @ts-expect-error - plain JS data module
import ohmRaw from '../../calc/ohm.js';
// @ts-expect-error
import ledResistorRaw from '../../calc/led-resistor.js';
// @ts-expect-error
import dividerRaw from '../../calc/divider.js';
// @ts-expect-error
import regulatorRaw from '../../calc/regulator.js';
// @ts-expect-error
import diodeRaw from '../../calc/diode.js';
// @ts-expect-error
import eseriesRaw from '../../calc/eseries.js';

export const ohm = ohmRaw as CalculatorDefinition;
export const ledResistor = ledResistorRaw as CalculatorDefinition;
export const divider = dividerRaw as CalculatorDefinition;
export const regulator = regulatorRaw as CalculatorDefinition;
export const diode = diodeRaw as CalculatorDefinition;
export const eseries = eseriesRaw as CalculatorDefinition;

export const calculators: CalculatorDefinition[] = [
  ohm, ledResistor, divider, regulator, diode, eseries,
];
