# CLAUDE.md — working agreement for this repo

Read this before touching anything. Then `PLAN.md` for the build order.

## What this is

Offline-first bench calculators for electronics. A companion to a reference
page of formulas: same formulas, same worked arithmetic, but you type your own
numbers in. Single user (Ed), used at a workbench, often on a phone, often with
no network.

## Read order for a new agent

1. `PLAN.md` — build order, phase exit criteria, the reasoning behind the
   architecture, known risks.
2. `docs/formulas.md` — all 18 calculators as structured data: relation,
   variables with units, derived values, warning thresholds, worked examples.
   This is what phases 4 and 7 transcribe from.
3. `docs/design.md` — tokens, layout anatomy, accessibility rules. What
   `src/style.css` and the UI are checked against.
4. `docs/reference/bench-formulas.html` — the original reference page, verbatim.
   Read it when a symbol or a caveat in `formulas.md` needs its full context.

## Canonical

**The repo wins.** These files are the source of truth. Two design artifacts
exist and are useful to look at, but they are rendered views of what is here:

- Reference page — `docs/reference/bench-formulas.html` is the committed copy.
- App design (canvas) — described in `docs/design.md`.

If an artifact and this repo disagree, the repo is right and the artifact is
stale. Change things here; republish there deliberately, if at all.

## Invariants

These are not preferences. Breaking one is a bug, not a style difference.

1. **SI base units internally, always.** Ohms, farads, seconds, amps. Every
   number in the engine and in every definition is SI. Prefixes exist at
   exactly two places: `parse()` reading an input, and `eng()` printing a
   result. Nowhere else.

2. **A formula is written once, as text, and parsed.** Never write a relation
   as a display string and separately as JavaScript — that is the specific bug
   this architecture exists to prevent. If you find yourself typing the same
   arithmetic twice, stop.

3. **Zero runtime dependencies. No build step.** Plain ES modules in the
   browser, plain ES modules under `node --test`. No bundler, no transpiler, no
   framework, no CDN script tags. `package.json` has no `dependencies` and no
   `devDependencies`, and it stays that way. If a task seems to need one, say so
   and stop rather than adding it.

4. **`npm test` is green before a phase closes.** Node's built-in runner, no
   install. A phase with failing tests is not finished.

5. **Identifiers are ASCII.** `dIL`, not `ΔIL`. `tau`, not `τ`. `Rthja`, not
   `Rth(j-a)`. The pretty form lives in the variable's `label`, which is what
   the UI shows. The parser only has to deal with `[A-Za-z_][A-Za-z0-9_]*`.

6. **Three significant figures by default.** Datasheet figures are typical
   values with spread behind them; decimals are a claim about how well you know
   something. `°C` and `°C/W` never take an SI prefix.

7. **Refusing beats guessing.** A solver that cannot bracket a root, a parser
   that got junk, a unit that does not match the field — these return a visible
   failure. They never return a plausible number.

8. **Real elements, real contrast.** `<button>`, `<a href>`, `<input>` with a
   `<label>`. Never `onClick` on a div. 44 px minimum touch targets, 4.5:1
   minimum text contrast, light and dark both. Details in `docs/design.md`.

## Where things are

```
src/engine/    units, expression parser, solver, formula runner — the real work
src/calc/      one file per calculator, pure data, no logic
src/ui/        rendering; knows nothing about any specific calculator
test/          node --test
tools/         dev server, precache list generator
docs/          formulas, design, the reference page
```

`src/ui/` must never import from `src/calc/`. The UI renders whatever the
formula runner hands it. If the UI needs to special-case a calculator, the
definition format is missing something — fix the format.

## Adding or changing a calculator

1. Write or edit the definition in `src/calc/<id>.js`, from
   `docs/formulas.md`.
2. Include its `examples` block. Every calculator carries at least one worked
   example with a known answer; those are the regression tests.
3. `npm test`. `definitions.test.js` sweeps every definition: identifiers
   resolve, dimensions balance on both sides of the relation, every
   `closedForm` entry actually satisfies the relation, every example lands.
4. If you changed the maths rather than the code, update `docs/formulas.md` in
   the same change. They are supposed to agree.

## Commands

```sh
npm test         # node --test, no install
npm run dev      # http://localhost:8080 (ES modules need an http origin)
```

## Two things not yet decided

Flagged here so nobody quietly invents an answer:

- **Procedures that are not a single relation.** E-series nearest value and the
  capacitor code decoder are algorithms, not equations. The definition format
  needs an escape hatch for them (a `procedure` kind with a plain function, kept
  out of the solve-for machinery). Decide this at phase 3, not by improvisation
  at phase 7.
- **Tolerance propagation.** Nothing currently tracks that Rthja is ±20 %. Out
  of scope for v1, but do not design the trace format in a way that makes it
  impossible to add later.
