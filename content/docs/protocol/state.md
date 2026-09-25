# State

## Storage layout

```solidity
struct Hold {
    address sender;      // slot 0, bits 0..159
    uint64  releaseAt;   // slot 0, bits 160..223
    uint8   status;      // slot 0, bits 224..231
    address recipient;   // slot 1, bits 0..159
    address asset;       // slot 2, bits 0..159
    uint256 amount;      // slot 3
}
```

Four slots per pending hold. The first three fields pack into one slot at 232
bits of 256. `recipient` and `asset` each take a slot with 96 bits spare, and
`amount` takes a full slot.

`amount` is deliberately left at `uint256` rather than squeezed into the spare
96 bits beside `recipient`. A `uint96` caps at roughly 7.9e28, which is about 79
billion units of an 18 decimal token. That is comfortable for most tokens and
not comfortable for all of them, and a silent overflow on an unusual token is a
worse outcome than one extra storage slot on a structure that is deleted again
within minutes.

Because every hold is deleted on settle or cancel, the refund recovers most of
the write cost. Steady state storage growth from holds is zero.

## Mappings

```solidity
// hold id to hold. Only ever contains pending holds.
mapping(bytes32 => Hold) private _holds;

// sender to the recipients they have settled a transfer to.
mapping(address => EnumerableSet.AddressSet) private _trusted;

// sender to the ids of their currently pending holds.
mapping(address => EnumerableSet.Bytes32Set) private _pending;

// sender to their chosen dwell. Zero means use DEFAULT_DWELL.
mapping(address => uint64) private _dwell;

// recipient to asset to an amount owed after a failed push delivery.
mapping(address => mapping(address => uint256)) private _claimable;
```

`EnumerableSet` is used rather than a bare mapping plus an array because both
sets need membership tests in the hot path and enumeration in the read path, and
because removal has to be cheap for `forget` and for settling a pending hold.

## Hold identity

```solidity
function holdIdOf(address sender, address recipient, address asset)
    public pure returns (bytes32)
{
    return keccak256(abi.encode(sender, recipient, asset));
}
```

Three properties follow from this choice, and all three are intended.

**It is derivable offchain.** A frontend can compute the id for a transfer it is
about to make, without a transaction and without an event, and watch for it.

**It is stable.** The same triple always produces the same id, so a cancelled
hold and a later hold between the same parties for the same asset share an id.
That is safe because a hold is deleted before a new one can be created, and
`HoldPending` blocks the overlapping case.

**It is scoped to the sender.** Two senders paying the same recipient the same
asset have different ids, so nothing about one sender is reachable from another.

It is not a counter, so there is no global sequence to read and no way to
enumerate all holds across all senders from storage alone. That enumeration is
available from the `Held` event log, which is where it belongs.

## Trust records

The trusted set stores addresses only. It does not currently store when trust
was granted or on what amount.

**Open question, likely to be adopted.** Store a companion mapping:

```solidity
mapping(address => mapping(address => uint256)) private _trustedAmount;
```

recording the amount of the settling transfer. It costs one slot per trusted
pair and enables a frontend to show an entry that was trusted on one wei
differently from one trusted on a real payment. See the dust trust risk in
[The trust list](../concepts/trust-list.md). The specification currently omits
it so that the decision is explicit rather than assumed.

## Invariants

These must hold after every externally callable function returns. They are the
basis of the property tests in [Testing](../implementation/testing.md).

| # | Invariant |
|---|---|
| 1 | `_holds[id].status` is either `STATUS_NONE` or `STATUS_PENDING`. Settled and cancelled never persist. |
| 2 | `id` is in `_pending[sender]` if and only if `_holds[id].status == STATUS_PENDING` and `_holds[id].sender == sender`. |
| 3 | For every asset, the contract balance is at least the sum of all pending hold amounts for that asset plus all claimable balances for that asset. |
| 4 | A recipient enters `_trusted[sender]` only in `settle`, and leaves only in `forget`. |
| 5 | `_dwell[sender]` is either zero, or within `[MIN_DWELL, MAX_DWELL]`. |
| 6 | `holdIdOf(sender, recipient, asset)` matches `_holds[id]` fields for every pending id. |
| 7 | No function lets an account modify another account trusted set, dwell, holds or claimable balance. |

Invariant 3 is the solvency invariant and is the one worth fuzzing hardest.

Next: [Parameters](parameters.md).
