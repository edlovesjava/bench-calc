# bench-calc

Offline-first bench calculators for electronics. A companion to the Bench
Formulas reference: same formulas, same worked arithmetic, but you can type
your own numbers into them.

The engine and calculator definitions have no build step, no dependencies, no
framework: plain ES modules under `node --test`. The UI is React + TypeScript,
built with Vite.

## Running it

```sh
npm run dev        # Vite dev server, http://localhost:8080
npm test           # engine + calc definitions: node's built-in test runner, no install needed
npm run test:ui    # React component tests, vitest
npm run build      # production bundle (tsc -b && vite build)
npm run preview    # serves the built bundle
```

## Where things are

```
CLAUDE.md      working agreement: invariants any agent must hold to
PLAN.md        build order, phase exit criteria, risks
docs/          formulas, design, architecture, the reference page
src/engine/    units, expression parser, solver, formula runner  (the real work)
src/calc/      one file per calculator, pure data
src/ui-react/  React + TypeScript UI; knows nothing about any specific calculator
test/          node --test
```

Start with `CLAUDE.md`, then `PLAN.md`. `docs/formulas.md` holds all 18
calculators as structured data; `docs/architecture.md` has the diagrams.

## The idea

A formula is written once, as text, and parsed. That one string is displayed,
evaluated, substituted with values to show the worked arithmetic, and
rearranged to solve for whichever variable you left blank. Nothing can drift
out of step with anything else, because there is only one of it.

See `PLAN.md` for the build order and the reasoning.

## Status

Six of the 18 calculators in `docs/formulas.md` (Ohm, LED resistor, divider,
regulator, diode, E-series) are ported to the React UI; the rest remain to
be ported. `src/ui/`, the original vanilla-JS UI, has been retired.
