# Kerb

Kerb is a small noncustodial protocol. The first transfer to an address you have
never sent to is held in a short cancellation window. Every transfer to that
address afterwards goes straight through.

The reason this works is an asymmetry that already exists on every public chain
and that almost nobody exploits in the user's favour:

> Anyone can write to your transaction history. Only you can write to a list
> built from your own completed sends.

An attacker can push a thousand lookalike addresses into the feed your wallet
shows you. They cannot push a single entry into a list that is only ever
appended when one of your own transfers settles.

## Status

The protocol is specified but **not yet implemented**. These documents are the
specification the Solidity work will be built against. Nothing here has been
audited, deployed, or formally verified. Where a design decision is still open
it is marked **Open question** rather than quietly resolved.

## How to read this

| If you want | Start at |
|---|---|
| To understand the problem | [Address poisoning](concepts/address-poisoning.md) |
| To understand the idea | [The asymmetry](concepts/the-asymmetry.md) |
| To understand the mechanism | [The dwell window](concepts/dwell-window.md) |
| To build the contracts | [Protocol overview](protocol/overview.md) then [KerbCore](implementation/core.md) |
| To integrate a wallet or a frontend | [Frontend integration](integration/frontend.md) |
| To know what Kerb does not do | [Honest limits](reference/limits.md) |

## The shape of it in one screen

```
send(recipient, asset, amount)
  |
  +-- recipient is on your list ......... funds move now, one transfer
  |
  +-- recipient is new .................. funds enter escrow
                                          a hold opens for dwellSeconds
                                          you may cancel at any point
                                          |
                                          +-- cancel() ..... funds return to you
                                          |                  nothing is trusted
                                          |
                                          +-- settle() ..... funds reach the recipient
                                                             the recipient joins your list
                                                             every later send goes straight through
```

## What Kerb is not

It is not a firewall, not a blocklist, not an oracle, not a reputation system,
and not a guarantee. It is one narrow mechanism that makes the first transfer to
a stranger reversible for a few minutes, and it is honest about the rest. Read
[Honest limits](reference/limits.md) before you trust it with anything.
