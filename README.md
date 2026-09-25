# Kerb web

Static landing page and a mock application shell for Kerb, a small noncustodial
protocol. The first transfer to an address you have never sent to is held in a
short cancellation window. Every transfer to that address afterwards goes
straight through. An attacker can write fake addresses into your transaction
history, but cannot write into a list built only from your own completed sends.

Plain HTML, CSS and ES modules. No framework, no bundler, no backend, no build
step. Two routes: `/` and `/app`.

## Run it

```bash
npx serve .
```

There is nothing to install and nothing to compile. Open the printed URL.

## Layout

```
index.html            landing page
app/index.html        mock app shell, demo data only
config/
  kerb.config.json    every address, link and flag. The only file you edit after deploy
  config.js           render rules, validator, truncation helper
assets/
  css/
    tokens.css        every colour, easing curve and duration. :root only
    base.css          reset, fonts, document frame, focus ring
    components.css    components ported from the reference frontend
    sections.css      Kerb's own section layouts
  js/
    motion.js         motion ported from the reference: typer, nav morph, ascii rain, observer
    kerb-visuals.js   the waiting window and the history versus list panels
    app.js            the four state send flow
    app-mock.js       mock contacts and tokens. The only address literals in the repo
    copy.js           clipboard and the shared announcement region
    main.js           boots both pages
  fonts/              Geist and Geist Mono, self hosted, SIL OFL 1.1
content/docs/         documentation source in GitBook layout, SUMMARY.md drives the order
docs/                 the generated documentation site, served at /docs
tools/build-docs.py   renders content/docs into docs. An authoring tool, not a build step
notes/
  DESIGN-SYSTEM.md    what the reference frontend does, extracted value by value
  PALETTE.md          the colour refinement, with every contrast ratio measured
  MOTION-LOG.md       every motion value against its reference value
  FILL-CONTRACTS.md   how to put the deployed addresses live
vercel.json
```

## Documentation

The protocol documentation lives in `content/docs` as plain markdown with a
`SUMMARY.md`, which is a GitBook layout. The same files are rendered into a
static site under `docs/`, served at `/docs`, by an authoring script:

```bash
python tools/build-docs.py
```

That script runs on a developer machine and its output is committed. Vercel
still runs no command and compiles nothing. Edit the markdown, run the script,
commit both.

## Where the design comes from

The palette, typography, spacing, component shapes, easing curves, durations and
scroll behaviour are extracted from an existing frontend the operator
contributed to and has permission to reuse. `notes/DESIGN-SYSTEM.md` records every
value and where it came from. `notes/MOTION-LOG.md` shows that no timing,
distance or easing was changed. `notes/PALETTE.md` shows the only colour moves
that were made and why.

No source project brand name, logo, wordmark, image or copy was carried over.

## Filling in the addresses

See `notes/FILL-CONTRACTS.md`. Short version: edit `config/kerb.config.json`,
commit, push. The `no-cache` header on `/config/*` means the site picks it up
without a rebuild.

Until then the token strip reads `Coming Soon` and the contract rows read
`Not deployed`. Those are the intended empty states, not placeholders.

Launching the token is one line: set `token.address` in
`config/kerb.config.json`. Empty or `null` reads `Coming Soon`. Anything else
shows in the strip at once, copyable, with an explorer link when it is a real
address.

## Deploy

Vercel, static.

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Build Command | empty |
| Output Directory | `.` |
| Install Command | empty |

```bash
npx vercel --prod
```

`vercel.json` sets `cleanUrls`, a one year immutable cache on `/assets/*`, a
`no-cache` on `/config/*`, and `X-Content-Type-Options`, `Referrer-Policy` and
`X-Frame-Options` on everything.

## Checks

Three scans guard the rules that matter. All three are expected to be silent,
except for the noted exceptions.

```bash
grep -rnP '0x[a-fA-F0-9]{40}' --include='*.html' --include='*.js' --include='*.css' . | grep -v '^./config/'
```

Two expected exceptions, nothing else:

