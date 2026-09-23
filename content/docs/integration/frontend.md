# Frontend integration

How an interface talks to Kerb. This describes what the Kerb web app will do
once the program exists, and is written so that any other wallet or frontend can
do the same. The last section says what the web app does today.

## No backend

Kerb has no server, no indexer and no API. Everything an interface needs comes
from two places: accounts read over RPC, and the events in Kerb transactions.
Any interface that can reach an RPC endpoint can render the complete state of a
user.

That constraint is deliberate. An interface that depends on a Kerb operated
service reintroduces a party who can go away, censor, or be compelled. See
[Protocol overview](../protocol/overview.md).

## Connecting a wallet

Use Wallet Standard discovery, which Phantom, Solflare, Backpack and most other
Solana wallets support, and which `@solana/wallet-adapter` is built on. The Kerb
web app does it without a library: it announces `wallet-standard:app-ready` and
listens for `wallet-standard:register-wallet`, then connects through the
wallet's `standard:connect` feature. See `assets/js/wallet.js`.

The connected account's `address` is its base58 public key. Nothing else about
the wallet is needed to read state.

## The compose screen

As the user types a recipient, run the quote from
[Reading state](../implementation/lens.md):

```js
const q = await quote(connection, sender, recipient, mint);
```

| `q` field | What to show |
|---|---|
| `willHold === false`, valid recipient | Chip reading `On your list`. Say the transfer goes straight through. |
| `willHold === true` | Chip reading `New address`. Say a first send here waits, and for how long. |
| `blocked === true` | Say a transfer to this address is already waiting. Do not let them sign. |
| `dwellSeconds` | The wait to quote, formatted as a duration |

Show the duration, not a wall clock time. `release_at` is fixed by the cluster
clock when the transaction lands.

Debounce the call and only fire it on a valid public key. A valid key is base58
that decodes to exactly 32 bytes; the character pattern alone is not enough,
because plenty of 44 character base58 strings decode to 33 bytes. The Kerb app
checks both, in `isPublicKey` in `config/solana.js`:

```js
/^[1-9A-HJ-NP-Za-km-z]{32,44}$/   // then decode and require 32 bytes
```

## Signing a send

With the Anchor client, SOL:

```js
await program.methods
  .send(new BN(lamports))
  .accounts({ sender, recipient, mint: null, /* derived accounts */ })
  .rpc();
```

An SPL token is the same instruction with the mint and the token accounts
supplied. There is no approval step before it: the sender's signature on the
send transaction authorises the transfer inside it, and nothing outlives the
transaction.

Show the user what they are signing in words before the wallet opens. A wallet
simulation that says "0.5 SOL leaves your wallet" is true of both paths, and only
the interface can say which of them this is.

## Watching a hold

The hold address is derivable before the transaction confirms:

```js
const hold = holdOf(sender, recipient, mint);
```

so the pending card can be rendered as soon as the user signs and reconciled
when the account appears. Then subscribe:

```js
connection.onAccountChange(hold, (info) => render(decodeHold(info.data)), 'confirmed');
```

Drive the countdown from `release_at` against the cluster clock, not from a
local timer started at signing. Local clocks drift and the chain is the
authority.

## Cancel and settle

`cancel` is the whole point of the product and should be the most prominent
control on the pending card, available for the entire window with no
confirmation step in front of it.

```js
await program.methods.cancel().accounts({ sender, hold /* ... */ }).rpc();
```

`settle` is permissionless, so the interface can send it on the user's behalf as
soon as the window closes. The Kerb app will do this for the sender. A recipient
side interface can do the same. Either way somebody pays the transaction fee,
and the recipient's token account rent if it has to be created, so an interface
should say so the first time.

```js
if (now >= hold.releaseAt) await program.methods.settle().accounts({ /* ... */ }).rpc();
```

## Reading the list

```js
const contacts = await contactsOf(connection, sender);
```

Sort client side by the `since` field. For the exact order of additions and
removals, read `Trusted` and `Forgotten` from the transaction history. See
[Events and errors](../protocol/events-and-errors.md).

## Displaying an address

Truncate as first four characters, the ellipsis character U+2026, last four, the
same form Solana wallets use:

```
example address, not a deployment

ZtQWM4ZkTjPu3yo5EWyQgbJJzstEfc7THPKmxFUsvWN  ->  ZtQW…svWN
```

Three rules that matter more than they look:

**Copy must always copy the full address.** Never the truncated form. The Kerb
app has been checked by intercepting the clipboard write and comparing it to the
source value character for character, because this is exactly the kind of thing
that breaks quietly.

**Never change an address's case.** Base58 is case sensitive: `ZtQW` and `ZTQW`
are different keys. A label style that sets text in capitals is harmless for
most text and wrong for an address. The Kerb app marks every element that holds
an address with `data-address`, and its stylesheet exempts those from any
uppercase styling.

**Do not present truncation as verification.** A poisoned address renders
identically to a real one under any truncation. The interface should never imply
that a matching prefix and suffix means anything. Kerb works because it does not
depend on that comparison, and the interface should not undo the point by
implying the user can eyeball it.

## Handling errors

Map Anchor error numbers to messages locally. The wording lives in the
interface and can improve without touching a program that can no longer change.

| Error | Number | Suggested message |
|---|---|---|
| `HoldPending` | 6005 | A transfer to this address is already waiting. |
| `WindowClosed` | 6008 | The window has closed. This transfer will settle. |
| `WindowOpen` | 6007 | Still holding. This can settle once the window closes. |
| `NotSender` | 6006 | Only the sender can cancel this. |
| `DwellOutOfRange` | 6009 | Choose between one minute and seven days. |
| `BelowRentExempt` | 6003 | Send at least 0.00089088 SOL to a new address. |
| `UnsupportedMint` | 6011 | This token cannot be held by Kerb. Send it directly instead. |
| `NothingToClaim` | 6010 | There is nothing to claim. |
| `AccountNotInitialized` | 3012 | That transfer has already settled or been cancelled. |

## What the web app does today

The Kerb program is not deployed, so the `/app` route in this repository does
not send anything. It runs in one of two modes:

**Demo, before a wallet connects.** The full four state flow, compose, review,
holding, settled, against invented contacts, with a 20 second countdown so the
demo is watchable. No network request is made and nothing is signed.

**Read only, after a Solana wallet connects.** The compose screen lists the
wallet's real SOL and SPL balances, read over RPC, and the review checks the
amount against them. The flow stops at review, which states the route the
transfer would take and that execution is not live. The contact list is empty,
because the list lives in the program and there is no program to read it from.

The wallet code in `assets/js/wallet.js` connects, reads the public key and
disconnects. It never reads a wallet's signing features, and no code in the
repository builds a transaction. When the program lands, the work is to add a
source to `assets/js/app-source.js` that reads accounts and builds the six
instructions above. The state machine in `assets/js/app.js`, the waiting window
visual and the contacts list are already shaped around the real lifecycle.

Next: [Glossary](../reference/glossary.md).
