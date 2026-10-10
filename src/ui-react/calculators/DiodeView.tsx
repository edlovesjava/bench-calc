import { diode } from './definitions';
import { useCalculatorForm } from '../hooks/useCalculatorForm';
import { Field } from '../widgets/Field';
import { Headline } from '../widgets/Headline';
import { CheckList } from '../widgets/CheckList';
import { ResultGrid } from '../widgets/ResultGrid';
import { FormulaTrace } from '../widgets/FormulaTrace';
import { eng } from '../engine';

export function DiodeView() {
  const { values, setField, target, setTarget, targetOptions, result } = useCalculatorForm(diode);

  const targetMeta = target ? diode.vars[target] : undefined;
  const targetValue = target ? result.values[target] : undefined;
  const computedDisplay =
    target && result.valid && typeof targetValue === 'number' && Number.isFinite(targetValue)
      ? eng(targetValue, targetMeta?.unit ?? '')
      : undefined;

  return (
    <section className="calculator" aria-label={diode.title}>
      <header className="titlebar">
        <div>
          <div className="eyebrow">{diode.group}</div>
          <h2>{diode.title}</h2>
        </div>
        <p className="blurb">{diode.blurb}</p>
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
                <option key={name} value={name}>{diode.vars[name]?.label ?? name}</option>
              ))}
            </select>
            <span className="solve-hint">
              The highlighted field is computed. Enter values in the other fields.
            </span>
          </label>
        )}
        <div className="field-grid">
          {Object.entries(diode.vars).map(([name, meta]) => (
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
        <CheckList checks={result.checks} />
        <ResultGrid values={result.values} vars={diode.vars} />
      </section>

      <section className="panel formula-panel">
        <h3>Formula</h3>
        <FormulaTrace trace={result.trace} />
      </section>
    </section>
  );
}