- the three seeded mock contacts in `assets/js/app-mock.js`, each commented as mock
- the truncation illustration in `docs/concepts/address-poisoning` and
  `docs/integration/frontend`, which is inside a code block labelled
  `example address, not a deployment`

`vercel.json` also ships alongside a `.vercelignore` that keeps `notes/`,
`content/` and `tools/` out of the deployment. `notes/DESIGN-SYSTEM.md` names
the reference frontend the design was extracted from, which belongs in version
control and does not belong on a public URL.

```bash
grep -rnP '#[0-9a-fA-F]{3,8}\b' --include='*.css' assets/css | grep -v 'tokens.css'
```

Expected: no output. Every colour lives in `tokens.css`.

```bash
grep -nP '>[^<]*[\x{002D}\x{2011}\x{2013}\x{2014}][^<]*<' index.html app/index.html
```

Expected: no output. No dash character appears in any user facing text.

## Measured

Lighthouse 12, mobile, median of three runs per page, against a local server
with brotli compression on.

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 99 | 100 | 100 | 100 | 1.73s | 0.002 |
| `/app` | 99 | 100 | 96 | 100 | 1.57s | 0.023 |
| `/docs` | 99 | 100 | 100 | 100 | 1.67s | 0.000 |
| `/docs/protocol/state` | 99 | 100 | 100 | 100 | 1.72s | 0.012 |
| `/docs/reference/faq` | 99 | 100 | 100 | 100 | 1.74s | 0.028 |

Desktop scores 100 on performance across the same pages. Budgets are LCP under
1.8s, CLS under 0.05, both met everywhere.

JavaScript gzipped: 13.5KB against a 60KB budget. CSS gzipped: 12.3KB across the
four stylesheets. Twenty generated documentation pages.

**One audit does not pass.** `font-size` on mobile `/app` reports 56 percent
legible text, because the reference type scale puts mono labels at 11px and
ledger rows at 10.5px, and the app page is mostly those. The type scale is a
KEEP EXACTLY item and nothing about the layout breaks, so it was left alone.
Accessibility still scores 100. Raising the two smallest steps would clear it at
the cost of fidelity to the reference.

### Two performance findings worth recording

**Layout shift from the mono font.** Documentation pages carry inline code in
running prose, and Geist Mono is 9.13 percent wider than the Consolas a bare
monospace stack resolves to on Windows. Every paragraph containing inline code
rewrapped when the real font landed, which measured CLS 0.061 on the longest
page. Courier New matches Geist Mono advance width to within 0.02 percent, so a
metric matched fallback face was added in `base.css`. That took the same page to
0.012. The reference does not need this because it only ever sets mono on short
uppercase labels.

**Four stylesheets versus one.** Lighthouse reports the four render blocking
stylesheets as an estimated 150ms saving. Measured over three runs each, a
single concatenated stylesheet gave a median LCP of 1.58s against 1.61s for the
four. The difference is inside the run to run noise, so the four file structure
stayed as it is.

## Browser support

Chrome, Edge, Firefox and Safari, latest two. iOS Safari 16 and up.

| Feature | Floor | Handling |
|---|---|---|
| `color-mix()` | Safari 16.2 | Guarded behind `@supports`, as the reference does. Below the floor the nav stays opaque and the stream hairline stays solid. |
| `:has()` | Safari 15.4, Firefox 121 | Only in the ported typer lozenge radii, where the reference uses it. Nothing structural depends on it. |
| `text-wrap: balance` and `pretty` | Chrome 114, Safari 17.5 | Progressive. Below the floor the text wraps normally. |
| `mask-image` | Safari 15.4 | `-webkit-` prefix alongside the standard property. |
| `backdrop-filter` | Safari 9 | `-webkit-` prefix alongside. |
| `:focus-visible` | Safari 15.4 | Below the floor there is no ring, same as the reference, which defines none at all. |

No JavaScript beyond ES2020 is used: no `structuredClone`, no `Array.at`, no
logical assignment, no top level await. All seven modules parse clean under
`node --check`.

## Honest limits

Kerb is not audited. The protocol is a speed bump you choose, you can send around
it, and a stolen key sends direct. The landing page says so in its own section
and that section is not marketing.
