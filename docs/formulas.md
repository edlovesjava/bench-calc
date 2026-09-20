# The 18 calculators

Source of truth for `src/calc/*.js`. Each entry below maps one-to-one onto a
definition file; phase 7 is transcription, not design.

Full context for any entry — the prose, the diagrams, the reasoning — is in
`docs/reference/bench-formulas.html`.

## Conventions

- **Identifiers are ASCII**: `dIL` not `ΔIL`, `tau` not `τ`, `Rthja` not
  `Rth(j-a)`. The pretty form goes in the variable's `label`.
- **Units are SI base**: `ohm`, `F`, `H`, `s`, `A`, `V`, `W`, `Hz`, `C`, `J`,
  `degC`, `degC/W`, or `''` for dimensionless.
- **Expression syntax**: `+ - * / ^`, parens, `sqrt() ln() log10() exp() abs()`,
  and `pi`. Nothing else — see `src/engine/expr.js`.
- **Defaults** are written as input strings (`'100u'`, `'4k7'`), because that is
  what the parser is fed and what the field shows.
- **Examples** are worked answers taken from the reference page. They become the
  test corpus. Tolerance is 0.5 % unless stated.
- `kind: procedure` marks a calculator that is an algorithm rather than a
  relation. Those sit outside the solve-for machinery — see CLAUDE.md.

---

## Units & parts

### `eseries` — E-series and combos
`kind: procedure`

| var | unit | label | default |
|---|---|---|---|
| `t` | ohm | Target resistance | `4780` |

Modes: `E24` (5 %), `E12` (10 %), `E96` (1 %).

Procedure: nearest value minimises `abs(ln(Rn / t))` over the series scaled
across the decades around `t`. Parallel pair minimises `abs(Ra*Rb/(Ra+Rb) - t)`
over E24 candidates.

Outputs: nearest series value; error `(Rn - t) / t`; the tolerance band
`Rn * (1 ± tol)`; closest E24 parallel pair `Ra ∥ Rb` with its own error.

Series tables: E12 `10 12 15 18 22 27 33 39 47 56 68 82`; E24 `10 11 12 13 15 16
18 20 22 24 27 30 33 36 39 43 47 51 56 62 68 75 82 91`; E96 is the standard
96-value decade (see `src/engine/units.js` neighbours or any E96 table).

Examples: `t=4780, E24` → nearest `4700`, error `-1.67 %`.

Status: `src/calc/eseries.js` currently implements nearest-value + error + the
tolerance band for E12/E24 only, as the first calculator through the
`kind: procedure` escape hatch. E96 and the parallel-pair minimisation are not
ported yet.

Note: the tolerance band is wider than the gap to the next series value. A 5 %
4.7 k can legitimately measure 4.47–4.94 k.

### `capcode` — Capacitor code decoder
`kind: procedure`

| var | unit | label | default | modes |
|---|---|---|---|---|
| `code` | *(text)* | Printed code | `104` | `dec` |
| `val` | F | Capacitance | `100n` | `enc` |

Decode: `NN` digits followed by a multiplier digit `D` → `NN × 10^D` pF.
`4R7` → 4.7 pF (R is the decimal point). Encode: reverse.

Outputs: capacitance; the same value in pF / nF / µF; reactance at 1 kHz and
1 MHz (`1 / (2*pi*f*C)`).

Examples: `104` → `100n`; `224` → `220n`; `1002` → `10n`; `4R7` → `4.7p`.
`100n` → code `104`.

---

## Resistors

### `ohm` — Ohm's law and power

relation: `V = I * R`

| var | unit | label | default | note |
|---|---|---|---|---|
| `V` | V | V (across R) | `5` | the drop across this resistor, not the rail |
| `I` | A | I (through R) | `50m` | |
| `R` | ohm | R | `100` | |
| `Prated` | W | Part rating | `0.25` | quoted at 70 °C in free air |

closed forms: `V = I * R`, `I = V / R`, `R = V / I`

derived:
- `P = V * I` (W) — also `I^2 * R` and `V^2 / R`; show all three, they agree
- `frac = P / Prated` (dimensionless)

