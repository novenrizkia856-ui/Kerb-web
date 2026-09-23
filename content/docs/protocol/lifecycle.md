# Transfer lifecycle

## States

A hold is an account, and it has only one state while it exists: pending. The
two terminal outcomes close the account, returning its rent to the sender.

```
                     send(recipient, mint, amount)
                                 |
                 +---------------+---------------+
                 |                               |
       recipient is trusted            recipient is new
                 |                               |
            [ straight ]                    [ PENDING ]
            funds moved                  funds in escrow
            nothing stored              hold account open
                 |                               |
               done             +----------------+----------------+
                                |                                 |
                    before release_at                at or after release_at
                                |                                 |
                             cancel                            settle
                                |                                 |
                        [ CANCELLED ]                       [ SETTLED ]
                     funds back to sender            funds to recipient
                     nothing trusted                 recipient trusted
                     hold closed                     hold closed
```

There is no status field. An open hold account is pending; a closed one no
longer exists. The outcome of a closed hold is recorded in the transaction that
closed it and in the event it emitted, not in an account.

## Path one, straight through

Precondition: the sender's contact account for this recipient exists.

1. Validate that the recipient is not the all zero key and not the sender, and
   that the amount is not zero.
2. Move the asset from sender to recipient. For SOL this is a system transfer
   from the sender's wallet. For an SPL token it is a single `transfer_checked`
   from the sender's token account directly to the recipient's, so the funds
   never touch an account the program owns.
3. Emit `Sent`.

No account is created. The sender's signature on the transaction is what
authorises the movement; there is no allowance, and nothing outlives the
transaction.

This path should cost close to a bare transfer plus one account read.

## Path two, a new recipient

Precondition: no contact account exists for the pair, and no hold is open for
the same sender, recipient and mint.

1. Validate as above, and for SOL that the amount is at least the rent exempt
   minimum for an empty account. See [Assets](../implementation/assets.md).
2. Derive the hold address from `("hold", sender, recipient, mint)`.
3. Create the hold account. Creation fails if one is already open at that
   address, which is how a second overlapping hold is refused.
4. Move the asset into escrow. For SOL the lamports go into the hold account
   itself. For an SPL token they go into a vault token account whose authority
   is the hold. The amount recorded is the amount **actually received**, which
   matters for Token-2022 mints with a transfer fee.
5. Write `release_at = clock.unix_timestamp + dwell_of(sender)`.
6. Emit `Held`.

The sender pays the rent for the hold and the vault. Both deposits come back
when the hold closes, whichever way it closes.

## Cancel

Signed by the hold's sender, only while `clock < release_at`.

1. Check that the hold account exists and belongs to this program.
2. Check that the signer is the sender recorded in the hold.
3. Reject with `WindowClosed` if `clock >= release_at`.
4. Return the escrowed asset to the sender.
5. Close the vault and the hold, returning their rent to the sender.
6. Emit `Cancelled`.

Nothing is trusted. As far as the trust list is concerned this transfer never
happened.

## Settle

Anyone may sign it, only when `clock >= release_at`.

1. Check that the hold account exists and belongs to this program.
2. Reject with `WindowOpen` if `clock < release_at`.
3. Create the sender's contact account for this recipient if it does not exist,
   emitting `Trusted` only when it is newly created. Its rent is paid out of the
   hold's own rent deposit, so the settler does not fund the sender's list.
4. Deliver the asset to the recipient. For an SPL token whose recipient account
   is frozen, move it to a claim account instead of failing. See
   [Assets](../implementation/assets.md).
5. Close the vault and the hold, returning the remaining rent to the sender.
6. Emit `Settled`.

Note the ordering. Trust is granted at the point the transfer becomes the
recipient's, not conditionally on the delivery mechanics succeeding. A recipient
whose token account is frozen has still been paid, through the claim account,
and the sender has still demonstrated intent.

The settler pays the transaction fee, and the rent for the recipient's token
account if it has to be created. The Kerb app settles on the sender's behalf, so
in practice that is the sender.

**Open question.** Whether trust should be withheld when delivery falls back to
a claim. The argument for withholding is that a sender may not consider a
blocked payment a completed relationship. The argument against is that it makes
trust depend on the recipient's circumstances rather than the sender's action.
Currently specified as granting trust.

## Timing edge cases

| Condition | Result |
|---|---|
| `clock == release_at` | Settle succeeds, cancel fails. The boundary belongs to the recipient. |
| Two settles in the same slot | The second fails, because the first closed the hold. |
| Cancel and settle in the same slot | Whichever executes first wins. Cancel is only legal strictly before `release_at`, so the two are never both legal. |
| A second `send` to the same recipient and mint while pending | Fails with `HoldPending`. |
| A second `send` to the same recipient, different mint, while pending | Allowed, because the hold address differs. |
| The recipient becomes trusted while another hold to them is pending | The pending hold is unaffected and still requires settle. |

Next: [State](state.md).
