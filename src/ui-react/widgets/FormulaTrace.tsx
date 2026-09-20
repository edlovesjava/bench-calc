import { eng } from '../engine';
import type { TraceStep } from '../types';

export interface FormulaTraceProps {
  trace: TraceStep[];
}

export function FormulaTrace({ trace }: FormulaTraceProps) {
  if (!trace.length) return null;
  return (
    <div className="derived-list">
      {trace.map((step, index) => (
        <div className="derived-item" key={index}>
          <span>{step.label}</span>
          <strong>{step.substituted} = {eng(step.value, step.unit)}</strong>
        </div>
      ))}
    </div>
  );
}
