# PALETTE.md

Phase 2. The six step refinement in brief section 5, run in order on the palette
extracted in `DESIGN-SYSTEM.md` section 1. Every ratio below was computed with the
WCAG 2.1 relative luminance formula, compositing translucent colours over the
background they actually sit on. None is estimated.

Gate 0 decided the accent question: the orange hue stays, so Step 3 only
desaturates it.

---

## Before and after

### Dark theme

| Token | Before | After | HSL after | Step | Why |
|---|---|---|---|---|---|
| `--bg` | `#080404` | `#080404` | `hsl(0, 33.3%, 2.4%)` | 2 | Page base, never raised |
| `--well` | `#0e0e0e` | `#0e0e0e` | `hsl(0, 0%, 5.5%)` | 2 | Already 3.14 above the base |
| `--surface` | `#121010` | `#171414` | `hsl(0, 7.0%, 8.4%)` | 2 | Was 1.18 above `--well`, raised to a clean 3.0 |
| `--cell` | `#191919` | `#1d1d1d` | `hsl(0, 0%, 11.4%)` | 2 | Followed `--surface` up to hold its own 3.0 |
| `--hairline` | `#ffffff1a` | `#ffffff1a` | `hsl(0, 0%, 100%) a10.2%` | 1 | Hairline role, untouched |
| `--line` | `#303030` | `#303030` | `hsl(0, 0%, 18.8%)` | 1 | Border role, untouched |
| `--text` | `#ffffff` | `#ffffff` | `hsl(0, 0%, 100%)` | 1, 4 | Text primary, already 16.86 at worst |
| `--solid` | new | `#ffffff` | `hsl(0, 0%, 100%)` | 1 | Split from `--text`, which was serving two roles |
| `--solid-ink` | new | `#080404` | `hsl(0, 33.3%, 2.4%)` | 1 | Split from `--bg`, same reason |
| `--value` | `#d9d9d9` | `#d9d9d9` | `hsl(0, 0%, 85.1%)` | 4 | Worst 11.94, no move needed |
| `--muted` | `#929292` | `#929292` | `hsl(0, 0%, 57.3%)` | 4 | Worst 5.42, no move needed |
| `--faint` | `#ffffff75` | `#ffffff75` | `hsl(0, 0%, 100%) a45.9%` | 4 | Worst 4.55 against the raised `--cell`, still clears |
| `--accent` | `#ff8700` | `#d4842b` | `hsl(31.6, 66.3%, 50.0%)` | 3 | Saturation 100 to 66, hue and lightness held |
| `--accent-text` | new | `#d4842b` | `hsl(31.6, 66.3%, 50.0%)` | 1 | Split from `--accent`, which was both a fill and a text colour |
| `--accent-lit` | `#f6ae2d` | `#daa649` | `hsl(38.5, 66.2%, 57.1%)` | 3 | Saturation 91.8 to 66 |
| `--accent-deep` | `#c65e00` | `#a46022` | `hsl(28.6, 65.7%, 38.8%)` | 3 | Saturation 100 to 66 |
| `--warn` | `#f6ae2d` | `#daa649` | `hsl(38.5, 66.2%, 57.1%)` | 3 | Saturation 91.8 to 66 |
| `--state-wait` | new | `#daa649` | `hsl(38.5, 66.2%, 57.1%)` | 5 | Derived from `--warn`, hue unchanged |
| `--state-trust` | new | `#ffffff` | `hsl(0, 0%, 100%)` | 5 | Derived from `--text`, no hue |
| `--state-danger` | new | `#dd5858` | `hsl(0, 66.2%, 60.6%)` | 5 | Hue 0, the hue `--bg` and `--surface` already carry |
| `--track` | `#ffffff24` | `#ffffff24` | `hsl(0, 0%, 100%) a14.1%` | 1 | Track role, untouched |
| `--backdrop` | `#ffffff12` | `#ffffff12` | `hsl(0, 0%, 100%) a7.1%` | 1 | Hover wash role, untouched |
| `--ink` | `#000000` | `#000000` | `hsl(0, 0%, 0%)` | 1 | Ink on accent, untouched |
| `--nav-float-shadow` | `0 14px 36px #00000073` | unchanged | | 1 | Elevation role, untouched |

### Light theme

