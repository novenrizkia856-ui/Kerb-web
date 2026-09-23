# Reading state

Kerb has no read program. On Solana every account can be fetched directly over
RPC, and every Kerb address can be derived by anyone from the keys it belongs
to, so the read surface is a small client library rather than something
deployed. It custodies nothing, signs nothing, and can be replaced by a better
one without touching the program.

Its job is to turn raw accounts into the handful of questions an interface
actually asks.

## Deriving addresses

```js
import { PublicKey } from '@solana/web3.js';

const NATIVE = PublicKey.default;   // 11111111111111111111111111111111

const pda = (...seeds) =>
  PublicKey.findProgramAddressSync(seeds, KERB_PROGRAM_ID)[0];

const settingsOf = (sender) =>
  pda(Buffer.from('settings'), sender.toBuffer());

const contactOf = (sender, recipient) =>
  pda(Buffer.from('contact'), sender.toBuffer(), recipient.toBuffer());

const holdOf = (sender, recipient, mint = NATIVE) =>
  pda(Buffer.from('hold'), sender.toBuffer(), recipient.toBuffer(), mint.toBuffer());
```

`KERB_PROGRAM_ID` comes from `solana.KERB_PROGRAM_ID` in the web configuration.
It is empty today, because the program is not deployed, and none of this runs
until it is set.

## quote

The one an interface calls as the user types a recipient. One round trip, three
accounts.

```js
async function quote(connection, sender, recipient, mint = NATIVE) {
  const [settings, contact, hold] = await connection.getMultipleAccountsInfo([
    settingsOf(sender),
    contactOf(sender, recipient),
    holdOf(sender, recipient, mint),
  ]);

  const owned = (info) => info !== null && info.owner.equals(KERB_PROGRAM_ID);
  const dwellSeconds = owned(settings) ? decodeSettings(settings.data).dwellSeconds || 900 : 900;

  if (recipient.equals(sender) || recipient.equals(NATIVE)) {
    return { willHold: false, dwellSeconds };
  }

  return {
    willHold: !owned(contact),
    dwellSeconds,
    blocked: owned(hold),   // a hold for this triple is already open
  };
}
```

The ownership check matters. Anyone can send lamports to a Kerb address that has
not been created yet, which makes the account exist, owned by the system
program. Only an account owned by the Kerb program means anything.

There is no `release_at` in the quote. The real value is fixed by the cluster
clock when the transaction lands, so an interface should show the duration, and
the Kerb app does.

`blocked` tells the interface to say "you already have a transfer waiting to
this address" instead of letting the user sign something that will fail with
`HoldPending`.

## Lists

A sender's contacts and open holds are every account of that type whose
`sender` field, at byte offset 8, is the sender.

```js
const discriminator = (name) => bs58.encode(anchorDiscriminator(`account:${name}`));

async function contactsOf(connection, sender) {
  return connection.getProgramAccounts(KERB_PROGRAM_ID, {
    filters: [
      { memcmp: { offset: 0, bytes: discriminator('Contact') } },
      { memcmp: { offset: 8, bytes: sender.toBase58() } },
    ],
  });
}
```

`holdsOf` is the same with `'Hold'`. Each hold decodes to its recipient, mint,
amount and `release_at`, and an interface computes `remaining` and `releasable`
against the cluster clock rather than the device's. `getBlockTime` on a recent
slot, or the `Clock` sysvar account, gives that clock.

## Caveats

**`getProgramAccounts` is heavy.** It scans every account the program owns.
Filtered, it is fine for a program of Kerb's size, but some RPC providers
restrict or charge extra for it, and the public mainnet endpoint does not serve
browsers at all. An interface should expect to be pointed at a provider.

**Order is not preserved.** The result order is whatever the node returns. For a
contact list of realistic size the right answer is to sort client side, by the
contact's `since` field. An interface that needs the exact order of additions
and removals should read the `Trusted` and `Forgotten` events instead. See
[Events and errors](../protocol/events-and-errors.md).

**Commitment matters.** Read at `confirmed` to show the user what they just did,
and treat anything as final only at `finalized`. See the fork note in
[Threat model](../concepts/threat-model.md).

## What the read library deliberately does not do

**It does not write.** It builds no transactions and asks no wallet to sign.

**It does not keep an index.** Every read goes to the chain. There is no Kerb
server holding a copy, because a copy is a second source of truth that can
drift, go away, or be compelled.

**It does not aggregate across senders.** Every read is scoped to one sender,
except the deliberately public "who has me on their list" query, which filters
on the recipient field instead.

**It does not price anything.** No oracle, no value in a reference currency, no
minimum amount logic. See [Parameters](../protocol/parameters.md).

Next: [Assets](assets.md).
