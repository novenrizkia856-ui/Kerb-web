# DESIGN-SYSTEM.md

Phase 0 extraction. Every value below is copied from the reference file. Where the
reference has no answer, the entry reads `NOT PRESENT`. Nothing here is a proposal.

## Source

| Field | Value |
|---|---|
| Reference file | `C:\Users\NOVEN\Downloads\Open Gacha Protocol by NFW.html` (132,278 bytes) |
| Saved from | `https://www.opengacha.io/` (comment on line 2 of the file) |
| Companion assets | `Open Gacha Protocol by NFW_files/` (36 files) |
| Stylesheet carrying the whole design system | `Open Gacha Protocol by NFW_files/3wpj_kk6gf4qj.css` (60,901 bytes, 3 physical lines) |
| Behaviour source | 20 Turbopack chunks in the same folder. Relevant logic isolated below |
| Inline `<style>` blocks in the HTML | none. All CSS is in the one external file plus `style=` attributes |

Line references written as `ref.css:N` point at the pretty printed copy of the
stylesheet used during extraction (3,696 lines). Line references written as
`body:N` point at the pretty printed copy of `<body>` (1,171 lines).

---

## 1. Colour

### 1.1 Dark theme, `:root` (ref.css:2596)

`color-scheme:dark`. This is the default. The file ships with `data-theme=""` on `<html>`.

| Token | Hex | HSL | Alpha | Count in CSS | Where it appears | Inferred role |
|---|---|---|---|---|---|---|
| `--bg` | `#080404` | `hsl(0, 33.3%, 2.4%)` | 1 | 1 def | `body` background, `.cells > *`, nav background, footer background, `.rule` pseudo element ink block, `.btn` foreground | Page base |
| `--surface` | `#121010` | `hsl(0, 5.9%, 6.7%)` | 1 | 1 def | `.panel`, `.slab img` backing, `.cells--surface > *`, mobile nav bar | Surface layer 1 |
| `--cell` | `#191919` | `hsl(0, 0%, 9.8%)` | 1 | 1 def | hero eyebrow chip, tab list selected item, tab stage panel | Surface layer 2, raised |
| `--well` | `#0e0e0e` | `hsl(0, 0%, 5.5%)` | 1 | 1 def | `.input-well` background | Recessed surface, inputs |
| `--hairline` | `#ffffff1a` | `hsl(0, 0%, 100%)` | 10.2% | 1 def | `.panel` border, `.cells` grid gap ink and outer border, nav bottom border at rest, section dividers, `.slab img` border | Hairline, one device pixel separation |
| `--line` | `#303030` | `hsl(0, 0%, 18.8%)` | 1 | 1 def | `.btn-ghost` border, `.input-well` border, `.frame` dashed side rails, `.rule` dashed top rule, chip outlines, dotted leaders, footer wordmark stroke, nav border when floating | Border, visible |
| `--text` | `#ffffff` | `hsl(0, 0%, 100%)` | 1 | 4 uses | body colour, headings, `.btn` background, `.stream-line` base at 30 percent, `.ascii-rain` glyphs at 5 percent | Text primary |
| `--value` | `#d9d9d9` | `hsl(0, 0%, 85.1%)` | 1 | 1 def | code block body text, footer tagline | Text, near primary. Data values |
| `--muted` | `#929292` | `hsl(0, 0%, 57.3%)` | 1 | 1 def | all body paragraphs, nav links, `.btn-ghost` label, `.btn-corner` label and corner ticks, `.rule` plus marks | Text secondary |
| `--faint` | `#ffffff75` | `hsl(0, 0%, 100%)` | 45.9% | 1 def | `.label` colour, micro captions, footnotes, inactive tab numerals, `.corners > .c` | Text muted |
| `--accent` | `#ff8700` | `hsl(31.8, 100%, 50%)` | 1 | 3 uses | `.input-well:focus` border, `.nav-link:hover`, `.skip-link` background, `.stream-line` travelling pulse, `--typer-accent`, `.grad-text` stop 1, disconnect menu item | Accent primary. OpenGacha brand orange |
| `--accent-lit` | `#f6ae2d` | `hsl(38.5, 91.8%, 57.1%)` | 1 | 1 def | step numerals `01..04`, `You 75%` fill bar, live pulse dot, active tab numeral | Accent, lighter. Data highlight |
| `--accent-deep` | `#c65e00` | `hsl(28.5, 100%, 38.8%)` | 1 | 1 def | outline of the `You 75%` chip | Accent, darker. Outline only |
| `--warn` | `#f6ae2d` | `hsl(38.5, 91.8%, 57.1%)` | 1 | 1 def | declared. No use found on this page | State: warning |
| `--track` | `#ffffff24` | `hsl(0, 0%, 100%)` | 14.1% | 1 def | declared. No use found on this page | Track for a bar or slider |
| `--backdrop` | `#ffffff12` | `hsl(0, 0%, 100%)` | 7.1% | 1 def | `.panel-hover:hover`, `.docs-rail-link:hover`, active nav link background | Hover wash |
| `--nav-float-shadow` | `0 14px 36px #00000073` | `hsl(0, 0%, 0%)` | 45.1% | 1 def | nav box shadow once scrolled | Elevation shadow |

Hard coded colours outside the token set, dark theme:

| Value | Count | Where | Role |
|---|---|---|---|
| `#ff8700` | 1 | `::selection` background (ref.css:2864) | Literal repeat of `--accent` |
| `#000` | 3 | `::selection` colour, `.skip-link` colour, `--typer-accent-ink` | Ink on accent |
| `#f6ae2d` | 1 | `.grad-text` gradient stop 2 (ref.css:3127) | Literal repeat of `--accent-lit` |
| `#0000` | 21 | shorthand for `transparent` throughout | Transparent |
| `rgba(0, 0, 0, 0.35)` | 1 | wallet menu box shadow, JS inline | Elevation shadow |

### 1.2 Light theme, `:root[data-theme=light]` (ref.css:2623)

Toggled by a nav button labelled `Switch to light theme`. `color-scheme:light`.

| Token | Hex | HSL | Alpha |
|---|---|---|---|
| `--bg` | `#faf7f5` | `hsl(24, 33.3%, 97.1%)` | 1 |
| `--text` | `#16130f` | `hsl(34.3, 18.9%, 7.3%)` | 1 |
| `--surface` | `#ffffff` | `hsl(0, 0%, 100%)` | 1 |
| `--line` | `#c4bfbc` | `hsl(22.5, 6.3%, 75.3%)` | 1 |
| `--hairline` | `#0000001a` | `hsl(0, 0%, 0%)` | 10.2% |
| `--value` | `#2a2622` | `hsl(30, 10.5%, 14.9%)` | 1 |
| `--muted` | `#5e635e` | `hsl(120, 2.6%, 37.8%)` | 1 |
| `--faint` | `#14100c8c` | `hsl(30, 25%, 6.3%)` | 54.9% |
| `--cell` | `#f0ece8` | `hsl(30, 21.1%, 92.5%)` | 1 |
| `--well` | `#efeae6` | `hsl(26.7, 22%, 92%)` | 1 |
| `--accent` | `#ff8700` | `hsl(31.8, 100%, 50%)` | 1 |
| `--accent-lit` | `#c65e00` | `hsl(28.5, 100%, 38.8%)` | 1 |
| `--accent-deep` | `#a85a00` | `hsl(32.1, 100%, 32.9%)` | 1 |
| `--warn` | `#b45309` | `hsl(26, 90.5%, 37.1%)` | 1 |
| `--track` | `#0000001f` | `hsl(0, 0%, 0%)` | 12.2% |
| `--backdrop` | `#0000000f` | `hsl(0, 0%, 0%)` | 5.9% |
| `--nav-float-shadow` | `0 14px 32px #1f160e24` | `hsl(31, 18%, 10%)` | 14.1% |

