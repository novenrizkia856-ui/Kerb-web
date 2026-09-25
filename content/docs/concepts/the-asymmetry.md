# The asymmetry

This is the whole idea. Everything else in Kerb is mechanism.

## Two lists

Consider the two places an address can appear in your wallet.

### Your transaction history

Your history is a projection of chain state. It is assembled from every transfer
that names your address, in either direction. That means its contents are
determined by **everyone**, not by you. Anyone holding gas can add a row to it,
permanently, for a fraction of a cent, without your consent and without any
signature from you.

The history is not wrong to work this way. It is a faithful record of what the
chain contains. The problem is that it is presented as if it were yours, and it
is not. It is a public writeable surface rendered inside a private looking
interface.

```
Transaction history          write access: anyone with gas
```

### A list built from your completed sends

Now consider a list with exactly one rule for appending to it: an address is
added when **a transfer you signed, and did not cancel, reached that address**.

There is no other path in. Nobody can pay to be added. Nobody can be added by
sending you something. There is no admin who can insert an entry, because there
is no admin. The only key that can cause an append is yours, and the only action
that causes one is an action you took deliberately and had the chance to undo.

```
Your Kerb list               write access: your key, via a settled transfer
```

## The claim

> An attacker can write fake addresses into your history. An attacker cannot
> write into a list built only from your own completed sends.

That is not a defence that depends on detection. There is no heuristic, no
scoring, no oracle, nothing to tune and nothing to get wrong. It is a property
of who holds write access to which surface.

## What this buys and what it costs

It buys one thing: **a transfer to an address you have never sent to before is
distinguishable, by the protocol, from a transfer to an address you have.** The
protocol does not need to know which is safe. It only needs to know which is
new, and it can know that from a list nobody else can write to.

Given that, the first transfer to a new address can be treated differently from
every transfer after it. Kerb treats it by holding it briefly. See
[The dwell window](dwell-window.md).

It costs one thing: **the first transfer to any genuinely new address is slower.**
Every subsequent transfer to that address is not. If most of your transfers go
to addresses you have used before, and for most people they do, the cost is paid
once per relationship and never again.

## Why the list is append only by sends

An obvious convenience would be a function that lets you add an address to your
list directly, without waiting. Kerb deliberately does not have one.

The moment such a function exists, the claim weakens from

> written only by your completed sends

to

> written by your completed sends, or by anything that can get you to sign one
> more transaction

An attacker who can persuade you to paste an address into a send field can just
as easily persuade you to paste it into a trust field, and the trust field has
no waiting period attached. The omission is the point. See
[The trust list](trust-list.md) for what is and is not possible.

Next: [The dwell window](dwell-window.md).
