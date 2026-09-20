import { useCallback, useMemo, useState } from 'react';
import { runDefinition } from '../engine';
import type { CalculatorDefinition, RunResult } from '../types';

function initialValues(definition: CalculatorDefinition): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, meta] of Object.entries(definition.vars)) {
    values[name] = meta.default ?? '';
  }
  return values;
}

export interface CalculatorForm {
  values: Record<string, string>;
  setField: (name: string, value: string) => void;
  target: string | undefined;
  setTarget: (name: string) => void;
  targetOptions: string[];
  result: RunResult;
}

export function useCalculatorForm(definition: CalculatorDefinition): CalculatorForm {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(definition));

  const targetOptions = useMemo(
    () => Object.keys(definition.closedForm ?? {}),
    [definition]
  );

  const [target, setTarget] = useState<string | undefined>(
    definition.solveFor ?? targetOptions[0]
  );

  const setField = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const result = useMemo(
    () => runDefinition(definition, values, { solveFor: target }),
    [definition, values, target]
  );

  return { values, setField, target, setTarget, targetOptions, result };
}
