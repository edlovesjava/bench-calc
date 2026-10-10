import type { VarMeta } from '../types';
import { SeriesPicker } from './SeriesPicker';

export interface FieldProps {
  name: string;
  meta: VarMeta;
  value: string;
  isTarget: boolean;
  computedDisplay?: string;
  error?: string;
  onChange: (name: string, value: string) => void;
}

export function Field({ name, meta, value, isTarget, computedDisplay, error, onChange }: FieldProps) {
  if (meta.kind === 'mode') {
    return (
      <label className="field input-field">
        <span className="field-label"><span>{meta.label}</span></span>
        <div className="input-wrap">
          <select
            aria-label={meta.label}
            value={value}
            onChange={(event) => onChange(name, event.target.value)}
          >
            {(meta.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </label>
    );
  }

  return (
    <label className={`field ${isTarget ? 'computed' : 'input-field'}`}>
      <span className="field-label">
        <span>{meta.label}</span>
        <span className="field-role">{isTarget ? 'Computed' : 'Input'}</span>
      </span>
      <div className="input-wrap">
        <input
          type="text"
          aria-label={meta.label}
          disabled={isTarget}
          value={isTarget ? (computedDisplay ?? '') : value}
          onChange={(event) => onChange(name, event.target.value)}
        />
        <span className="unit">{meta.unit}</span>
      </div>
      {error && <span className="field-error">{error}</span>}
      {!isTarget && meta.presets?.length ? (
        <select
          className="quick-entry"
          aria-label={`Quick ${meta.label} preset`}
          value=""
          onChange={(event) => {
            if (event.target.value) onChange(name, event.target.value);
          }}
        >
          <option value="">Quick entry</option>
          {meta.presets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label} ({preset.value} {meta.unit})
            </option>
          ))}
        </select>
      ) : null}
      {!isTarget && meta.series ? (
        <SeriesPicker unit={meta.unit} onPick={(picked) => onChange(name, String(picked))} />
      ) : null}
    </label>
  );
}
