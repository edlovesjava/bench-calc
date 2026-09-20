// The only file in src/ui-react allowed to import the plain-JS engine
// directly. Every other file in this tree imports from here and gets real
// types. See CLAUDE.md invariant 3.

// @ts-expect-error - src/engine/formula.js is plain JS, typed by the wrapper below
import { runDefinition as runDefinitionJs } from '../engine/formula.js';
// @ts-expect-error - plain JS
import { eng as engJs } from '../engine/format.js';
// @ts-expect-error - plain JS
import { nearestSeries as nearestSeriesJs, seriesValues as seriesValuesJs, seriesNames as seriesNamesJs } from '../engine/eseries.js';

import type { CalculatorDefinition, RunResult } from './types';

export function runDefinition(
  definition: CalculatorDefinition,
  input: Record<string, string | number> = {},
  options: { solveFor?: string } = {}
): RunResult {
  return runDefinitionJs(definition, input, options);
}

export function eng(value: number, unit = '', sigFigs = 3): string {
  return engJs(value, unit, sigFigs);
}

export function nearestSeries(value: number, series = 'E24'): number {
  return nearestSeriesJs(value, series);
}

export function seriesValues(series = 'E24', min = 1, max = 1e6): number[] {
  return seriesValuesJs(series, min, max);
}

export const seriesNames: readonly string[] = seriesNamesJs;
