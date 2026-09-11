# KerbLens

A stateless read helper. It custodies nothing, writes nothing, and can be
replaced without touching `KerbCore`.

Its job is to turn the raw mappings on `KerbCore` into the handful of questions
an interface actually asks, in one call each, with paging so that a large list
cannot make a read revert.

## Interface

```solidity
interface IKerbLens {
    struct HoldView {
        bytes32 holdId;
        address sender;
        address recipient;
        address asset;
        uint256 amount;
        uint64  releaseAt;
        uint64  remaining;   // seconds until releaseAt, 0 once releasable
        bool    releasable;  // block.timestamp >= releaseAt
    }

    struct Quote {
        bool    willHold;
        uint64  dwellSeconds;
        uint64  releaseAt;   // 0 when willHold is false
        bytes32 holdId;      // 0 when willHold is false
        bool    blocked;     // a hold for this triple is already pending
    }

    function core() external view returns (address);

    function quote(address sender, address recipient, address asset)
        external view returns (Quote memory);

    function trusted(address sender, uint256 offset, uint256 limit)
        external view returns (address[] memory page, uint256 total);

    function pending(address sender, uint256 offset, uint256 limit)
        external view returns (HoldView[] memory page, uint256 total);

    function hold(bytes32 holdId) external view returns (HoldView memory);

    function summary(address sender) external view returns (
        uint256 trustedTotal,
        uint256 pendingTotal,
        uint64  dwellSeconds
    );
}
```

## quote

The one an interface calls on every keystroke in the recipient field.

```solidity
function quote(address sender, address recipient, address asset)
    external view returns (Quote memory q)
{
    q.dwellSeconds = core.dwellOf(sender);

    if (recipient == address(0) || recipient == sender) {
        return q;   // willHold false, nothing to say
    }

    if (core.isTrusted(sender, recipient)) {
        return q;   // willHold false, goes straight through
    }

    q.willHold  = true;
    q.holdId    = core.holdIdOf(sender, recipient, asset);
    q.releaseAt = uint64(block.timestamp) + q.dwellSeconds;

    ( , , , , , uint8 status) = core.holdOf(q.holdId);
    q.blocked = status == 1;   // STATUS_PENDING
}
```

`releaseAt` here is a projection from the current block, not a commitment. The
real value is fixed when the transaction lands. An interface should present it
as an estimate, and the Kerb app shows the duration rather than a wall clock
time for exactly that reason.

`blocked` tells the interface to say "you already have a transfer waiting to
this address" instead of letting the user sign something that will revert with
`HoldPending`.

## Paging

Both list reads take `offset` and `limit` and return the page plus the true
total, so a caller can size its next request without a second call.

```solidity
function trusted(address sender, uint256 offset, uint256 limit)
    external view returns (address[] memory page, uint256 total)
{
    total = core.trustedCount(sender);
    if (offset >= total) return (new address[](0), total);

    uint256 n = total - offset;
    if (n > limit) n = limit;

    page = new address[](n);
    for (uint256 i = 0; i < n; ++i) {
        page[i] = core.trustedAt(sender, offset + i);
    }
}
```

`pending` follows the same shape, resolving each id through `holdOf` and
computing `remaining` and `releasable` against `block.timestamp`.

Paging matters because `EnumerableSet` enumeration is O(n) in the page size and
an unbounded return would eventually exceed the gas limit of an `eth_call` on a
long list. Nothing enforces a maximum `limit`, because a view call that runs out
of gas costs the caller nothing and fails loudly.

## Ordering caveat

`EnumerableSet` does not preserve insertion order. Removing an element moves the
last element into the vacated slot. So:

- The order of `trusted` and `pending` pages is arbitrary and changes on removal.
- Paging across a mutation can miss or repeat an entry.

For a contact list of realistic size the correct answer is to read the whole set
in one or two pages and sort client side. An interface that needs stable
chronological order should build it from the `Trusted` and `Forgotten` logs
instead, which do carry order. See
[Events and errors](../protocol/events-and-errors.md).

## What KerbLens deliberately does not do

**It does not write.** No function is non view. It cannot be made to move value
and holds no allowances.

**It does not hold an upgrade pointer.** `core` is `immutable`, set once in the
constructor. A new lens is a new deployment with a new address, published in the
web configuration.

**It does not aggregate across senders.** Every read is scoped to one sender.
There is no "all pending holds" or "all trusted pairs" view, because serving one
would mean maintaining a global index in `KerbCore` that nothing else needs.

**It does not price anything.** No oracle, no value in a reference currency, no
minimum amount logic. See [Parameters](../protocol/parameters.md).

Next: [Assets](assets.md).
