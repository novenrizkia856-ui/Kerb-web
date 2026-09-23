# State

## Account layouts

Every account starts with the 8 byte discriminator Anchor writes, so a program
can never mistake one account type for another.

```rust
#[account]
pub struct Hold {            // seeds: "hold", sender, recipient, mint
    pub sender: Pubkey,      // 32
    pub recipient: Pubkey,   // 32
    pub mint: Pubkey,        // 32, all zeros for SOL
    pub amount: u64,         // 8, what actually arrived in escrow
    pub release_at: i64,     // 8, unix seconds from the Clock sysvar
    pub bump: u8,            // 1
}                            // 8 + 113 = 121 bytes

#[account]
pub struct Contact {         // seeds: "contact", sender, recipient
    pub sender: Pubkey,      // 32
    pub recipient: Pubkey,   // 32
    pub since: i64,          // 8, when the settlement that created it landed
    pub bump: u8,            // 1
}                            // 8 + 73 = 81 bytes

#[account]
pub struct Settings {        // seeds: "settings", sender
    pub sender: Pubkey,      // 32
    pub dwell_seconds: u64,  // 8, zero means DEFAULT_DWELL
    pub bump: u8,            // 1
}                            // 8 + 41 = 49 bytes

#[account]
pub struct Claim {           // seeds: "claim", recipient, mint
    pub recipient: Pubkey,   // 32
    pub mint: Pubkey,        // 32
    pub amount: u64,         // 8
    pub bump: u8,            // 1
}                            // 8 + 73 = 81 bytes
```

`sender` sits first after the discriminator in `Hold`, `Contact` and `Settings`,
at byte offset 8. That is deliberate: it is what lets a client ask an RPC node
for every account of a type belonging to one sender with a single `memcmp`
filter. See [Reading state](../implementation/lens.md).

`amount` is a `u64`, because SPL token amounts and lamports are both `u64`
natively. There is no wider amount to accommodate and no narrowing to get wrong.

## Rent

Every account holds a rent exempt deposit, returned to whoever the program
names when it is closed.

| Account | Size | Deposit | Paid by | Returned |
|---|---|---|---|---|
| Hold | 121 bytes | 0.00173304 SOL | sender | to the sender, on cancel or settle |
| Vault (SPL only) | 165 bytes, more with Token-2022 extensions | 0.00203928 SOL | sender | to the sender, on cancel or settle |
| Contact | 81 bytes | 0.00145464 SOL | the hold's deposit | to the sender, on forget |
| Settings | 49 bytes | 0.00123192 SOL | sender | to the sender, when the dwell is cleared |
| Claim and its vault | 81 + 165 bytes | about 0.0035 SOL | the settler | to the settler, when the claim is withdrawn |

Figures assume the current rent rate of 6,960 lamports per byte, including the
128 byte account overhead. Because holds close on settle or cancel, steady state
growth from holds is zero. Contacts persist, which is the point of them.

The contact's deposit comes out of the hold's, which is larger. So settling
never asks the settler to fund the sender's list, and the sender's cost for a
first transfer is one contact deposit, recoverable with `forget`.

## Hold identity

```
hold address = find_program_address(["hold", sender, recipient, mint], program_id)
```

Three properties follow from this choice, and all three are intended.

**It is derivable off chain.** A frontend can compute the hold address for a
transfer it is about to make, without a transaction and without an event, and
watch it.

**It is stable.** The same triple always produces the same address, so a
cancelled hold and a later hold between the same parties for the same mint share
an address. That is safe because the account is closed before a new one can be
created there, and account creation fails while it is open.

**It is scoped to the sender.** Two senders paying the same recipient the same
mint have different addresses, so nothing about one sender is reachable from
another.

It is not a counter, so there is no global sequence and no global account for
concurrent sends to contend over. A sender's open holds are enumerated by
filtering on the sender field, and history comes from transaction logs.

## Trust records

A contact account records that a settlement happened and when. It does not
currently record the amount or the mint.

**Open question, likely to be adopted.** Add

```rust
pub settled_mint: Pubkey,    // 32
pub settled_amount: u64,     // 8
```

to `Contact`, recording the settlement that created it. It costs 40 bytes, about
0.00028 SOL of extra rent per contact, and lets a frontend show an entry trusted
on a speck of dust differently from one trusted on a real payment. See the dust
trust risk in [The trust list](../concepts/trust-list.md). The specification
currently omits it so that the decision is explicit rather than assumed.

## Invariants

These must hold after every instruction. They are the basis of the property
tests in [Testing](../implementation/testing.md).

| # | Invariant |
|---|---|
| 1 | Every open hold account has `amount > 0`, and `release_at` no later than creation time plus `MAX_DWELL`. |
| 2 | A hold account's address equals the PDA derived from its own `sender`, `recipient` and `mint` fields. The same holds for contact, settings and claim accounts. |
| 3 | For every hold, its escrow holds at least `amount`: the vault's token balance for an SPL hold, or lamports above the rent deposit for a SOL hold. For every claim, its vault holds at least `amount`. |
| 4 | A contact account is created only by `settle`, and closed only by `forget`. |
| 5 | A settings account's `dwell_seconds` is either zero, or within `[MIN_DWELL, MAX_DWELL]`. |
| 6 | Every vault's token authority is the hold or claim account it belongs to, and nothing else. |
| 7 | No instruction lets one key modify another key's contacts, settings, holds or claims, except `settle` completing a hold exactly as it was opened. |

Invariant 3 is the solvency invariant and is the one worth fuzzing hardest.

Next: [Parameters](parameters.md).
