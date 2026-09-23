# FILL-CONFIG.md

How to put the Solana values on the live site.

`config/kerb.config.json` is the only file you edit. It ships with every address
as an empty string. The `no-cache, must-revalidate` header on `/config/*` in
`vercel.json` is what lets the change appear without a rebuild.

## Runbook

```
1. Open config/kerb.config.json, or copy .env.example to .env and fill that in
2. Set solana.SOLANA_NETWORK: mainnet-beta, devnet or testnet
3. Set solana.SOLANA_RPC_URL. Required on mainnet for balances, see below
4. Only if the token exists, set solana.KERB_TOKEN_MINT and KERB_TOKEN_SYMBOL
5. Only once the program is deployed, verified and its upgrade authority
   revoked, set solana.KERB_PROGRAM_ID
6. Set meta.siteUrl and links.*
7. If you used .env: python tools/solana-env.py
8. Commit and push. No other file changes.
9. Verify: the strip shows the mint, the Program section links to Solana
   Explorer on the right cluster, copy returns the full address, the console
   shows no validation warnings.
```

## Environment variables

The keys in the `solana` block are named after the variables a framework build
would read, so the mapping is one to one:

| Variable | JSON key |
|---|---|
| `NEXT_PUBLIC_SOLANA_NETWORK` | `solana.SOLANA_NETWORK` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `solana.SOLANA_RPC_URL` |
| `NEXT_PUBLIC_EXPLORER_BASE_URL` | `solana.EXPLORER_BASE_URL` |
| `NEXT_PUBLIC_KERB_TOKEN_MINT` | `solana.KERB_TOKEN_MINT` |
| `NEXT_PUBLIC_KERB_TOKEN_SYMBOL` | `solana.KERB_TOKEN_SYMBOL` |
| `NEXT_PUBLIC_KERB_PROGRAM_ID` | `solana.KERB_PROGRAM_ID` |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | `solana.TREASURY_ADDRESS` |

The site has no build step, so nothing reads the environment at deploy time.
`tools/solana-env.py` copies whatever is set, from the environment or from a
`.env` file, into the JSON; `--check` shows the change without writing it. The
unprefixed names work too. `.env` is ignored by git, and both `.env` and
`.env.example` are kept out of the deployment by `.vercelignore`.

Every one of these values is public. The JSON is served to every visitor.

## The RPC URL

Leave `SOLANA_RPC_URL` empty and the site uses the cluster's public endpoint.
That works on devnet and testnet. It does not work on mainnet:
`api.mainnet-beta.solana.com` refuses requests from browsers with
`403 Access forbidden`, so balances read as unavailable.

On mainnet, use a provider endpoint and restrict its key to the production
domain in the provider's dashboard. The key will be visible in the page, like
everything else in this file; the domain restriction is what protects it. The
site makes at most three reads per wallet action: `getBalance` and two
`getTokenAccountsByOwner`, plus `getTokenSupply` when a pasted mint is not in
the wallet.

## What each field changes on the page

| Field | Empty | Filled |
|---|---|---|
| `KERB_TOKEN_MINT` | The strip at the very top reads `Coming Soon`. The copy button is present but inert: clicking it announces `Not live yet` and copies nothing. No explorer link. The Mint row reads `Coming Soon`. | The strip reads the truncated mint, for example `ZtQW…svWN`, in its original case. Copy is active and copies the full address, announcing `Copied`. The explorer link appears. The Mint row matches. A connected wallet sees its balance of this mint labelled with `KERB_TOKEN_SYMBOL`. |
| `KERB_PROGRAM_ID` | The Program row reads `Not deployed`. No copy, no explorer link. | The row reads the truncated id, with an active copy button and an explorer link. The app does **not** start sending; that needs code, not config. |
| `SOLANA_NETWORK` | Treated as `mainnet-beta`. | The Network row reads `Solana Mainnet`, `Solana Devnet` or `Solana Testnet`, and every explorer link carries the matching `?cluster=`. |
| `EXPLORER_BASE_URL` | No explorer link appears anywhere, even when an address is set. | Links are built as `EXPLORER_BASE_URL + /address/ + key`, with `?cluster=` off mainnet. The layout is Solana Explorer's. |
| `TREASURY_ADDRESS` | Nothing. | Validated as a public key. Nothing on the site displays it yet. |
| `links.x`, `links.github`, `links.docs` | Each empty entry has its footer link removed from the DOM. When all three are empty the whole Elsewhere column goes too. | Each filled entry renders as a footer link. |
| `meta.siteUrl` | The canonical link and the `og:url` meta are removed from the DOM. | Both are filled, with `/` on the landing page and `/app` on the app shell. |
| `flags.appEnabled` false | Every Open App control loses its `href` and gains `aria-disabled="true"`. | The controls work normally. |
| `flags.showProgramSection` false | The whole Program section is removed from the DOM. | The section renders. |

## Validation

`config/config.js` checks the file on every load and writes one `console.warn`
per problem. It never throws and never blanks the page: a bad value falls back
to the empty state.

| Rule | Message shape |
|---|---|
| `KERB_TOKEN_MINT`, `KERB_PROGRAM_ID`, `TREASURY_ADDRESS` are base58 decoding to 32 bytes when not empty | `solana.KERB_TOKEN_MINT is not a valid Solana public key: ...` |
| `SOLANA_NETWORK` is one of the three clusters | `solana.SOLANA_NETWORK must be one of mainnet-beta, devnet, testnet, received: ...` |
| `EXPLORER_BASE_URL` and `SOLANA_RPC_URL` start with `https://` when not empty | `solana.SOLANA_RPC_URL must start with https:// when set, received: ...` |
| `defaults.dwellSeconds` between `minDwellSeconds` and `maxDwellSeconds` | `defaults.dwellSeconds must sit between 60 and 604800, received: ...` |

A clean console after step 8 means every value passed. Passing is not the same
as being right: the validator cannot tell your mint from somebody else's.

## Truncation

Addresses display as the first four characters, the ellipsis character `…`
(U+2026), then the last four, the same shape Solana wallets use. Example:
`ZtQW…svWN`. Copy always returns the full untruncated address, never the display
form. Base58 is case sensitive, so every element holding an address carries
`data-address`, which exempts it from the uppercase label styling around it.

## Notes

- Setting `KERB_PROGRAM_ID` changes the landing page only. The app keeps
  stopping at review until a source that builds Kerb instructions is written.
  See `content/docs/integration/frontend.md`.
- The demo hold runs for 20 seconds rather than `defaults.dwellSeconds` so the
  countdown is watchable. The connected review quotes `defaults.dwellSeconds`.
- No mint, program id, RPC URL or explorer URL exists anywhere else in the
  repository, apart from the fixed public ids in `config/solana.js`: the two
  token programs, wrapped SOL, and the USDC and USDT mints used as labels.
