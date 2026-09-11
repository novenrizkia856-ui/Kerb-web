# MOTION-LOG.md

Phase 6 deviation log. Every motion value Kerb ships, set against the reference
value recorded in `DESIGN-SYSTEM.md` section 4, with the permitted deviation
range from brief section 4 alongside.

## 1. Values carried unchanged

| Item | Reference | Kerb | Allowed deviation | Deviation taken |
|---|---|---|---|---|
| Easing curve | `cubic-bezier(.22, 1, .36, 1)` | same | none | none |
| `--dur` | `.22s` | `.22s` | up to 15 percent | 0 percent |
| `--dur-slow` | `.38s` | `.38s` | up to 15 percent | 0 percent |
| Nav morph duration | `.35s` on six properties | same | up to 15 percent | 0 percent |
| Nav morph threshold | `scrollY > 12` | same | none stated | none |
| Nav morph end state | `top 12px`, `width min(1120px, calc(100vw - 24px))`, `radius 4px`, `border-color var(--line)`, `background color-mix(in srgb, var(--bg) 80%, transparent)`, `box-shadow var(--nav-float-shadow)` | same | none | none |
| Typer frame rate | `fps: 20` | `fps: 20` | up to 15 percent | 0 percent |
| Typer cycles | `cycles: 3` | `3` | none stated | none |
| Typer cycle length | `cycleLength: 0.5` | `0.5` | none stated | none |
| Typer char offset curve | bezier `P1 (0, 0.75)`, `P2 (0.75, 0)`, snapped to `0.05` | same | none | none |
| Typer progress quantisation | snapped to `0.1` | same | none | none |
| Typer variations | the six char state classes, shuffled per run | same six, same shuffle | none | none |
| Typer stagger, scroll | `0.12s` | `0.12s` | up to 15 percent | 0 percent |
| Typer stagger, load | `0.15s` | `0.15s` | up to 15 percent | 0 percent |
| Scroll observer | `IntersectionObserver`, `threshold: 0.6`, `disconnect()` on first fire | same | **none** | none |
| Stream pulse duration | `2.6s` linear infinite, all three variants | same | up to 15 percent | 0 percent |
| Stream gradient size | `34% 100%` horizontal, `100% 60%` vertical | same | none | none |
| Stream keyframe stops | `-80%` to `180%`, reversed, and the two elbow phasings | same | none | none |
| Drift | `7s ease-in-out infinite`, `translateY(-8px)`, `rotate(+2.5deg)` at 50 percent | same | up to 15 percent, 8px of distance | 0 percent, 0px |
| Corner tick fade | `opacity 0 to 1` over `var(--dur) var(--ease)` | same | up to 15 percent | 0 percent |
| Slab lift | `translateY(-10px)` over `var(--dur) var(--ease)` | same | 8px of distance | 0px |
| Rise and fade distances | `4px` (`stagein`), `6px` (`fade-in`), `10px` (tab stage) | same three | up to 8px, direction unchanged | 0px, direction unchanged |
| Pulse breathe | `opacity 1 to .45`, `2s infinite` | same | up to 15 percent | 0 percent |
| Gate shake | `translateX ±5px`, `0.35s` | same | up to 15 percent | 0 percent |
| Wordmark torch | `opacity .35s var(--ease)`, `radial-gradient(circle 210px ...)` mask | same | up to 15 percent | 0 percent |
| ASCII rain frame | one logical frame per `110ms` | same | up to 15 percent | 0 percent |
| ASCII rain grid | 54 rows, 220 columns, column period `3 + floor(rand * 7)`, random phase | same | none | none |
| ASCII rain glyph cuts | `x < 0.62` space, `x < 0.81` zero, else one | same | none | none |
| ASCII rain seed | LCG `seed 20325838`, `(1103515245 s + 12345) mod 2147483648` | same | none | none |
| ASCII rain pop layer | probability `0.7`, `2 + floor(rand * 3)` cells | same | none | none |
| ASCII rain opacity | `.05` base, `.32` pop | same | none | none |
| Animation library | none | none | none | none |
| Motion primitives | the eleven in DESIGN-SYSTEM 4.3 | the same eleven, no new one | **none** | none |

**Total timing deviation taken: zero.** Nothing was sped up or slowed down,
no reveal distance changed, no direction changed.

## 2. Structural choices that are not deviations