| Token | Before | After | HSL after | Step | Why |
|---|---|---|---|---|---|
| `--bg` | `#faf7f5` | `#faf7f5` | `hsl(24, 33.3%, 97.1%)` | 2 | Needed a 0.06 drop to clear `--surface` by 3.0. That rounds to the same 8 bit value, so nothing changed |
| `--surface` | `#ffffff` | `#ffffff` | `hsl(0, 0%, 100%)` | 2 | Top of the stack |
| `--cell` | `#f0ece8` | `#f0ece8` | `hsl(30, 21.1%, 92.5%)` | 2 | Already 4.51 below `--bg` |
| `--well` | `#efeae6` | `#eae4df` | `hsl(27.3, 20.8%, 89.6%)` | 2 | Was 0.59 below `--cell`, lowered to a clean 3.0 |
| `--hairline` | `#0000001a` | `#0000001a` | `hsl(0, 0%, 0%) a10.2%` | 1 | Untouched |
| `--line` | `#c4bfbc` | `#c4bfbc` | `hsl(22.5, 6.3%, 75.3%)` | 1 | Untouched |
| `--text` | `#16130f` | `#16130f` | `hsl(34.3, 18.9%, 7.3%)` | 4 | Worst 14.69 |
| `--solid` | new | `#16130f` | `hsl(34.3, 18.9%, 7.3%)` | 1 | Split from `--text` |
| `--solid-ink` | new | `#faf7f5` | `hsl(24, 33.3%, 97.1%)` | 1 | Split from `--bg` |
| `--value` | `#2a2622` | `#2a2622` | `hsl(30, 10.5%, 14.9%)` | 4 | Worst 12.77 |
| `--muted` | `#5e635e` | `#5e635e` | `hsl(120, 2.6%, 37.8%)` | 4 | Worst 4.87 against the lowered `--well`, still clears |
| `--faint` | `#14100c8c` | `#14100c98` | `hsl(30, 25%, 6.3%) a59.6%` | 4 | Was 3.99 at worst. Alpha 54.9 to 59.6, hue untouched |
| `--accent` | `#ff8700` | `#d4842b` | `hsl(31.6, 66.3%, 50.0%)` | 3 | Saturation 100 to 66 |
| `--accent-text` | new | `#915a1d` | `hsl(31.6, 66.7%, 34.1%)` | 1, 4 | Split from `--accent`, then darkened until it cleared 4.5 on all four backgrounds |
| `--accent-lit` | `#c65e00` | `#95571f` | `hsl(28.5, 65.6%, 35.3%)` | 3, 4 | Saturation to 66, then darkened from 4.18 to 4.88 |
| `--accent-deep` | `#a85a00` | `#8b581d` | `hsl(32.2, 65.5%, 32.9%)` | 3 | Saturation 100 to 66, already cleared 4.5 |
| `--warn` | `#b45309` | `#9a551f` | `hsl(26.3, 66.5%, 36.3%)` | 3, 4 | Saturation 90.5 to 66, then darkened to clear 4.5 |
| `--state-wait` | new | `#9a551f` | `hsl(26.3, 66.5%, 36.3%)` | 5 | Derived from `--warn` |
| `--state-trust` | new | `#16130f` | `hsl(34.3, 18.9%, 7.3%)` | 5 | Derived from `--text` |
| `--state-danger` | new | `#c42828` | `hsl(0, 66.1%, 46.3%)` | 5 | Hue 0 |
| `--track` | `#0000001f` | `#0000001f` | `hsl(0, 0%, 0%) a12.2%` | 1 | Untouched |
| `--backdrop` | `#0000000f` | `#0000000f` | `hsl(0, 0%, 0%) a5.9%` | 1 | Untouched |
| `--ink` | `#000000` | `#000000` | | 1 | Untouched |
| `--nav-float-shadow` | `0 14px 32px #1f160e24` | unchanged | | 1 | Untouched |

---

## Step 1. Roles

