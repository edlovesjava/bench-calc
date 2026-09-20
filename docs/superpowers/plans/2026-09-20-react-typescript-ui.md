# React + TypeScript UI Rearchitecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/ui/app.js` (one hand-rolled, string-templated render function) with a React + TypeScript UI, served by a build step (Vite), with one hand-authored component per calculator and a shared library of common widgets.

**Architecture:** `src/engine/` and `src/calc/` are untouched — they stay plain, framework-free `.js`, still tested by `npm test` (`node --test`, no install). All new code lives under `src/ui-react/`. A single facade module (`src/ui-react/engine.ts`) is the only file that imports the untyped engine `.js` directly; every other TypeScript file gets fully-typed bindings from it. Each calculator gets its own component under `src/ui-react/calculators/`, composed from a shared widget library under `src/ui-react/widgets/`. Every component calls the engine's `runDefinition` for every number it displays — a component may choose layout, it may never compute.

**Tech Stack:** Vite, React 18, TypeScript, Vitest + @testing-library/react for the new UI layer.

**Spec:** This plan *is* the spec — it was scoped directly with the project owner (component granularity: one component per calculator; build tool: Vite; CLAUDE.md invariant 3 rewritten explicitly as the first task). See `CLAUDE.md` and `PLAN.md` at the repo root for the existing architecture this plan builds on top of, and `docs/formulas.md` for the six calculators being ported.

## Global Constraints

- `src/engine/**` and `src/calc/**` are not modified by this plan. They stay plain ES modules, zero dependencies, tested by `node --test`. If a task in this plan finds itself wanting to edit a file under those two directories, stop — that's a sign the plan's boundary is wrong, not that the boundary should move.
- `npm test` (the existing `node --test` suite, currently 53 tests) must stay green throughout. It is never touched by this plan except to keep running.
- Every calculator component must render *only* from the object `runDefinition()` returns (`values`, `derived`, `checks`, `trace`, `fieldErrors`, `valid`) or from the calculator definition's own declared metadata (`vars`, `outputs`, `title`, `blurb`, ...). No component may compute a displayed number itself (e.g. `value * 2` inline in JSX). This is the same rule CLAUDE.md invariant 2 exists to enforce, now extended to the UI layer.
- No calculator-specific `if (id === 'ohm')` branching anywhere in shared widget code. A widget takes `VarMeta`/`RunResult` shapes and renders generically; a calculator-specific choice belongs in that calculator's own `*View.tsx`.
- TypeScript strict mode is on (`"strict": true`). No `any` outside the two facade files (`src/ui-react/engine.ts`, `src/ui-react/calculators/definitions.ts`) that cross the untyped-JS boundary, and even there the `any` is contained to the `@ts-expect-error` import line, not exported.

---

## Task 0: Rewrite CLAUDE.md invariant 3 to describe the new reality

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** None — this is a documentation-only task, done first so the repo's own source of truth never lies about what's true, even mid-migration.

- [ ] **Step 1: Replace invariant 3**

Find this in `CLAUDE.md`'s Invariants list:

```markdown
3. **Zero runtime dependencies. No build step.** Plain ES modules in the
   browser, plain ES modules under `node --test`. No bundler, no transpiler, no
   framework, no CDN script tags. `package.json` has no `dependencies` and no
   `devDependencies`, and it stays that way. If a task seems to need one, say so
   and stop rather than adding it.
```

Replace it with:

```markdown
3. **The engine and the calculator definitions stay dependency-free.**
   `src/engine/**` and `src/calc/**` are plain ES modules, zero dependencies,
   tested by `node --test` with no install step — that has not changed.

   The UI layer (`src/ui-react/**`) is React + TypeScript, built with Vite.
   `package.json` has `react`/`react-dom` as runtime dependencies and
   `vite`/`typescript`/`vitest`/testing tooling as devDependencies, and that is
   accepted, not a violation to route around. What is still not allowed: a
   dependency inside `src/engine/` or `src/calc/`, or a build step for the
   test suite that exercises them. `npm test` stays `node --test`, no install,
   no build. `npm run dev` / `npm run build` now go through Vite for the UI.

   If a task wants a dependency *inside* the engine or calc layers, that is
   still a stop-and-say-so situation. A dependency for the UI layer is a
   normal, expected decision — just don't add one without a reason.
```

- [ ] **Step 2: Update the "Where things are" file tree**

Find the file tree in `CLAUDE.md` (`src/ui/` line) and change:

```
src/ui/        rendering; knows nothing about any specific calculator
```

to:

```
src/ui-react/  React + TypeScript UI: one component per calculator, plus a
               shared widget library. Every number it shows comes from
               src/engine/ via src/ui-react/engine.ts — it never computes one.
```

Also update the sentence right after the tree:

```markdown
`src/ui/` must never import from `src/calc/`. The UI renders whatever the
formula runner hands it. If the UI needs to special-case a calculator, the
definition format is missing something — fix the format.
```

to:

```markdown
`src/ui-react/widgets/` must never import a specific calculator's id or
special-case its shape — a widget takes `VarMeta`/`RunResult`, not a
calculator id. `src/ui-react/calculators/*View.tsx` *is* allowed to be
calculator-specific (that's the point of one component per calculator), but
every number it renders must come from `runDefinition()`'s return value or
the definition's own declared metadata, never a value computed in JSX. If a
view finds itself needing arithmetic the engine doesn't already hand it, the
definition format is missing something — fix `src/calc/<id>.js`, not the view.
```

- [ ] **Step 3: Update the Commands section**

```sh
npm test         # node --test, no install
npm run dev      # http://localhost:8080 (ES modules need an http origin)
```

becomes:

```sh
npm test         # node --test, no install — exercises src/engine and src/calc only
npm run dev      # vite dev server for the React UI
npm run build    # vite build — production bundle for the React UI
npm run test:ui  # vitest run — component tests for src/ui-react
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe the React+TS UI layer in CLAUDE.md invariant 3"
```

---

## Task 1: Scaffold the build tooling

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Modify: `index.html`
- Modify: `.gitignore`
- Delete: `tools/serve.js` (superseded by `vite`)

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run preview`, `npm test` (unchanged), `npm run test:ui` — every later task assumes these five scripts exist with these exact names.

- [ ] **Step 1: Install dependencies**

```bash
npm install --save react react-dom
npm install --save-dev vite @vitejs/plugin-react typescript \
  @types/react @types/react-dom \
  vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "bench-calc",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "description": "Offline-first bench calculators for electronics. Engine and calculator definitions are dependency-free; the UI is React + TypeScript, built with Vite.",
  "scripts": {
    "test": "node --test \"test/**/*.test.js\"",
    "test:ui": "vitest run",
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

