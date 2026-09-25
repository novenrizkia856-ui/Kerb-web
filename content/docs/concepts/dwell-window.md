# The dwell window

The dwell window is the short period during which a first transfer to a new
address is held in escrow and can be pulled back by the sender.

## Behaviour

When you call `send` with a recipient that is not on your list:

1. The asset leaves your wallet and enters `KerbCore`.
2. A **hold** is recorded with a `releaseAt` timestamp, which is the current
   block time plus your dwell.
3. Until `releaseAt`, only you can act on it, and the only thing you can do is
   `cancel`, which returns the full amount to you.
4. From `releaseAt` onward, only `settle` is possible, and **anyone** may call
   it. Funds reach the recipient and the recipient joins your list.

When the recipient is already on your list, none of the above happens. The
transfer executes immediately in a single call.

## The three timestamps that matter

```
t0 ................. you call send()
                     asset moves into escrow
                     hold opens

t0 + dwell ......... releaseAt
                     cancel stops being possible
                     settle starts being possible

t_settle ........... anyone calls settle()
                     asset reaches recipient
                     recipient is appended to your list
```

Between `t0` and `releaseAt` the funds are yours to reclaim. After `releaseAt`
they are the recipient's to claim. There is no period where both are true and no
period where neither is.

## Why the cutoff is hard

An earlier design let the sender cancel at any time before somebody settled,
making the dwell a minimum wait rather than a deadline. That was rejected. With
a soft cutoff the recipient never reaches certainty: a transfer that looks
complete could still be withdrawn because nobody happened to call `settle` yet.
A hard cutoff at `releaseAt` gives both sides a moment they can point at.

The cost of the hard cutoff is that funds can sit unsettled if nobody calls
`settle`. That is addressed by making `settle` permissionless, so the recipient
never depends on the sender's cooperation, and by having the frontend settle
automatically. See [Transfer lifecycle](../protocol/lifecycle.md).

## Choosing a dwell

| Constant | Value | Meaning |
|---|---|---|
| `DEFAULT_DWELL` | 900 seconds | 15 minutes, the protocol default |
| `MIN_DWELL` | 60 seconds | the shortest a sender may choose |
| `MAX_DWELL` | 604800 seconds | 7 days, the longest a sender may choose |

Every sender may set their own dwell inside those bounds with `setDwell`. The
bounds are constants in the contract and cannot be changed by anyone, including
the deployer.

The default is fifteen minutes because the attack it defends against is a paste
from a poisoned history, and that mistake is usually noticed within seconds to
minutes of sending, when the sender looks at the confirmation or the recipient
says nothing arrived. Fifteen minutes is long enough to catch that and short
enough that a legitimate first payment is not meaningfully delayed.

**Open question.** Whether the dwell should scale with the amount, so that a
large first transfer waits longer than a small one. It would help, but it adds a
price assumption, and Kerb has no oracle and does not want one. Currently out of
scope.

## What the window does not do

The window does not evaluate the recipient. Kerb has no opinion about whether an
address is good. The window exists so that **you** have a chance to form one,
with the transfer already visible in front of you rather than as forty
characters in a text field.

Next: [The trust list](trust-list.md).