checks:
- warn `P > Prated` — over the rating; it will discolour, drift, then fail
- warn `P > Prated / 2` — runs hot enough to feel, and hot resistors drift

examples: `V=5, R=100` → `I=50m`, `P=0.25`

### `led-resistor` — LED series resistor

relation: `R = (Vs - Vf) / If`

| var | unit | label | default | note |
|---|---|---|---|---|
| `Vs` | V | Supply rail | `5` | |
| `Vf` | V | LED Vf | `2.0` | red 1.8–2.2, green/blue/white 2.8–3.3 |
| `If` | A | Forward current | `3m` | what you are actually designing |
| `R` | ohm | Series resistor | `1k` | |
| `dVfSpread` | V | Assumed Vf spread | `100m` | named so the sensitivity below is a real SI ratio, not a bare constant |

closed forms: all four, trivially.

derived:
- `head = Vs - Vf` (V)
- `Pr = If^2 * R` (W)
- `Pled = Vf * If` (W)
- `sens = dVfSpread / head` (dimensionless) — fractional current change per
  the assumed Vf spread

checks:
- warn `If > 25m` — above the 20 mA most small LEDs are characterised at
- warn `head < 0.5` — Vf spread and thermal drift will swing the current
- fail `head <= 0` — Vf at or above the rail, nothing lights

examples: `Vs=5, Vf=2, If=3m` → `R=1000`, `Pr=9m`, `Pled=6m`

### `divider` — Voltage divider and loading

relation: `Vout = Vin * R2 / (R1 + R2)`

| var | unit | label | default | note |
|---|---|---|---|---|
| `Vin` | V | Vin | `5` | |
| `R1` | ohm | R1 (top) | `10k` | |
| `R2` | ohm | R2 (bottom) | `10k` | |
| `RL` | ohm | Load resistance | *(blank)* | optional; blank = ideal load |

derived:
- `Rsource = R1 * R2 / (R1 + R2)` (ohm) — the Thevenin resistance
- `Rmin = 10 * Rsource` (ohm) — minimum sane load, keeps the error under ~1 %
- `Idiv = Vin / (R1 + R2)` (A), `Pdiv = Vin * Idiv` (W)
- when `RL` is given: `R2e = R2 * RL / (R2 + RL)`,
  `Vloaded = Vin * R2e / (R1 + R2e)`, `err = (Vloaded - Vout) / Vout`

checks:
- warn `RL < 10 * Rsource` — the load is part of the divider now

examples: `Vin=5, R1=10k, R2=10k` → `Vout=2.5`, `Rsource=5k`.
With `RL=5k` → `R2e=3.333k`, `Vloaded=1.25`

Note: into a comparator or op-amp the load is a bias current, not a resistance.
The error is `Iib * Rsource` — 25 nA into 5 k is 125 µV (nothing); into 10 M it
is 250 mV (everything).

---

## Linear supplies

### `regulator` — Linear regulator heat

relation: `P = (Vs - Vd - Vout) * Iout` — the top-level relation can only use
base vars (never a derived quantity), so it is written directly in terms of
`Vs`/`Vd`/`Vout` rather than through the derived `Vin`.

| var | unit | label | default | note |
|---|---|---|---|---|
| `Vs` | V | Supply in | `9` | before the diode |
| `Vd` | V | Series diode drop | `0.8` | 0 if none |
| `Vout` | V | Regulated out | `5` | |
| `Iout` | A | Load current | `200m` | |
| `Ta` | degC | Ambient | `25` | 40–50 is honest inside a box |
| `Rja` | degC/W | Rthja, bare part | `50` | TO-220 free air |
| `Rjc` | degC/W | Rthjc | `5` | |
| `Rsa` | degC/W | Rcs + Rsa, with sink | `11` | 1 mounting + 10 small sink |
| `Vdrop` | V | Dropout | `2` | 2 for a 78xx, 0.3 for an LDO |
| `Tjmax` | degC | Tj max | `125` | named so the checks below aren't a bare magic number |

