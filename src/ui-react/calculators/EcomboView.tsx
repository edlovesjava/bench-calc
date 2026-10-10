import { ecombo } from './definitions';
import { useCalculatorForm } from '../hooks/useCalculatorForm';
import { Field } from '../widgets/Field';
import { CheckList } from '../widgets/CheckList';
import { ResultGrid } from '../widgets/ResultGrid';
import { ResistorDiagram } from '../widgets/ResistorDiagram';
import { eng } from '../engine';

export function EcomboView() {
  const { values, setField, result } = useCalculatorForm(ecombo);

  return (
    <section className="calculator" aria-label={ecombo.title}>
      <header className="titlebar">
        <div>
          <div className="eyebrow">{ecombo.group}</div>
          <h2>{ecombo.title}</h2>
        </div>
        <p className="blurb">{ecombo.blurb}</p>
      </header>

      <section className="panel">
        <div className="field-grid">
          {Object.entries(ecombo.vars).map(([name, meta]) => (
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
        <ResultGrid values={result.values} vars={ecombo.vars} />
        <div className="derived-list">
          {(ecombo.outputs ?? []).map((item) => (
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
        <ResistorDiagram diagram={result.diagram} />
      </section>
    </section>
  );
}