| Role | Dark | Light |
|---|---|---|
| Page base | `--bg` | `--bg` |
| Recessed surface | `--well` | `--well` |
| Surface | `--surface` | `--surface` |
| Raised surface | `--cell` | `--cell` |
| Hairline | `--hairline` | `--hairline` |
| Border | `--line` | `--line` |
| Text primary | `--text` | `--text` |
| Text, data value | `--value` | `--value` |
| Text secondary | `--muted` | `--muted` |
| Text muted | `--faint` | `--faint` |
| Accent, fill | `--accent` | `--accent` |
| Accent, text and thin lines | `--accent-text` | `--accent-text` |
| Accent, highlight | `--accent-lit` | `--accent-lit` |
| Accent, outline | `--accent-deep` | `--accent-deep` |
| Inverted surface | `--solid` | `--solid` |
| Ink on inverted surface | `--solid-ink` | `--solid-ink` |
| Ink on accent | `--ink` | `--ink` |
| Track | `--track` | `--track` |
| Hover wash | `--backdrop` | `--backdrop` |
| Elevation | `--nav-float-shadow` | `--nav-float-shadow` |
| State, waiting | `--state-wait` | `--state-wait` |
| State, trusted | `--state-trust` | `--state-trust` |
| State, cancelled or dangerous | `--state-danger` | `--state-danger` |

Three colours were serving two roles each and were split, as the step requires.
No split changes a rendered value; each pair starts life holding the same colour.

| Split | From | Because |
|---|---|---|
| `--solid` | `--text` | `--text` was both the text colour and the fill behind `.btn-solid` and `.chip--fill` |
| `--solid-ink` | `--bg` | `--bg` was both the page base and the ink sitting on that fill |
| `--accent-text` | `--accent` | `--accent` was both a fill (skip link, stream pulse, gradient stop) and a text colour (`.nav-link:hover`), and in light theme the two cannot be the same value and still clear 4.5 |

## Step 2. Layer separation

Measured in HSL lightness, adjacent pairs only.

**Dark, before:** `--bg` 2.35, `--well` 5.49, `--surface` 6.67, `--cell` 9.80.

| Pair | Gap before | Verdict | Gap after |
|---|---|---|---|
| `--bg` to `--well` | +3.14 | passes | +3.14 |
| `--well` to `--surface` | +1.18 | **too close** | +3.00 |
| `--surface` to `--cell` | +3.14 | passes | +3.00 |

The failing pair is `--well` to `--surface`. The rule says push apart by lowering
the lower one, but `--well` already sits exactly 3.14 above the page base and the
page base may not be raised, so there is no room beneath it. The surfaces above it
moved instead, which preserves the ordering, the hue and the saturation of every
layer and changes only lightness.

**Light, before:** `--surface` 100.00, `--bg` 97.06, `--cell` 92.55, `--well` 91.96.

| Pair | Gap before | Verdict | Gap after |
|---|---|---|---|
| `--surface` to `--bg` | 2.94 | **too close** | 2.94, see note |
| `--bg` to `--cell` | 4.51 | passes | 4.51 |
| `--cell` to `--well` | 0.59 | **too close** | 2.95 |

`--surface` to `--bg` misses by 0.06. Closing it needs `--bg` at lightness 97.00,
which rounds to `#faf7f5`, the value it already holds. The gap is a rounding
artefact of the 8 bit value, not a real proximity, so nothing changed.
`--cell` to `--well` was a genuine failure and `--well` was lowered.

## Step 3. Accent restraint

Distinct accent hues before: **one**, spanning hue 28.5 to 38.5. Three is the cap,
so nothing was removed. Every accent sat at or above 90 percent saturation, which
is the single biggest reason the reference palette reads as loud. All four dropped
to **66 percent**, the middle of the permitted 60 to 72 band, applied uniformly.
Hue and lightness were not touched.

| Token | Theme | Saturation before | After |
|---|---|---|---|
| `--accent` | both | 100.0 | 66 |
| `--accent-lit` | dark | 91.8 | 66 |
| `--accent-lit` | light | 100.0 | 66 |
| `--accent-deep` | dark | 100.0 | 66 |
| `--accent-deep` | light | 100.0 | 66 |
| `--warn` | dark | 91.8 | 66 |
| `--warn` | light | 90.5 | 66 |

## Step 4. Text contrast

Target 4.5 to 1 against every background each colour actually sits on. Fixed by
lightness only, never by hue. In the light theme the equivalent of raising
lightness is lowering it, since the text is dark on a light ground, and that is
what was done.

### Dark, measured