(Exact version numbers: use whatever `npm install` resolved in Step 1 — the above are floors, not pins. Do not hand-edit version numbers after `npm install` has already written them.)

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowJs": false
  },
  "include": ["src/ui-react"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`allowJs: false` is deliberate: TypeScript files under `src/ui-react` never import a `.js` file directly except through the two facade files, which suppress the check per-import with `@ts-expect-error` rather than by loosening this globally.

- [ ] **Step 4: Write `tsconfig.node.json`** (for `vite.config.ts` itself)

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

No `noEmit` here, even though this project's only job is to type-check
`vite.config.ts`, never to actually produce JS: TypeScript forbids a
*referenced* project (`tsconfig.json`'s `"references"` points at this file)
from disabling emit — `tsc --noEmit -p tsconfig.json` fails with `TS6310:
Referenced project ... may not disable emit` if you add it. Without
`noEmit`, `tsc -b` (invoked by the `build` npm script) emits
`vite.config.js`/`vite.config.d.ts` into the repo root on every build, and
`composite: true` also always writes a `.tsbuildinfo` cache file regardless
of `noEmit`. All three are handled in `.gitignore` (Step 7) instead of
suppressed at the compiler level.

- [ ] **Step 5: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: { port: 8080 },
});
```

Port 8080 matches the old `tools/serve.js` default, so any bookmark/muscle memory still works.

- [ ] **Step 6: Update `index.html`**

Change the entry script tag from:

```html
<script type="module" src="src/ui/app.js"></script>
```

to:

```html
<script type="module" src="/src/ui-react/main.tsx"></script>
```

Leave everything else in `index.html` (fonts, `#app` div, viewport meta) as-is — Vite serves `index.html` from the project root exactly like the old `tools/serve.js` did, so no other change is needed here.

- [ ] **Step 7: Update `.gitignore`**

Add, if not already present:

```
node_modules/
dist/
*.tsbuildinfo
/vite.config.js
/vite.config.d.ts
```

The last three entries are the build-byproduct paths `tsconfig.node.json`'s
Step 4 note explains — `tsc -b` produces them on every `npm run build`, and
none of them are meant to be tracked.

- [ ] **Step 8: Delete the old dev server**

```bash
git rm tools/serve.js
```

(`tools/precache.sh`, if it exists yet, is unrelated — PWA precache-list generation — and is untouched.)

- [ ] **Step 9: Verify the scaffold boots**

```bash
npm run dev
```

Expected: Vite prints a local URL (e.g. `http://localhost:8080/`). It's fine that the page is blank or errors right now — `src/ui-react/main.tsx` doesn't exist yet. Stop the dev server (Ctrl-C) once you've confirmed it starts without a config error.

```bash
npm test
```

