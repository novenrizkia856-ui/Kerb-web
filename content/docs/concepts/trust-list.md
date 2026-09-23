# The trust list

Each sender has a list of recipient addresses. The list is per sender: your list
and mine are unrelated, and no address is globally trusted or globally suspect.

On Solana the list is a set of small accounts, one **contact** account per
sender and recipient pair, at an address derived from both keys. An address is
on your list exactly when its contact account exists.

## The only way in

An address is appended to your list when a hold you created **settles**. That is
the sole write path. Specifically:

- Not when you create a hold. A hold that is cancelled leaves no trace.
- Not when you receive from an address. Inbound transfers never touch your list.
- Not by any instruction another account can sign.
- Not by an administrator, because there is no administrative role.
- Not by a direct trust instruction, because there is not one. See
  [The asymmetry](the-asymmetry.md) for why that omission is deliberate.

## The only way out

`forget` removes an address from your list by closing its contact account. It
must be signed by you, and it only reaches your own list, because the contact
account's address is derived from your key.

Removal is safe to expose in a way that addition is not. Adding an address
removes friction and so can be weaponised. Removing an address adds friction
back, so the worst an attacker could achieve by tricking you into signing it is
to make your next transfer to that address wait fifteen minutes.

After `forget`, the address is new again. The next transfer to it opens a fresh
hold. Closing the contact account returns its rent deposit to you.

## Trust is per address, not per token

The list stores recipients, not recipient and mint pairs. If you have settled a
transfer of SOL to an address, a later transfer of an SPL token to the same
address goes straight through.

This is intentional. The thing you are being protected from is sending to the
**wrong address**. Once you have demonstrated, with a completed transfer, that
this address is one you meant, repeating that demonstration per token adds
friction without adding information.

## The dust trust risk

There is a real weakness here and it should be stated plainly.

The list records that a transfer settled. It does not record how much. A
transfer of the smallest amount the program accepts that settles trusts the
recipient exactly as firmly as a transfer of a thousand SOL.

That means a malicious application which can get you to sign one tiny Kerb send
to an attacker controlled address, and then wait out the dwell without you
cancelling, has permanently placed that address on your list. Your next real
transfer to it will not wait.

Mitigations, in order of how much they actually help:

1. **The dwell still applies to the dust transfer.** The attacker has to get you
   to sign, and then get you not to notice for fifteen minutes. The window works
   the same way for a tiny send as for a large one.
2. **`forget` exists.** The damage is reversible the moment it is noticed.
3. **Frontends should show the list.** An address list you never look at is an
   address list you cannot audit. The Kerb app shows it by default.

**Open question.** Whether to record the settled amount and mint on the contact
account, so a frontend can show "trusted on the strength of 0.000001 SOL" and let
the user judge. It adds 40 bytes to an account that already exists and no
protocol complexity. It is likely worth doing. Not yet specified.

## Growth

The list grows by one contact account per distinct recipient you ever settle to,
and shrinks only when you call `forget`. Each account carries a small, refundable
rent deposit. It is unbounded in principle. In practice it is bounded by how many
counterparties a person has, which is small.

Enumeration happens off chain, by asking an RPC node for every contact account
whose sender field is yours. See [Reading state](../implementation/lens.md).

Next: [Threat model](threat-model.md).
