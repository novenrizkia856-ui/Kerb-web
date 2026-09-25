# Events and errors

## Events

Every state change emits exactly one primary event, plus `Trusted` when a
settlement adds a recipient that was not already on the list. The log is
complete enough to rebuild any sender view without reading storage, which is
what lets a frontend work without a backend.

```solidity
event Sent(
    address indexed sender,
    address indexed recipient,
    address indexed asset,
    uint256 amount
);

event Held(
    bytes32 indexed holdId,
    address indexed sender,
    address indexed recipient,
    address asset,
    uint256 amount,
    uint64  releaseAt
);

event Cancelled(
    bytes32 indexed holdId,
    address indexed sender,
    address indexed recipient,
    address asset,
    uint256 amount
);

event Settled(
    bytes32 indexed holdId,
    address indexed sender,
    address indexed recipient,
    address asset,
    uint256 amount,
    bool    delivered      // false when the amount went to claimable instead
);

event Trusted(
    address indexed sender,
    address indexed recipient
);

event Forgotten(
    address indexed sender,
    address indexed recipient
);

event DwellSet(
    address indexed sender,
    uint64 dwellSeconds
);

event Claimed(
    address indexed recipient,
    address indexed asset,
    uint256 amount
);
```

### Indexing notes

`Sent`, `Held` and `Cancelled` index sender and recipient so a frontend can
filter a user view with one topic filter in each direction. `Held` indexes
`holdId` rather than `asset`, because three indexed slots is the EVM limit and a
hold is far more often looked up by id than by asset.

`Settled` carries `delivered`. When it is false the recipient was credited to
`claimable` because a push failed, and an interface should tell them to call
`claim`. See [Assets](../implementation/assets.md).

`Trusted` is emitted only on a genuinely new addition, never on a repeat
settlement to an address already on the list. A consumer can therefore treat the
`Trusted` log as the exact contents of a sender list, applying `Forgotten` as
removals, without deduplicating.

### Rebuilding a view from logs

| View | Filter |
|---|---|
| My trust list | `Trusted(sender = me)` minus `Forgotten(sender = me)`, in block order |
| My pending holds | `Held(sender = me)` minus `Settled` and `Cancelled` on the same `holdId` |
| Payments I received | `Sent(recipient = me)` and `Settled(recipient = me)` |
| Who has me on their list | `Trusted(recipient = me)` minus `Forgotten(recipient = me)` |

The last row is worth noticing. It is public. Anybody can see who has trusted
whom, because the events are public and the storage is public. Kerb does not
claim privacy and nothing in this design should be read as providing it.

## Errors

Custom errors throughout, no revert strings.

```solidity
error ZeroRecipient();      // recipient is address(0)
error ZeroAmount();         // amount is 0
error SelfSend();           // recipient == msg.sender
error ValueMismatch();      // msg.value does not match the native amount
error NativeNotAccepted();  // ether sent alongside an ERC20 transfer
error HoldNotFound();       // no pending hold at this id
error HoldPending();        // a hold for this sender, recipient and asset already exists
error NotSender();          // caller is not the hold sender
error WindowOpen();         // settle attempted before releaseAt
error WindowClosed();       // cancel attempted at or after releaseAt
error DwellOutOfRange();    // setDwell outside [MIN_DWELL, MAX_DWELL] and not 0
error NothingToClaim();     // claim with a zero balance
error TransferFailed();     // ERC20 transfer returned false or reverted
```

### Which function raises what

| Function | Can revert with |
|---|---|
| `send` | `ZeroRecipient`, `ZeroAmount`, `SelfSend`, `ValueMismatch`, `NativeNotAccepted`, `HoldPending`, `TransferFailed` |
| `cancel` | `HoldNotFound`, `NotSender`, `WindowClosed`, `TransferFailed` |
| `settle` | `HoldNotFound`, `WindowOpen`, `TransferFailed` |
| `forget` | none, removing an absent entry is a no op |
| `setDwell` | `DwellOutOfRange` |
| `claim` | `NothingToClaim`, `TransferFailed` |

`forget` on an address that is not on the list succeeds silently and emits
nothing. Making it revert would leak whether an address is on a list to a caller
who is guessing, and would make a batch cleanup awkward for no benefit.

### Why no revert strings

Custom errors cost less to deploy and less to revert with, and they carry a
selector a frontend can match on exactly rather than comparing text. The Kerb
frontend maps each selector to a message in its own copy, so the wording can
improve without touching an immutable contract.

Next: [KerbCore](../implementation/core.md).