Note the deliberate inversion: in light theme `--accent-lit` and `--accent-deep`
become darker than `--accent`, not lighter. The names describe position in the
gradient, not lightness.

### 1.3 Code syntax palette (inline `style` in the `In code` section, body:678)

Not tokenised. Present only inside one `<pre>`.

| Hex | HSL | Count | Role |
|---|---|---|---|
| `#8a8a8a` | `hsl(0, 0%, 54.1%)` | 24 | punctuation |
| `#7aa2f7` | `hsl(220.8, 88.7%, 72.4%)` | 12 | keyword |
| `#e0af68` | `hsl(35.5, 65.9%, 64.3%)` | 6 | function name |
| `#9ece6a` | `hsl(88.8, 50.5%, 61.2%)` | 2 | string |
| `#6b6b6b` | `hsl(0, 0%, 42%)` | 2 | comment |

### 1.4 Accent hue count

Distinct accent hues in the dark palette: **one**. Every accent sits between
`hsl(28.5)` and `hsl(38.5)`. The code palette adds blue `220.8` and green `88.8`,
but only inside the code block.

### 1.5 Glows and gradients

| Name | Definition | Where |
|---|---|---|
| `.grad-text` | `linear-gradient(92deg, var(--accent) 10%, #f6ae2d 90%)`, clipped to text | second line of the h1 |
| `.grad-text`, light | `linear-gradient(92deg, var(--accent-lit) 10%, var(--accent-deep) 90%)` | same |
| stream pulse, horizontal | `linear-gradient(90deg, transparent, var(--accent) 50%, transparent)`, `34% 100%` size | `.stream-line:after`, `.stream-elbow-h:after` |
| stream pulse, vertical | `linear-gradient(180deg, transparent, var(--accent) 50%, transparent)`, `100% 60%` size | `.stream-elbow-v:after` |
| hover corner ticks | eight `linear-gradient(var(--tick), var(--tick))` layers, `9px 1px` and `1px 9px`, pinned to the four corners, `--tick: var(--muted)` | `.btn`, `.btn-ghost`, `.btn-solid`, `.panel-hover`, `.docs-rail-link`, `.hover-corners` |
| hatch fill | `repeating-linear-gradient(-45deg, var(--line) 0 2px, transparent 2px 6px)` | the `Protocol 25%` slice of the fee bar |
| dotted leader | `border-bottom: 1px dotted var(--line)` | ledger rows |
| spotlight mask | `radial-gradient(circle 210px at var(--mx, 50%) var(--my, 50%), black 0%, transparent 72%)` | footer wordmark |

No box shadow glow, no `filter: drop-shadow`, no blurred colour blobs anywhere.
The only blur is `backdrop-filter: blur(14px)` on the nav.

---

## 2. Typography

### 2.1 Families

| Family | Source | Weights loaded | Variable | Declared as |
|---|---|---|---|---|
| GeistSans | Self hosted `woff2`, one variable file, `font-display:swap` | `100 900` (single variable axis) | yes | `--font-geist-sans` then `--font-sans` and `--font-display` |
| GeistMono | Self hosted `woff2`, one variable file, `font-display:swap` | `100 900` | yes | `--font-geist-mono` then `--font-mono` |
| GeistSans Fallback | `local(Arial)` with metric overrides: `ascent-override:94.56%`, `descent-override:27.76%`, `line-gap-override:0.0%`, `size-adjust:106.28%` | n/a | no | second entry in the sans stack |
| `"Helvetica Neue", Helvetica, Arial, sans-serif` | system | `700` | no | footer wordmark only, hard coded inline |

Resolved stacks:

```
--font-display : var(--font-geist-sans), system-ui, -apple-system, sans-serif
--font-sans    : var(--font-geist-sans), system-ui, -apple-system, sans-serif
--font-mono    : var(--font-geist-mono), ui-monospace, "SF Mono", Menlo, monospace
```

`--font-display` and `--font-sans` are identical. There is no separate display face.

**The two `woff2` files are NOT PRESENT in the saved asset folder.** The stylesheet
points at `../media/Geist_Variable-s.p.0mrjj4bg00-he.woff2` and
`../media/GeistMono_Variable.p.3ms9vq719j3f8.woff2`, neither of which was saved.
Geist and Geist Mono are published by Vercel under SIL OFL 1.1, so the files can be
obtained and self hosted. Flagged for Phase 1.

### 2.2 Sizes actually rendered

Every size is a fixed pixel value written inline as a Tailwind arbitrary value.
There is no `clamp()` anywhere, and no `rem` based type scale. Two exceptions use
viewport units, both decorative.

| Size | Line height | Tracking | Weight | Count | Used by |
|---|---|---|---|---|---|
| `62px` (`sm:`) / `44px` (`min-[420px]:`) / `36px` | `1.05` at sm, `1.08` below | `-0.03em` | 600 | 1 | `h1`, hero |
| `40px` (`sm:`) / `32px` | `1.05` | `-0.03em` | 500 | 1 | footer CTA `h2` |
| `40px` (`sm:`) / `34px` | `leading-none` | `-0.03em` | 500 | 3 | stat figures, tabular nums |
| `32px` (`sm:`) / `28px` | `1.15` | `-0.02em` | 500 | 1 | `Who it is for` `h2` |
| `24px` | `1.1` or `1.15` | `-0.02em` | 500 | 4 | section `h2` |
| `20px` | default | `-0.02em` | 500 | 2 | `h3` |
| `17px` (`sm:`) / `16px` | `1.65` | none | 400 | 1 | hero lead paragraph |
| `17px` | `leading-none` | `-0.02em` | 500 | 1 | footer wordmark row |
| `15px` | `1.8` or `leading-none` | `-0.01em` or `-0.02em` | 500 | 21 | card titles, nav brand, tab labels |
| `14px` | `1.7` | none | 400 | 1 | footer CTA paragraph |
| `13.5px` | `1.65` or `leading-none` | none | 400 or 500 | 13 | nav links, body copy in split panels, footer tagline |
| `13px` | `1.65` | none | 400 | 9 | small body copy, mono row value |
| `12.5px` | `1.6` or `2` | none | 400 or 500 | 35 | card body copy, footer links, code block |
| `12px` | `1.7` or `leading-none` | `0.08em` when uppercase | 400 or 500 | 19 | button labels, tab strip, footnotes |
| `11px` | `leading-[32px]` or `leading-none` | `0.08em` | 500 | 14 | `.label`, small buttons, copyright |
| `10.5px` | `leading-none` | `0.08em` | 400 | 30 | ledger rows, uppercase mono micro labels |
| `10px` | `leading-none` | `0.08em` | 500 | 5 | mobile nav labels, ledger footnote |
| `8px` | default | none | 400 | 12 | stream diagram edge labels |
| `16.4vw` | `0.82` | `-0.02em` | 700 | 1 | footer wordmark, decorative |
| `12px` | `1.7` | `0.35em` | 400 | 2 | `.ascii-rain`, decorative |

