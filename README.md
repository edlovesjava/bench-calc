# bench-calc

Offline-first bench calculators for electronics. A companion to the Bench
Formulas reference: same formulas, same worked arithmetic, but you can type
your own numbers into them.

No build step, no dependencies, no framework. Plain ES modules in the browser,
plain ES modules under `node --test`.

## Running it

```sh
npm run dev      # http://localhost:8080
npm test         # node's built-in test runner, no install needed
```

`npm run dev` exists because ES modules will not load over `file://`. It is
twenty lines of Node stdlib in `tools/serve.js`, not a toolchain.

## Where things are

```
CLAUDE.md      working agreement: invariants any agent must hold to
PLAN.md        build order, phase exit criteria, risks
docs/          formulas, design, architecture, the reference page
src/engine/    units, expression parser, solver, formula runner  (the real work)
src/calc/      one file per calculator, pure data
src/ui/        rendering; knows nothing about any specific calculator
test/          node --test
tools/         dev server, precache list generator
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

Phase 1 of 8: units and formatting, with tests. The page at `/` is a smoke
test for that layer, not the app.
