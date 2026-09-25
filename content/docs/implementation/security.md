# Security

Concerns to hold in mind while writing the contracts, and the specific defence
for each. This complements the
[Threat model](../concepts/threat-model.md), which covers the protocol level.
This page is about the code.

## Reentrancy

Every function that moves value uses two defences together.

**Checks, effects, interactions.** State is fully resolved before any external
call. In `cancel` and `settle` the hold is removed from the pending set and
deleted from storage before a single wei moves. A reentrant call arriving during
the transfer reads `STATUS_NONE` and reverts with `HoldNotFound`.

**A reentrancy guard.** `send`, `cancel`, `settle` and `claim` carry
`nonReentrant`. This is redundant against the ordering above and is kept anyway,
because the cost is one storage slot and the failure mode it protects against is
total loss.

The native push uses a full gas `call`, so a recipient contract can run
arbitrary code during `settle`. That is the intended behaviour, and it is why
the ordering matters more than the guard.

```solidity
// wrong, do not write this
IERC20(h.asset).safeTransfer(h.recipient, h.amount);
delete _holds[holdId];

// right
delete _holds[holdId];
IERC20(h.asset).safeTransfer(h.recipient, h.amount);
```

## Cross function reentrancy

A recipient reentering during `settle` could call `send`, `cancel`, `forget` or
`claim`. Walk each:

| Reentered into | Outcome |
|---|---|
| `send` | Blocked by `nonReentrant`. Without it, still safe: a new hold has a different id and its own funds. |
| `cancel` | The hold being settled is already deleted, so `HoldNotFound`. |
| `settle` on the same id | Already deleted, `HoldNotFound`. |
| `settle` on a different id | Blocked by the guard. Without it, safe, the other hold is independent and funded. |
| `forget` | Touches only the caller own list. The trust granted by the outer settle belongs to the sender, not the recipient. |
| `claim` | Balance is zeroed before the push, so a second claim sees zero. |

## Solvency

Invariant 3 from [State](../protocol/state.md):

> For every asset, the contract balance is at least the sum of all pending hold
> amounts plus all claimable balances for that asset.

Everything that could break it:

| Risk | Defence |
|---|---|
| Recording a requested amount larger than what arrived | Balance delta measurement on the ERC20 hold path |
| Untracked native value entering | `receive()` reverts, `ValueMismatch` on send |
| Native value attached to an ERC20 send | `NativeNotAccepted` |
| Paying a hold twice | The hold is deleted before payment |
| Claim draining more than owed | Balance zeroed before the push |
| A rebasing token shrinking the balance | Not defended. Do not use rebasing tokens, see [Assets](assets.md) |

This is the invariant to fuzz hardest. See [Testing](testing.md).

## Griefing

**Can somebody open a hold in my name?** No. `send` takes the sender from
`msg.sender` and the caller supplies the funds. There is no delegated send, no
permit path and no meta transaction.

**Can somebody stop my hold settling?** No. `settle` is permissionless and has
no precondition other than the timestamp.

**Can somebody cancel my hold?** No. `cancel` checks `h.sender != msg.sender`.

**Can somebody fill my trust list with junk?** No. The set is written only by
`settle`, and only with the recipient of a hold the caller created and funded.

**Can somebody block my hold id?** Only by causing a pending hold to exist for
the same sender, recipient and asset triple, and only the sender can do that.
Blocking yourself is possible and is reported by `Quote.blocked`.

**Can a recipient trap funds?** They can refuse a native push, which routes to
`claimable` rather than reverting. For an ERC20 with a blocklist they can leave
a hold pending indefinitely. That case is an open question in
[Assets](assets.md).

## Timestamp dependence

`block.timestamp` sets `releaseAt` and gates both `cancel` and `settle`. A block
producer can shift it by a small amount. Against a minimum dwell of sixty
seconds the achievable shift is not enough to matter, and there is no financial
edge in moving a settlement a few seconds either way, because settlement pays
the recipient exactly what was held with no price, no rate and no fee.

Do not use `block.number` instead. Block times vary and the value being
expressed is a human interval.

## Arithmetic

Solidity 0.8 checked arithmetic throughout. No `unchecked` blocks except, if
profiling justifies it, a loop counter increment in `KerbLens` paging, where the
bound is a local length.

`releaseAt` is `uint64`, computed as `uint64(block.timestamp) + dwellOf(sender)`.
With `MAX_DWELL` at seven days, overflow requires a timestamp within a week of
2^64 seconds, roughly the year 584942417355. The cast from `uint256` to `uint64`
is safe for the same reason.

## Denial of service through unbounded loops

`KerbCore` contains no loops. Every write is O(1), including the set operations,
which are constant time add, remove and contains.

`KerbLens` contains loops, bounded by the caller supplied `limit`, in view
functions only. A caller who asks for too large a page gets a failed `eth_call`
that costs nothing and reverts nothing.

The trust list grows without bound in principle. It is never iterated onchain,
so its size cannot make a write fail.

## Signature and approval surface

There is none. Kerb has no `permit`, no EIP712 domain, no signature
verification and no meta transaction relay. The only approval involved is the
ordinary ERC20 allowance the sender grants to `KerbCore`, which is required only
for the hold path, since the straight through path moves the token directly
between the two accounts.

Interfaces should request an exact allowance rather than an unlimited one. Kerb
cannot enforce that and should not pretend to.

## Deployment

`KerbCore` takes no constructor arguments. There is nothing to configure, no
owner to set and no address to inject. Two independent deployments from the same
bytecode are interchangeable except that they hold different trust lists.

`KerbLens` takes the `KerbCore` address as its single constructor argument and
stores it `immutable`.

Verify both on the explorer before publishing the addresses. A protocol that
claims no admin key must be readable by anyone who wants to check that claim,
and unverified bytecode makes the claim unfalsifiable.

Next: [Testing](testing.md).