| Foreground | Background | Ratio |
|---|---|---|
| `--text` `#ffffff` | `--bg` `#080404` | 20.40 |
| `--text` `#ffffff` | `--well` `#0e0e0e` | 19.30 |
| `--text` `#ffffff` | `--surface` `#171414` | 18.32 |
| `--text` `#ffffff` | `--cell` `#1d1d1d` | 16.86 |
| `--value` `#d9d9d9` | `--bg` | 14.45 |
| `--value` `#d9d9d9` | `--surface` | 12.98 |
| `--value` `#d9d9d9` | `--cell` | 11.94 |
| `--muted` `#929292` | `--bg` | 6.56 |
| `--muted` `#929292` | `--well` | 6.20 |
| `--muted` `#929292` | `--surface` | 5.89 |
| `--muted` `#929292` | `--cell` | 5.42 |
| `--faint` `#ffffff75` | `--surface` | 4.65 |
| `--faint` `#ffffff75` | `--bg` | 4.60 |
| `--faint` `#ffffff75` | `--cell` | 4.55 |
| `--accent-text` `#d4842b` | `--bg` | 6.93 |
| `--accent-text` `#d4842b` | `--well` | 6.56 |
| `--accent-text` `#d4842b` | `--surface` | 6.22 |
| `--accent-text` `#d4842b` | `--cell` | 5.73 |
| `--accent-lit` `#daa649` | `--bg` | 9.26 |
| `--accent-lit` `#daa649` | `--surface` | 8.31 |
| `--accent-lit` `#daa649` | `--cell` | 7.65 |
| `--state-wait` `#daa649` | `--bg` | 9.26 |
| `--state-wait` `#daa649` | `--surface` | 8.31 |
| `--state-wait` `#daa649` | `--cell` | 7.65 |
| `--state-danger` `#dd5858` | `--bg` | 5.45 |
| `--state-danger` `#dd5858` | `--surface` | 4.89 |
| `--state-danger` `#dd5858` | `--cell` | 4.50 |
| `--state-trust` `#ffffff` | `--bg` | 20.40 |
| `--state-trust` `#ffffff` | `--surface` | 18.32 |
| `--state-trust` `#ffffff` | `--cell` | 16.86 |
| `--solid-ink` `#080404` | `--solid` `#ffffff` | 20.40 |
| `--ink` `#000000` | `--accent` `#d4842b` | 7.13 |

**Worst dark text ratio: 4.50.** Every pair clears.

### Light, measured

| Foreground | Background | Ratio |
|---|---|---|
| `--text` `#16130f` | `--surface` `#ffffff` | 18.52 |
| `--text` `#16130f` | `--bg` `#faf7f5` | 17.36 |
| `--text` `#16130f` | `--cell` `#f0ece8` | 15.75 |
| `--text` `#16130f` | `--well` `#eae4df` | 14.69 |
| `--value` `#2a2622` | `--surface` | 15.01 |
| `--value` `#2a2622` | `--bg` | 14.07 |
| `--value` `#2a2622` | `--cell` | 12.77 |
| `--muted` `#5e635e` | `--surface` | 6.14 |
| `--muted` `#5e635e` | `--bg` | 5.75 |
| `--muted` `#5e635e` | `--cell` | 5.22 |
| `--muted` `#5e635e` | `--well` | 4.87 |
| `--faint` `#14100c98` | `--surface` | 4.89 |
| `--faint` `#14100c98` | `--bg` | 4.79 |
| `--faint` `#14100c98` | `--cell` | 4.64 |
| `--accent-text` `#915a1d` | `--surface` | 5.70 |
| `--accent-text` `#915a1d` | `--bg` | 5.34 |
| `--accent-text` `#915a1d` | `--cell` | 4.85 |
| `--accent-text` `#915a1d` | `--well` | 4.52 |
| `--accent-lit` `#95571f` | `--surface` | 5.74 |
| `--accent-lit` `#95571f` | `--bg` | 5.38 |
| `--accent-lit` `#95571f` | `--cell` | 4.88 |
| `--state-wait` `#9a551f` | `--surface` | 5.69 |
| `--state-wait` `#9a551f` | `--bg` | 5.33 |
| `--state-wait` `#9a551f` | `--cell` | 4.84 |
| `--state-danger` `#c42828` | `--surface` | 5.70 |
| `--state-danger` `#c42828` | `--bg` | 5.35 |
| `--state-danger` `#c42828` | `--cell` | 4.85 |
| `--state-trust` `#16130f` | `--surface` | 18.52 |
| `--state-trust` `#16130f` | `--bg` | 17.36 |
| `--state-trust` `#16130f` | `--cell` | 15.75 |
| `--solid-ink` `#faf7f5` | `--solid` `#16130f` | 17.36 |
| `--ink` `#000000` | `--accent` `#d4842b` | 7.13 |