| Choice | Why it is not a deviation |
|---|---|
| Observer anchored on a short child rather than the whole block | `threshold: 0.6` is kept exactly. The reference only ever applied it to headings, which are always shorter than the viewport. A block taller than the viewport can never reach 60 percent visibility, so the anchor is a heading sized child (`.kwin-row`, `.asym-head`) and the threshold is untouched. |
| Nav rest position `var(--nav-rest-top)` | Defaults to the reference's `0`. Only a page carrying the token strip raises it, because brief 8.1 puts the strip above the nav. The morph itself, its trigger and all six transitioned properties are unchanged. |
| `--accent-text` used for the focus ring and the nav link hover instead of `--accent` | A Phase 2 token split, not a motion change. See `PALETTE.md` step 1. |

## 3. Additions, flagged as brief section 12 requires

The reference has no answer for these, so they were added rather than ported.

| Addition | Reason | What was added |
|---|---|---|
| Focus ring | The reference defines no focus ring anywhere. It suppresses the outline on `.input-well` and relies on the decorative corner ticks elsewhere, which are a decoration rather than an indicator. Brief section 12 requires a visible ring using an accent already in the palette. | `:focus-visible { outline: 1px solid var(--accent-text); outline-offset: 2px; border-radius: 2px }`, at the reference's own 1px border width and 2px house radius. Measured 4.52 to 1 at worst against every background, `PALETTE.md` step 4. |
| Reduced motion, three loops | The reference leaves `ogpulse`, `gate-shake` and the wordmark torch running under `prefers-reduced-motion: reduce`. Brief section 12 says to disable loops where the reference does not. | `.pulse-dot { animation: none }`, `.gate-shake { animation: none }`, `.wordmark-lit { transition: none }` inside the reduced motion block. |
| Reduced motion, toast | New component, so the reference has no rule for it. | `.toast { animation: none }` inside the same block. |

Everything the reference already handled under reduced motion is ported verbatim:
`.fade-in`, `.stage-in`, `.slab:hover img`, `.nav-morph`, `.drifter`,
`.drift-float`, the three stream pseudo elements, the corner tick transitions,
`[data-typer]` in both CSS and JS, and the ASCII rain's early return.

## 4. Reduced motion, verified

Measured by stubbing `matchMedia` and mounting fresh instances of both visuals
and the typer:

| Behaviour | Result |
|---|---|
| Typer | `data-typer-type="done"` immediately, no loop, no scramble |
| Waiting window | renders its settled end state at once, no countdown, no `.stage-in` |
| History panel | five static rows, no `.stage-in`, and the row count does not grow afterwards, so no timer is running |
| List panel | all three rows present immediately |
| ASCII rain | `requestAnimationFrame` loop never installed, the seeded static field stays |

This is the same policy the reference uses: check `matchMedia` before starting
any loop, and mirror the rule in CSS.

## 5. Where each Kerb visual gets its motion

Brief section 7 of the phase workflow asks which primitive each visual is built
from. Primitive numbers refer to `DESIGN-SYSTEM.md` section 4.3.

### Visual A, the waiting window

| Element | Primitive | Detail |
|---|---|---|
| The line filling as the window closes | **P3**, travelling gradient along a hairline | `background-position-x` driven from `100%` to `0%` on a gradient twice the width of the track. Same property and same 1px line as `.stream-line`. |
| The pulse running while it holds | **P3** verbatim | `.stream-line` itself, class and keyframes unchanged, tinted `--state-wait`. |
| The waiting label | **P7**, opacity breathe | carried by the shared `ogpulse` derived rule when the state is live. |
| The resolve into trusted | **P2**, rise and fade | `.stage-in`, `0.28s var(--ease)`, `translateY(4px)` to zero. Reference value, unchanged. |
| Reveal trigger | the reference's observer | `threshold: 0.6`, disconnect on first fire. |

No SVG stroke drawing was available: the reference has none, confirmed by
searching the stylesheet and all twenty chunks. That is why brief 8.3's SVG
option is not the one taken.

### Visual B, history versus list

| Panel | Primitive | Rhythm |
|---|---|---|
| History | **P2**, rise and fade | A row every 700 to 1300ms, irregular, prepended, five visible at a time so the oldest is pushed out. Twelve arrivals, then it stops. Every third row is a poisoned lookalike that renders **identically** to one of the user's real rows, because the attack keeps the head and the tail and changes only the middle that a truncated display never shows. Two of the three genuine addresses end up with an indistinguishable impostor sitting in the panel beside them. |
| List | **P1**, character state scramble | A row every 6000ms, appended, never removed, each one revealed by a fresh `Typer` at `fps: 20`, `cycles: 3`. P1 is the slowest and most deliberate primitive in the file. |

The interval ratio is roughly 6 to 1 and the reveal mechanisms are different
primitives, so the two panels cannot read alike. That contrast is the argument.

### Why the history stream is bounded