Inputs bump to `16px` on mobile and drop to `12px` or `13px` at `sm:` to stop iOS
zooming on focus. Pattern: `text-[16px] sm:text-[13px]`.

### 2.3 Tracking values

`0.08em` (42 uses, always with `text-transform:uppercase` and the mono family),
`-0.01em` (12), `-0.02em` (17), `-0.03em` (8), `0.35em` (ascii rain), `0.06em`
(one input). Nothing else.

### 2.4 Weights actually used

`400` implicit, `500` (70 uses), `600` (1 use, the `h1`), `700` (footer wordmark
only). `--font-weight-bold` and `--font-weight-extrabold` exist in the Tailwind
theme block but are unused on this page.

---

## 3. Space and shape

### 3.1 Container and gutters

| Element | Value |
|---|---|
| Content container | `max-width: 1200px`, `margin-inline: auto` |
| Container padding | `16px`, rising to `24px` at `min-width: 640px` |
| Page frame | `.page-frame { margin: 0 10px 10px; border: 1px solid var(--line); border-top: none; padding-top: var(--nav-h) }`, margin rises to `14px` at `640px` |
| Effective minimum side gutter | `10 + 1 + 16 = 27px` at the narrowest width |
| Vertical rails | `.frame { border-inline: 1px dashed var(--line) }` wrapping the section stack and the footer grid |
| Nav height | `--nav-h: 54px`, `62px` at `min-width: 640px` |
| Mobile bottom nav height | `--mobile-nav-h: calc(56px + env(safe-area-inset-bottom, 0px))`, `0px` at `min-width: 640px` |

### 3.2 Section vertical padding

| Section kind | Padding |
|---|---|
| Hero | `px-6 pt-20 pb-20 sm:px-10 sm:pt-24` (24/80/80, then 40/96/80) |
| Section label bar | `px-6 py-4 sm:px-10` (24/16, then 40/16) |
| Standard section | `px-6 pt-10 pb-12 sm:px-10` (24/40/48, then 40/40/48) |
| Split grid cell | `px-8 py-10 sm:px-10 sm:py-12` (32/40, then 40/48) |
| Tabs section | `px-6 pt-14 pb-12 sm:px-10` |
| Footer CTA | `px-6 pt-24 pb-20` |
| Footer link grid | `px-2 pt-12 pb-4 sm:px-6` |
| Footer legal row | `px-2 pt-8 pb-6 sm:px-6` |

### 3.3 Spacing scale actually used

Tailwind `--spacing: .25rem`, so every step is 4px. Steps in use, by frequency:
`2.5` (10px), `2` (8px), `3` (12px), `1` (4px), `1.5` (6px), `4` (16px), `6` (24px),
`10` (40px), `5` (20px), `8` (32px), `12` (48px), `9` (36px), `3.5` (14px),
`7` (28px), `14` (56px), `20` (80px), `24` (96px). No value outside the 4px grid
except the `0.5` half steps, which land on 2px.

### 3.4 Radii

| Value | Where |
|---|---|
| `2px` | `.panel`, `.btn`, `.btn-ghost`, `.btn-solid`, `.input-well`, every inline chip |
| `3px` | drifter thumbnails (`rounded-[3px]`) |
| `4px` | `.panel-hover`, `.skip-link`, `.slab img`, `--typer-radius`, nav when scrolled |
| `6px` | wallet dropdown (`rounded-[6px]`, JS only) |
| `8px` | nav brand link (`rounded-lg`) |
| `9999px` | live pulse dot (`rounded-full`) |

`2px` is the house radius. `4px` is the interaction radius.

### 3.5 Border widths

`1px` everywhere, solid or dashed or dotted. Exceptions: `2px` on the travelling
stream pulse, `3px` on the divider inside the fee bar, `1px` and `1.2px`
`-webkit-text-stroke` on the two footer wordmark layers.

Dash styles carry meaning: `solid` for structure, `dashed` for the section rules
and the outer frame rails, `dotted` for ledger leaders.

### 3.6 Shadows and blurs

| Name | Value | Where |
|---|---|---|
| `--nav-float-shadow` dark | `0 14px 36px #00000073` | nav, only once scrolled |
| `--nav-float-shadow` light | `0 14px 32px #1f160e24` | same |
| tab underline | `box-shadow: 0 1px 0 var(--text)` | active tab in the code card |
| dropdown | `0 16px 40px rgba(0, 0, 0, 0.35)` | wallet menu, JS inline |
| backdrop blur | `blur(14px)` | nav, always on |
| `--blur-xl` | `24px` | declared in the Tailwind theme block, unused |

There is no ambient shadow on cards. Depth is carried by hairlines and by the
`--surface` / `--cell` / `--well` lightness steps, not by shadow.

---

## 4. Motion

### 4.1 The two global motion constants

```
--ease      : cubic-bezier(.22, 1, .36, 1)
--dur       : .22s
--dur-slow  : .38s
```

`cubic-bezier(.22, 1, .36, 1)` is the curve commonly published as `easeOutQuint`.
Every transition and every keyframe animation on this page uses either this curve,
`linear` (the four stream keyframes), or `ease-in-out` (the drift keyframe).
Tailwind's own `--ease-out: cubic-bezier(0, 0, .2, 1)` and
`--default-transition-timing-function: cubic-bezier(.4, 0, .2, 1)` exist in the
theme block but no class on this page uses them.

### 4.2 Animation inventory

#### A. Typed heading scramble

| Field | Value |
|---|---|
| Name | Per character scramble reveal. Each glyph cycles through six inked states before settling |
| Trigger | Scroll into view, `IntersectionObserver`, `{ threshold: 0.6 }`, `disconnect()` on first fire so it runs once. The hero heading is the exception: it fires on mount with no observer |
| Properties | `className` on each `<span class="char">`. No transform, no opacity transition. The six states are `charFill`, `charInverse`, `charAccent`, `charAccentInverse`, `charAccentFill`, `charBorder`, shuffled per run |
| Duration | Frame driven, not time driven. `frames = fps * (1 + 0.01 * charCount)`, `fps = 20`, so a 20 character line runs `20 * 1.2 = 24` frames at 50ms, about `1.2s` |
| Easing | Per character start offset from a cubic bezier solved by Newton then bisection, control points `P1 = (0, 0.75)`, `P2 = (0.75, 0)`, output quantised with `round(x / 0.05) * 0.05`. Progress within a character quantised with `round(x / 0.1) * 0.1` |
| Delay and stagger | `TyperGroup` gives element index `i` a delay of `i * stagger`. `stagger = 0.12s` for `TypedHeading`, `0.15s` for the hero |
| Library | None. Hand written class, about 130 lines, in chunk `85540` |
| Scroll mechanism | `IntersectionObserver` |
| Reduced motion | `matchMedia('(prefers-reduced-motion: reduce)')` checked before construction. When true the group is built with `initVisible: true`, which sets `data-typer-type="done"` immediately and never starts the loop. CSS additionally forces `[data-typer][data-typer-type=initial] { opacity: 1 }` and `.charInit { color: var(--typer-fg) }` |
| Other | `cycles: 3`, `cycleLength: 0.5`. On completion the element's original `innerHTML` is restored, so the DOM ends clean |