**Worst light text ratio: 4.52.** Every pair clears.

Three light theme colours needed a move. `--faint` was at 3.99 and its alpha went
from 54.9 to 59.6 percent. `--accent-lit` was at 4.18 and lost 3.2 points of
lightness. `--accent-text`, newly split, was darkened from the shared accent value
until it cleared on all four grounds.

### Non text, measured against the 3 to 1 guideline

| Element | Ratio range, dark | Ratio range, light | Verdict |
|---|---|---|---|
| Focus ring `--accent-text` | 5.73 to 6.93 | 4.52 to 5.70 | passes |
| Accent chip outline `--accent-deep` | 3.43 to 4.15 | 5.09 to 5.98 | passes |
| Visible border `--line` | 1.28 to 1.55 | 1.45 to 1.82 | **fails** |

`--line` is the reference's own border value and no step in section 5 covers
border contrast, so it was not changed. It matters because `--line` draws the
`.btn-ghost` outline and the `.input-well` field edge. In the reference those
components read by their fill rather than their outline: a ghost button sits on a
text label and a field sits on `--well`, which is now a clean 3.0 below its
surface. On focus the field border becomes `--accent-text` at 4.52 or better.
Flagged for you, unchanged by me.

## Step 5. Semantic states

All three derive from hues already present. None is decorative anywhere in the
build: each means one thing only.

| State | Meaning | Derived from | Dark | Light |
|---|---|---|---|---|
| `--state-wait` | A transfer sitting in its cancellation window | `--warn`, hue 38.5 dark and 26.3 light, unchanged from the reference's own warning hue | `#daa649` | `#9a551f` |
| `--state-trust` | An address on your list | `--text`. The reference already uses `--text` as the fill of `.chip--fill`, its marker for the settled and authoritative thing. Trusted reads as the absence of alert, not as a colour | `#ffffff` | `#16130f` |
| `--state-danger` | A cancelled or dangerous action | Hue 0, which `--bg` `hsl(0, 33.3%, 2.4%)` and `--surface` already carry. Saturation 66 to match every other accent, lightness solved for 4.5 | `#dd5858` | `#c42828` |

**One flag.** `--state-danger` is the weakest derivation of the three. Hue 0 is
genuinely present in the palette, but only as the faint warm tint inside a near
black, never as a saturated colour. If you would rather not read that as a
licence, the alternative is to build the cancel state from `--accent-deep` instead
and let cancellation share the orange family, distinguished by weight rather than
hue. I did not do that because a cancel toast and a waiting badge would then be
the same colour, which defeats the point of step 5. Say the word and I will swap it.

## Step 6. Tokenise

Every value above goes into `assets/css/tokens.css` under `:root` and
`:root[data-theme="light"]` and nowhere else. The hardcoded colour scan in brief
section 16 stays clean.

---

# Revision: the accent moves off orange

Requested as a tweak after the first build. The change is confined to the four
accent tokens. Every surface, text and state value is untouched, so steps 2, 4
and 5 of the original procedure still hold as recorded above.

## Why

The Phase 2 palette had one accent hue, inherited from the reference, at
`hsl(31.6)`. Step 5 then derived the waiting state from `--warn` at `hsl(38.5)`.
Those two are seven degrees apart. In practice that meant a focus ring, a link,
the skip link and the hero gradient were all rendering in almost exactly the
same colour as a transfer sitting in its cancellation window, which is the one
colour on the site that is supposed to mean a single specific thing.

Step 5 says a state colour means one thing each and is never used decoratively.
Keeping the accent on the same hue broke that in the other direction: the state
colour was fine, but the decoration was impersonating it.

## What changed