It originally ran forever. Two problems with that, both found by running axe
through Lighthouse against the finished page:

1. **WCAG 2.2.2.** Motion that starts on its own, runs past five seconds and
   offers no pause is not allowed. An endless feed is exactly that.
2. **Contrast.** `.stage-in` fades each new row up from zero opacity. With the
   stream running forever there was always a row partway through that fade, and
   axe caught one at 2.73 to 1. At rest every row measures 4.89 to 1 or better.

Capping the stream at twelve arrivals fixes both without touching a single
timing value, and the argument does not need more than twelve to land. The list
panel already stopped on its own after three. Verified: the row count is
identical twenty and twenty four seconds after the panels come into view, and no
row is left below full opacity.

---

# Revision: motion added as a tweak round

Three additions after the first build, requested as "key informative animations
to sections". Recorded here with the same discipline as the original log: what
was reused, what is new, and why.

## 1. Section reveals, reused

| Field | Value |
|---|---|
| What | The steps, properties, limits, contract rows and stat cells fade up as their section arrives |
| Class | `.fade-in`, the reference's own, unchanged. `animation: fade-in var(--dur-slow) var(--ease) both` |
| Why that class | Its `both` fill is what makes a stagger usable. An item with a delay waits at the 0 percent keyframe instead of showing first and then jumping |
| Distance | `translateY(6px)`, the reference's value inside its own keyframe |
| Duration | `var(--dur-slow)`, 0.38s. Unchanged |
| Stagger | 0.12s, the same figure the reference gives its `TyperGroup` |
| Trigger | The reference's observer. `IntersectionObserver`, `threshold: 0.6`, disconnect on first fire, anchored on the first item because a grid can be taller than the viewport |
| Reduced motion | Items are marked revealed immediately, no class added, no observer |
| No script | Nothing is ever hidden. The hide rule is scoped to `[data-js="on"]`, an attribute only `main.js` sets |

**Deviation taken: none.** No new class, no new value.

## 2. Count up on the three figures, ADDED

This one is new and is flagged as new. `notes/DESIGN-SYSTEM.md` 4.3 records
under notable absences that the reference has **no counting or number tween**:
its stat figures are static strings.

| Field | Value |
|---|---|
| What | `270M` and `17M` count from zero when the scale section arrives. `3 of 53` stays static, it is not a magnitude |
| Why | The scale section is the one place where the number itself is the argument. Watching 270 million arrive lands differently from reading it |
| Duration | 900ms |
| Easing | `cubic-bezier(.22, 1, .36, 1)`, the site's own curve, solved in script because a CSS transition cannot drive text content. Same Newton then bisection method the reference uses for its per character offsets |
| Trigger | The same observer as everything else |
| Reduced motion | The final value is written immediately, no loop |
| No script | The HTML already contains `270M` and `17M`, so a page without script reads correctly |

## 3. Rise without fade, a subset of P2

| Field | Value |
|---|---|
| What | `.rise-in`, `translateY(4px)` to zero over 0.28s with `var(--ease)` |
| Relationship to P2 | Identical to `.stage-in` with the opacity channel removed. A subset of an existing primitive, not a new one |
| Why it exists | The history feed in visual B arrives in `--state-danger`, which measures 4.89 to 1 against the panel. Any opacity below 1 puts that under the 4.5 line, so every fading row was a real contrast failure for the length of its tween. axe caught one at 2.73 to 1 |
| Alternative rejected | Lightening `--state-danger` until a mid fade frame clears. That would mean a settled value near 9 to 1, redesigning a state colour to accommodate a transient |
| Where used | The history feed only. `.stage-in` still carries the settled label in visual A and new contact rows in the app, both of which sit above 12 to 1 and are unaffected |
| Verified | Desktop accessibility 100 with no failing audits on three consecutive runs |

## 4. Floating cards in the hero

Not new motion. The drift primitive P6 runs unchanged: `7s ease-in-out
infinite`, `translateY(-8px)`, `rotate` plus 2.5 degrees at 50 percent, negative
per element delays. The reference's own delays and tilts are reused verbatim.

What changed is only the payload. The reference drifted collectible thumbnails,
which Phase 0 removed as its artwork, so the cards carry Kerb's own address
states instead. No image files and no requests.

One measured adjustment: the reference started its drifters at 1024 because its
thumbnails were 56 to 86px wide. A card wide enough for a truncated address is
152px and overlapped the 640px hero column at that width, measured at four
collisions out of four. The side cards now start at 1280 and the inner pair at
1536, both breakpoints the reference already defines. Zero collisions at 1280,
1400 and 1600, and none visible at or below 1024.
