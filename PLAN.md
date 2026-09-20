# Bench Calculators — build plan

Offline-first PWA. Vanilla ES modules, no build step, no runtime dependencies.
Suggested home: `~/Projects/bench-calc` (alongside `~/Projects/kb`).

The design artifact is the UI reference. This plan is about what sits under it.

---

## 1. The one decision that shapes everything

In the artifact version, every calculator holds the formula **twice**: once as a
display string (`'R = (Vs − Vf) / If'`) and once as JavaScript
(`R = (Vs - Vf) / If`). Nothing ties them together. Edit one, and the app
confidently shows you arithmetic it did not do. That is a latent-wrong-answer
bug in a tool whose entire job is being right.

So: **the formula text is the only source of truth, and the engine parses it.**

One string, four uses:

| use | how |
|---|---|
| display | print the source text |
| evaluation | walk the AST with a scope of values |
| worked arithmetic | walk the same AST, printing formatted values instead of names |
| solve-for-any-variable | rearrange, or find the root of `lhs − rhs` |

That needs a small expression parser. It is ~150 lines, it has no dependencies,
and it is the difference between a calculator app and a calculator app you can
trust six months from now. Everything else in this plan is downstream of it.

---

## 2. Layout

```
bench-calc/
  index.html                 app shell, one <div id="app">
  manifest.webmanifest
  sw.js                      service worker, versioned cache
  icons/                     192, 512, maskable
  src/
    engine/
      units.js               dimension vectors, SI conversion, parse/format
      expr.js                tokenizer, Pratt parser, eval, substitute
      solve.js               closed form, else numeric root-find
      formula.js             load + validate a definition, run it, emit trace
      format.js              significant figures, engineering prefixes
    calc/
      index.js               registry: id -> loader
      ohm.js
      led-resistor.js
      ...                    one file per calculator, pure data
    ui-react/                   React + TypeScript UI (see docs/superpowers/plans/2026-09-20-react-typescript-ui.md)
      engine.ts                  the only file touching the plain-JS engine directly
      types.ts                   CalculatorDefinition, RunResult, and friends
      App.tsx / main.tsx         shell — sidebar + all calculator views
      hooks/useCalculatorForm.ts field/target state + memoized runDefinition call
      widgets/                   Field, SeriesPicker, Headline, CheckList, ResultGrid, FormulaTrace, Sidebar
      calculators/               one *View.tsx per calculator, plus definitions.ts (typed src/calc/*.js re-exports)
    style.css                  custom properties, light + dark
  test/
    units.test.js
    expr.test.js
    solve.test.js
    definitions.test.js      sweeps every calculator
  test-ui/                  vitest + React Testing Library, for src/ui-react
    setup.ts
    widgets/
    calculators/
  tools/
    precache.sh              regenerates the sw.js file list
  PLAN.md
```

`src/engine/` and `src/calc/` stay plain ES modules with no build step — tests
run on `node --test test/`, built into Node, needs nothing installed. The UI
(`src/ui-react/`) is React + TypeScript, built and served by Vite: `npm run dev`
for local development, `npm run build` for a production bundle, `npm run
test:ui` for its component tests. See CLAUDE.md invariant 3 and
`docs/superpowers/plans/2026-09-20-react-typescript-ui.md` for the full
rationale.

---

## 3. What a calculator looks like

Data, not code. This is the target shape — `src/calc/led-resistor.js`:

