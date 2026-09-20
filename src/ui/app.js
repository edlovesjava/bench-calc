/**
 * Generic calculator UI.
 *
 * This is intentionally thin: the engine is the source of truth, and the UI just
 * renders calculator definitions so we can demo the phase 4 work while the
 * tests keep the equations honest.
 */

import { calculators } from '../calc/index.js';
import { runDefinition } from '../engine/formula.js';
import { eng } from '../engine/format.js';
import { nearestSeries, seriesValues } from '../engine/eseries.js';

const app = document.getElementById('app');
const state = {
  selectedId: calculators[0]?.id ?? 'ohm',
  targets: {},
  adjustments: {},
  seriesModes: {},
  values: {},
};

function currentCalculator() {
  return calculators.find((calc) => calc.id === state.selectedId) ?? calculators[0];
}

function render() {
  const activeField = document.activeElement?.dataset?.field;
  const selectionStart = document.activeElement?.selectionStart;
  const selectionEnd = document.activeElement?.selectionEnd;
  const calc = currentCalculator();
  const safeValues = state.values[calc.id] ?? {};
  const targetOptions = Object.keys(calc.closedForm ?? {});
  const target = state.targets[calc.id] ?? calc.solveFor ?? targetOptions[0];
  const values = Object.fromEntries(
    Object.entries(calc.vars).map(([name, meta]) => {
      const current = Object.hasOwn(safeValues, name) ? safeValues[name] : (meta.default ?? '');
      return [name, current];
    })
  );

  const result = runDefinition(calc, values, { solveFor: target });
  const targetValue = result.values[target];
  const adjustment = calc.adjustments?.find((item) => item.target === target)
    ?? (calc.vars[target]?.unit === 'ohm'
      ? { id: `standard-${target}`, target, label: 'Adjust to nearest', modes: ['E12', 'E24'] }
      : null);
  const adjustmentState = state.adjustments[calc.id]?.[adjustment?.id] ?? {};
  const adjustmentMode = adjustmentState.mode ?? adjustment?.modes?.[1];
  const adjustedValue = adjustment && Number.isFinite(targetValue)
    ? nearestSeries(targetValue, adjustmentMode)
    : NaN;
  const practicalValue = adjustmentState.value ?? adjustedValue;
  const practicalDisplay = Number.isFinite(practicalValue)
    ? eng(practicalValue, calc.vars[target]?.unit ?? '')
    : practicalValue;

  state.values[calc.id] = values;

  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="eyebrow">Ed's bench</div>
          <h1>Bench Calculators</h1>
        </div>
        <div class="calculator-list">
          ${calculators.map((item) => `
            <button
              type="button"
              class="calc-button ${item.id === calc.id ? 'active' : ''}"
              data-id="${item.id}"
            >
              ${item.title}
            </button>
          `).join('')}
        </div>
      </aside>

      <main class="main">
        <header class="titlebar">
          <div>
            <div class="eyebrow">${calc.group}</div>
            <h2>${calc.title}</h2>
          </div>
          <p class="blurb">${calc.blurb}</p>
        </header>

        <section class="panel">
          ${targetOptions.length > 0 ? `
            <label class="solve-for">
              <span class="field-label">Solve for</span>
              <select data-target aria-label="Solve for">
                ${targetOptions.map((name) => `<option value="${name}" ${name === target ? 'selected' : ''}>${calc.vars[name]?.label ?? name}</option>`).join('')}
              </select>
              <span class="solve-hint">The highlighted field is computed. Enter values in the other fields.</span>
            </label>
          ` : ''}
          <div class="field-grid">
            ${Object.entries(calc.vars).map(([name, meta]) => `
              <label class="field ${name === target ? 'computed' : 'input-field'}">
                <span class="field-label">
                  <span>${meta.label}</span>
                  <span class="field-role">${name === target ? 'Computed' : 'Input'}</span>
                </span>
                <div class="input-wrap">
                  <input
                    type="text"
                    data-field="${name}"
                    value="${name === target && Number.isFinite(targetValue) ? eng(targetValue, meta.unit) : (values[name] ?? '')}"
                    ${name === target ? 'disabled' : ''}
                    aria-label="${meta.label}"
                  >
                  <span class="unit">${meta.unit}</span>
                </div>
                ${name !== target && meta.presets?.length ? `
                  <select class="quick-entry" data-preset-field="${name}" aria-label="Quick ${meta.label} preset">
                    <option value="">Quick entry</option>
                    ${meta.presets.map((preset) => `<option value="${preset.value}" ${String(values[name]) === String(preset.value) ? 'selected' : ''}>${preset.label} (${preset.value} ${meta.unit})</option>`).join('')}
                  </select>
                ` : ''}
                ${name !== target && meta.unit === 'ohm' ? `
                  <select class="quick-entry" data-series-mode="${name}" aria-label="Choose ${meta.label} series">
                    <option value="E12" ${(state.seriesModes[calc.id]?.[name] ?? 'E24') === 'E12' ? 'selected' : ''}>E12 values</option>
                    <option value="E24" ${(state.seriesModes[calc.id]?.[name] ?? 'E24') === 'E24' ? 'selected' : ''}>E24 values</option>
                  </select>
                  <select class="quick-entry" data-series-value="${name}" aria-label="Choose ${meta.label} standard value">
                    <option value="">Choose standard value</option>
                    ${seriesValues(state.seriesModes[calc.id]?.[name] ?? 'E24').map((value) => `<option value="${value}" ${String(values[name]) === String(value) ? 'selected' : ''}>${eng(value, meta.unit)}</option>`).join('')}
                  </select>
                ` : ''}
              </label>
            `).join('')}
          </div>
        </section>

        <section class="panel result-panel">
          <div class="headline">
            <div class="headline-label">${target}</div>
            <div class="headline-value">${Number.isFinite(targetValue) ? eng(targetValue, calc.vars[target]?.unit ?? '') : '—'}</div>
          </div>
          ${adjustment ? `
            <div class="adjustment">
              <label class="adjustment-label" for="adjustment-${adjustment.id}">${adjustment.label}</label>
              <select id="adjustment-${adjustment.id}" data-adjustment="${adjustment.id}" aria-label="${adjustment.label}">
                ${adjustment.modes.map((mode) => `<option value="${mode}" ${mode === adjustmentMode ? 'selected' : ''}>${mode}</option>`).join('')}
              </select>
              <input class="adjustment-value" type="text" data-adjustment-value="${adjustment.id}" value="${practicalDisplay ?? ''}" aria-label="Practical ${calc.vars[target]?.label ?? target}">
              <span class="unit">${calc.vars[target]?.unit ?? ''}</span>
            </div>
          ` : ''}
          ${result.checks.length ? `
            <div class="check-list">
              ${result.checks.map((check) => `<div class="check ${check.level}">${check.text}</div>`).join('')}
            </div>
          ` : ''}

          <div class="result-grid">
            ${Object.entries(result.values).map(([name, value]) => `
              <div class="result-row">
                <span class="row-label">${name}</span>
                <span class="row-value">${eng(value, calc.vars[name]?.unit ?? '')}</span>
              </div>
            `).join('')}
          </div>
        </section>

        <section class="panel formula-panel">
          <h3>Formula</h3>
          <div class="formula">${calc.relation}</div>
          <div class="derived-list">
            ${(calc.derived ?? []).map((item) => `
              <div class="derived-item">
                <span>${item.label}</span>
                <strong>${Number.isFinite(result.derived[item.id]) ? eng(result.derived[item.id], item.unit) : '—'}</strong>
              </div>
            `).join('')}
          </div>
        </section>
      </main>
    </div>
  `;

  app.querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedId = button.dataset.id;
      render();
    });
  });

  app.querySelector('[data-target]')?.addEventListener('change', (event) => {
    state.targets[calc.id] = event.target.value;
    render();
  });

  app.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { field } = event.target.dataset;
      const current = state.values[calc.id] ?? {};
      current[field] = event.target.value;
      state.values[calc.id] = current;
      render();
    });
  });

  app.querySelectorAll('[data-preset-field]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const { presetField } = event.target.dataset;
      if (event.target.value) {
        const current = state.values[calc.id] ?? {};
        current[presetField] = event.target.value;
        state.values[calc.id] = current;
        render();
      }
    });
  });

  app.querySelectorAll('[data-series-mode]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const { seriesMode } = event.target.dataset;
      const current = state.seriesModes[calc.id] ?? {};
      current[seriesMode] = event.target.value;
      state.seriesModes[calc.id] = current;
      render();
    });
  });

  app.querySelectorAll('[data-series-value]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const { seriesValue } = event.target.dataset;
      if (event.target.value) {
        const current = state.values[calc.id] ?? {};
        current[seriesValue] = event.target.value;
        state.values[calc.id] = current;
        render();
      }
    });
  });

  app.querySelectorAll('[data-adjustment]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const { adjustment: adjustmentId } = event.target.dataset;
      const current = state.adjustments[calc.id] ?? {};
      current[adjustmentId] = {
        mode: event.target.value,
        value: nearestSeries(targetValue, event.target.value),
      };
      state.adjustments[calc.id] = current;
      render();
    });
  });

  app.querySelectorAll('[data-adjustment-value]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { adjustmentValue: adjustmentId } = event.target.dataset;
      const current = state.adjustments[calc.id] ?? {};
      current[adjustmentId] = {
        ...(current[adjustmentId] ?? {}),
        value: event.target.value,
      };
      state.adjustments[calc.id] = current;
    });
  });

  if (activeField) {
    const input = app.querySelector(`[data-field="${activeField}"]`);
    if (input && !input.disabled) {
      input.focus();
      const end = selectionEnd ?? input.value.length;
      const start = selectionStart ?? end;
      input.setSelectionRange(start, end);
    }
  }
}

render();
