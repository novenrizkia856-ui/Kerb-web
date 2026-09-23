# Honest limits

This page exists because a protocol that overstates itself is more dangerous
than one that does nothing. Everything below is a real limitation of the design
as specified. None of it is softened, and none of it is scheduled to be fixed by
a future version that will quietly appear later.

## You can send around it

Kerb is a program you choose to call. A plain transfer from your wallet to any
address never touches it and is always available. Nothing about Kerb constrains
your account, because nothing about Kerb has any authority over your account.

It is a speed bump you opt into. If you paste a poisoned address into your
wallet send field instead of the Kerb one, Kerb was not involved and cannot
help.

## A stolen key sends direct

An attacker holding your signing key holds your authority, and a dwell window is
a delay on your own authority. They can open holds, settle them, cancel anything
you try to reclaim, set your dwell to the sixty second minimum and forget your
real contacts.

Kerb is not a recovery mechanism, not a social recovery scheme and not a
guardian system. If your key is gone, Kerb offers nothing.

## Not audited

There is no audit. There is also, as of this writing, no implementation and no
deployed program. These documents are a specification that the Solana program
will be built against, and the web app runs without sending anything.

When an implementation exists and somebody audits it, this section will name the
auditor, the version reviewed and the findings. Until this page says otherwise,
assume the only people who have checked this design are the people who wrote it.

**Read the source before you trust it with anything.** That instruction is not a
formality.

## Dust can trust an address

The trust list records that a transfer settled, not how large it was. A tiny
transfer that settles trusts a recipient exactly as firmly as a large one.

A malicious application that gets you to sign a tiny Kerb send to an address it
controls, and that you do not cancel within the window, has permanently put that
address on your list. Your next real transfer to it will not wait.

The window still applies to the dust transfer, `forget` reverses it, and the
Kerb app shows your list so it can be audited. But the gap is real. Recording
the settled amount alongside the entry is under consideration and not yet
specified. See [The trust list](../concepts/trust-list.md).

## A trusted address that turns hostile

Trust in Kerb is a mechanical record that you completed a transfer to an address
before. It is not a judgement about whoever controls that address, and it does
not expire. If a counterparty becomes an adversary, Kerb will not slow you down.
`forget` is the remedy and it is entirely manual.

## No privacy

Trust lists are public accounts and every state change is a public transaction.
Anyone can read who has trusted whom, in both directions, for every address that
has ever used Kerb.

Kerb makes no privacy claim of any kind.

## Some tokens do not work

**Some Token-2022 mints are refused.** A mint with a transfer hook, a permanent
delegate or confidential transfers cannot be held, because each can move or
block the escrowed tokens behind Kerb's back. They can still go straight through
to an address already on your list.

**A token whose issuer can freeze accounts can strand a hold.** Many mints keep
a freeze authority, stablecoins among them. If the issuer freezes a hold's
escrow account, neither `cancel` nor `settle` can move the tokens. The hold
stays open until the issuer thaws it, possibly forever. This is a genuine trap
with no clean answer currently specified. See
[Assets](../implementation/assets.md).

## It cannot be fixed after deployment

The Kerb program's upgrade authority is revoked at deploy, and it has no admin.
That is the point, and it cuts both ways: a bug discovered after deployment
cannot be patched. The only response is for everybody to move to a new
deployment and rebuild their trust lists through fresh settled transfers.

That is why the [Testing](../implementation/testing.md) plan is specified as
tightly as it is, and why an audit matters more here than it would for an
upgradeable program.

## It slows down your first transfer

Every genuinely new recipient costs you one dwell window, fifteen minutes by
default. That is the product, not a defect, but it is a cost and it should be
stated as one. If most of your transfers go to new addresses, Kerb will annoy
you.

## What it actually does

Given all of the above, the honest summary of what Kerb provides is narrow:

> If you use Kerb to send, then a transfer to an address you have never
> successfully sent to before is reversible by you for a short, configurable
> period, and no other party can add an address to the list that decides which
> transfers get that treatment.

That is the entire claim. Anything broader that appears on a website, in a post,
or in a conversation about Kerb is an overstatement, including if it comes from
us.
