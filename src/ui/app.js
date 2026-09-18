/**
 * Phase 1 shell.
 *
 * There is no calculator here yet, and deliberately so: the only thing built
 * is the units layer, so the only thing on screen is the units layer. It is a
 * smoke test you can actually use — type what you would type into a field and
 * see exactly what the engine made of it, including the failures.
 *
 * Phase 6 replaces this file with the real app.
 */

import { parse, scan, dimOf, dimString, isUnit, UNITS } from '../engine/units.js';
import { eng, DASH } from '../engine/format.js';

const UNIT_KEYS = Object.keys(UNITS).filter((k) => k !== '');

const app = document.getElementById('app');

app.innerHTML = `
  <div class="wrap">
    <header>
      <div class="eyebrow">Ed's bench &middot; phase 1</div>
      <h1>Bench Calculators</h1>
      <p class="lede">
        The engine's units layer, wired to an input so you can prod it. Type a value
        the way you would at the bench and see what the parser makes of it.
      </p>
    </header>

    <section class="card">
      <h2>Parse and format</h2>
      <div class="row">
        <div class="field">
          <label for="v">Value</label>
          <input id="v" type="text" inputmode="decimal" autocomplete="off" value="4k7">
        </div>
        <div class="field" style="flex: 0 0 160px">
          <label for="u">Unit of the field</label>
          <select id="u">
            ${UNIT_KEYS.map((k) => `<option value="${k}">${k}</option>`).join('')}
          </select>
        </div>
      </div>
      <dl class="out" id="out"></dl>
      <p class="hint">
        Try <code>4k7</code>, <code>100n</code>, <code>50 mA</code>, <code>2R2</code>,
        <code>1e-6</code>, <code>1M</code> against <code>1m</code>, and something
        that is not a number at all.
      </p>
    </section>
  </div>
`;

const valueEl = document.getElementById('v');
const unitEl = document.getElementById('u');
const outEl = document.getElementById('out');

unitEl.value = 'ohm';

function render() {
  const text = valueEl.value;
  const unit = unitEl.value;
  const scanned = scan(text);
  const value = parse(text);
  const ok = Number.isFinite(value);

  const rows = [
    ['input', JSON.stringify(text)],
    ['parsed (SI)', ok ? String(value) : `<span class="bad">NaN &mdash; not a number</span>`],
    ['unit found in the text', scanned && scanned.unit ? scanned.unit : DASH],
    ['dimension', isUnit(unit) ? dimString(dimOf(unit)) : DASH],
  ];

  outEl.innerHTML = `
    <dt>formatted</dt><dd class="big">${ok ? eng(value, unit) : DASH}</dd>
    ${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}
  `;
}

valueEl.addEventListener('input', render);
unitEl.addEventListener('change', render);
render();