Expected: still 53 passing — this task must not touch `src/engine`, `src/calc`, or `test/`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html .gitignore
git rm tools/serve.js
git commit -m "build: scaffold Vite + TypeScript + Vitest for the UI layer"
```

---

## Task 2: Type boundary — `types.ts` and the two facade modules

**Files:**
- Create: `src/ui-react/types.ts`
- Create: `src/ui-react/engine.ts`
- Create: `src/ui-react/calculators/definitions.ts`

**Interfaces:**
- Produces: `CalculatorDefinition`, `VarMeta`, `DerivedItem`, `OutputItem`, `CheckDefinition`, `TriggeredCheck`, `TraceStep`, `FieldError`, `RunResult` (all from `./types`) — every later task imports these, never redefines them.
- Produces: `runDefinition`, `eng`, `nearestSeries`, `seriesValues`, `seriesNames` (all from `./engine`) — the only place any later TS file is allowed to reach the plain-JS engine.
- Produces: `ohm`, `ledResistor`, `divider`, `regulator`, `diode`, `eseries` (all from `./calculators/definitions`, each typed as `CalculatorDefinition`) — every calculator view imports its definition from here, never from `../../calc/*.js` directly.

- [ ] **Step 1: Write `src/ui-react/types.ts`**

```ts
export type Unit = string;

export interface VarMeta {
  unit: Unit;
  label: string;
  default?: string;
  domain?: [number, number];
  series?: boolean;
  presets?: { label: string; value: string }[];
  kind?: 'mode';
  options?: string[];
}

export interface DerivedItem {
  id: string;
  unit: Unit;
  expr: string;
  label: string;
}

export interface OutputItem {
  id: string;
  unit: Unit;
  label: string;
}

export interface CheckDefinition {
  when: string;
  level: 'warn' | 'fail';
  text: string;
}

export interface TriggeredCheck extends CheckDefinition {
  triggered: true;
}

export interface TraceStep {
  label: string;
  expr: string;
  substituted: string;
  value: number;
  unit: Unit;
}

export interface FieldError {
  name: string;
  message: string;
}

export interface Adjustment {
  id: string;
  target: string;
  label: string;
  modes: string[];
}

export interface CalculatorDefinition {
  id: string;
  kind?: 'procedure';
  group: string;
  title: string;
  blurb: string;
  vars: Record<string, VarMeta>;
  relation?: string;
  solveFor?: string;
  closedForm?: Record<string, string>;
  derived?: DerivedItem[];
  outputs?: OutputItem[];
  run?: (values: Record<string, string | number>) => Record<string, number>;
  checks?: CheckDefinition[];
  adjustments?: Adjustment[];
  symbols?: Record<string, string>;
  datasheet?: string[];
  examples: { given: Record<string, number | string>; expect: Record<string, number> }[];
}

export interface RunResult {
  definition: CalculatorDefinition;
  values: Record<string, number | string>;
  derived: Record<string, number>;
  relation: string | null;
  target: string | null;
  checks: TriggeredCheck[];
  trace: TraceStep[];
  fieldErrors: FieldError[];
  valid: boolean;
}
```

This must stay a structural match for what `src/engine/formula.js`'s `runDefinition` actually returns (see that file's final `return` in `runRelation`/`runProcedure`) and what `src/calc/*.js` definitions actually contain. If a later task in this plan (or a future calculator port) needs a field this file doesn't have, add it here first.

- [ ] **Step 2: Write `src/ui-react/engine.ts`**

```ts
// The only file in src/ui-react allowed to import the plain-JS engine
// directly. Every other file in this tree imports from here and gets real
// types. See CLAUDE.md invariant 3.

// @ts-expect-error - src/engine/formula.js is plain JS, typed by the wrapper below
import { runDefinition as runDefinitionJs } from '../engine/formula.js';
// @ts-expect-error - plain JS
import { eng as engJs } from '../engine/format.js';
// @ts-expect-error - plain JS
import { nearestSeries as nearestSeriesJs, seriesValues as seriesValuesJs, seriesNames as seriesNamesJs } from '../engine/eseries.js';

import type { CalculatorDefinition, RunResult } from './types';

export function runDefinition(
  definition: CalculatorDefinition,
  input: Record<string, string | number> = {},
  options: { solveFor?: string } = {}
): RunResult {
  return runDefinitionJs(definition, input, options);
}

export function eng(value: number, unit = '', sigFigs = 3): string {
  return engJs(value, unit, sigFigs);
}

export function nearestSeries(value: number, series = 'E24'): number {
  return nearestSeriesJs(value, series);
}

export function seriesValues(series = 'E24', min = 1, max = 1e6): number[] {
  return seriesValuesJs(series, min, max);
}

export const seriesNames: readonly string[] = seriesNamesJs;
```

Every `@ts-expect-error`-guarded import above is written on a single line,
deliberately. TypeScript attributes a missing-declaration-file diagnostic
(`TS7016`) to the line holding the module specifier string — for a
multi-line `import { a, b, c } from '...'`, that's the closing `} from
'...'` line, not the `import {` line. A `@ts-expect-error` comment only
suppresses a diagnostic on the *very next* line, so splitting one of these
imports across multiple lines makes the comment "expect" an error on the
wrong line: `TS2578: Unused '@ts-expect-error' directive` where the comment
sits, and the real `TS7016` still surfaces, unsuppressed, on the `from`
line. Keep every plain-JS import here (and in `definitions.ts`, Step 3) on
one line.

- [ ] **Step 3: Write `src/ui-react/calculators/definitions.ts`**

```ts
// The only file allowed to import src/calc/*.js directly. Everything else
// in src/ui-react imports a calculator's definition from here.

import type { CalculatorDefinition } from '../types';

// @ts-expect-error - plain JS data module
import ohmRaw from '../../calc/ohm.js';
// @ts-expect-error
import ledResistorRaw from '../../calc/led-resistor.js';
// @ts-expect-error
import dividerRaw from '../../calc/divider.js';
// @ts-expect-error
import regulatorRaw from '../../calc/regulator.js';
// @ts-expect-error
import diodeRaw from '../../calc/diode.js';
// @ts-expect-error
import eseriesRaw from '../../calc/eseries.js';

export const ohm = ohmRaw as CalculatorDefinition;
export const ledResistor = ledResistorRaw as CalculatorDefinition;
export const divider = dividerRaw as CalculatorDefinition;
export const regulator = regulatorRaw as CalculatorDefinition;
export const diode = diodeRaw as CalculatorDefinition;
export const eseries = eseriesRaw as CalculatorDefinition;

export const calculators: CalculatorDefinition[] = [
  ohm, ledResistor, divider, regulator, diode, eseries,
];
```

`calculators` here is the direct TS-typed counterpart of `src/calc/index.js`'s `calculators` array — when a 7th calculator is ported later (`rc`, per `docs/formulas.md`), it's added to *both* `src/calc/index.js` (for the `node --test` sweep) and here (for the UI), same as every other calculator-specific change touches both `src/calc/` and `src/ui-react/calculators/`.

- [ ] **Step 4: Verify it type-checks in isolation**

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: no errors. (There's nothing importing these three files yet, but `tsc` still checks every file under `include`.)

- [ ] **Step 5: Commit**

```bash
git add src/ui-react/types.ts src/ui-react/engine.ts src/ui-react/calculators/definitions.ts
git commit -m "feat(ui): type boundary between the plain-JS engine and the new React UI"
```

---

## Task 3: The `useCalculatorForm` hook

**Files:**
- Create: `src/ui-react/hooks/useCalculatorForm.ts`
- Test: `test-ui/useCalculatorForm.test.tsx`

**Interfaces:**
- Consumes: `runDefinition` from `../engine`; `CalculatorDefinition`, `RunResult` from `../types`.
- Produces: `useCalculatorForm(definition: CalculatorDefinition): { values: Record<string, string>; setField: (name: string, value: string) => void; target: string | undefined; setTarget: (name: string) => void; targetOptions: string[]; result: RunResult }` — every calculator view in Tasks 6-11 destructures exactly this shape.

- [ ] **Step 1: Write the failing test**

Create `test-ui/useCalculatorForm.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculatorForm } from '../src/ui-react/hooks/useCalculatorForm';
import { ohm } from '../src/ui-react/calculators/definitions';

describe('useCalculatorForm', () => {
  it('starts from each var\'s declared default', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    expect(result.current.values.V).toBe('5');
    expect(result.current.values.R).toBe('100');
  });

  it('solves for the default target and exposes the result', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    expect(result.current.target).toBe('V');
    expect(result.current.result.values.V).toBeCloseTo(5, 6);
  });

  it('re-solves when a field changes', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    act(() => result.current.setField('R', '200'));
    expect(result.current.result.values.V).toBeCloseTo(10, 6);
  });

  it('re-solves for a different target', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    act(() => result.current.setTarget('R'));
    expect(result.current.target).toBe('R');
    expect(result.current.result.values.R).toBeCloseTo(100, 6);
  });

  it('exposes every closedForm key as a target option', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    expect(result.current.targetOptions.sort()).toEqual(['I', 'R', 'V']);
  });

  it('has no target options for a procedure-kind definition', async () => {
    const { eseries } = await import('../src/ui-react/calculators/definitions');
    const { result } = renderHook(() => useCalculatorForm(eseries));
    expect(result.current.targetOptions).toEqual([]);
    expect(result.current.target).toBeUndefined();
  });
});
```

- [ ] **Step 2: Configure Vitest for this test to run**

Create `vitest.config.ts` at the repo root:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test-ui/**/*.test.{ts,tsx}'],
    setupFiles: ['./test-ui/setup.ts'],
  },
});
```

Create `test-ui/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

The `afterEach(cleanup)` matters from Task 4 onward: any test file that
calls `render()` more than once (or has more than one test with its own
`render()`) leaves prior DOM mounted without it, and later `screen.getBy*`
queries fail with "Found multiple elements" — not a bug in the component
under test, just accumulated DOM from earlier renders in the same file.
`useCalculatorForm.test.tsx` (Task 3) never hit this because `renderHook`
doesn't mount into the shared document the way `render()` does.

- [ ] **Step 3: Run it, confirm it fails**

```bash
npm run test:ui
```

Expected: fails with "Cannot find module '../src/ui-react/hooks/useCalculatorForm'".

- [ ] **Step 4: Write the hook**

