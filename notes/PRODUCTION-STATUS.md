# Production status

Written after the contracts were deployed to Robinhood Chain (4663) and the
site was pointed at them. It says what is ready, what is not, and what will
mislead somebody if it ships as is.

## Ready

**The landing page.** Static, config driven, no build step. The contracts
section reads the real deployed addresses out of `config/kerb.config.json` and
links to the explorer. Verified in a browser against the served config with no
console errors.

**Wallet connection.** `assets/js/wallet.js` and `assets/js/wallet-ui.js`.
EIP-6963 discovery first, so a browser with several extensions offers a choice
instead of whichever one won the race for `window.ethereum`; a pre-6963 wallet
falls back to the global. WalletConnect is loaded from a CDN at click time, and
only when a project id is set, so a visitor using an extension never downloads
it. Connect, disconnect, account display, chain switch and add, silent
reconnect on return.

**The app.** It transacts against the deployed contracts. See below.

## The WalletConnect project id

Set in `config/kerb.config.json` under `wallet.walletConnectProjectId`.

**Not in a Vercel environment variable, and this is not a shortcut.** This site
has no `package.json` and no build step. Vercel environment variables exist at
build time and in serverless functions; a static file served to a browser never
sees them. There is nothing here to substitute the value in.

The id is also not a secret. It travels to every visitor's browser and anybody
can read it in devtools. What protects it is the domain allowlist in the
WalletConnect dashboard, so add the production domain there. The public config
file is the correct home for a public value.

Leaving it empty is a supported state: the picker simply offers the installed
extensions and no WalletConnect row.

## Now live, not demo

`app/index.html` transacts. Connect a wallet on chain 4663 and the same four
screens drive the deployed contracts; disconnect and the demo source takes back
over. Both sources implement one interface in `app-source.js`, so the live path
is not a second, less tested app bolted to the side of the first.

What it does:

- **Send.** Native and ERC-20. For a token it checks the balance, checks the
  allowance, and sends an approval first only when one is needed, telling you
  which of the two signatures you are looking at. Approval is for the exact
  amount, not unlimited — Kerb's own claim that an unlimited approval to
  KerbCore is safe is a claim about KerbCore, and an app that habituates people
  to signing unlimited approvals is teaching the habit that drains them
  somewhere else.
- **Waiting.** Open holds are found from `Held` logs filtered on the sender,
  then resolved in one `pendingsOf` call. Each row carries a live countdown and
  a Cancel that becomes Settle when the window closes.
- **Cancel and settle.** Real transactions, waited on, and a reverted receipt is
  reported as a failure rather than shown as success.
- **Your list.** Read from `KerbLens.contactsPage`, refreshed after anything
  that could change it.

### Verified end to end, not just wired

Run against a local Anvil node with the real contracts deployed and a provider
shim standing in for a wallet:

| | |
|---|---|
| Connect, read contacts | the `trust`ed contact and its on-chain label |
| Trusted vs new address | read from `isTrusted`, not from mock data |
| Send 0.01 and 0.05 ETH | `nextId` advanced, holds appeared with real windows |
| Cancel | 0.05 ETH refunded, hold gone |
| Settle after the window | recipient received exactly 1 ETH |
| The property itself | the settled recipient joined the contact list |

### Two bugs that testing found

**The countdown asked the wrong clock.** `cancel` and `settle` are decided by
`block.timestamp`, and the first version computed the time remaining from
`Date.now()`. A user whose device clock is a few minutes fast would have been
offered Settle on a hold the contract still considered open, and the
transaction would have reverted in their face with nothing the app could say
about why. Every window decision now goes through a chain clock, resynced
whenever the lists reload. The Anvil run made this visible by putting the chain
1,142 seconds ahead of the browser.

**The demo countdown would have lied in live mode.** `mountWindow` reads
`data-dwell` once when it mounts and closes over it, so the twenty second demo
animation could not be retargeted at a real window of fifteen minutes to seven
days. Rather than animate a wrong number convincingly, live mode hides that
widget and shows the actual release time and time remaining.

## Still not ready

### The documentation describes a contract that was never deployed

This is the one that will actively mislead people, and it is worse than a
missing feature because it looks finished.

| The docs say | The deployed contract has |
|---|---|
| `forget(address)` | `untrust(address)` |
| `holdId = keccak256(abi.encode(sender, recipient, asset))` | a sequential `uint256` from `nextId` |
| `holdIdOf(sender, recipient, asset)` | no such function |
| one pending per sender/recipient/asset triple | any number of concurrent pendings |

`forget` appears in ten files under `content/docs/`. Anyone who integrates from
these pages writes code that does not compile against the deployed ABI.

The docs are generated from `content/docs/**` by `tools/build-docs.py` into
`docs/`, so both trees need the fix and the generator needs re-running.

There is a second drift worth checking while in there: earlier drafts argued
that `trust()` deliberately does not exist. It does exist, it is one of the two
doors into the list, and it grants a permanent bypass for that address from a
single signature. That is a real sharp edge and the docs should describe it
rather than deny it.

## Also fixed while looking

**WalletConnect could not load.** The CDN URL pointed at the package's own
`dist/index.es.js`, which begins `import { EventEmitter } from "events"` — a
bare specifier Node resolves and a browser cannot, so the import failed with a
module resolution error before any WalletConnect code ran. The `+esm` build on
the same CDN is bundled: no bare specifiers, and its remaining imports are
absolute paths on the same origin. Confirmed loading in the browser, exporting
`EthereumProvider.init`.

**A stale cache header would have frozen every JS fix for a year.**
`vercel.json` marked everything under `/assets/` as
`max-age=31536000, immutable`, but no build step hashes the filenames. A
returning visitor would have kept a stale `main.js` and `tokens.css` for a year
after any deployment. Images and fonts keep the immutable header, because those
genuinely do not change in place; `.js` and `.css` now revalidate.

This was not theoretical. It is exactly what happened in local testing: a
freshly written `main.js` was served from memory cache and the connect button
did nothing until the cache was bypassed.
