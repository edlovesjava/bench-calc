import { eseries } from './definitions';
import { useCalculatorForm } from '../hooks/useCalculatorForm';
import { Field } from '../widgets/Field';
import { CheckList } from '../widgets/CheckList';
import { ResultGrid } from '../widgets/ResultGrid';
import { eng } from '../engine';

export function EseriesView() {
  const { values, setField, result } = useCalculatorForm(eseries);

  return (
    <section className="calculator" aria-label={eseries.title}>
      <header className="titlebar">
        <div>
          <div className="eyebrow">{eseries.group}</div>
          <h2>{eseries.title}</h2>
        </div>
        <p className="blurb">{eseries.blurb}</p>
      </header>

      <section className="panel">
        <div className="field-grid">
          {Object.entries(eseries.vars).map(([name, meta]) => (
            <Field
              key={name}
              name={name}
              meta={meta}
              value={values[name] ?? ''}
              isTarget={false}
              error={result.fieldErrors.find((e) => e.name === name)?.message}
              onChange={setField}
            />
          ))}
        </div>
      </section>

      <section className="panel result-panel">
        <CheckList checks={result.checks} />
        <ResultGrid values={result.values} vars={eseries.vars} />
        <div className="derived-list">
          {(eseries.outputs ?? []).map((item) => (
            <div className="derived-item" key={item.id}>
              <span>{item.label}</span>
              <strong>
                {Number.isFinite(result.derived[item.id])
                  ? eng(result.derived[item.id], item.unit)
                  : '—'}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
