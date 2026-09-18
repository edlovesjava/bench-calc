# Design

What `src/style.css` and the UI are checked against. The canvas artifact is a
rendered view of this file, not the other way round.

The look is inherited deliberately from the reference page
(`docs/reference/bench-formulas.html`) so the app and the reference read as one
thing. Do not restyle piecemeal; change this file, then the CSS.

## Tokens

Light is the base. Dark is not decoration — half of bench work happens under a
desk lamp, and a white screen at 11 pm is hostile.

| token | light | dark | used for |
|---|---|---|---|
| `--bg` | `#EEF2F4` | `#0E1418` | page ground |
| `--surface` | `#FFFFFF` | `#151E24` | cards, inputs, sidebar |
| `--ink` | `#13202A` | `#E1E9EE` | body text, result values |
| `--muted` | `#56697A` | `#93A6B4` | labels, captions, worked arithmetic |
| `--rule` | `#CFD9E0` | `#26343D` | borders, dividers |
| `--accent` | `#0B6E8A` | `#56C2DC` | headline result, selected nav, formulas |
| `--accent-soft` | `#DCEEF3` | `#16323B` | datasheet tags, selected pill fill |
| `--accent-ink` | `#0B3B4A` | `#BFE7F2` | text on `--accent-soft` |
| `--warn` | `#9A4A16` | `#F0A060` | the "Watch out:" label only |
| `--warn-soft` | `#F7E8DB` | `#33251B` | warning banner fill |
| `--panel` | `#F4F8FA` | `#111A1F` | inset panels, unit suffix, code |

Contrast, measured, light theme: accent on bg 4.95:1, accent on surface 5.9:1,
white on accent 5.9:1, muted on bg 4.97:1, warn on warn-soft 5.2:1. All clear
4.5:1. Anything lighter than `--muted` for text fails — there is no lighter grey
token on purpose.

## Type

Three families, all Google Fonts, each with a metric-compatible fallback:

- **Display** — Barlow Condensed 600/700, fallback `"Arial Narrow", system-ui`.
  Uppercase, `letter-spacing: 0.02–0.04em`. Page title, section headings, nav
  items.
- **Body** — IBM Plex Sans 400/500/600, fallback `system-ui, -apple-system,
  "Segoe UI"`. 15 px base, `line-height: 1.55`.
- **Mono** — IBM Plex Mono 400/500, fallback `ui-monospace, Menlo, Consolas`.
  **Every number lives here**, without exception: inputs, results, worked
  arithmetic, formulas, units, datasheet tags. Digits that shift width as you
  type are the single worst thing a calculator can do.

Scale: page title `clamp(38px, 7vw, 58px)`; calculator title 34 px display;
card heading 22 px display; body 15 px; labels and captions 12–13 px mono;
headline result 38 px mono; secondary results 19 px mono.

Never Inter, Roboto, or Arial as a first choice.

## Layout — desktop, 1280×800

```
+-- 300px --+---------------------------------------------+
| sidebar   | main, 30px 36px 48px padding                |
|           |                                             |
| brand     |  title + blurb .......... [bench example]   |
| search    |  [mode pills]                               |
| nav       |  +--- 340px ---+--- 1fr ------------------+ |
| (scrolls) |  | inputs card  | headline result          | |
|           |  |              | result rows              | |
|           |  |              | warnings                 | |
| hint      |  |              | notes                    | |
| ref link  |  +--------------+--------------------------+ |
|           |  | formula + symbols, two columns          | |
+-----------+---------------------------------------------+
```

- Sidebar is fixed 300 px, `--surface`, right rule. Nav scrolls inside it
  (`flex: 1; min-height: 0; overflow-y: auto`) so brand, search and the footer
  link stay put.
- Main content column: 340 px inputs + 24 px gap + remaining width for results.
- Cards: `--surface`, 1 px `--rule`, 8 px radius, 18 px padding.
- Sibling groups use flex/grid with `gap`. Never margins between siblings, never
  whitespace-as-spacing.

Phone (390 wide) collapses to one column: nav becomes a full-width picker above
the inputs, inputs and results stack. Same tokens, same type scale.

## Components

**Field.** `<label>` in mono above a bordered row containing `<input>` plus a
unit suffix on `--panel` with a left rule. Hint line in 12 px `--muted`
underneath. Input is `type="text" inputmode="decimal"` — never `type="number"`,
which fights `4k7` and gives you a spinner nobody wants at a bench.

**Headline result.** Label in 11 px mono uppercase `--muted`; value in 38 px
mono `--accent`; the substituted arithmetic under it in 13 px mono `--muted`.
Separated from the rest by a 2 px `--ink` rule.

**Result row.** Label (14 px, 600) and its worked arithmetic on the left,
value right-aligned in 19 px mono. 1 px `--rule` between rows.

**Worked arithmetic.** Always present, always mono, always `--muted`,
`white-space: pre-wrap`. This is the feature, not decoration: the app shows the
substitution it actually performed.

**Warning banner.** `--warn-soft` fill, 6 px radius, bold `--warn` "Watch out: "
prefix, body in `--ink`. Notes use `--panel` with a `--rule` border and no
prefix. Warnings are computed, never static: a threshold that is not crossed
produces no banner.

**Formula card.** `--panel`, two columns: the relation and its derived lines in
17 px mono `--accent`, plus datasheet tags; symbol definitions as a `<dl>` grid
on the right.

## Rules that are not negotiable

- Real elements. `<button>`, `<a href>`, `<input>` + `<label>`, `aria-label` on
  icon-only controls. A div with `onClick` is invisible to Tab and to a screen
  reader.
- 44 px minimum hit target, including sidebar nav items and mode pills.
- Focus is always visible: `outline: 2px solid var(--accent); offset 1px`. Never
  `outline: none`.
- No emoji as UI glyphs. Icons are inline stroke SVG.
- No gradient washes, no left-border accent cards, no fake device chrome.
- Numbers never change font or width between states.

## Where the design came from

Canvas artifact, one interactive artboard at 1280×800, launching focused. It is
a reference to look at, not a source to copy from — this file is what the code
answers to.