Character state CSS, all six variants (ref.css:3353 onward):

```
.charFill            colour var(--typer-bg) on background var(--typer-fg), radius 4px
.charInverse         same colours, no radius
.charAccent          colour var(--typer-accent), transparent background
.charAccentInverse   colour var(--typer-accent-ink) on var(--typer-accent), radius 4px
.charAccentFill      colour and background both var(--typer-accent)
.charBorder          1px solid var(--typer-accent) drawn on an ::after
.charInit            colour transparent
```

Runs of the same state merge their radii so a filled run reads as one lozenge,
handled by `:has(+ .charFill)` and `+ .charFill:last-child` rules.

Per element variables: `--typer-fg: var(--text)`, `--typer-bg: var(--bg)`,
`--typer-accent: var(--accent)`, `--typer-accent-ink: #000`, `--typer-radius: 4px`.
Overridable inline, and the reference does exactly that once, setting
`--typer-fg: var(--accent-lit)` on the `75%` segment.

#### B. Nav morph on scroll

| Field | Value |
|---|---|
| Name | Nav detaches from the page edge and becomes a floating bar |
| Trigger | `window.scrollY > 12`, `scroll` listener with `{ passive: true }`, also evaluated once on mount |
| Properties | `top` `0px` to `12px`. `width` `100%` to `min(1120px, calc(100vw - 24px))`. `border-radius` `0` to `4px`. `border-color` `transparent transparent var(--hairline) transparent` to `var(--line)`. `background-color` `var(--bg)` to `color-mix(in srgb, var(--bg) 80%, transparent)`. `box-shadow` `0 0 0 0 rgba(0,0,0,0)` to `var(--nav-float-shadow)`. `backdrop-filter: blur(14px)` at both ends |
| Duration | `0.35s` on all six properties |
| Easing | `var(--ease)` |
| Delay and stagger | none |
| Library | None. React `useState` plus a scroll listener |
| Scroll mechanism | plain scroll listener, no observer |
| Reduced motion | `.nav-morph { transition: none }`. The end state still applies, only the tween is dropped |

#### C. ASCII rain, hero background

| Field | Value |
|---|---|
| Name | Two stacked grids of binary glyphs. The base layer falls, the pop layer sparks |
| Trigger | Continuous from mount |
| Properties | `textContent` of 54 `<div>` rows, 220 characters each. Nothing animated by CSS |
| Duration | `requestAnimationFrame` loop, throttled to one logical frame per `110ms` |
| Easing | none, discrete |
| Delay and stagger | Each of the 220 columns gets a period of `3 + floor(random() * 7)` logical frames and a random phase inside that period, so columns advance at different rates |
| Library | None, chunk `61402` |
| Scroll mechanism | none |
| Reduced motion | The effect returns before installing the loop, leaving the seeded static field visible |
| Other | Glyph function `g(x) = x < 0.62 ? " " : x < 0.81 ? "0" : "1"`. Seed for the static server rendered field is a linear congruential generator, `seed = 20325838`, `next = (1103515245 * s + 12345) % 2147483648`. The pop layer clears its previous marks each tick, then with probability `0.7` lights `2 + floor(random() * 3)` random cells |
| Styling | `.ascii-rain { opacity: .05; font-size: 12px; line-height: 1.7; letter-spacing: .35em; white-space: pre; position: absolute; inset: 0 }`, `.ascii-rain--pop { opacity: .32 }` |

#### D. Drift

| Field | Value |
|---|---|
| Name | Floating thumbnails bob and tilt |
| Trigger | Continuous, CSS only |
| Properties | `transform: translateY(0) rotate(var(--tilt, 0deg))` to `translateY(-8px) rotate(calc(var(--tilt) + 2.5deg))` at 50 percent, and back |
| Duration | `7s`, infinite |
| Easing | `ease-in-out` |
| Delay and stagger | Per element negative `animation-delay`, values found on the page: `-0.7s`, `-1.7s`, `-2.1s`, `-2.8s`, `-3.4s`, `-4.1s`. Per element `--tilt`: `-9deg`, `-8deg`, `-6deg`, `6deg`, `9deg`, `11deg` |
| Library | None |
| Reduced motion | `animation: none` |

#### E. Stream pulse, three variants

| Field | Value |
|---|---|
| Name | A lit segment travels along a hairline to show direction of flow |
| Trigger | Continuous, CSS only |
| Properties | `background-position-x` or `background-position-y` on an `::after`. The gradient is `34% 100%` wide horizontally, `100% 60%` tall vertically |
| Duration | `2.6s`, infinite, all three variants |
| Easing | `linear` |
| Delay and stagger | Read from `--stream-delay`, default `0s`. Values on the page: `0s`, `1.15s`, `2s` |
| Library | None |
| Keyframes | `stream` `-80%` to `180%`. `stream-rev` `180%` to `-80%`. `stream-elbow-v` `-150%` to `250%` but finished by `22%` of the cycle then held. `stream-elbow-h` held at `180%` until `18%`, travels to `-80%` by `75%`, then held. The two elbow curves are phased so the pulse turns a corner |
| Reduced motion | `display: none` on the `::after`, leaving the static hairline |
| Base line | `.stream-line { background: color-mix(in srgb, var(--text) 30%, transparent); height: 1px }` |

#### F. Hover corner ticks

| Field | Value |
|---|---|
| Name | Four L shaped tick marks fade in at the corners of anything interactive |
| Trigger | `:hover` and `:focus-visible` |
| Properties | `opacity` `0` to `1` on an `::after` carrying eight background gradient layers |
| Duration | `var(--dur)` = `0.22s` |
| Easing | `var(--ease)` |
| Library | None |
| Reduced motion | `transition: none`, the ticks still appear |
| Applied to | `.btn`, `.btn-ghost`, `.btn-solid`, `.panel-hover`, `.docs-rail-link`, `.hover-corners`. Variant `.hover-corners--pad` insets the ticks by `-5px -8px` so they sit outside the text |

#### G. Slab lift

| Field | Value |
|---|---|
| Name | A card in a fanned stack rises on hover |
| Trigger | `:hover` on `.slab` |
| Properties | `transform: translateY(-10px)` on the child `img`, plus `z-index: 10` on the parent |
| Duration | `var(--dur)` |
| Easing | `var(--ease)` |
| Reduced motion | `transform: none` |

#### H. Tab stage crossfade

| Field | Value |
|---|---|
| Name | Swapping the illustration in the `Who it is for` panel |
| Trigger | Click or keyboard on a tab |
| Properties | `opacity` `0` to `1` and `transform: translateY(10px)` to `translateY(0)`. Every panel stays mounted, absolutely positioned |
| Duration | `350ms` |
| Easing | `var(--ease)`, set inline as `transition-timing-function` |
| Reduced motion | `motion-reduce:transition-none` |

