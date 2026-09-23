# Production status

Written after the site was moved to Solana. It says what is ready, what is not,
and what will mislead somebody if it ships as is.

## Ready

**The landing page.** Static, config driven, no build step. The token mint
strip and the Program section read `solana.KERB_TOKEN_MINT` and
`solana.KERB_PROGRAM_ID` out of `config/kerb.config.json`, render `Coming Soon`
and `Not deployed` while they are empty, and link to Solana Explorer on the
configured cluster once they are set. The instruction figure reads the planned
interface from `config/idl/kerb.json`.

**Wallet connection.** `assets/js/wallet.js` and `assets/js/wallet-ui.js`.
Wallet Standard discovery first, the same protocol `@solana/wallet-adapter` is
built on, so Phantom, Solflare, Backpack and any other standard wallet are
offered by name. Injected globals (`window.phantom.solana`, `window.solflare`,
`window.backpack`) are the fallback for a wallet that does not register. Connect,
disconnect, account switching from the wallet side, and silent reconnect on
return. With no wallet installed the picker says so and links to the three.

**Read only data.** `assets/js/solana-read.js`. SOL balance, SPL balances under
both token programs, and a mint's decimals, all plain JSON-RPC over `fetch`.
Shown in the account menu and in the compose form.

## Not live, on purpose

There is no Kerb program on Solana, so the app sends nothing.

- **Before a wallet connects** the app runs the demo: invented contacts, a
  twenty second window, all four screens. No network request, nothing signed.
- **After a wallet connects** it reads the wallet's real balances, validates a
  send against them, and stops at review. Confirm reads `Not live` and is
  disabled, and the review says `Solana execution is not active yet. Nothing
  will be signed or sent.` The contact list is empty, and says the list lives in
  the program.

No code in the repository builds a Solana transaction or reads a wallet's
signing features. `wallet.js` never touches `solana:signTransaction`,
`solana:signAndSendTransaction`, `solana:signMessage` or `solana:signIn`, and
never calls `signTransaction`, `signAllTransactions` or `sendTransaction` on an
injected provider. `solana-read.js` has no `sendTransaction`,
`simulateTransaction` or `requestAirdrop`. The review's Confirm handler refuses
for any source that does not execute, even if the disabled button is forced.

### Verified in a browser

A test wallet was registered through the real Wallet Standard event, with spies
on its signing features, and the config pointed at devnet with devnet USDC
standing in for the Kerb mint:

| | |
|---|---|
| Discovery | the wallet appeared in the picker by name |
| Connect, silent reconnect, account switch, wallet side disconnect | all reflected in the button and the app |
| Balances | SOL and every SPL holding listed with real amounts, the configured mint labelled `KERB` |
| Validation | over balance, too many decimals, own address and a non mint key each refused with a sentence |
| Review | route shown as `Held 15 min`, Confirm disabled, non live notice shown |
| Forced Confirm click | refused with the non live notice, no state change |
| Signing spies | never called, in either the standard or the injected fallback path |
| Explorer links | `?cluster=devnet` appended on devnet, absent on mainnet |
| Mobile, 375 pixels | no horizontal scroll with a filled mint, full key in the account menu stays inside the viewport |

## Still not ready

### Mainnet balances need an RPC URL

`api.mainnet-beta.solana.com` answers `403 Access forbidden` to any request from
a browser origin. With `SOLANA_RPC_URL` empty on mainnet, every balance reads as
unavailable. Nothing breaks, the app says so, but the read only mode shows no
numbers. Set `SOLANA_RPC_URL` to a provider endpoint whose key is restricted to
the production domain. Devnet and testnet's public endpoints do answer browsers.

### Placeholders that must stay empty until they are real

| Field | State |
|---|---|
| `KERB_TOKEN_MINT` | empty, the strip and the Mint row read `Coming Soon` |
| `KERB_PROGRAM_ID` | empty, the Program row reads `Not deployed` |
| `TREASURY_ADDRESS` | empty, and nothing on the site reads it yet |

Do not put a placeholder key in any of them. The validator only checks that a
value is a well formed public key, not that it is the right one.

### Landing copy that describes the future program

"No upgrade authority. Revoked at deploy." and the instruction figure describe
the specified program, not a deployed one. They are accurate to the
specification in `content/docs/`, and the Program row saying `Not deployed`
sits beneath them, but they should be re-read against the real program the day
it ships.

The scale numbers in the landing page's second section come from studies of
chains other than Solana. The documentation says so; the landing page does not.

## Also worth knowing

**The wallet picker's spacing tokens are undefined.** `components.css` styles
`.wallet-picker` and `.wallet-option` with `--space-2`, `--space-3`, `--step--1`,
`--fg` and `--fg-dim`, none of which exist in `tokens.css`, so the menu renders
with no padding. This predates the Solana move and was left alone under the
design lock. It is a two line fix whenever the design owner wants it.
