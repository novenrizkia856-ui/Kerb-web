# FILL-CONTRACTS.md

How to put the deployed addresses on the live site.

`config/kerb.config.json` is the only file you edit. It ships with every address
as an empty string. The `no-cache, must-revalidate` header on `/config/*` in
`vercel.json` is what lets the change appear without a rebuild.

## Runbook

```
1. Open config/kerb.config.json
2. Set contracts.core.address, contracts.lens.address, deployBlock, verified
3. Set chain.rpcUrl and chain.explorerBaseUrl
4. Only if a token exists, set token.address, token.symbol, token.decimals
5. Set meta.siteUrl and links.*
6. Commit and push. No other file changes.
7. Verify: token strip shows the address, contract rows link to the explorer,
   copy returns the full address, console shows no validation warnings.
```

## What each field changes on the page

| Field | Empty | Filled |
|---|---|---|
| `token.address` | The strip at the very top reads `Coming Soon`. The copy button is present but inert: clicking it announces `Not live yet` and copies nothing. No explorer link. | The strip reads the truncated address, for example `0x71C7…976F`. Copy is active and copies the full address, announcing `Copied`. The explorer link appears. |
| `contracts.core.address` | The Core row reads `Not deployed`. No copy, no explorer link. | The row reads the truncated address, with an active copy button and an explorer link. |
| `contracts.lens.address` | Same as Core. | Same as Core. |
| `chain.explorerBaseUrl` | No explorer link appears anywhere, even when an address is set. | Explorer links appear next to every filled address, built as `explorerBaseUrl + explorerAddressPath + address`. |
| `chain.name` | The Network row is blank. | The Network row reads the chain name. |
| `links.x`, `links.github`, `links.docs` | Each empty entry has its footer link removed from the DOM. When all three are empty the whole Elsewhere column goes too. | Each filled entry renders as a footer link. |
| `meta.siteUrl` | The canonical link and the `og:url` meta are removed from the DOM. | Both are filled, with `/` on the landing page and `/app` on the app shell. |
| `flags.appEnabled` false | Every Open App control loses its `href` and gains `aria-disabled="true"`. | The controls work normally. |
| `flags.showContractsSection` false | The whole Contracts section is removed from the DOM. | The section renders. |

## Validation

`config/config.js` checks the file on every load and writes one `console.warn`
per problem. It never throws and never blanks the page: a bad value falls back
to the empty state.

| Rule | Message shape |
|---|---|
| Address shape `/^0x[a-fA-F0-9]{40}$/` when not empty | `token.address is not a valid address: ...` |
| `chain.id` a positive integer | `chain.id must be a positive integer, received: ...` |
| `chain.explorerBaseUrl` starts with `https://` when not empty | `chain.explorerBaseUrl must start with https:// when set, received: ...` |
| `chain.rpcUrl` starts with `https://` when not empty | `chain.rpcUrl must start with https:// when set, received: ...` |
| `defaults.dwellSeconds` between `minDwellSeconds` and `maxDwellSeconds` | `defaults.dwellSeconds must sit between 60 and 604800, received: ...` |

A clean console after step 6 means every value passed.

## Truncation

Addresses display as the first six characters, the ellipsis character `…`
(U+2026), then the last four. Example: `0x71C7…976F`. Copy always returns the
full untruncated address, never the display form.

## Verified, not assumed

The whole runbook was rehearsed end to end before handover: the config was
filled with deployed style values, every rule was checked in the browser, then
the file was reverted and the empty states were confirmed to return. No code was
touched at any point.

| Check | Result |
|---|---|
| Token strip value | `0x2546…Ec30`, truncated correctly |
| Token copy button | active, `aria-label` reads `Copy token address` |
| Token explorer link | shown, and the href carries the **full** address, not the truncated one |
| Core row | `0x71C7…976F`, copy shown, explorer shown |
| Lens row | `0x4E83…311C`, copy shown, explorer shown |
| Explorer URL assembly | a trailing slash on `explorerBaseUrl` was planted on purpose and normalised away, so the path never doubles up |
| Network row | reads `chain.name` |
| Footer links | `x` and `github` rendered, `docs` left empty and removed, the group survived because two links remained |
| Canonical and `og:url` | filled from `meta.siteUrl` on both routes, `/` and `/app` |
| **What copy actually writes** | the full 42 character address, never the truncated display form. Verified by intercepting `navigator.clipboard.writeText` on all three buttons and comparing each captured string to the config value character for character |
| Announcements | three `Copied` toasts through the shared polite region |
| Console | silent. Every field passed the validator |
| App shell under a filled config | unchanged, still mock. The demo hold stayed at 20 seconds and did not pick up `defaults.dwellSeconds` |
| After reverting | `Coming Soon`, `Not deployed` twice, copy and explorer hidden again, footer links and the whole Elsewhere column removed, canonical and `og:url` removed |

## Notes

- The app shell at `/app` is mock only. It never reads a contract address and is
  unaffected by anything in this runbook. Its demo data lives in
  `assets/js/app-mock.js` and is commented as mock.
- The demo hold runs for 20 seconds rather than `defaults.dwellSeconds` so the
  countdown is watchable. Changing `dwellSeconds` does not change the demo.
- No address, chain id, RPC URL or explorer URL exists anywhere else in the
  repository. The scan that proves it is in `README.md`.