#### I. Stage in

| Field | Value |
|---|---|
| Name | The description under a newly selected tab appears |
| Trigger | Class applied when the tab becomes selected |
| Properties | `opacity 0 to 1`, `transform: translateY(4px) to none` |
| Duration | `0.28s` |
| Easing | `var(--ease)` |
| Reduced motion | `animation: none` |

#### J. Fade in

| Field | Value |
|---|---|
| Name | Generic rise and fade |
| Trigger | Class `.fade-in`. **No use of this class was found on the landing page.** Declared and available |
| Properties | `opacity 0 to 1`, `transform: translateY(6px) to none`, `animation-fill-mode: both` |
| Duration | `var(--dur-slow)` = `0.38s` |
| Easing | `var(--ease)` |
| Reduced motion | `animation: none` |

#### K. Pulse dot

| Field | Value |
|---|---|
| Name | `ogpulse`. A small dot breathes to mark live data |
| Trigger | Continuous |
| Properties | `opacity 1` to `0.45` at 50 percent |
| Duration | `2s`, infinite |
| Easing | not specified, so `ease` |
| Reduced motion | **NOT PRESENT.** This animation is not disabled under reduced motion |

#### L. Gate shake

| Field | Value |
|---|---|
| Name | `gate-shake`. Horizontal shake to reject an action |
| Trigger | Class `.gate-shake`. Not used on the landing page |
| Properties | `translate(0)` to `-5px` at 20 and 60 percent, `+5px` at 40 and 80 percent |
| Duration | `0.35s`, once |
| Easing | not specified |
| Reduced motion | NOT PRESENT |

#### M. Footer wordmark spotlight

| Field | Value |
|---|---|
| Name | A pointer torch reveals a brighter stroke of the giant wordmark |
| Trigger | `pointermove` sets `--mx`, `--my`, `--spot: 1`. `pointerleave` sets `--spot: 0` |
| Properties | `opacity` via `--spot`, plus a radial `mask-image` following the pointer |
| Duration | `0.35s` on opacity only. The mask follows with no tween |
| Easing | `var(--ease)` |
| Reduced motion | NOT PRESENT |

#### N. Skip link

`transform: translateY(-200%)` to `none` on `:focus-visible`. No transition
declared, so the move is instant.

#### O. Button opacity and brightness

`.btn:hover { opacity: .88 }` over `var(--dur) var(--ease)`.
`.btn-solid:hover { filter: brightness(.92) }` with **no transition declared**, so
that one snaps.

### 4.3 Motion primitives, the reusable vocabulary

This is the complete set. There is nothing else in the file.

| # | Primitive | Mechanism | Where it already appears |
|---|---|---|---|
| P1 | **Character state scramble** | swap a class on each `<span class="char">` at 20fps until it settles | every animated heading |
| P2 | **Rise and fade** | `opacity 0 to 1` plus `translateY` of `4px`, `6px` or `10px` down to zero | `.fade-in`, `.stage-in`, tab stage crossfade |
| P3 | **Travelling gradient along a hairline** | animate `background-position` of a narrow gradient inside a 1px line | `.stream-line`, `.stream-elbow-v`, `.stream-elbow-h` |
| P4 | **Corner tick fade** | fade in four L shaped 9px marks at the bounding box corners | every interactive element |
| P5 | **Hover lift** | `translateY(-10px)` plus a `z-index` raise | `.slab` |
| P6 | **Continuous bob and tilt** | `translateY` up to `-8px` with a small `rotate` delta, long loop, negative delay per element | `.drifter` |
| P7 | **Opacity breathe** | `opacity` between `1` and `0.45` on a loop | live dot |
| P8 | **Container morph on scroll threshold** | tween `top`, `width`, `radius`, `border-color`, `background`, `shadow` together | nav |
| P9 | **Glyph field churn** | rewrite `textContent` of a character grid on a throttled rAF loop | ascii rain |
| P10 | **Pointer masked reveal** | radial `mask-image` positioned from pointer coordinates, opacity gated | footer wordmark |
| P11 | **Axis shake** | alternating `translateX` of `5px`, 350ms | `.gate-shake` |

Notable absences, all confirmed by searching the stylesheet and all 20 chunks:

- **No SVG stroke drawing.** No `stroke-dasharray`, no `stroke-dashoffset`, no `pathLength`. Every icon on the page is a filled `<polygon>` or `<path>` with `shape-rendering: crispEdges`
- No scale transforms in any animation
- No clip path or `inset()` reveal
- No parallax, no scroll linked scrubbing, no `animation-timeline`
- No counting or number tween. The stat figures render as static strings
- No page transition, no view transitions API

### 4.4 Scroll mechanism

`IntersectionObserver`, `{ threshold: 0.6 }`, `disconnect()` after the first
intersection. That is the entire scroll reveal system. It is attached to one
component type only, `TypedHeading`. Everything else is either always on, hover
driven, or click driven.

Next.js also installs an `IntersectionObserver` with `rootMargin: "200px"` for link
prefetching. That is framework plumbing, not design.

`scroll-behavior: smooth` is **NOT PRESENT**. No smooth scroll library.

### 4.5 Reduced motion policy

| Handled | Not handled |
|---|---|
| `.fade-in`, `.slab:hover img`, `.nav-morph`, `.drifter`, `.drift-float`, `.stream-line:after`, `.stream-elbow-v:after`, `.stream-elbow-h:after`, `.stage-in`, `[data-typer]` (both in CSS and in JS), `.ascii-rain` (JS returns early), tab crossfade (`motion-reduce:transition-none`), corner tick transitions | `ogpulse`, `gate-shake`, footer spotlight, `.btn` opacity, `.btn-solid` brightness |

The pattern is: check `matchMedia('(prefers-reduced-motion: reduce)')` in JS before
starting any loop, and mirror the same rule in CSS with
`@media (prefers-reduced-motion: reduce)`. Coverage is good but not complete.

---

## 5. Structure and components

### 5.1 Document skeleton

```
body.antialiased
  a.skip-link
  div.page-frame                       1px solid --line, no top border, 10px/14px inset
    nav.nav-morph.site-nav             fixed, z-50, height --nav-h
    div#content
      main.mx-auto.max-w-[1200px]      px-4 sm:px-6
        div.frame.flex.flex-col        dashed vertical rails
          ...sections, each separated by div.rule and a label bar
  nav.nav-mobile-only                  fixed bottom, z-50, hidden at >= 640px
  footer
    section  (closing CTA)
    div      (SpotWordmark)
    div      (link grid + legal row, inside another .frame)
```

### 5.2 Section order on the landing page

