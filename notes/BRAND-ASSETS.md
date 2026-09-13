# Brand assets

What came in the logo pack, what each file actually is, and where it went.

## What was supplied

Twelve files at 4167px square or larger. Read rather than assumed: the five
`KERB LOGO-0x` PNGs are all genuinely transparent, roughly 94% clear pixels
each. The matching `.jpg` files are the same artwork flattened onto black
(02, 04) or white (05), which is why an early pass mistook them for versions
with baked backgrounds.

| File | What it is | Transparent |
|---|---|---|
| `KERB LOGO-01.png` | Lockup, all white | yes |
| `KERB LOGO-02.png` | Lockup, lime mark + white wordmark | yes |
| `KERB LOGO-03.png` | Mark only | yes |
| `KERB LOGO-04.png` | Mark only, same artwork as 03 | yes |
| `KERB LOGO-05.png` | Lockup, lime mark + black wordmark | yes |
| `KERB.png` | 3D glossy mark | yes |
| `KERB PFP.jpg` | 3D mark on a lime gradient | no |
| `KERB X BANNER.png` | 3:1 social header | no, fully opaque |

**The one detail that decided most of the placement:** the mark's eyes and
mouth are knocked out of the artwork, not filled white. They take the colour of
whatever is behind them, so the mark needs no recolouring per theme; what it
does need is something dark behind it on the light theme, which is covered
below.

Brand colour sampled from the artwork: **`#c8f800`**.

## Where each one went

Everything in `assets/img/` is generated from the originals by the commands in
the commit that added them. The originals are not in the repo.

| Asset | Built from | Used by |
|---|---|---|
| `logo-lockup-dark.png` 560×242 | LOGO-02 | Nav and footer, dark theme |
| `logo-lockup-light.png` 560×242 | LOGO-05 + a dark tile | Nav and footer, light theme |
| `logo-lockup-mono.png` 420×150 | LOGO-01 | Spare, nothing yet |
| `mark.png` 512 transparent | LOGO-03 | Manifest, anything needing the face alone |
| `favicon.ico` 16/32/48 | LOGO-03 | Browser tab |
| `favicon-16/32/48.png` | LOGO-03 | Browser tab |
| `apple-touch-icon.png` 180 | LOGO-03 | iOS home screen |
| `icon-192.png`, `icon-512.png` | LOGO-03 | `site.webmanifest` |
| `og.png` 1200×630 | LOGO-02 + Geist | Open Graph, Telegram, Slack, Discord |
| `og-x.png` 1200×600 | LOGO-02 + Geist | X, which crops 1.91:1 badly |
| `x-banner.png` | supplied as is | **Not used on the site.** See below |

### The mark needed a dark tile on the light theme

Lime `#c8f800` on the light theme's `#faf7f5` measures **1.17 to 1**. That is
not a logo sitting on a page, it is a logo disappearing into one, and it is
what "the images sank into the background" was pointing at.

The supplied pack has no lime-on-white composition anywhere. The PFP is a dark
mark on lime; LOGO-04 is lime on black; LOGO-02 is lime on dark. Every
composition the designer made puts the lime against something dark, so the
light lockup now carries a dark rounded tile behind the mark rather than a
second brand colour being invented for it. On that tile the lime measures
**14.89 to 1**. The dark lockup is untouched at 16.4 to 1 and needs no tile.

Both files are built on one canvas geometry, so the wordmark lands in the same
place in each and the theme toggle neither resizes nor shifts the logo: both
render at exactly 56×24 in the nav.

The favicons sit on solid `#080404` rather than transparent. With the eyes and
mouth knocked out, a transparent favicon takes the browser tab's own colour
through the face and loses its features entirely at 16px.

The share cards are composed, not cropped: the real lockup, the real headline,
set in Geist from the repo's own font file, on the site's own background. A
lime rule runs along the bottom so the card is recognisably Kerb at thumbnail
size, where the wordmark is too small to read.

## The X banner is deliberately not on the page

It is a 5000×1667 social header: fully opaque, bright lime, and busy. Dropping
it into a dark, quiet page would not look like a mistake to fix later, it would
look like a different product. It belongs on the X profile header, which is
what it was made for. It is committed at `assets/img/x-banner.png` so it is
version controlled and easy to find.

## Two things still open

### The accent colour disagrees with the logo

The logo is lime `#c8f800`. The site's accent, used for links, the gradient in
the hero headline, numerals and focus rings, is blue `#2ba1d4`. They currently
sit on the same page without agreeing.

`--brand` is defined in `tokens.css` and used by nothing but the marks, so the
logo is correct wherever it appears and nothing else moved. Making the two
agree is a decision about the product rather than about CSS, and it is not one
to make quietly on somebody's behalf: switching the accent to lime would touch
the headline gradient, every link, the focus ring and the trust state colour,
and it would need its own contrast pass, since `#c8f800` on `#080404` is a very
different measurement from `#2ba1d4`.

### The share cards need the production domain

`og:image` is written into the HTML as a relative path, and relative share
images are read inconsistently: some crawlers resolve them against the page
URL, X often will not.

It cannot be left to `config.js`. That fills `data-site-url` at runtime, and no
crawler that renders a link preview runs script. Facebook, X, Telegram, Slack,
iMessage and Discord all read the raw document.

So when the domain is known, run it once and commit:

```bash
python tools/set-site-url.py https://your-domain
```

That rewrites `og:image`, `twitter:image`, `og:url` and `canonical` across all
22 HTML files to absolute URLs, and sets `meta.siteUrl` so the runtime path
agrees with the baked one. It reads the path from each tag's own
`data-site-url` attribute rather than from its current value, so it is
idempotent and can be pointed at a new origin later.
