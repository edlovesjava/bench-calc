import { useState } from 'react';
import { ledResistor } from './definitions';
import { useCalculatorForm } from '../hooks/useCalculatorForm';
import { Field } from '../widgets/Field';
import { Headline } from '../widgets/Headline';
import { CheckList } from '../widgets/CheckList';
import { ResultGrid } from '../widgets/ResultGrid';
import { FormulaTrace } from '../widgets/FormulaTrace';
import { SeriesPicker } from '../widgets/SeriesPicker';
import { eng, nearestSeries } from '../engine';

export function LedResistorView() {
  const { values, setField, target, setTarget, targetOptions, result } = useCalculatorForm(ledResistor);
  const [pickedValue, setPickedValue] = useState<number | undefined>(undefined);

  const targetMeta = target ? ledResistor.vars[target] : undefined;
  const targetValue = target ? result.values[target] : undefined;
  const computedDisplay =
    target && result.valid && typeof targetValue === 'number' && Number.isFinite(targetValue)
      ? eng(targetValue, targetMeta?.unit ?? '')
      : undefined;
  const adjustment = target ? ledResistor.adjustments?.find((item) => item.target === target) : undefined;
  const nearestValue =
    typeof targetValue === 'number' && Number.isFinite(targetValue)
      ? nearestSeries(targetValue, 'E24')
      : undefined;
  const practicalValue = pickedValue ?? nearestValue;

  return (
    <section className="calculator" aria-label={ledResistor.title}>
      <header className="titlebar">
        <div>
          <div className="eyebrow">{ledResistor.group}</div>
          <h2>{ledResistor.title}</h2>
        </div>
        <p className="blurb">{ledResistor.blurb}</p>
      </header>

      <section className="panel">
        {targetOptions.length > 0 && (
          <label className="solve-for">
            <span className="field-label">Solve for</span>
            <select
              aria-label="Solve for"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              {targetOptions.map((name) => (
                <option key={name} value={name}>{ledResistor.vars[name]?.label ?? name}</option>
              ))}
            </select>
            <span className="solve-hint">
              The highlighted field is computed. Enter values in the other fields.
            </span>
          </label>
        )}
        <div className="field-grid">
          {Object.entries(ledResistor.vars).map(([name, meta]) => (
            <Field
              key={name}
              name={name}
              meta={meta}
              value={values[name] ?? ''}
              isTarget={name === target}
              computedDisplay={name === target ? computedDisplay : undefined}
              error={result.fieldErrors.find((e) => e.name === name)?.message}
              onChange={setField}
            />
          ))}
        </div>
      </section>

      <section className="panel result-panel">
        {target && <Headline label={target} value={computedDisplay ?? '—'} />}
        {adjustment && (
          <div className="adjustment">
            <span className="adjustment-label">{adjustment.label}</span>
            <SeriesPicker unit={targetMeta?.unit ?? ''} onPick={setPickedValue} />
            {practicalValue !== undefined && (
              <span className="adjustment-value">{eng(practicalValue, targetMeta?.unit ?? '')}</span>
            )}
          </div>
        )}
        <CheckList checks={result.checks} />
        <ResultGrid values={result.values} vars={ledResistor.vars} />
      </section>

      <section className="panel formula-panel">
        <h3>Formula</h3>
        <FormulaTrace trace={result.trace} />
      </section>
    </section>
  );
}