| # | Section | Shape | Motion present |
|---|---|---|---|
| 1 | Hero | centred column, `max-width: 640px`, eyebrow chip, `h1`, lead, two buttons, one footnote line. Absolute `.ascii-rain` behind, eight `.drifter` thumbnails around | P1 hero typer, P9, P6 |
| 2 | `[ The machine ]` | three equal columns, hairline between, heading plus two line paragraph each | P1 on each `h2` |
| 3 | `[ The deal ]` | two columns `minmax(0,380px) 1fr`, prose left, mono ledger right with a 75/25 fill bar | P1 |
| 4 | `[ Two ways to run it ]` | two stacked rows, each `280px 1fr`, prose left, a mono flow diagram right | P3 |
| 5 | `[ How it works ]` | `ol.cells`, 1 / 2 / 4 columns, numbered `01..04`, title, caption | none |
| 6 | `[ In code ]` | `.cells--surface`, 2 columns at `lg`, code block left with a tab strip, live shop preview right | P5 on the slab fan |
| 7 | `[ Case study ]` | single `.cells` column: header row, three stat cells, footer row with a button | P7 on the live dot |
| 8 | `[ Who it is for ]` | centred `h2`, then `400px 1fr` at `lg`, vertical tablist left, `.corners` stage right | P1, P2, tab crossfade |
| 9 | Footer CTA | centred, `h2`, paragraph, one solid button | none |
| 10 | Footer wordmark | giant outlined word, `height: 8.5vw`, overflow hidden | P10 |
| 11 | Footer links | `1.6fr auto auto` at `md`, brand column plus two link columns, then a legal row | P4 |

The repeating rhythm is: `div.rule` (dashed line with a `+` at each end), then a
label bar reading `[ Section name ]` in uppercase mono, then the section body.

### 5.3 Breakpoints

Tailwind v4 defaults as compiled, plus two raw queries.

| Name | Query | Used for |
|---|---|---|
| raw | `min-width: 420px` | one h1 size step |
| `sm` | `min-width: 40rem` (640px) | the main layout switch. Nav goes three column, mobile bottom nav disappears, section padding grows, type steps up |
| `md` | `min-width: 48rem` (768px) | two column splits, footer grid |
| `lg` | `min-width: 64rem` (1024px) | four column steps, code card side by side, tabs side by side, drifters appear |
| `xl` | `min-width: 80rem` (1280px) | two extra drifters |
| `2xl` | `min-width: 96rem` (1536px) | declared by Tailwind, unused on this page |
| raw | `max-width: 639px` | mobile nav height |
| raw | `max-width: 1023px` / `min-width: 1024px` | a pool page header, not this page |

### 5.4 Grid system

There is no column grid. Each section declares its own `grid-template-columns`
inline or through a Tailwind class. Recurring shapes:
`repeat(3, 1fr)`, `minmax(0,380px) 1fr`, `280px 1fr`, `400px 1fr`,
`1.6fr auto auto`, `auto 1fr 88px 1fr auto` (the flow diagram),
and `.cells` at 1, 2 or 4 columns.

### 5.5 z index layers

| Layer | Value | Element |
|---|---|---|
| 100 | `z-index: 100` | `.skip-link` |
| 50 | `z-50` | primary nav, mobile bottom nav, wallet dropdown |
| 20 | `z-20` | `.panel` dropdown list |
| 10 | `z-10` | hero content above the ascii rain, `.slab:hover` |
| 1 | `z-[1]` | footer, `.rule` plus marks |
| 0 | default | everything else |

### 5.6 Component catalogue

| Component | Selector | Default | Hover | Focus visible | Active or selected | Disabled |
|---|---|---|---|---|---|---|
| Solid button | `.btn-solid` | `background: var(--text)`, `color: var(--bg)`, mono, uppercase, `0.08em`, `500`, radius 2px | `filter: brightness(.92)`, corner ticks fade in | corner ticks fade in | none | NOT PRESENT for `.btn-solid` |
| Solid button, alt | `.btn` | as above, plus `transition: opacity` | `opacity: .88` | ticks | none | `opacity: .4`, `cursor: default` |
| Ghost button | `.btn-ghost` | transparent, `1px solid var(--line)`, `color: var(--muted)`, mono uppercase | `color: var(--text)`, `border-color: var(--text)`, ticks | ticks | none | `opacity: .4`, `cursor: default` |
| Corner button | `.btn-corner` | transparent, no border. Four `span.c` children draw 9px L marks in `var(--muted)` | text and marks go to `var(--text)` over `var(--dur)` | ticks | none | NOT PRESENT |
| Panel | `.panel` | `1px solid var(--hairline)`, `background: var(--surface)`, radius 2px | none by itself | none | none | none |
| Hover panel | `.panel-hover` | transparent, radius 4px | `background: var(--backdrop)` plus ticks | same | inline `background: var(--backdrop)` for the current page | none |
| Input | `.input-well` | `background: var(--well)`, `1px solid var(--line)`, sans, radius 2px, `outline: none` | none | `border-color: var(--accent)` (this is `:focus`, not `:focus-visible`) | none | NOT PRESENT |
| Label | `.label` | mono, `11px`, `var(--faint)`, `0.08em`, uppercase | none | none | none | none |
| Cell grid | `.cells` | `display: grid`, `gap: 1px`, `background: var(--hairline)`, `1px solid var(--hairline)`. Children take `var(--bg)`, or `var(--surface)` under `.cells--surface`. The gap is the hairline | none | none | none | none |
| Corner frame | `.corners` with four `span.c` children | static 9px L marks in `var(--faint)` | none | none | none | none |
| Hover corners | `.hover-corners`, `.hover-corners--pad` | invisible | eight gradient tick layers fade to `opacity: 1` | same | none | none |
| Rule | `.rule` | `border-top: 1px dashed var(--line)`, a `+` glyph in `var(--muted)` at each end sitting on a `var(--bg)` chip | none | none | none | none |
| Frame rails | `.frame` | `border-inline: 1px dashed var(--line)` | none | none | none | none |
| Slab | `.slab` and `.slab img` | `1px solid var(--hairline)`, `background: var(--surface)`, radius 4px | `translateY(-10px)`, parent `z-index: 10` | none | none | none |
| Ledger row | no class. `flex items-baseline gap-2`, mono `10.5px` uppercase, `var(--faint)` label, `border-bottom: 1px dotted var(--line)` leader that flexes, `var(--muted)` value | as described | none | none | none | none |
| Chip | no class. `px-2.5 py-1.5 leading-none`, `1px solid var(--line)`, radius 2px, `var(--muted)`. Variants: filled `background: var(--text)` with `color: var(--bg)`, and accent `border: 1px solid var(--accent-deep)` with `color: var(--accent-lit)` | none | none | none | none |
| Section label bar | `flex items-center px-6 py-4 sm:px-10`, `border-bottom: 1px dashed var(--line)`, holds one `.label` reading `[ Name ]` | none | none | none | none |
| Tab, vertical | `button[role=tab].hover-corners` | selected: `background: var(--cell)`, title in `var(--text)`, numeral in `var(--accent-lit)`, plus a `.stage-in` description. Unselected: transparent, title `var(--muted)`, numeral `var(--faint)`, no description | ticks | ticks | as described | none |
| Tab, horizontal | `button` in the code card | active: `color: var(--text)`, `box-shadow: 0 1px 0 var(--text)`. Inactive: `var(--faint)` | inactive goes to `var(--text)` | none | as described | none |
| Skip link | `.skip-link` | fixed `8px/8px`, `background: var(--accent)`, `color: #000`, radius 4px, `translateY(-200%)` | none | `transform: none` | none | none |