```ts
// src/ui-react/hooks/useCalculatorForm.ts
import { useCallback, useMemo, useState } from 'react';
import { runDefinition } from '../engine';
import type { CalculatorDefinition, RunResult } from '../types';

function initialValues(definition: CalculatorDefinition): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, meta] of Object.entries(definition.vars)) {
    values[name] = meta.default ?? '';
  }
  return values;
}

export interface CalculatorForm {
  values: Record<string, string>;
  setField: (name: string, value: string) => void;
  target: string | undefined;
  setTarget: (name: string) => void;
  targetOptions: string[];
  result: RunResult;
}

export function useCalculatorForm(definition: CalculatorDefinition): CalculatorForm {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(definition));

  const targetOptions = useMemo(
    () => Object.keys(definition.closedForm ?? {}),
    [definition]
  );

  const [target, setTarget] = useState<string | undefined>(
    definition.solveFor ?? targetOptions[0]
  );

  const setField = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const result = useMemo(
    () => runDefinition(definition, values, { solveFor: target }),
    [definition, values, target]
  );

  return { values, setField, target, setTarget, targetOptions, result };
}
```

- [ ] **Step 5: Run the test, confirm it passes**

```bash
npm run test:ui
```

Expected: all 6 cases pass.

- [ ] **Step 6: Commit**

```bash
git add src/ui-react/hooks/useCalculatorForm.ts test-ui/useCalculatorForm.test.tsx vitest.config.ts test-ui/setup.ts
git commit -m "feat(ui): useCalculatorForm hook wraps runDefinition with field/target state"
```

---

## Task 4: Shared widget library

**Files:**
- Create: `src/ui-react/widgets/Field.tsx`
- Create: `src/ui-react/widgets/SeriesPicker.tsx`
- Create: `src/ui-react/widgets/Headline.tsx`
- Create: `src/ui-react/widgets/CheckList.tsx`
- Create: `src/ui-react/widgets/ResultGrid.tsx`
- Create: `src/ui-react/widgets/FormulaTrace.tsx`
- Create: `src/ui-react/widgets/Sidebar.tsx`
- Test: `test-ui/widgets/Field.test.tsx`
- Test: `test-ui/widgets/CheckList.test.tsx`
- Test: `test-ui/widgets/ResultGrid.test.tsx`

**Interfaces:**
- Produces: `Field`, `SeriesPicker`, `Headline`, `CheckList`, `ResultGrid`, `FormulaTrace`, `Sidebar` — every calculator view in Tasks 6-11 imports these and only these for rendering chrome shared across calculators. No widget imports a calculator id or a specific `VarMeta` name.
- Consumes: `VarMeta`, `TriggeredCheck`, `TraceStep`, `CalculatorDefinition` from `../types`; `eng`, `seriesValues`, `seriesNames` from `../engine`.

- [ ] **Step 1: Write the failing tests**

`test-ui/widgets/Field.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Field } from '../../src/ui-react/widgets/Field';

describe('Field', () => {
  it('renders a text input for a normal var', () => {
    render(
      <Field name="V" meta={{ unit: 'V', label: 'V (across R)' }}
        value="5" isTarget={false} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText('V (across R)')).toHaveValue('5');
    expect(screen.getByText('V')).toBeInTheDocument();
  });

  it('disables the input and shows the computed display when it is the target', () => {
    render(
      <Field name="V" meta={{ unit: 'V', label: 'V (across R)' }}
        value="5" isTarget computedDisplay="5 V" onChange={vi.fn()} />
    );
    const input = screen.getByLabelText('V (across R)') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input.value).toBe('5 V');
  });

  it('calls onChange with the field name and new text', () => {
    const onChange = vi.fn();
    render(
      <Field name="V" meta={{ unit: 'V', label: 'V (across R)' }}
        value="5" isTarget={false} onChange={onChange} />
    );
    fireEvent.change(screen.getByLabelText('V (across R)'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith('V', '7');
  });

  it('shows a field error when one is given', () => {
    render(
      <Field name="V" meta={{ unit: 'V', label: 'V (across R)' }}
        value="5 A" isTarget={false} error="that is A, this field wants V" onChange={vi.fn()} />
    );
    expect(screen.getByText('that is A, this field wants V')).toBeInTheDocument();
  });

  it('renders a select for a mode var', () => {
    const onChange = vi.fn();
    render(
      <Field name="series" meta={{ unit: '', label: 'Series', kind: 'mode', options: ['E24', 'E12'] }}
        value="E24" isTarget={false} onChange={onChange} />
    );
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: 'E12' } });
    expect(onChange).toHaveBeenCalledWith('series', 'E12');
  });
});
```

`test-ui/widgets/CheckList.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckList } from '../../src/ui-react/widgets/CheckList';

describe('CheckList', () => {
  it('renders nothing when there are no checks', () => {
    const { container } = render(<CheckList checks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each triggered check with its level as a class', () => {
    render(<CheckList checks={[
      { when: 'x', level: 'warn', text: 'careful', triggered: true },
      { when: 'y', level: 'fail', text: 'nope', triggered: true },
    ]} />);
    expect(screen.getByText('careful')).toHaveClass('check', 'warn');
    expect(screen.getByText('nope')).toHaveClass('check', 'fail');
  });
});
```

`test-ui/widgets/ResultGrid.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultGrid } from '../../src/ui-react/widgets/ResultGrid';

describe('ResultGrid', () => {
  it('formats each value with its declared unit', () => {
    render(<ResultGrid
      values={{ V: 5, R: 100 }}
      vars={{ V: { unit: 'V', label: 'V' }, R: { unit: 'ohm', label: 'R' } }}
    />);
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('5 V')).toBeInTheDocument();
    expect(screen.getByText('100 Ω')).toBeInTheDocument();
  });

  it('skips mode-kind vars', () => {
    render(<ResultGrid
      values={{ t: 4780, series: 'E24' }}
      vars={{ t: { unit: 'ohm', label: 't' }, series: { unit: '', label: 'Series', kind: 'mode' } }}
    />);
    expect(screen.queryByText('series')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, confirm all fail** (modules don't exist yet)

```bash
npm run test:ui
```

- [ ] **Step 3: Write `src/ui-react/widgets/SeriesPicker.tsx`** (written first: `Field` imports it)

```tsx
import { useState } from 'react';
import { eng, seriesNames, seriesValues } from '../engine';

const DEFAULT_SERIES = seriesNames.includes('E24') ? 'E24' : seriesNames[0];

export interface SeriesPickerProps {
  unit: string;
  onPick: (value: number) => void;
}

