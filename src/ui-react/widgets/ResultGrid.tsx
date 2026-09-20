import { eng } from '../engine';
import type { VarMeta } from '../types';

export interface ResultGridProps {
  values: Record<string, number | string>;
  vars: Record<string, VarMeta>;
}

export function ResultGrid({ values, vars }: ResultGridProps) {
  const rows = Object.entries(values).filter(([name]) => vars[name]?.kind !== 'mode');
  return (
    <div className="result-grid">
      {rows.map(([name, value]) => (
        <div className="result-row" key={name}>
          <span className="row-label">{name}</span>
          <span className="row-value">{eng(Number(value), vars[name]?.unit ?? '')}</span>
        </div>
      ))}
    </div>
  );
}