Two behaviours that live only in JS:

- **Copy affordance.** A menu item reading `Copy address` switches to `Copied` for
  `1200ms`, then back. Uses `navigator.clipboard.writeText` inside a try/catch that
  swallows failures.
- **Address display.** `shortAddr = a => a.slice(0,4) + "\u2026" + a.slice(-4)`, so
  `12yP…u1j6`. Four characters, a real ellipsis, four characters. Rendered in mono
  at `12px` in `var(--muted)`, wrapped in `.hover-corners.hover-corners--pad`.
  Brief Section 9.4 asks for six characters rather than four, which is a
  configuration decision and therefore the brief's call.

### 5.7 Accessibility patterns present in the reference

- `a.skip-link` first in `<body>`, revealed on `:focus-visible`
- `nav aria-label="Primary"` and `nav aria-label="Sections"`
- One `h1` per page
- Decorative SVG carries `aria-hidden="true" focusable="false"`
- Decorative `.ascii-rain`, `.drifter` and all corner spans carry `aria-hidden="true"`
- The flow diagrams carry a prose `aria-label` describing the whole diagram
- The fee bar carries a visually hidden `<span class="sr-only">` restating it
- Tablist uses `role="tablist"`, `aria-orientation="vertical"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabindex` roving between `0` and `-1`, `role="tabpanel"`, `aria-labelledby`
- `aria-live` region: only the Next.js route announcer, `aria-live="assertive"`. There is **no author supplied `aria-live="polite"` region**
- Escape closes the wallet menu, outside `mousedown` closes it
- No focus ring is defined anywhere in the stylesheet. The browser default outline is suppressed on `.input-well` and replaced by an accent border. Everything else relies on `:focus-visible` corner ticks, which are a decoration, not an outline. **This is a gap the Kerb build must close, per brief Section 12**

---

## 6. Dependencies

| Item | URL or source | Version | Purpose |
|---|---|---|---|
| Next.js, App Router, Turbopack runtime | 20 local chunks, `globalThis.TURBOPACK` | NOT PRESENT in the saved file | framework |
| React, `react/jsx-runtime` | bundled into the chunks | NOT PRESENT | rendering |
| Tailwind CSS v4 | compiled into `3wpj_kk6gf4qj.css`, identified by `@layer theme, base, components, utilities`, `@property --tw-*`, `--spacing: .25rem` | v4.x, exact minor NOT PRESENT | utility classes |
| Lightning CSS | inferred from `--lightningcss-light` / `--lightningcss-dark` variables | NOT PRESENT | CSS minification and theme scoping |
| GeistSans variable | `../media/Geist_Variable-s.p.0mrjj4bg00-he.woff2`, **file not saved** | NOT PRESENT | body and display type |
| GeistMono variable | `../media/GeistMono_Variable.p.3ms9vq719j3f8.woff2`, **file not saved** | NOT PRESENT | mono type |
| Animation library | none | n/a | there is no GSAP, no Framer Motion, no Lenis, no Locomotive, no anime.js. Verified by grepping all 20 chunks |
| Icon library | none | n/a | icons are inline `<svg>` with `shape-rendering="crispEdges"` |
| Analytics, chat, consent | none found | n/a | |

Nothing on this page loads from a CDN. Everything is same origin.

---

## 7. Verdict table

Verdicts follow brief Section 3.7.

### 7.1 Tokens and values

| Item | Verdict |
|---|---|
| `--ease: cubic-bezier(.22, 1, .36, 1)` | KEEP |
| `--dur: .22s`, `--dur-slow: .38s` | KEEP |
| `--nav-h`, `--mobile-nav-h` | KEEP |
| `--typer-*` variables and `--typer-radius: 4px` | KEEP |
| Spacing scale, 4px base | KEEP |
| Container `1200px`, gutters `16px` / `24px`, `.page-frame` inset `10px` / `14px` | KEEP |
| Breakpoints `420`, `640`, `768`, `1024`, `1280` | KEEP |
| Radii `2px`, `3px`, `4px`, `6px`, `8px`, `9999px` | KEEP |
| Border widths `1px`, `2px`, `3px` and the solid / dashed / dotted grammar | KEEP |
| `--nav-float-shadow`, tab underline shadow, dropdown shadow, `blur(14px)` | KEEP |
| Geist Sans and Geist Mono, weights `100 900`, the fallback metric overrides | KEEP |
| Type scale, every px value in 2.2 | KEEP |
| Tracking values `0.08em`, `-0.01em`, `-0.02em`, `-0.03em` | KEEP |
| `--bg`, `--surface`, `--cell`, `--well`, `--hairline`, `--line`, `--text`, `--value`, `--muted`, `--faint`, `--track`, `--backdrop` | KEEP FOR NOW, refine in Phase 2 |
| `--warn` | KEEP FOR NOW, refine in Phase 2. Unused here, but it is the natural seed for one Kerb state colour |
| `--accent`, `--accent-lit`, `--accent-deep` | KEEP FOR NOW, refine in Phase 2. **See the open question in Section 8** |
| Light theme block, all 17 tokens | KEEP FOR NOW, refine in Phase 2 |
| Code syntax palette, five hexes | REMOVE. Belongs to the code card, which is removed |

### 7.2 Motion

| Item | Verdict |
|---|---|
| P1 character state scramble, all six variants, `fps: 20`, `cycles: 3`, `cycleLength: 0.5`, the bezier char offset | KEEP |
| P2 rise and fade, `4px` / `6px` / `10px` | KEEP |
| P3 travelling gradient along a hairline, all three variants and their keyframes | KEEP |
| P4 corner tick fade | KEEP |
| P5 hover lift | KEEP |
| P6 continuous bob and tilt | KEEP |
| P7 opacity breathe | KEEP |
| P8 container morph on scroll threshold | KEEP |
| P9 glyph field churn | KEEP |
| P10 pointer masked reveal | KEEP |
| P11 axis shake | KEEP |
| `IntersectionObserver` at `threshold: 0.6`, disconnect on first fire | KEEP |
| `TyperGroup` stagger `0.12s` on scroll, `0.15s` on load | KEEP |
| Reduced motion policy, the JS `matchMedia` guard plus the mirrored CSS block | KEEP, and extend to cover the five animations the reference leaves unhandled |

### 7.3 Components

