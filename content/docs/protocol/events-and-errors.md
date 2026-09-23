# Events and errors

## Events

Every state change emits exactly one primary event, plus `Trusted` when a
settlement adds a recipient that was not already on the list. Events are emitted
through a self CPI (Anchor's `emit_cpi!`), so they are recorded as instruction
data in the transaction rather than as log lines, which RPC nodes are free to
truncate. That makes the history complete enough to rebuild any sender's past
without a backend.

```rust
#[event]
pub struct Sent {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Held {
    pub hold: Pubkey,
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub release_at: i64,
}

#[event]
pub struct Cancelled {
    pub hold: Pubkey,
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Settled {
    pub hold: Pubkey,
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub delivered: bool,     // false when the amount went to a claim instead
}

#[event]
pub struct Trusted {
    pub sender: Pubkey,
    pub recipient: Pubkey,
}

#[event]
pub struct Forgotten {
    pub sender: Pubkey,
    pub recipient: Pubkey,
}

#[event]
pub struct DwellSet {
    pub sender: Pubkey,
    pub dwell_seconds: u64,
}

#[event]
pub struct Claimed {
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}
```

### Finding events

Solana has no topic index. A transaction is found through the accounts it
touched: `getSignaturesForAddress` on an account returns every transaction that
included it, and `getTransaction` returns the events inside each. Every Kerb
instruction includes the sender's wallet, the recipient's wallet and the account
being changed, so each of them is a handle on its history.

`Settled` carries `delivered`. When it is false the recipient's token account
was frozen and the amount went to a claim account instead, and an interface
should tell them to call `claim`. See [Assets](../implementation/assets.md).

`Trusted` is emitted only on a genuinely new addition, never on a repeat
settlement to an address already on the list. A consumer can therefore treat the
`Trusted` events as the exact contents of a sender's list, applying `Forgotten`
as removals, without deduplicating.

### Current state versus history

For current state, do not replay events at all. Read the accounts, which are the
state. Events are for history and ordering.

| View | Source |
|---|---|
| My trust list, now | contact accounts filtered on `sender = me` |
| My pending holds, now | hold accounts filtered on `sender = me` |
| My trust list, in the order it was built | `Trusted(sender = me)` minus `Forgotten(sender = me)`, in slot order |
| Payments I received | `Sent` and `Settled` in transactions that include my wallet |
| Who has me on their list | contact accounts filtered on `recipient = me`, at byte offset 40 |

The last row is worth noticing. It is public. Anybody can see who has trusted
whom, because accounts are public and transactions are public. Kerb does not
claim privacy and nothing in this design should be read as providing it.

## Errors

A single `#[error_code]` enum. Anchor numbers custom errors from 6000 in
declaration order, so the order below is part of the interface and must never be
rearranged.

```rust
#[error_code]
pub enum KerbError {
    ZeroRecipient,        // 6000  recipient is the all zero key
    ZeroAmount,           // 6001  amount is 0, or nothing arrived in escrow
    SelfSend,             // 6002  recipient is the sender
    BelowRentExempt,      // 6003  a SOL hold under the rent exempt minimum
    RecipientExecutable,  // 6004  a SOL send to a program account
    HoldPending,          // 6005  a hold for this sender, recipient and mint is open
    NotSender,            // 6006  signer is not the hold's sender
    WindowOpen,           // 6007  settle before release_at
    WindowClosed,         // 6008  cancel at or after release_at
    DwellOutOfRange,      // 6009  set_dwell outside [MIN_DWELL, MAX_DWELL] and not 0
    NothingToClaim,       // 6010  claim with a zero balance
    UnsupportedMint,      // 6011  a Token-2022 extension Kerb refuses, see Assets
}
```

`HoldNotFound` has no entry. A hold that does not exist is an account that does
not exist, and Anchor rejects the instruction before Kerb's code runs, with its
own `AccountNotInitialized`. An interface should map that to the same message.

### Which instruction raises what

| Instruction | Can fail with |
|---|---|
| `send` | `ZeroRecipient`, `ZeroAmount`, `SelfSend`, `BelowRentExempt`, `RecipientExecutable`, `HoldPending`, `UnsupportedMint`, and the token program's own errors |
| `cancel` | `NotSender`, `WindowClosed`, a missing hold |
| `settle` | `WindowOpen`, a missing hold |
| `forget` | none, forgetting an absent entry is a no op |
| `set_dwell` | `DwellOutOfRange` |
| `claim` | `NothingToClaim` |

`forget` on an address that is not on the list succeeds silently and emits
nothing. Making it fail would leak nothing new, since contact accounts are
public, but it would make a batch cleanup awkward for no benefit.

### Why numbered errors and no messages in the interface

Anchor attaches a message to each error in the program binary, but an interface
should not show it. The number is exact and stable; the message is whatever the
author typed. The Kerb frontend maps each number to a sentence in its own copy,
so the wording can improve without touching a program that can no longer change.

Next: [The Kerb program](../implementation/core.md).