```js
export default {
  id: 'led-resistor',
  group: 'resistors',
  title: 'LED series resistor',
  blurb: 'Vf is not an input you choose — it is what the die does at the ' +
         'current you picked. The resistor sets the current.',

  vars: {
    Vs: { unit: 'V',   label: 'Supply rail',    default: '5',  domain: [0, 60] },
    Vf: { unit: 'V',   label: 'LED Vf',         default: '2.0' },
    If: { unit: 'A',   label: 'Forward current',default: '3m', domain: [1e-6, 1] },
    R:  { unit: 'ohm', label: 'Series resistor',               domain: [1, 1e7] },
  },

  relation: 'R = (Vs - Vf) / If',
  solveFor: 'R',                       // default unknown; UI offers the rest

  closedForm: {                        // optional; engine falls back to numeric
    R:  '(Vs - Vf) / If',
    If: '(Vs - Vf) / R',
    Vs: 'Vf + If * R',
    Vf: 'Vs - If * R',
  },

  derived: [
    { id: 'head', unit: 'V', expr: 'Vs - Vf',  label: 'Headroom' },
    { id: 'Pr',   unit: 'W', expr: 'If^2 * R', label: 'Power in the resistor' },
    { id: 'Pled', unit: 'W', expr: 'Vf * If',  label: 'Power in the LED' },
  ],

  checks: [
    { when: 'If > 25m', level: 'warn',
      text: '{If} is above the 20 mA most small LEDs are characterised at. ' +
            'Check If(max) before leaving it on.' },
    { when: 'head < 0.5', level: 'warn',
      text: 'Only {head} of headroom. Vf varies part to part and falls as the ' +
            'die warms, so the current will wander.' },
  ],

  symbols: {
    Vs: 'the rail feeding LED + resistor (V)',
    Vf: 'forward voltage at the chosen current (V)',
    If: 'forward current (A) — what you are actually designing',
  },
  datasheet: ['Vf @ If', 'If max (continuous)', 'Luminous intensity @ If'],

  examples: [                          // golden tests, from the reference page
    { given: { Vs: 5, Vf: 2.0, If: 3e-3 }, expect: { R: 1000, Pr: 9e-3 } },
  ],
};
```

Three things to notice:

- **`checks` use the same expression language.** `'If > 25m'` is parsed, not
  evaluated by `eval`. `{If}` in the message interpolates the formatted value.
- **`examples` are the test suite.** Every worked example on the Bench Formulas
  page is already arithmetic you checked by hand. Paste them in and
  `definitions.test.js` sweeps all of them. Free regression coverage on day one,
  growing with every calculator.
- **`closedForm` is optional.** Where the rearrangement is trivial, write it and
  the engine uses it. Where it is not (`t = −τ·ln(1 − fraction)` inverted, or
  anything transcendental), leave it out and the numeric solver handles it.

---

## 4. Engine internals

### units.js

Each unit maps to a dimension vector over `[mass, length, time, current, temp]`.
`V` is `[1,2,−3,−1]`, `ohm` is `[1,2,−3,−2]`, and so on. Two jobs:

- **Parse**: `'4k7'`, `'100n'`, `'2.2u'`, `'1e-6'`, `'50 mA'` → a number in SI
  base units. The artifact already has a working parser; harden it and test the
  edges (`'1M'` vs `'1m'`, `'4R7'`, empty, garbage).
- **Format**: engineering notation, 3 significant figures, correct prefix.
  Never `0.00044 A`; always `440 µA`.

Dimension checking runs **at test time, not runtime** — `definitions.test.js`
walks each relation's AST and asserts both sides balance. It catches the class of
bug where you divide by a resistance and label the answer volts, and it costs
nothing at the bench.

### expr.js

Tokenizer plus Pratt parser. Grammar: `+ - * / ^`, unary minus, parens,
identifiers, numbers with SI suffixes, and a fixed function set
(`sqrt ln log10 exp abs min max pi`). Three exports:

```js
parse(src)                    // -> AST
evaluate(ast, scope)          // -> number
substitute(ast, scope, fmt)   // -> string, values in place of names
identifiers(ast)              // -> Set, for validation
```

`substitute` is what produces the worked-arithmetic line under every result,
automatically, from the same tree that computed the number. That line can no
longer disagree with the answer, because it *is* the answer.

### solve.js

```
solveFor(relation, unknown, scope):
  1. closedForm[unknown] exists?  evaluate it.  done.
  2. otherwise: residual(x) = eval(lhs, scope+{unknown:x}) - eval(rhs, ...)
  3. bracket from vars[unknown].domain; expand geometrically if no sign change
  4. no sign change after expansion -> return "can't solve here", NOT a number
  5. Brent's method to tolerance; verify by substituting the root back in
```

Step 4 matters. A numeric solver handed a non-monotonic relation will happily
return one of several roots, or a plausible-looking wrong one. Refusing is the
correct behaviour for a bench tool — and the refusal is visible in the UI, not
swallowed.

### formula.js

Load a definition → validate it → run it. Validation (at test time) asserts:
every identifier in `relation`, `closedForm`, `derived` and `checks` resolves to
a declared var or a prior derived; dimensions balance; every `closedForm` entry
actually satisfies the relation. Running returns a single result object:

```js
{ values: {...}, trace: [ {label, expr, substituted, value, unit} ], checks: [...] }
```

The UI renders that object and knows nothing about any specific calculator.

---

## 5. Phases

Each phase ends when its tests pass. Nothing moves forward on an unproven layer.

| # | Phase | Exit criteria |
|---|---|---|
| **0** | Skeleton — repo, `index.html`, dev server, `node --test` wired, empty modules | `node --test` runs green on zero tests; page loads |
| **1** | `units.js` + `format.js` | Parser round-trips every suffix form; formatter gives correct prefix across 10⁻¹² to 10⁹; dimension table complete for V A Ω W F H Hz s °C °C/W C |
| **2** | `expr.js` | Parses and evaluates every relation in the 17 calculators; precedence and associativity tests; `substitute` output matches hand-written expectations |
| **3** | `solve.js` + `formula.js` | Ohm's law solves for all three variables by closed form and again by forcing the numeric path — same answers; non-monotonic case refuses instead of guessing |
| **4** | Port 3 calculators (ohm, led-resistor, buck) as engine acceptance | Their golden examples from the reference page pass; dimension checks pass |
| **5** | Checks/rules engine | Warnings fire on the right side of each threshold; message interpolation formatted correctly |
| **6** | UI shell — render a calculator generically from a definition; solve-for picker built from `closedForm` keys + domains; hash routing | One calculator fully usable in the browser, keyboard-navigable, dark mode |
| **7** | Port the remaining 14 | All golden examples pass; sidebar search; app matches the design |
| **8** | PWA — manifest, icons, service worker, `tools/precache.sh` | Installs on phone and laptop; airplane mode; update banner on new version |

We are intentionally overlapping Phase 4 and Phase 6: as each calculator is added to the engine, it is also wired into the generic UI so there is a live demo while the test suite keeps the definitions honest. The engine remains the source of truth; the UI only renders it.

Phases 0–3 are the real work. 4–7 are mostly transcription once the engine holds.

**Later, deliberately out of v1:** parts library (IRF9540, L7805, TL431 … with
datasheet figures, prefilling fields), saved scenarios, Obsidian embedding,
tolerance propagation.

Two of those get cheaper if step 6 puts state in the URL hash —
`#/led-resistor?Vs=5&Vf=2&If=3m`. That is bookmarkable, shareable, pasteable
into a kb note, and survives offline with no storage code. It is most of
"saved scenarios" for about twenty lines, which is why scenarios are not in v1.

---

## 6. Risks, and what to do about them

**A stale service worker serving last week's app.** The classic PWA failure.
Version the cache (`bench-v7`), `skipWaiting` on activate, and show an explicit
"new version — reload" banner rather than swapping under the user.

**The precache list rots.** The one place no-build genuinely costs something:
`sw.js` needs a list of files to cache and nothing generates it. `tools/precache.sh`
(a shell script that greps the tree and rewrites the array) keeps it honest —
run it before commit. Not a build step; a maintenance script.

**Numeric solve returning a confident wrong root.** Covered above: declared
domains, sign-change requirement, refusal over guessing. Test each numeric-only
relation against a known answer at both ends of its domain.

**False precision.** Showing `57.32 °C` when Rthja is a typical value with 20 %
spread is a lie with decimals on it. Default to 3 significant figures, and treat
worst-case propagation as a later feature rather than pretending it is not
missing.

**Engine scope creep.** It is tempting to grow this into a general symbolic math
layer. The stopping line: no symbolic rearrangement, no matrices, no complex
numbers, no automatic differentiation. Closed form where you wrote one, Brent
where you did not.

**Types.** No build means no TypeScript. If the untyped definition objects start
biting, JSDoc annotations plus a dev-only `tsc --noEmit` gives real checking
without changing a single shipped byte. Worth reaching for at phase 7, not
before.

---

## 7. First session

1. `git init ~/Projects/bench-calc`, drop this file in at the root.
2. `index.html` + `src/engine/units.js` + `test/units.test.js`.
3. Move the suffix parser and the engineering formatter over from the artifact,
   then write the tests that make them defensible.

That is phase 1 done, and it is the only phase where the artifact code transfers
more or less as-is. From phase 2 the shape genuinely changes.