derived:
- `Vin = Vs - Vd` (V), `head = Vin - Vout` (V)
- `Tj = Ta + P * Rja` (degC)
- `Rsink = Rjc + Rsa` (degC/W), `Tjsink = Ta + P * Rsink` (degC)
- `Imax = (Tjmax - Ta) / (Rja * head)` (A) — and the same with `Rsink`
- `effReg = Vout / Vin`, `effBoard = Vout / Vs` (dimensionless)

checks:
- warn `head < Vdrop` — the output sags and follows the input, ripple and all
- warn `Tj > Tjmax` — thermal shutdown will cycle it
- warn `Tj > Tjmax - 25` — within 25 °C of the limit; a warm day takes it over

examples: `Vs=9, Vd=0.8, Vout=5, Iout=200m, Ta=25, Rja=50` →
`Vin=8.2`, `head=3.2`, `P=0.64`, `Tj=57`.
At `Iout=500m` → `P=1.6`, `Tj=105`; with `Rsink=16` → `Tj=50.6`

Note: a Schottky instead of the silicon diode buys headroom but not coolness —
the regulator just drops more. Heat falls only if `Vin` falls.

### `diode` — Diode drop and dissipation

relation: `Vafter = Vbefore - Vf`

| var | unit | label | default |
|---|---|---|---|
| `Vbefore` | V | Voltage before | `9` |
| `Vf` | V | Vf at this current | `0.8` |
| `If` | A | Current | `200m` |
| `Irated` | A | Part rating If(AV) | `1` |
| `VfSchottky` | V | Vf a Schottky would drop | `0.35` |

derived: `P = Vf * If` (W); `frac = If / Irated`;
`saved = (Vf - VfSchottky) * If` (W) — what a Schottky would save

checks: warn `If > Irated`

examples: `Vbefore=9, Vf=0.8, If=200m` → `Vafter=8.2`, `P=0.16`

Note: Vf falls roughly 2 mV/°C as the junction warms, which is why paralleling
diodes to share current works badly.

---

## Capacitors & inductors

### `rc` — RC time constant and cutoff

relation: `tau = R * C`

| var | unit | label | default |
|---|---|---|---|
| `R` | ohm | R | `10k` |
| `C` | F | C | `100u` |
| `frac` | '' | Reach this fraction | `0.9` |
| `Vfinal` | V | Final voltage | `5` |

derived:
- `t = -tau * ln(1 - frac)` (s) — **no closed form for `frac` from `t`
  without the log; declare the numeric path**
- `settled = 5 * tau` (s) — 99.3 %
- `fc = 1 / (2 * pi * R * C)` (Hz)
- `Vat = frac * Vfinal` (V)

Landmarks: 1τ = 63.2 %, 2τ = 86.5 %, 3τ = 95.0 %, 4τ = 98.2 %, 5τ = 99.3 %.

examples: `R=10k, C=100u` → `tau=1`, `settled=5`, `fc=0.159`

### `reactance` — Reactance Xc and Xl

relation: `Xc = 1 / (2 * pi * f * C)`

| var | unit | label | default |
|---|---|---|---|
| `f` | Hz | Frequency | `50k` |
| `C` | F | C | `100n` |
| `L` | H | L | `100u` |
| `esr` | ohm | Cap ESR | `0.1` |

derived:
- `Xl = 2 * pi * f * L` (ohm)
- `Z = sqrt(Xc^2 + esr^2)` (ohm)
- `fesr = 1 / (2 * pi * esr * C)` (Hz) — above this the cap is a resistor
- `f0 = 1 / (2 * pi * sqrt(L * C))` (Hz)

examples: `C=100u, f=100` → `Xc=15.9`; `C=100n, f=1M` → `Xc=1.59`;
`L=100u, f=50k` → `Xl=31.4`

### `cap-droop` — Cap droop, charge, energy

relation: `dV = I * dt / C`

| var | unit | label | default |
|---|---|---|---|
| `I` | A | Current drawn | `5m` |
| `dt` | s | For how long | `10m` |
| `C` | F | Capacitance | `220u` |
| `V` | V | Rail voltage | `5` |

