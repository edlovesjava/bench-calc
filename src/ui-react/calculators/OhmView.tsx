import { ohm } from './definitions';
import { useCalculatorForm } from '../hooks/useCalculatorForm';
import { Field } from '../widgets/Field';
import { Headline } from '../widgets/Headline';
import { CheckList } from '../widgets/CheckList';
import { ResultGrid } from '../widgets/ResultGrid';
import { FormulaTrace } from '../widgets/FormulaTrace';
import { SeriesPicker } from '../widgets/SeriesPicker';
import { eng } from '../engine';

export function OhmView() {
  const { values, setField, target, setTarget, targetOptions, result } = useCalculatorForm(ohm);

  const targetMeta = target ? ohm.vars[target] : undefined;
  const targetValue = target ? result.values[target] : undefined;
  const computedDisplay =
    target && result.valid && typeof targetValue === 'number' && Number.isFinite(targetValue)
      ? eng(targetValue, targetMeta?.unit ?? '')
      : undefined;

  return (
    <section className="calculator" aria-label={ohm.title}>
      <header className="titlebar">
        <div>
          <div className="eyebrow">{ohm.group}</div>
          <h2>{ohm.title}</h2>
        </div>
        <p className="blurb">{ohm.blurb}</p>
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
                <option key={name} value={name}>{ohm.vars[name]?.label ?? name}</option>
              ))}
            </select>
            <span className="solve-hint">
              The highlighted field is computed. Enter values in the other fields.
            </span>
          </label>
        )}
        <div className="field-grid">
          {Object.entries(ohm.vars).map(([name, meta]) => (
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
        {target && targetMeta?.series && (
          <div className="adjustment">
            <span className="adjustment-label">Nearest standard value</span>
            <SeriesPicker unit={targetMeta.unit} onPick={() => {}} />
          </div>
        )}
        <CheckList checks={result.checks} />
        <ResultGrid values={result.values} vars={ohm.vars} />
      </section>

      <section className="panel formula-panel">
        <h3>Formula</h3>
        <FormulaTrace trace={result.trace} />
      </section>
    </section>
  );
}