export function SeriesPicker({ unit, onPick }: SeriesPickerProps) {
  const [mode, setMode] = useState(DEFAULT_SERIES);

  return (
    <>
      <select
        className="quick-entry"
        aria-label="Choose series"
        value={mode}
        onChange={(event) => setMode(event.target.value)}
      >
        {seriesNames.map((name) => (
          <option key={name} value={name}>{name} values</option>
        ))}
      </select>
      <select
        className="quick-entry"
        aria-label="Choose standard value"
        value=""
        onChange={(event) => {
          if (event.target.value) onPick(Number(event.target.value));
        }}
      >
        <option value="">Choose standard value</option>
        {seriesValues(mode).map((value) => (
          <option key={value} value={value}>{eng(value, unit)}</option>
        ))}
      </select>
    </>
  );
}
```

- [ ] **Step 4: Write `src/ui-react/widgets/Field.tsx`**

```tsx
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
```

- [ ] **Step 5: Write `src/ui-react/widgets/Headline.tsx`**

```tsx
export interface HeadlineProps {
  label: string;
  value: string;
}

export function Headline({ label, value }: HeadlineProps) {
  return (
    <div className="headline">
      <div className="headline-label">{label}</div>
      <div className="headline-value">{value}</div>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/ui-react/widgets/CheckList.tsx`**

```tsx
import type { TriggeredCheck } from '../types';

export interface CheckListProps {
  checks: TriggeredCheck[];
}

export function CheckList({ checks }: CheckListProps) {
  if (!checks.length) return null;
  return (
    <div className="check-list">
      {checks.map((check, index) => (
        <div key={index} className={`check ${check.level}`}>{check.text}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Write `src/ui-react/widgets/ResultGrid.tsx`**

```tsx
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
```

- [ ] **Step 8: Write `src/ui-react/widgets/FormulaTrace.tsx`**

This is new behavior, not a port: `app.js` never rendered `result.trace` (it didn't exist until this session's formula.js hardening). This widget is the first thing in the app to show the worked-arithmetic line the whole engine architecture is built around.

```tsx
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
```

- [ ] **Step 9: Write `src/ui-react/widgets/Sidebar.tsx`**

```tsx
import type { CalculatorDefinition } from '../types';

export interface SidebarProps {
  calculators: CalculatorDefinition[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ calculators, activeId, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="eyebrow">Ed's bench</div>
        <h1>Bench Calculators</h1>
      </div>
      <div className="calculator-list">
        {calculators.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`calc-button ${item.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 10: Run the tests, confirm they pass**

```bash
npm run test:ui
```

- [ ] **Step 11: Commit**

```bash
git add src/ui-react/widgets test-ui/widgets
git commit -m "feat(ui): shared widget library (Field, SeriesPicker, Headline, CheckList, ResultGrid, FormulaTrace, Sidebar)"
```

---

## Task 5: App shell — `App.tsx` and `main.tsx`

**Files:**
- Create: `src/ui-react/App.tsx`
- Create: `src/ui-react/main.tsx`

**Interfaces:**
- Consumes: `Sidebar` from `./widgets/Sidebar`; `calculators` from `./calculators/definitions`; the six `*View` components (created in Tasks 6-11 — this task references them by name now, they're implemented next).
- Produces: `App` — a single React component mounted by `main.tsx`. Nothing later depends on `App`'s internals, only on the fact that it renders.

This task is written now, ahead of the views it references, so the six view tasks each end with something that actually shows up when you run `npm run dev` — you'll see six placeholder-free real views land into a working shell one at a time.

- [ ] **Step 1: Write `src/ui-react/App.tsx`**

```tsx
import { useState } from 'react';
import { Sidebar } from './widgets/Sidebar';
import { calculators } from './calculators/definitions';
import { OhmView } from './calculators/OhmView';
import { LedResistorView } from './calculators/LedResistorView';
import { DividerView } from './calculators/DividerView';
import { RegulatorView } from './calculators/RegulatorView';
import { DiodeView } from './calculators/DiodeView';
import { EseriesView } from './calculators/EseriesView';

export function App() {
  const [activeId, setActiveId] = useState(calculators[0].id);

  // Every view is mounted at once and hidden with CSS, not conditionally
  // rendered, so switching calculators doesn't lose in-progress edits in the
  // other one — matches the old app.js behavior, where field state lived in
  // a module-level object keyed by calculator id rather than component state.
  return (
    <div className="shell">
      <Sidebar calculators={calculators} activeId={activeId} onSelect={setActiveId} />
      <main className="main">
        <div style={{ display: activeId === 'ohm' ? 'block' : 'none' }}><OhmView /></div>
        <div style={{ display: activeId === 'led-resistor' ? 'block' : 'none' }}><LedResistorView /></div>
        <div style={{ display: activeId === 'divider' ? 'block' : 'none' }}><DividerView /></div>
        <div style={{ display: activeId === 'regulator' ? 'block' : 'none' }}><RegulatorView /></div>
        <div style={{ display: activeId === 'diode' ? 'block' : 'none' }}><DiodeView /></div>
        <div style={{ display: activeId === 'eseries' ? 'block' : 'none' }}><EseriesView /></div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/ui-react/main.tsx`**

```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../style.css';

const container = document.getElementById('app');
if (!container) throw new Error('missing #app root element');
createRoot(container).render(<App />);
```

Also create `src/ui-react/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Without this, `tsc --noEmit` fails on `main.tsx`'s `import '../style.css'` with
"Cannot find module '../style.css' or its corresponding type declarations" —
this triple-slash reference is what tells TypeScript that Vite's client
types (including bare CSS/asset imports) exist. It's the same one-line file
every official Vite template scaffolds; this plan's Task 1 just didn't
create it since nothing imported a non-`.ts`/`.tsx` asset until now.

- [ ] **Step 3: Confirm it fails to compile** (the six view modules don't exist yet — expected)

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: six "Cannot find module" errors, one per `*View` import. That's the correct state to be in at the end of this task — Tasks 6-11 each remove one of these errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui-react/App.tsx src/ui-react/main.tsx
git commit -m "feat(ui): App shell — sidebar + all six calculator views mounted, hidden by CSS"
```

---

## Task 6: `OhmView` — the first calculator component

**Files:**
- Create: `src/ui-react/calculators/OhmView.tsx`
- Test: `test-ui/calculators/OhmView.test.tsx`

**Interfaces:**
- Consumes: `ohm` from `../calculators/definitions`; `useCalculatorForm` from `../hooks/useCalculatorForm`; `Field`, `Headline`, `CheckList`, `ResultGrid`, `FormulaTrace`, `SeriesPicker` from `../widgets/*`; `eng` from `../engine`.
- Produces: `OhmView` — a zero-prop component. `App.tsx` (Task 5) already imports it by this exact name.

This is the fully-worked template every other calculator view (Tasks 7-11) follows. Read this one closely; the others are the same shape with a different definition and different calculator-specific extras (or lack of them).

- [ ] **Step 1: Write the failing test**

```tsx
// test-ui/calculators/OhmView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OhmView } from '../../src/ui-react/calculators/OhmView';

describe('OhmView', () => {
  it('shows the default-solved headline for V', () => {
    render(<OhmView />);
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('5 V')).toBeInTheDocument(); // V = I*R = 50 mA * 100 ohm
  });

  it('re-solves when R changes', () => {
    render(<OhmView />);
    fireEvent.change(screen.getByLabelText('R'), { target: { value: '200' } });
    expect(screen.getByText('10 V')).toBeInTheDocument();
  });

  it('switches target and disables the newly-computed field', () => {
    render(<OhmView />);
    fireEvent.change(screen.getByLabelText('Solve for'), { target: { value: 'R' } });
    const rField = screen.getByLabelText('R') as HTMLInputElement;
    expect(rField).toBeDisabled();
  });

  it('shows a warn check when power exceeds the part rating', () => {
    render(<OhmView />);
    fireEvent.change(screen.getByLabelText('I (through R)'), { target: { value: '3' } });
    expect(screen.getByText(/Over the part rating/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npm run test:ui
```

Expected: fails, `OhmView` module not found.

- [ ] **Step 3: Write `src/ui-react/calculators/OhmView.tsx`**

```tsx
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
```

Note the `onPick={() => {}}` on the target's `SeriesPicker`: this is a deliberate, scoped-down replacement for the old `app.js`'s editable "practical value" override field (a free-text input where you could type in the resistor you actually grabbed, e.g. "4.6k77 measured"). That feature is **not ported** — see "Deliberate simplifications" at the end of this plan. What's kept is the informational "here's the nearest E12/E24 value" picker; picking one doesn't write anywhere yet. If you want the override restored, wire `onPick` to a local `useState<number>()` and render its value next to the picker — the widget already supports it, this view just isn't using that capability yet.

- [ ] **Step 4: Run the test, confirm it passes**

```bash
npm run test:ui
```

- [ ] **Step 5: Confirm the app actually renders it**

```bash
npm run dev
```

Open the printed URL. Ohm's law should be the default-selected calculator and fully interactive. Leave the other five sidebar buttons alone for now — they'll error until Tasks 7-11 land (that's expected; `App.tsx` already references all six).

- [ ] **Step 6: Commit**

```bash
git add src/ui-react/calculators/OhmView.tsx test-ui/calculators/OhmView.test.tsx
git commit -m "feat(ui): OhmView, the first calculator ported to React"
```

---

## Task 7: `LedResistorView`

**Files:**
- Create: `src/ui-react/calculators/LedResistorView.tsx`
- Test: `test-ui/calculators/LedResistorView.test.tsx`

**Interfaces:** Same shape as Task 6, importing `ledResistor` instead of `ohm`. `ledResistor.solveFor` is `'R'`, and `R`'s `VarMeta` has `series: true` — this is the calculator where the "nearest standard value" block actually matters by default, not just when you switch targets.

- [ ] **Step 1: Write the failing test**

```tsx
// test-ui/calculators/LedResistorView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LedResistorView } from '../../src/ui-react/calculators/LedResistorView';

describe('LedResistorView', () => {
  it('solves R by default from Vs, Vf, If', () => {
    render(<LedResistorView />);
    expect(screen.getByText('1 kΩ')).toBeInTheDocument(); // (5-2)/3mA = 1k
  });

  it('shows the Vf preset picker and applies a preset', () => {
    render(<LedResistorView />);
    fireEvent.change(screen.getByLabelText('Quick LED Vf preset'), { target: { value: '3.2' } });
    expect(screen.getByLabelText('LED Vf')).toHaveValue('3.2');
  });

  it('shows the fail check when Vf is at or above the rail', () => {
    render(<LedResistorView />);
    fireEvent.change(screen.getByLabelText('LED Vf'), { target: { value: '9' } });
    expect(screen.getByText(/nothing lights/)).toBeInTheDocument();
    expect(screen.getByText(/nothing lights/)).toHaveClass('fail');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npm run test:ui
```

- [ ] **Step 3: Write `src/ui-react/calculators/LedResistorView.tsx`**

Identical structure to `OhmView.tsx`, swapping the definition:

```tsx
import { ledResistor } from './definitions';
import { useCalculatorForm } from '../hooks/useCalculatorForm';
import { Field } from '../widgets/Field';
import { Headline } from '../widgets/Headline';
import { CheckList } from '../widgets/CheckList';
import { ResultGrid } from '../widgets/ResultGrid';
import { FormulaTrace } from '../widgets/FormulaTrace';
import { SeriesPicker } from '../widgets/SeriesPicker';
import { eng } from '../engine';

export function LedResistorView() {
  const { values, setField, target, setTarget, targetOptions, result } = useCalculatorForm(ledResistor);

  const targetMeta = target ? ledResistor.vars[target] : undefined;
  const targetValue = target ? result.values[target] : undefined;
  const computedDisplay =
    target && result.valid && typeof targetValue === 'number' && Number.isFinite(targetValue)
      ? eng(targetValue, targetMeta?.unit ?? '')
      : undefined;

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
        {target && targetMeta?.series && (
          <div className="adjustment">
            <span className="adjustment-label">Nearest standard value</span>
            <SeriesPicker unit={targetMeta.unit} onPick={() => {}} />
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
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
npm run test:ui
```

- [ ] **Step 5: Commit**

```bash
git add src/ui-react/calculators/LedResistorView.tsx test-ui/calculators/LedResistorView.test.tsx
git commit -m "feat(ui): LedResistorView"
```

---

## Task 8: `DividerView`

**Files:**
- Create: `src/ui-react/calculators/DividerView.tsx`
- Test: `test-ui/calculators/DividerView.test.tsx`

**Interfaces:** Same shape as Task 6, importing `divider`. `divider.solveFor` is `'Vout'`, none of `R1`/`R2`/`RL`/`Vout` is the default target's `series` case (`Vout` isn't a resistance), so the "nearest standard value" block only appears if the user explicitly switches the solve-for target to `R1`, `R2`, or `RL`.

- [ ] **Step 1: Write the failing test**

```tsx
// test-ui/calculators/DividerView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DividerView } from '../../src/ui-react/calculators/DividerView';

describe('DividerView', () => {
  it('solves Vout by default', () => {
    render(<DividerView />);
    expect(screen.getByText('2.5 V')).toBeInTheDocument();
  });

  it('warns when RL is set below 10x Rsource', () => {
    render(<DividerView />);
    fireEvent.change(screen.getByLabelText('Load resistance'), { target: { value: '1000' } });
    expect(screen.getByText(/load is now part of the divider/)).toBeInTheDocument();
  });

  it('shows the nearest-standard-value picker when R1 is the target', () => {
    render(<DividerView />);
    fireEvent.change(screen.getByLabelText('Solve for'), { target: { value: 'R1' } });
    expect(screen.getByText('Nearest standard value')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npm run test:ui
```

- [ ] **Step 3: Write `src/ui-react/calculators/DividerView.tsx`**

Same shape as `LedResistorView.tsx`, swapping in `divider`:

```tsx
import { divider } from './definitions';
import { useCalculatorForm } from '../hooks/useCalculatorForm';
import { Field } from '../widgets/Field';
import { Headline } from '../widgets/Headline';
import { CheckList } from '../widgets/CheckList';
import { ResultGrid } from '../widgets/ResultGrid';
import { FormulaTrace } from '../widgets/FormulaTrace';
import { SeriesPicker } from '../widgets/SeriesPicker';
import { eng } from '../engine';

export function DividerView() {
  const { values, setField, target, setTarget, targetOptions, result } = useCalculatorForm(divider);

  const targetMeta = target ? divider.vars[target] : undefined;
  const targetValue = target ? result.values[target] : undefined;
  const computedDisplay =
    target && result.valid && typeof targetValue === 'number' && Number.isFinite(targetValue)
      ? eng(targetValue, targetMeta?.unit ?? '')
      : undefined;

  return (
    <section className="calculator" aria-label={divider.title}>
      <header className="titlebar">
        <div>
          <div className="eyebrow">{divider.group}</div>
          <h2>{divider.title}</h2>
        </div>
        <p className="blurb">{divider.blurb}</p>
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
                <option key={name} value={name}>{divider.vars[name]?.label ?? name}</option>
              ))}
            </select>
            <span className="solve-hint">
              The highlighted field is computed. Enter values in the other fields.
            </span>
          </label>
        )}
        <div className="field-grid">
          {Object.entries(divider.vars).map(([name, meta]) => (
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
        <ResultGrid values={result.values} vars={divider.vars} />
      </section>

      <section className="panel formula-panel">
        <h3>Formula</h3>
        <FormulaTrace trace={result.trace} />
      </section>
    </section>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
npm run test:ui
```

- [ ] **Step 5: Commit**

```bash
git add src/ui-react/calculators/DividerView.tsx test-ui/calculators/DividerView.test.tsx
git commit -m "feat(ui): DividerView"
```

---

## Task 9: `RegulatorView`

**Files:**
- Create: `src/ui-react/calculators/RegulatorView.tsx`
- Test: `test-ui/calculators/RegulatorView.test.tsx`

**Interfaces:** Same shape as Task 6, importing `regulator`. No var in `regulator.vars` has `series: true` (they're all volts, amps, or degC/W), so this view omits the "nearest standard value" block entirely — this is the concrete example of a view that legitimately differs from `OhmView`'s template because its definition differs, which is the whole point of choosing one component per calculator.

- [ ] **Step 1: Write the failing test**

```tsx
// test-ui/calculators/RegulatorView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegulatorView } from '../../src/ui-react/calculators/RegulatorView';

describe('RegulatorView', () => {
  it('solves P by default and shows Tj in the result grid', () => {
    render(<RegulatorView />);
    expect(screen.getByText('640 mW')).toBeInTheDocument(); // (9-0.8-5)*0.2
    expect(screen.getByText('57 °C')).toBeInTheDocument();
  });

  it('warns when Tj passes Tjmax', () => {
    render(<RegulatorView />);
    fireEvent.change(screen.getByLabelText('Load current'), { target: { value: '0.5' } });
    expect(screen.getByText(/past 125/)).toBeInTheDocument();
  });

  it('has no nearest-standard-value block for any target', () => {
    render(<RegulatorView />);
    expect(screen.queryByText('Nearest standard value')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npm run test:ui
```

- [ ] **Step 3: Write `src/ui-react/calculators/RegulatorView.tsx`**

```tsx
import { regulator } from './definitions';
import { useCalculatorForm } from '../hooks/useCalculatorForm';
import { Field } from '../widgets/Field';
import { Headline } from '../widgets/Headline';
import { CheckList } from '../widgets/CheckList';
import { ResultGrid } from '../widgets/ResultGrid';
import { FormulaTrace } from '../widgets/FormulaTrace';
import { eng } from '../engine';

export function RegulatorView() {
  const { values, setField, target, setTarget, targetOptions, result } = useCalculatorForm(regulator);

  const targetMeta = target ? regulator.vars[target] : undefined;
  const targetValue = target ? result.values[target] : undefined;
  const computedDisplay =
    target && result.valid && typeof targetValue === 'number' && Number.isFinite(targetValue)
      ? eng(targetValue, targetMeta?.unit ?? '')
      : undefined;

  return (
    <section className="calculator" aria-label={regulator.title}>
      <header className="titlebar">
        <div>
          <div className="eyebrow">{regulator.group}</div>
          <h2>{regulator.title}</h2>
        </div>
        <p className="blurb">{regulator.blurb}</p>
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
                <option key={name} value={name}>{regulator.vars[name]?.label ?? name}</option>
              ))}
            </select>
            <span className="solve-hint">
              The highlighted field is computed. Enter values in the other fields.
            </span>
          </label>
        )}
        <div className="field-grid">
          {Object.entries(regulator.vars).map(([name, meta]) => (
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
        <ResultGrid values={result.values} vars={regulator.vars} />
      </section>

      <section className="panel formula-panel">
        <h3>Formula</h3>
        <FormulaTrace trace={result.trace} />
      </section>
    </section>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
npm run test:ui
```

- [ ] **Step 5: Commit**

```bash
git add src/ui-react/calculators/RegulatorView.tsx test-ui/calculators/RegulatorView.test.tsx
git commit -m "feat(ui): RegulatorView"
```

---

## Task 10: `DiodeView`

**Files:**
- Create: `src/ui-react/calculators/DiodeView.tsx`
- Test: `test-ui/calculators/DiodeView.test.tsx`

**Interfaces:** Same shape as Task 9 (`RegulatorView`) — no `series` vars, so no adjustment block.

- [ ] **Step 1: Write the failing test**

```tsx
// test-ui/calculators/DiodeView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiodeView } from '../../src/ui-react/calculators/DiodeView';

describe('DiodeView', () => {
  it('solves Vafter by default', () => {
    render(<DiodeView />);
    expect(screen.getByText('8.2 V')).toBeInTheDocument();
  });

  it('warns when If exceeds Irated', () => {
    render(<DiodeView />);
    fireEvent.change(screen.getByLabelText('Current'), { target: { value: '2' } });
    expect(screen.getByText(/over the part rating/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npm run test:ui
```

- [ ] **Step 3: Write `src/ui-react/calculators/DiodeView.tsx`**

```tsx
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
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
npm run test:ui
```

- [ ] **Step 5: Commit**

```bash
git add src/ui-react/calculators/DiodeView.tsx test-ui/calculators/DiodeView.test.tsx
git commit -m "feat(ui): DiodeView"
```

---

## Task 11: `EseriesView` — the procedure-kind calculator

**Files:**
- Create: `src/ui-react/calculators/EseriesView.tsx`
- Test: `test-ui/calculators/EseriesView.test.tsx`

**Interfaces:** Different shape from Tasks 6-10: `eseries.kind === 'procedure'`, so there's no `relation`, no `closedForm`, no `target`, and `result.trace` is always `[]` (procedures don't populate a trace — see `runProcedure` in `src/engine/formula.js`). Computed numbers come from `eseries.outputs` + `result.derived`, not from a headline/trace. This view does not use `Headline`, `FormulaTrace`, or the target/solve-for select at all — it's the concrete proof that "one component per calculator" earns its keep on a calculator whose shape genuinely differs.

- [ ] **Step 1: Write the failing test**

```tsx
// test-ui/calculators/EseriesView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EseriesView } from '../../src/ui-react/calculators/EseriesView';

describe('EseriesView', () => {
  it('shows the nearest E24 value for the default target', () => {
    render(<EseriesView />);
    expect(screen.getByText('4.7 kΩ')).toBeInTheDocument();
  });

  it('switches series and recomputes', () => {
    render(<EseriesView />);
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: 'E12' } });
    // E12 nearest to 4780 is also 4700 (10*470 in E12), but confirm the output panel re-rendered
    expect(screen.getByText('4.7 kΩ')).toBeInTheDocument();
  });

  it('has no solve-for control', () => {
    render(<EseriesView />);
    expect(screen.queryByLabelText('Solve for')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npm run test:ui
```

- [ ] **Step 3: Write `src/ui-react/calculators/EseriesView.tsx`**

```tsx
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
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
npm run test:ui
```

- [ ] **Step 5: Commit**

```bash
git add src/ui-react/calculators/EseriesView.tsx test-ui/calculators/EseriesView.test.tsx
git commit -m "feat(ui): EseriesView, the first procedure-kind calculator in the React UI"
```

---

## Task 12: Cutover — retire `src/ui/app.js`

**Files:**
- Delete: `src/ui/app.js`
- Modify: `README.md` (if it references `src/ui/app.js` or the old dev command)
- Modify: `PLAN.md`'s file-tree section (§2) to match the real layout

**Interfaces:** None new — this task removes the now-dead code path and brings the two long-lived docs (`README.md`, `PLAN.md`) back in sync with reality, same discipline CLAUDE.md already asks for on every calculator port.

- [ ] **Step 1: Confirm nothing still imports `src/ui/app.js`**

```bash
grep -rn "ui/app.js" --include="*.html" --include="*.js" --include="*.ts" --include="*.tsx" .
```

Expected: no matches (Task 1, Step 6 already repointed `index.html` at `src/ui-react/main.tsx`).

- [ ] **Step 2: Delete it**

```bash
git rm -r src/ui
```

- [ ] **Step 3: Update `PLAN.md`'s file tree** (§2)

Find:

```
    ui/
      app.js                     state, hash routing
      render.js                  tagged-template -> DOM, no vdom
      components.js               field, result row, check banner, formula card
```

Replace with:

```
  ui-react/                     React + TypeScript UI (see docs/superpowers/plans/2026-09-20-react-typescript-ui.md)
    engine.ts                    the only file touching the plain-JS engine directly
    types.ts                     CalculatorDefinition, RunResult, and friends
    App.tsx / main.tsx           shell — sidebar + all calculator views
    hooks/useCalculatorForm.ts   field/target state + memoized runDefinition call
    widgets/                     Field, SeriesPicker, Headline, CheckList, ResultGrid, FormulaTrace, Sidebar
    calculators/                 one *View.tsx per calculator, plus definitions.ts (typed src/calc/*.js re-exports)
```

- [ ] **Step 4: Update `README.md`** if it mentions `npm run dev` pointing at a static server, or `src/ui/`. Point it at the five scripts from Task 1 instead.

- [ ] **Step 5: Full verification**

```bash
npm test           # engine + calc, unchanged, still node --test, no install
npm run test:ui    # all React component tests
npx tsc --noEmit -p tsconfig.json
npm run build      # production bundle
npm run preview    # serves the built bundle
```

Open the preview URL. Click through all six calculators in the sidebar. Confirm:
- Each one solves correctly and updates live as you type.
- The "Formula" panel now shows substituted worked arithmetic (e.g. `R = (5 V - 2 V) / 3 mA = 1 kΩ`), not just the bare relation text — this is new versus the old `app.js`.
- LED resistor's fail check (`Vf` at or above `Vs`) blanks the headline instead of showing a stale number.
- A wrong-unit field entry (type `5 A` into a volts field) shows the field error message instead of silently accepting it.

- [ ] **Step 6: Commit**

```bash
git add PLAN.md README.md
git rm -r src/ui
git commit -m "chore: retire src/ui/app.js now that the React UI is the only UI"
```

---

## Deliberate simplifications (not bugs, not forgotten)

- **The old "editable practical value" override** (a free-text field next to the E-series adjustment, letting you record e.g. "used 4k67 measured") is not ported. The new `SeriesPicker` widget shows the nearest standard value only. See the note in Task 6, Step 3 for how to restore it if wanted later.
- **`FormulaTrace` is new UI, not a straight port.** The old `app.js` never rendered `result.trace` — it didn't exist before this session's `formula.js` hardening. Every view in this plan wires it up for the first time.
- **`EseriesView` doesn't use most of the shared widget set** (no `Headline`, no `FormulaTrace`, no solve-for select) because `eseries` genuinely has no target/relation/trace. This is intended, not a gap — see Task 11's Interfaces note.
- **Hash-based routing (`#/ohm?V=5&R=100`) is out of scope for this plan.** The old `app.js` didn't have it either, despite `PLAN.md` §5 floating it as a future nicety tied to phase 6/8 (bookmarkable state, "most of saved scenarios for twenty lines"). `App.tsx`'s `activeId` state is a plain `useState`, not synced to the URL. If it's wanted, it's a follow-on task: swap `useState` for a small `useSyncExternalStore` on `window.location.hash`, or reach for a router — deliberately not decided here to avoid pulling in a dependency this plan doesn't otherwise need.
- **Porting the remaining 12 calculators from `docs/formulas.md`** (starting with `rc`) is out of scope for this plan. Each new calculator still needs a matching entry in `src/calc/index.js` (for the `node --test` sweep — unchanged) *and* a new `*View.tsx` + an entry in `src/ui-react/calculators/definitions.ts` + a case in `App.tsx` (for the UI) — that three-place update is the new "adding a calculator" checklist; it should be written into `CLAUDE.md`'s "Adding or changing a calculator" section as a follow-up once this plan lands.
