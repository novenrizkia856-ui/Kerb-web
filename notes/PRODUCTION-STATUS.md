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
reconnect on return. Nothing signs anything.

## Set the WalletConnect project id

In `config/kerb.config.json`:

```json
"wallet": { "walletConnectProjectId": "", "enabled": true }
```

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

## Not ready

### The app does not transact

`app/index.html` is still a demo shell. The wallet connects for real, and
nothing else does: sending, cancelling and settling run against
`app-mock.js` and sign nothing. `flags.appMode` stays `"mock"` because that is
true, and because nothing in the codebase reads the flag anyway — flipping it
would change a word and not a behaviour.

What wiring it up needs: encode and send `send`, `cancel`, `settle`, `trust`,
`untrust` through the connected provider; read contacts and pendings through
`KerbLens` (`contactsPage`, `pendingsOf`, `summary`); watch `Held`, `Settled`,
`Cancelled` and `Trusted` logs to keep the list current. The ABIs are in
`config/abi/` and `wallet.js` already exposes an `eth_call` helper.

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

## Fixed while looking

`vercel.json` marked everything under `/assets/` as
`max-age=31536000, immutable`, but no build step hashes the filenames. A
returning visitor would have kept a stale `main.js` and `tokens.css` for a year
after any deployment. Images and fonts keep the immutable header, because those
genuinely do not change in place; `.js` and `.css` now revalidate.

This was not theoretical. It is exactly what happened in local testing: a
freshly written `main.js` was served from memory cache and the connect button
did nothing until the cache was bypassed.
