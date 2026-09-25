# Transfer lifecycle

## States

A hold occupies exactly one of four states. Two of them are terminal, and the
hold is deleted from storage when either is reached.

```
                     send(recipient, asset, amount)
                                 |
                 +---------------+---------------+
                 |                               |
       recipient is trusted            recipient is new
                 |                               |
            [ straight ]                    [ PENDING ]
            funds moved                  funds in escrow
            nothing stored                 hold stored
                 |                               |
               done             +----------------+----------------+
                                |                                 |
                     before releaseAt                  at or after releaseAt
                                |                                 |
                          cancel()                           settle()
                                |                                 |
                        [ CANCELLED ]                       [ SETTLED ]
                     funds back to sender            funds to recipient
                     nothing trusted                 recipient trusted
                     hold deleted                    hold deleted
```

`status` is stored as a `uint8` while the hold exists. Because settled and
cancelled holds are deleted, the only status ever read back from storage is
`PENDING`. The constants are kept for event clarity and for the moment inside a
transaction between the state change and the delete.

```solidity
uint8 constant STATUS_NONE      = 0;
uint8 constant STATUS_PENDING   = 1;
uint8 constant STATUS_SETTLED   = 2;
uint8 constant STATUS_CANCELLED = 3;
```

## Path one, straight through

Precondition: the recipient is on the sender trusted set.

1. Validate that the recipient is not the zero address and not `msg.sender`, and
   that the amount is not zero.
2. Move the asset from sender to recipient. For the native asset this forwards
   `msg.value`. For an ERC20 it is a single `transferFrom` from the sender
   directly to the recipient, so the funds never touch `KerbCore`.
3. Emit `Sent`.

No storage is written. No hold id is produced. The function returns
`bytes32(0)`.

This path should cost close to a bare transfer plus one set membership read.

## Path two, a new recipient

Precondition: the recipient is not on the sender list, and no pending hold
exists for the same sender, recipient and asset triple.

1. Validate as above.
2. Compute `holdId = keccak256(abi.encode(sender, recipient, asset))`.
3. Revert with `HoldPending` if that hold is already pending.
4. Pull the asset into `KerbCore`. For an ERC20 the amount recorded is the
   balance **actually received**, which matters for fee on transfer tokens. See
   [Assets](../implementation/assets.md).
5. Write the hold with `releaseAt = block.timestamp + dwellOf(sender)`.
6. Add `holdId` to the sender pending set.
7. Emit `Held`.

## Cancel

Callable only by the hold sender, only while `block.timestamp < releaseAt`.

1. Load the hold, revert `HoldNotFound` if the status is not pending.
2. Revert `NotSender` if the caller is not the sender.
3. Revert `WindowClosed` if `block.timestamp >= releaseAt`.
4. Remove the id from the pending set and delete the hold, **before** moving any
   value.
5. Return the asset to the sender.
6. Emit `Cancelled`.

Nothing is trusted. As far as the trust list is concerned this transfer never
happened.

## Settle

Callable by anyone, only when `block.timestamp >= releaseAt`.

1. Load the hold, revert `HoldNotFound` if the status is not pending.
2. Revert `WindowOpen` if `block.timestamp < releaseAt`.
3. Remove the id from the pending set and delete the hold.
4. Append the recipient to the sender trusted set if absent, emitting `Trusted`
   only when it is newly added.
5. Deliver the asset to the recipient. If a native push fails, credit
   `claimable[recipient][asset]` rather than reverting.
6. Emit `Settled`.

Note the ordering. Trust is granted at the point the transfer becomes the
recipient's, not conditionally on the delivery mechanics succeeding. A recipient
contract that cannot accept a push has still been paid, through the claim
balance, and the sender has still demonstrated intent.

**Open question.** Whether trust should be withheld when delivery falls back to
`claimable`. The argument for withholding is that a sender may not consider a
bounced payment a completed relationship. The argument against is that it makes
trust depend on the recipient code rather than the sender action. Currently
specified as granting trust.

## Timing edge cases

| Condition | Result |
|---|---|
| `block.timestamp == releaseAt` | Settle succeeds, cancel reverts. The boundary belongs to the recipient. |
| Two settles in one block | The second reverts with `HoldNotFound`, because the first deleted the hold. |
| Cancel and settle in the same block | Whichever executes first wins. Cancel is only legal strictly before `releaseAt`, so the two are never both legal. |
| A second `send` to the same recipient and asset while pending | Reverts with `HoldPending`. |
| A second `send` to the same recipient, different asset, while pending | Allowed, because the hold id differs. |
| `send` to a recipient trusted between the send and a pending hold settling | The pending hold is unaffected and still requires settle. |

Next: [State](state.md).