closed forms: `dV = I*dt/C`, `C = I*dt/dV`, `I = dV*C/dt`, `dt = dV*C/I`

derived: `Q = C * V` (C); `Qmoved = I * dt` (C); `E = 0.5 * C * V^2` (J);
`Eusable = 0.5 * C * (V^2 - (0.9*V)^2)` (J)

checks: warn `dV > 0.1 * V` — past most brown-out thresholds on a digital rail

examples: `I=5m, dt=10m, C=220u` → `dV=0.227`; `C=220u, V=5` → `E=2.75m`

Note: assumes nothing recharges the cap during `dt`. With a regulator still
supplying current the cap only covers what the regulator cannot follow.

### `inductor-ramp` — Inductor current ramp

relation: `dI = V * dt / L`

| var | unit | label | default |
|---|---|---|---|
| `V` | V | Voltage across L | `4` |
| `L` | H | Inductance | `100u` |
| `dt` | s | For how long | `11.1u` |
| `R` | ohm | Loop resistance (DCR) | `0.1` |
| `Isat` | A | Inductor Isat | `1` |

derived: `slope = V / L` (A/s, dimensionless here); `tauLR = L / R` (s);
`fracTau = dt / tauLR`; `E = 0.5 * L * dI^2` (J)

checks:
- warn `dI > Isat` — past saturation L collapses, so the slope steepens and the
  current runs away faster than this predicts
- note when `fracTau > 0.2` — the straight-line model is getting optimistic

examples: `V=4, L=100u, dt=11.1u` → `slope=40000`, `dI=0.444`

### `lc` — LC resonance

relation: `f0 = 1 / (2 * pi * sqrt(L * C))`

| var | unit | label | default |
|---|---|---|---|
| `L` | H | L | `100u` |
| `C` | F | C | `220u` |
| `R` | ohm | Loop resistance | `0.2` |
| `fsw` | Hz | Switching frequency | `50k` |

derived: `Z0 = sqrt(L / C)` (ohm); `Q = Z0 / R`; `ratio = fsw / f0`;
`atten = 40 * log10(ratio)` (dB, two-pole roll-off)

checks:
- warn `ratio < 10` — the filter passes most of the ripple and rings on a load step
- note `Q > 5` — it will ring for roughly Q cycles at f0

examples: `L=100u, C=220u` → `f0=1.07k`

---

## Buck converter

### `buck` — Buck converter sizing

relation: `D = Vout / Vin`

| var | unit | label | default |
|---|---|---|---|
| `Vin` | V | Input | `9` |
| `Vout` | V | Output | `5` |
| `Iout` | A | Load current | `500m` |
| `L` | H | Inductor | `100u` |
| `C` | F | Output cap | `220u` |
| `esr` | ohm | Cap ESR | `0.1` |
| `fsw` | Hz | Switching frequency | `50k` |
| `Isat` | A | Inductor Isat | `1` |

derived:
- `T = 1 / fsw` (s), `ton = D * T` (s)
- `dIL = (Vin - Vout) * D / (L * fsw)` (A p-p)
- `Ipeak = Iout + dIL / 2` (A), `Ivalley = Iout - dIL / 2` (A)
- `dVc = dIL / (8 * fsw * C)` (V p-p)
- `dVesr = dIL * esr` (V p-p)
- `dVtotal = dVc + dVesr` (V p-p)
- `rippleFrac = dIL / Iout` — 30–40 % is the usual target

checks:
- warn `Ipeak > 0.8 * Isat` — saturation is gradual; L sags before the datasheet number
- warn `Ivalley < 0` — discontinuous conduction; these CCM equations no longer hold
- warn `dVesr > 3 * dVc` — a bigger electrolytic will not help; low-ESR or a ceramic will

examples: `Vin=9, Vout=5, Iout=500m, L=100u, C=220u, esr=0.1, fsw=50k` →
`D=0.556`, `T=20u`, `ton=11.1u`, `dIL=0.444`, `Ipeak=0.722`,
`dVc=5.05m`, `dVesr=44.4m`

