# Frontend integration

How an interface talks to Kerb. This describes what the Kerb web app will do
once the contracts exist, and is written so that any other wallet or frontend
can do the same.

## No backend

Kerb has no server, no indexer and no API. Everything an interface needs comes
from two places: `eth_call` against `KerbLens`, and the event log from
`KerbCore`. Any interface that can reach an RPC endpoint can render the complete
state of a user.

That constraint is deliberate. An interface that depends on a Kerb operated
service reintroduces a party who can go away, censor, or be compelled. See
[Protocol overview](../protocol/overview.md).

## The compose screen

As the user types a recipient, call `KerbLens.quote`:

```js
const q = await lens.quote(sender, recipient, asset);
```

| `q` field | What to show |
|---|---|
| `willHold === false`, valid recipient | Chip reading `On your list`. Say the transfer goes straight through. |
| `willHold === true` | Chip reading `New address`. Say a first send here waits, and for how long. |
| `blocked === true` | Say a transfer to this address is already waiting. Do not let them sign. |
| `dwellSeconds` | The wait to quote, formatted as a duration |

Show the duration, not a wall clock time. `q.releaseAt` is projected from the
current block and will be a little different once the transaction lands.

Debounce the call and only fire it on a well formed address. The regular
expression used across the Kerb app is:

```js
/^0x[a-fA-F0-9]{40}$/
```

## Signing a send

Native:

```js
await core.send(recipient, ZERO_ADDRESS, amount, { value: amount });
```

ERC20, which needs an allowance first, and only on the hold path:

```js
await token.approve(core.address, amount);
await core.send(recipient, token.address, amount);
```

Request an exact allowance, not an unlimited one. Kerb cannot enforce that, so
it falls to the interface.

## Watching a hold

The hold id is derivable before the transaction confirms:

```js
const holdId = keccak256(abiEncode(['address','address','address'],
                                   [sender, recipient, asset]));
```

which means the pending card can be rendered optimistically and reconciled when
the `Held` event arrives. Then poll or subscribe:

```js
const h = await lens.hold(holdId);
// h.remaining   seconds left, 0 once releasable
// h.releasable  true once settle will succeed
```

Drive the countdown from `h.remaining` rather than from a local timer started at
signing. Local clocks drift and the chain is the authority.

## Cancel and settle

`cancel` is the whole point of the product and should be the most prominent
control on the pending card, available for the entire window with no
confirmation step in front of it.

```js
await core.cancel(holdId);
```

`settle` is permissionless, so the interface can call it on the user behalf as
soon as `releasable` turns true, without asking. The Kerb app will do this for
the sender. A recipient side interface can do the same.

```js
if (h.releasable) await core.settle(holdId);
```

## Reading the list

```js
const { page, total } = await lens.trusted(sender, 0, 100);
```

Remember that set order is arbitrary and shifts when an entry is removed. For a
stable, chronological list build it from the log instead:

```
Trusted(sender = me)  minus  Forgotten(sender = me)   in block order
```

See [Events and errors](../protocol/events-and-errors.md) for the full set of
reconstructions available from logs.

## Displaying an address

Truncate as first six characters, the ellipsis character U+2026, last four:

```
example address, not a deployment

0x71C7656EC7ab88b098defB751B7401B5f6d8976F  ->  0x71C7…976F
```

Two rules that matter more than they look:

**Copy must always copy the full address.** Never the truncated form. The Kerb
app has a test that intercepts the clipboard write and compares it to the source
value character for character, because this is exactly the kind of thing that
breaks quietly.

**Do not present truncation as verification.** A poisoned address renders
identically to a real one under any truncation. The interface should never imply
that a matching prefix and suffix means anything. Kerb works because it does not
depend on that comparison, and the interface should not undo the point by
implying the user can eyeball it.

## Handling errors

Map custom error selectors to messages locally. The contract carries no revert
strings, so the wording lives in the interface and can improve without touching
an immutable contract.

| Error | Suggested message |
|---|---|
| `HoldPending` | A transfer to this address is already waiting. |
| `WindowClosed` | The window has closed. This transfer will settle. |
| `WindowOpen` | Still holding. This can settle once the window closes. |
| `NotSender` | Only the sender can cancel this. |
| `DwellOutOfRange` | Choose between one minute and seven days. |
| `ValueMismatch` | The amount and the attached value do not match. |
| `NothingToClaim` | There is nothing to claim. |

## The mock app shell

The `/app` route in this repository already implements the full four state flow
against mock data: compose, review, holding, settled. It runs a 20 second
countdown instead of the configured dwell so the demo is watchable, and shows a
permanent notice that contracts are not connected.

When the contracts land, the work is to replace `assets/js/app-mock.js` with
real reads and writes. The state machine in `assets/js/app.js`, the waiting
window visual and the contacts list are already shaped around the real
lifecycle, so the interface itself should not need to change much.

Next: [Glossary](../reference/glossary.md).
