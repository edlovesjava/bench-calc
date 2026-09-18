# Architecture

Three views of the same idea: a formula is written once, as text, and parsed.

All diagrams below are mermaid and validated — GitHub renders them inline, and
Obsidian renders them with the mermaid block it already supports.

## How a result is computed

The path a keystroke takes. Note that `substitute` and `evaluate` walk the
**same AST**: the worked arithmetic under a result cannot disagree with the
result, because it is the result, printed differently.

```mermaid
flowchart TD
    IN["field text, e.g. 4k7"] --> PARSE["parse — units.js"]
    PARSE -->|not a number| BAD["field flagged, no result"]
    PARSE -->|SI value| SCOPE["scope: every known var, in SI"]

    DEF["definition — src/calc/led-resistor.js"] --> RELT["relation text: R = (Vs - Vf) / If"]
    RELT --> AST["expr.parse — one AST"]

    SCOPE --> SOLVE{"solve for the blank var"}
    AST --> SOLVE

    SOLVE -->|closed form declared| EVAL["evaluate AST with scope"]
    SOLVE -->|none| NUM["bracket from domain, Brent on lhs - rhs"]
    NUM -->|no sign change| REFUSE["refuse — cannot solve here"]
    NUM -->|root found| EVAL

    EVAL --> FULL["full scope: inputs + solved value"]
    FULL --> DER["derived expressions, same evaluator"]
    FULL --> SUB["substitute values into the SAME AST"]
    DER --> CHK["checks, e.g. P > Prated / 2"]

    SUB --> RES["result: values + trace + checks"]
    CHK --> RES
    REFUSE --> RES
    RES --> UI["render — ui/ knows no calculator"]
```

Two branches matter more than the happy path:

- **`not a number`** — a bad field produces a flagged field, never a result
  computed from `NaN` that renders as a dash and gets ignored.
- **`no sign change`** — the numeric solver refuses rather than returning one of
  several roots. A confident wrong number is the worst output a bench tool can
  produce.

## Module dependencies

`src/ui` never imports `src/calc`. If the UI needs to special-case a
calculator, the definition format is missing something — fix the format.

```mermaid
flowchart TD
    subgraph engine["src/engine — the real work"]
        units["units.js<br/>parse, dimensions"]
        format["format.js<br/>sig figs, prefixes"]
        expr["expr.js<br/>AST, evaluate, substitute"]
        solve["solve.js<br/>closed form or Brent"]
        formula["formula.js<br/>validate, run, trace"]
    end

    subgraph calc["src/calc — pure data"]
        defs["one file per calculator"]
    end

    subgraph ui["src/ui — knows no calculator"]
        app["app.js"]
        render["render.js"]
    end

    units --> format
    units --> expr
    expr --> solve
    solve --> formula
    format --> formula
    defs --> formula
    formula --> app
    render --> app

    test["test/ — node --test"] -.-> units
    test -.-> expr
    test -.-> solve
    test -.->|sweeps every definition| defs

    app -.->|never imports| defs
```

## Build phases

Solid arrows are order. Dotted arrows are why the order is what it is.
Phases 0 and 1 are done; 2 is next.

```mermaid
flowchart LR
    P0["0 — skeleton<br/>repo, dev server, test runner"]
    P1["1 — units + format"]
    P2["2 — expr.js<br/>tokenizer and Pratt parser"]
    P3["3 — solve.js + formula.js"]
    P4["4 — port 3 calculators<br/>engine acceptance"]
    P5["5 — checks engine"]
    P6["6 — UI shell<br/>generic renderer"]
    P7["7 — port the other 15"]
    P8["8 — PWA<br/>manifest, service worker"]

    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8
    P1 -.->|dimension table| P3
    P2 -.->|same evaluator| P5
    P4 -.->|proves the format| P7
    P6 -.->|app shell to cache| P8

    DOCS["docs/formulas.md"] -.->|transcribed from| P4
    DOCS -.->|transcribed from| P7
    DES["docs/design.md"] -.->|checked against| P6

    classDef done fill:#DCEEF3,stroke:#0B6E8A,color:#0B3B4A
    classDef next fill:#F7E8DB,stroke:#9A4A16,color:#13202A
    class P0,P1 done
    class P2 next
```

Phase exit criteria are in `PLAN.md`. The rule behind the whole chart: nothing
is built on an unproven layer, and a phase with failing tests is not finished.