Note: a hysteretic converter has no fixed `fsw` — the switch flips when the
output crosses the comparator band, so frequency falls out of the band width,
L, C and the load. Enter the frequency you measured; these give the sizes at
that operating point.

---

## Comparators & references

### `hysteresis` — Comparator hysteresis (non-inverting)

relation: `Vrise = Vref * (1 + R1 / R2)`

| var | unit | label | default | note |
|---|---|---|---|---|
| `Vcc` | V | Vcc | `5` | |
| `Vref` | V | Vref on (−) | `2.5` | |
| `R1` | ohm | R1 (signal to +) | `10k` | |
| `R2` | ohm | R2 (feedback) | `100k` | |
| `Rpu` | ohm | Output pull-up | `4.7k` | 0 for push-pull |

derived:
- `dVhyst = Vcc * R1 / R2` (V)
- `Vfall = Vrise - dVhyst` (V)
- `R2e = R2 + Rpu` (ohm) — the pull-up is in series with R2 when the output is high
- `VriseE = Vref * (1 + R1 / R2e)`, `dVhystE = Vcc * R1 / R2e` (V)
- `Isink = Vcc / Rpu` (A) — must stay under Iol

checks:
- warn `Rpu > R2 / 10` — it shifts the band; use the corrected figures or drop Rpu
- warn `dVhyst < 0.02` — comparable to the LM393's own input offset

examples: `Vcc=5, Vref=2.5, R1=10k, R2=100k` → `Vrise=2.75`, `dVhyst=0.5`,
`Vfall=2.25`

Note: Vol is not 0 V. An LM393 sinking a few mA sits at 0.1–0.4 V, so the real
band is slightly narrower than `Vcc * R1/R2`.

### `tl431` — TL431 shunt reference

relation: `Vka = Vref * (1 + R1 / R2) + Iref * R1`

| var | unit | label | default |
|---|---|---|---|
| `Vref` | V | Internal Vref | `2.495` |
| `R1` | ohm | R1 (K to REF) | `10k` |
| `R2` | ohm | R2 (REF to GND) | `10k` |
| `Iref` | A | Iref | `2u` |
| `Vs` | V | Supply | `9` |
| `Ika` | A | Wanted Ika | `1.5m` |
| `Iload` | A | Load off the node | `0` |

derived:
- `Rbias = (Vs - Vka) / (Ika + Iload)` (ohm)
- `Ireal = (Vs - Vka) / Rbias_fitted - Iload` (A) — after rounding to E24
- `errTerm = Iref * R1 / Vka` (dimensionless)
- `Pdev = Vka * Ireal` (W), `Pbias = (Vs - Vka) * (Ireal + Iload)` (W)

checks:
- warn `Ireal < 1m` — below Imin the device leaves regulation
- warn `errTerm > 0.01` — the Iref·R1 term is over 1 % of the output; shrink R1

examples: `R1=R2=10k, Vref=2.495, Iref=2u` → `Vka=5.01`.
`R1=3.3k, R2=10k` → `Vka=3.33`. REF tied to K, `Vs=5, Ika=1.5m` → `Rbias=1.67k`

Note: load current comes from the node, not from the TL431 — it sinks whatever
the load does not. Size Rbias for Ika(min) + Iload(max), then check the device
can absorb the lot at no load.

---

## Transistor switches

### `bjt-switch` — BJT saturated switch

relation: `Rb = (Vdrive - Vbe) / Ib`

| var | unit | label | default | note |
|---|---|---|---|---|
| `Ic` | A | Load current | `9m` | |
| `beta` | '' | βforced | `10` | NOT hFE — that is linear-region gain |
| `Vdrive` | V | Drive voltage | `5` | |
| `Vbe` | V | Vbe | `0.7` | up to ~1 V saturated hard |
| `Rs` | ohm | Resistance already in the drive | `0` | e.g. an open-collector pull-up |
| `Vcesat` | V | Vce(sat) | `0.3` | |

