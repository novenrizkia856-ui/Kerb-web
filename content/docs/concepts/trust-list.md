# The trust list

Each sender has a list of recipient addresses. The list is per sender: your list
and mine are unrelated, and no address is globally trusted or globally suspect.

## The only way in

An address is appended to your list when a hold you created **settles**. That is
the sole write path. Specifically:

- Not when you create a hold. A hold that is cancelled leaves no trace.
- Not when you receive from an address. Inbound transfers never touch your list.
- Not by any call another account can make.
- Not by an administrator, because there is no administrative role.
- Not by a direct trust function, because there is not one. See
  [The asymmetry](the-asymmetry.md) for why that omission is deliberate.

## The only way out

`forget(recipient)` removes an address from your list. It is callable only by
you, for your own list.

Removal is safe to expose in a way that addition is not. Adding an address
removes friction and so can be weaponised. Removing an address adds friction
back, so the worst an attacker could achieve by tricking you into calling it is
to make your next transfer to that address wait fifteen minutes.

After `forget`, the address is new again. The next transfer to it opens a fresh
hold.

## Trust is per address, not per asset

The list stores recipients, not recipient and asset pairs. If you have settled a
transfer of the native asset to an address, a later transfer of an ERC20 to the
same address goes straight through.

This is intentional. The thing you are being protected from is sending to the
**wrong address**. Once you have demonstrated, with a completed transfer, that
this address is one you meant, repeating that demonstration per asset adds
friction without adding information.

## The dust trust risk

There is a real weakness here and it should be stated plainly.

The list records that a transfer settled. It does not record how much. A
transfer of one wei that settles trusts the recipient exactly as firmly as a
transfer of a thousand ether.

That means a malicious application which can get you to sign one tiny Kerb send
to an attacker controlled address, and then wait out the dwell without you
cancelling, has permanently placed that address on your list. Your next real
transfer to it will not wait.

Mitigations, in order of how much they actually help:

1. **The dwell still applies to the dust transfer.** The attacker has to get you
   to sign, and then get you not to notice for fifteen minutes. The window works
   the same way for a one wei send as for a large one.
2. **`forget` exists.** The damage is reversible the moment it is noticed.
3. **Frontends should show the list.** An address list you never look at is an
   address list you cannot audit. The Kerb app shows it by default.

**Open question.** Whether to record the settled amount alongside the entry, so
a frontend can show "trusted on the strength of 0.000000000000000001 ETH" and
let the user judge. This costs one storage slot per entry and adds no protocol
complexity. It is likely worth doing. Not yet specified.

## Growth

The list grows by one entry per distinct recipient you ever settle to, and
shrinks only when you call `forget`. It is unbounded in principle. In practice it
is bounded by how many counterparties a person has, which is small.

Enumeration is provided by [KerbLens](../implementation/lens.md) with offset and
limit paging so that a large list never makes a read revert.

Next: [Threat model](threat-model.md).