| Item | Verdict |
|---|---|
| `.skip-link`, `.page-frame`, `.frame`, `.rule`, section label bar | KEEP |
| `.cells`, `.cells--surface` | KEEP |
| `.panel`, `.panel-hover`, `.label` | KEEP |
| `.btn`, `.btn-solid`, `.btn-ghost`, `.btn-corner` and its `span.c` marks | KEEP |
| `.corners`, `.hover-corners`, `.hover-corners--pad` | KEEP |
| `.input-well` | KEEP |
| `.slab` | KEEP |
| Ledger row, chip, filled chip, accent chip | KEEP |
| `.nav-morph`, `.site-nav`, `.nav-desktop`, `.nav-desktop-block` | KEEP |
| `.nav-mobile-only` bottom bar | KEEP as a component. Kerb has one page and one app route, so it may go unused. Not repurposed |
| `.docs-rail-link` | REMOVE. Kerb has no docs rail |
| `.stage-in`, tablist and tab stage | REMOVE. The section they serve is removed. The `.stage-in` keyframe itself is P2, kept |
| `.grad-text` | KEEP the technique. Its two gradient stops resolve in Phase 2 with the rest of the accent |
| `.gate-shake` | KEEP |
| `.fade-in` | KEEP |
| `.ascii-rain`, `.ascii-rain--pop` | KEEP |
| `.drifter`, `.drift-float` | KEEP the primitive. REMOVE the thumbnails it carries, which are their collection art |
| Theme toggle button | KEEP as a component. Both palettes are being carried, so the toggle stays useful |
| Wallet connect button and dropdown | REMOVE. Kerb ships no wallet |
| `.nfw-pull`, `.gacha-*` (26 rules) | REMOVE. These style a pool page that is not in this file |

### 7.4 Sections

| Reference section | Verdict |
|---|---|
| Hero | KEEP the shape |
| `[ The machine ]`, three column claims | KEEP the shape |
| `[ The deal ]`, prose plus mono ledger | KEEP the shape |
| `[ Two ways to run it ]`, prose plus flow diagram | REMOVE as a section. The flow diagram shape and P3 are kept |
| `[ How it works ]`, `ol.cells` `01..04` | KEEP the shape |
| `[ In code ]`, code card plus live preview | REMOVE. Kerb has no SDK section in brief Section 8.2 |
| `[ Case study ]`, live totals | REMOVE. It is their metric and their brand |
| `[ Who it is for ]`, tablist plus stage | REMOVE. No Kerb equivalent |
| Footer CTA | KEEP the shape |
| Footer wordmark | KEEP the shape |
| Footer link grid and legal row | KEEP the shape |

### 7.5 Brand identity

| Item | Verdict |
|---|---|
| Name `OpenGacha`, `Open Gacha`, `opengacha.io`, `@opengacha_io` | REMOVE |
| Name `NFW`, `nfw.fun` | REMOVE |
| `og-logo.svg` | REMOVE |
| Footer wordmark string `OPENGACHA` | REMOVE. The component is kept, the string is replaced |
| All 12 collectible images: `og-nft.png`, `og-tcg.png`, `DeGods_Image.png`, `Claynosaurz_Image.png`, `Cets_Image.png`, and the seven `.jpeg` files | REMOVE |
| Favicons, `apple-icon.png`, `opengraph-image.png` | REMOVE |
| All product copy, every headline, every paragraph, every figure | REMOVE |
| The `12yP8SdcZ54u1jbae8XNj9hRMCtkinrjw2doTzUhu1j6` program address and every Solscan, X, GitHub link | REMOVE |
| `--accent: #ff8700` | **Flagged. See Section 8** |

---

## 8. Open question for Gate 0

The brief points two ways on one value and I am not deciding it alone.

`--accent: #ff8700` is the only accent hue in the file. It is the focus ring
substitute, the skip link background, the stream pulse, the typer accent, and both
stops of `.grad-text`. Section 3.7 of the brief says to REMOVE any "signature brand
colour if it is unmistakably theirs". Section 5 of the brief says the Phase 2
refinement preserves hue identity and adjusts rather than redesigns.

If the orange counts as unmistakably theirs, Phase 2 has no accent hue to refine and
must rotate to a new one, which Section 5 only permits with approval. If it does
not, Phase 2 desaturates it from `100%` into the `60 to 72` band per Step 3 and
keeps the hue.

Three options:

1. **Keep the hue.** Treat `hsl(31.8)` orange as a generic warm accent, not a mark.
   Phase 2 then only desaturates it, which is the smallest change and matches the
   brief's instruction to deviate less when in doubt.
2. **Rotate the hue, keep everything else.** Pick one replacement hue, apply the
   same three step lit / base / deep relationship and the same saturation and
   lightness figures. Nothing else about the palette moves.
3. **You name the hue.** Give me a target and Phase 2 builds the three step ramp
   around it using the reference's own relationships.

My recommendation is option 1. Orange at `hsl(31.8, 100%, 50%)` is not distinctive
enough to read as anyone's mark once the name, the logo and the wordmark are gone,
and Step 3 of the colour procedure pulls it well off that saturation anyway. But
this is your call, not mine.

Two smaller notes that need no decision, only your awareness:

- The two Geist `woff2` files were not saved with the page. They are SIL OFL 1.1 and
  I will fetch them in Phase 1 unless you would rather supply them.
- The reference defines no focus ring at all. Brief Section 12 requires one. I will
  add it in Phase 1 and flag it in the deviation log, as the brief instructs for
  anything the reference does not handle.

---

## Appendix. Reference section shapes matched to Kerb's Section 8.2

Structural mapping only. No new values, no new components. This exists so Phase 5
adapts an existing layout instead of building new ones.

| Kerb section (brief 8.2) | Reference shape to adapt |
|---|---|
| Token CA strip | The section label bar (`px-6 py-4 sm:px-10`, dashed bottom border, one `.label`) carrying a ledger row and a `.btn-corner`. Brief 8.1 says to use the smallest existing surface treatment if there is no dedicated bar, and this is that bar |
| 1 Hero | Hero, unchanged shape. `.ascii-rain` behind, `.drifter` positions available, eyebrow chip, `h1` with two typed segments, lead, `.btn-solid` plus `.btn-corner`, one footnote line |
| 2 The asymmetry | `[ The deal ]` two column split, `minmax(0,380px) 1fr`. The right hand cell is where visual B lives, and it needs the widest treatment on the page |
| 3 Numbers | `[ Case study ]` three stat cells inside `.cells`, `34px` rising to `40px`, `tabular-nums`, mono `10.5px` uppercase caption under each. Footnote goes in the closing row |
| 4 How it works | `[ How it works ]` `ol.cells`, three columns rather than four. Numerals `01`, `02`, `03` in `--accent-lit`. Visual A sits in step `02` |
| 5 Properties | `[ The machine ]` three column claims, run as two rows of three inside `.cells` to hold six |
| 6 Honest limits | `[ The machine ]` again, three columns, but with no typed heading. Plain text, static, per brief 8.2 |
| 7 Contracts | The mono ledger from `[ The deal ]`: label, dotted leader, value. Three rows plus a network row |
| 8 Footer | Footer CTA, then the wordmark, then the link grid, then the legal row |
| `/app` compose card | `.panel` at `p-6 sm:p-8`, `.input-well w-full px-4 py-3 text-[16px] sm:text-[13px]` per field, `.btn-solid` primary, `.btn-ghost` secondary |
| `/app` contacts list | `.cells` single column, one row per contact |
| Visual A, waiting window | Built from P3 travelling gradient along a hairline, plus P7 opacity breathe, plus P2 for the resolve. There is no SVG stroke drawing in the reference, so the SVG option offered in brief 8.3 is unavailable |
| Visual B, history versus list | Two `.panel` columns. History uses P2 rise and fade at short intervals with no observer gate, so entries keep arriving unbidden. List uses P1 character scramble fired once per settled entry, the slowest and most deliberate primitive in the file. The rhythm contrast is that difference |