derived:
- `Ib = Ic / beta` (A)
- `Rtotal = (Vdrive - Vbe) / Ib` (ohm), `Rb = Rtotal - Rs` (ohm)
- `Psat = Vcesat * Ic` (W), `Prb = (Vdrive - Vbe) * Ib` (W)

checks:
- warn effective `Ic / Ib > 20` — too gentle; it sits in the linear region and
  dissipates `Vce * Ic` instead of `Vce(sat) * Ic`
- warn `Vdrive - Vbe < 1` — Vbe spread then dominates the base current

examples: `Ic=9m, beta=10, Vdrive=5, Vbe=0.7` → `Ib=0.9m`, `Rb=4.78k` → fit 4.7k

Note: over-driving the base is what makes turn-off slow — the stored charge has
to come back out. Hence storage time, and why a Baker clamp helps at speed.

### `mosfet` — MOSFET losses

relation: `Pcond = Id^2 * Rdson * D`

| var | unit | label | default | note |
|---|---|---|---|---|
| `Id` | A | Drain current | `500m` | |
| `Rdson` | ohm | Rds(on) | `0.2` | valid only at its stated Vgs |
| `D` | '' | Duty cycle | `0.556` | 1 for a static switch |
| `Vin` | V | Voltage switched | `9` | |
| `Qgd` | C | Miller charge | `29n` | |
| `Vplateau` | V | Plateau voltage | `4.5` | |
| `Rg` | ohm | Gate drive resistance | `1k` | |
| `fsw` | Hz | Switching frequency | `50k` | |

derived:
- `Ig = Vplateau / Rg` (A)
- `tsw = Qgd / Ig` (s)
- `Psw = 0.5 * Vin * Id * tsw * fsw` (W) — per edge
- `Ptotal = Pcond + Psw` (W)
- `edgeFrac = tsw * fsw` (dimensionless)
- `IgFor100ns = Qgd / 100n` (A)

checks:
- warn `Psw > Pcond` — the gate drive is heating the FET, not the load; a lower
  Rg fixes it, a bigger FET does not
- warn `edgeFrac > 0.1` — the linear estimate is optimistic and the scope will
  show triangles

examples: `Id=500m, Rdson=0.2, D=0.556` → `Pcond=27.8m`.
`Qgd=29n, Vplateau=4.5, Rg=1k` → `Ig=4.5m`, `tsw=6.44u`, `Psw=0.725`

Reference table — Rds(on) max at the stated Vgs: IRF9540 (P) 0.20 Ω @ −10 V;
IRF9540N (P) 0.117 Ω @ −10 V; IRFZ44N (N) 17.5 mΩ @ 10 V; RFP30N06LE (N, logic)
47 mΩ @ 5 V; 2N7000 (N, small) ≈5 Ω @ 10 V.

Note: Vgs(th) (−2 to −4 V on an IRF9540) is where conduction starts at 250 µA.
It is not the voltage for fully on — use the Vgs printed beside Rds(on).

---

## Signals

### `db` — Decibels

relation: `dB = 20 * log10(V2 / V1)`

| var | unit | label | default | modes |
|---|---|---|---|---|
| `V2` | V | Output level | `1` | `todb` |
| `V1` | V | Input level | `1m` | `todb` |
| `dB` | '' | Decibels | `68` | `fromdb` |
| `level` | V | Apply it to this level | `1` | `fromdb` |

closed forms: `dB = 20*log10(V2/V1)`, `V2 = V1 * 10^(dB/20)`,
`V1 = V2 / 10^(dB/20)`

derived: `ratioV = 10^(dB/20)`; `ratioP = 10^(dB/10)`;
`applied = level * ratioV`; `rejected = level / ratioV`

Landmarks: −3 dB = ×0.707 V, ×0.5 P. +3 = ×1.41, ×2. +6 = ×2, ×4.
+20 = ×10, ×100. +40 = ×100, ×10⁴. +60 = ×1000, ×10⁶.

examples: `dB=60, level=1` → `rejected=1m` (60 dB ripple rejection, 1 V in →
1 mV out)

Datasheet parameters this connects to: PSRR, CMRR, open-loop gain Avol, ripple
rejection (L7805: 68 dB typ).
