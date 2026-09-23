# Security

Concerns to hold in mind while writing the program, and the specific defence
for each. This complements the [Threat model](../concepts/threat-model.md),
which covers the protocol level. This page is about the code.

Most Solana program bugs are not arithmetic or reentrancy. They are an
instruction trusting an account it was handed without checking what it is. So
most of this page is about accounts.

## Account validation

Every account an instruction touches is either derived and checked by seeds,
checked by ownership, or is a signer. None is trusted by position.

| Account | Check |
|---|---|
| `hold`, `contact`, `settings`, `claim` | `seeds` and `bump` constraints, so only the one correct address is accepted. Owner is the Kerb program, checked by Anchor's `Account<T>`. |
| `vault`, `claim_vault` | Associated token account of the hold or claim PDA for this mint, with the token program checked as its owner. |
| `sender` | `Signer`, and `has_one = sender` on the hold for `cancel`. |
| `recipient` | Unchecked by design, it is any address. `has_one = recipient` on the hold for `settle`, so settle cannot be pointed at someone else. |
| `mint` | Owned by the SPL Token or Token-2022 program, and equal to `hold.mint`. |
| `token_program` | One of the two token program ids, and the one that owns the mint. |
| `sender_token_account`, `recipient_token_account` | Token accounts for this mint, owned by the right wallet, under the right token program. |

The wrong version of this is easy to write and looks fine:

```rust
// wrong: any account at all is accepted as the recipient's token account,
// so a caller could pass their own and receive the settlement
#[account(mut)]
pub recipient_token_account: AccountInfo<'info>,

// right: it must be the recipient's associated token account for this mint
#[account(
    init_if_needed, payer = payer,
    associated_token::mint = mint,
    associated_token::authority = recipient,
    associated_token::token_program = token_program,
)]
pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,
```

## Signers and PDAs

The program signs for exactly two kinds of account, holds and claims, and only
to move funds out of their own vaults. It signs with `invoke_signed` using the
account's own seeds and stored bump, so a signature for one hold can never
authorise a transfer from another.

The sender's signature is never stored or reused. It authorises the transfer in
the `send` transaction and nothing else. There is no delegate, no allowance and
no off chain signature verification anywhere in the program.

## Closing accounts

Closing a hold, vault, contact, settings or claim account is done through
Anchor's `close` constraint, which moves every lamport out and marks the data as
closed in the same instruction. That matters: an account that is only drained of
lamports, with its data left in place, could be topped back up within the same
transaction and read as still open.

A closed account's address can be created again later, which is what makes hold
addresses reusable, and what the lifecycle depends on.

## Pre-funded addresses

Anyone can send lamports to an address before the program creates an account
there. A plain `create_account` fails on such an address, which would let an
attacker block a user's hold or contact from ever being created, for the price
of one transfer.

Anchor's `init` handles this: when the target already holds lamports it tops
them up to the rent exempt minimum, then allocates and assigns the account
instead of creating it. The contact creation inside `settle`, which is done by
hand so its rent can come from the hold, must follow the same pattern. There is
a test for it. See [Testing](testing.md).

## Duplicate accounts

An instruction handed the same account in two mutable positions can end up
double counting. `settle` with `recipient_token_account` equal to `vault`, or
`claim` with `destination` equal to `claim_vault`, are the cases to reject.
Both are rejected by the associated token constraints above, because a PDA's
vault can never be the recipient's own associated account, and are asserted in
tests anyway.

## Reentrancy

Solana does not allow a program to be re-entered through a cross program
invocation, except by invoking itself directly. Kerb invokes the system, token
and associated token programs, none of which call back, and itself only for
`emit_cpi!`, which records an event and changes nothing.

Transfer hooks are the one way a token transfer can run arbitrary code, and the
hold path refuses mints that have one. See [Assets](assets.md).

State is still written before value moves, as a matter of habit: the hold is
read into locals, the contact is created, then funds move, then accounts close.

## Solvency

Invariant 3 from [State](../protocol/state.md):

> For every hold, its escrow holds at least `amount`. For every claim, its vault
> holds at least `amount`.

Everything that could break it:

| Risk | Defence |
|---|---|
| Recording a requested amount larger than what arrived | Vault balance measured before and after the deposit |
| A permanent delegate moving tokens out of the vault | Mints with the extension are refused on the hold path |
| A transfer hook refusing the vault's outbound transfer | Mints with the extension are refused on the hold path |
| Paying a hold twice | The hold is closed in the instruction that pays it |
| Claim paying more than owed | The claim is closed in the instruction that pays it |
| A freeze authority freezing the vault | Not defended. Documented in [Assets](assets.md) |

This is the invariant to fuzz hardest. See [Testing](testing.md).

## Griefing

**Can somebody open a hold in my name?** No. `send` requires the sender's
signature and only moves funds from accounts the sender owns.

**Can somebody stop my hold settling?** No. `settle` is permissionless and has
no precondition other than the clock.

**Can somebody cancel my hold?** No. `has_one = sender` and the `Signer`
constraint reject any other key.

**Can somebody fill my trust list with junk?** No. A contact account is created
only by `settle`, only for the recipient of a hold the sender created and
funded.

**Can somebody block my hold or contact address?** Not by pre-funding it, as
above. Only by causing a hold to be open for the same sender, recipient and mint,
and only the sender can do that. Blocking yourself is possible and is reported
by the quote's `blocked` field.

**Can a recipient trap funds?** A frozen recipient account routes the tokens to
a claim rather than stranding the hold. An issuer freezing the vault itself can
strand it, as documented.

## Clock dependence

`Clock::get()?.unix_timestamp` sets `release_at` and gates both `cancel` and
`settle`. It is a stake weighted estimate from validator votes and can drift
from wall clock time by seconds. Against a minimum dwell of sixty seconds that is
not enough to matter, and there is no financial edge in moving a settlement a
few seconds either way, because settlement pays the recipient exactly what was
held, with no price, no rate and no fee.

Do not use the slot number instead. Slot times vary and the value being
expressed is a human interval.

## Arithmetic

`overflow-checks = true` in the release profile, so every addition and
subtraction is checked and a wrap aborts the transaction. `release_at` is an
`i64` of unix seconds; with `MAX_DWELL` at seven days, overflow needs a clock
within a week of the year 292 billion.

## Compute and unbounded work

The program contains no loops. Every instruction touches a fixed number of
accounts, so its compute cost is bounded and small, and the trust list can grow
without ever making a write fail, because it is never iterated on chain.

## Deployment

The program takes no initialisation instruction. There is no config account, no
admin to set and no address to inject, so there is nothing to get wrong between
deploying and using it.

Two steps matter, in this order, before the program id is published:

1. **Verifiable build.** Build with `anchor build --verifiable` or
   `solana-verify build`, deploy that artifact, and submit it for verification
   so explorers show the source matches the deployed program.
2. **Revoke the upgrade authority.** `solana program set-upgrade-authority
   <PROGRAM_ID> --final`. Until this is done the program is upgradeable by
   whoever holds the authority key, and every claim on the landing page about
   having no admin is false.

A protocol that claims no admin key must be checkable by anyone who wants to
check that claim. An unverified program, or one whose upgrade authority is still
set, makes the claim unfalsifiable. The explorer shows both.

Next: [Testing](testing.md).