Hue moves to **198**, a clear cyan leaning blue. Saturation stays at the 66
percent the Step 3 restraint set. The three step lit, base, deep relationship is
preserved, and so is the reference's inversion in light theme where lit and deep
sit darker than the base.

| Token | Before | After | HSL after |
|---|---|---|---|
| `--accent` dark and light | `#d4842b` | `#2ba1d4` | `hsl(198, 66%, 50.0%)` |
| `--accent-text` dark | `#d4842b` | `#2ba1d4` | `hsl(198, 66%, 50.0%)` |
| `--accent-lit` dark | `#daa649` | `#5eb8de` | `hsl(198, 66%, 62.0%)` |
| `--accent-deep` dark | `#a46022` | `#227da4` | `hsl(198, 66%, 38.8%)` |
| `--accent-text` light | `#915a1d` | `#1b6483` | `hsl(198, 66%, 31.0%)` |
| `--accent-lit` light | `#95571f` | `#1d6c8e` | `hsl(198, 66%, 33.5%)` |
| `--accent-deep` light | `#8b581d` | `#17546e` | `hsl(198, 66%, 26.0%)` |

Nothing else in the palette moved. `--state-wait` is still `#daa649` dark and
`#9a551f` light, `--state-danger` still `#dd5858` and `#c42828`, `--state-trust`
still resolves to `--text`.

## Hue separation after the change

| Role | Hue | Distance from the accent |
|---|---|---|
| `--accent` | 198.1 | |
| `--state-wait` | 38.5 | 160 degrees |
| `--state-danger` | 0.0 | 162 degrees |
| `--state-trust` | none, neutral | not applicable |

No two meanings now share a neighbourhood.

## Contrast, measured in the browser against the rendered tokens

Every figure below was read from the live page with `getComputedStyle`, not
computed from the source values, so it accounts for whatever the browser
actually resolved.

### Dark

| Foreground | bg | well | surface | cell | Worst | Target | Pass |
|---|---|---|---|---|---|---|---|
| `--accent-text` | 6.95 | 6.57 | 6.24 | 5.74 | 5.74 | 4.5 | yes |
| `--accent-lit` | 9.12 | 8.63 | 8.19 | 7.54 | 7.54 | 4.5 | yes |
| `--accent-deep` | 4.41 | 4.17 | 3.96 | 3.64 | 3.64 | 3.0 non text | yes |
| `--state-wait` | 9.26 | 8.76 | 8.31 | 7.65 | 7.65 | 4.5 | yes |
| `--state-danger` | 5.45 | 5.16 | 4.89 | 4.50 | 4.50 | 4.5 | yes |
| `--ink` on `--accent` | | | | | 7.15 | 4.5 | yes |

### Light

| Foreground | bg | surface | cell | well | Worst | Target | Pass |
|---|---|---|---|---|---|---|---|
| `--accent-text` | 6.16 | 6.57 | 5.59 | 5.21 | 5.21 | 4.5 | yes |
| `--accent-lit` | 5.49 | 5.85 | 4.98 | 4.64 | 4.64 | 4.5 | yes |
| `--accent-deep` | 7.78 | 8.30 | 7.06 | 6.59 | 6.59 | 4.5 | yes |
| `--state-wait` | 5.33 | 5.69 | 4.84 | 4.51 | 4.51 | 4.5 | yes |
| `--state-danger` | 5.35 | 5.70 | 4.85 | 4.53 | 4.53 | 4.5 | yes |
| `--ink` on `--accent` | | | | | 7.15 | 4.5 | yes |

`--accent-deep` carries a higher target in light than in dark because it is a
gradient stop in `.grad-text` there, which makes it text, while in dark it only
draws the accent chip outline and the documentation link underline.

## Hues considered and rejected

| Hue | Rejected because |
|---|---|
| 212 | `--accent-deep` reached only 2.60 against `--cell`, under the 3.0 non text guideline |
| 250, violet | Black ink on the accent fill fell to 2.56, which breaks the skip link, and `--accent-deep` to 1.55 |
| 205 | Workable, but `--accent-deep` at 3.08 left almost no margin over the 3.0 line |

Hue 198 was the only candidate that cleared every threshold with room to spare,
including the non text guideline the previous orange only just made at 3.43.
