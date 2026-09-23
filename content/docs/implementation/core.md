# The Kerb program

The only program Kerb has. It owns every Kerb account and custodies value only
while a hold is open.

The sketches below use Anchor, because its account constraints make most of the
checks declarative and therefore reviewable. They are a specification, not a
finished program: account structs are abbreviated, and error handling around
token CPIs is left to the real implementation.

## Interface

```rust
#[program]
pub mod kerb {
    pub fn send(ctx: Context<Send>, amount: u64) -> Result<()>;
    pub fn cancel(ctx: Context<Cancel>) -> Result<()>;
    pub fn settle(ctx: Context<Settle>) -> Result<()>;
    pub fn forget(ctx: Context<Forget>) -> Result<()>;
    pub fn set_dwell(ctx: Context<SetDwell>, dwell_seconds: u64) -> Result<()>;
    pub fn claim(ctx: Context<ClaimFunds>) -> Result<()>;
}
```

There are no read instructions. Every account is readable directly; see
[Reading state](lens.md).

`mint` is the all zero key for SOL, and the mint address for an SPL token. For
SOL the token accounts, the vault and the token programs are simply absent from
the instruction, passed as Anchor `Option` accounts.

## send

```rust
pub fn send(ctx: Context<Send>, amount: u64) -> Result<()> {
    let sender = ctx.accounts.sender.key();
    let recipient = ctx.accounts.recipient.key();
    require!(recipient != Pubkey::default(), KerbError::ZeroRecipient);
    require!(recipient != sender, KerbError::SelfSend);
    require!(amount > 0, KerbError::ZeroAmount);

    let native = ctx.accounts.mint.is_none();

    // The contact account is passed unchecked at its derived address. It is
    // trusted exactly when it exists and is owned by this program.
    if ctx.accounts.contact.owner == &crate::ID {
        // straight through, no account created
        if native {
            system_transfer(&ctx.accounts.sender, &ctx.accounts.recipient, amount)?;
        } else {
            token_transfer_checked(
                &ctx.accounts.sender_token_account,     // from the sender
                &ctx.accounts.recipient_token_account,  // straight to the recipient
                &ctx.accounts.sender,                   // authority: the signer
                amount,
            )?;
        }
        emit_cpi!(Sent { sender, recipient, mint: mint_key(&ctx), amount });
        return Ok(());
    }

    // A new recipient. The hold account is created by the `init` constraint at
    // ("hold", sender, recipient, mint); creation fails if one is already open,
    // which is reported as HoldPending.
    if native {
        require!(amount >= Rent::get()?.minimum_balance(0), KerbError::BelowRentExempt);
        require!(!ctx.accounts.recipient.executable, KerbError::RecipientExecutable);
    } else {
        reject_unsupported_extensions(&ctx.accounts.mint)?;
    }

    let received = if native {
        system_transfer(&ctx.accounts.sender, &ctx.accounts.hold, amount)?;
        amount
    } else {
        let before = ctx.accounts.vault.amount;
        token_transfer_checked(
            &ctx.accounts.sender_token_account,
            &ctx.accounts.vault,
            &ctx.accounts.sender,
            amount,
        )?;
        ctx.accounts.vault.reload()?;
        let received = ctx.accounts.vault.amount - before;
        require!(received > 0, KerbError::ZeroAmount);
        received
    };

    let release_at = Clock::get()?.unix_timestamp + dwell_of(&ctx.accounts.settings) as i64;

    let hold = &mut ctx.accounts.hold;
    hold.sender = sender;
    hold.recipient = recipient;
    hold.mint = mint_key(&ctx);
    hold.amount = received;
    hold.release_at = release_at;
    hold.bump = ctx.bumps.hold;

    emit_cpi!(Held { hold: hold.key(), sender, recipient, mint: hold.mint, amount: received, release_at });
    Ok(())
}
```

Four details worth defending.

**`received` rather than `amount`.** A Token-2022 mint with a transfer fee
delivers less than was requested. Recording the requested amount would make the
hold insolvent against invariant 3 the moment such a mint is used. Measuring the
vault's balance before and after is the only correct thing to do here. See
[Assets](assets.md).

**The straight through path never touches a Kerb account.** For SOL it is a
system transfer, for a token a single `transfer_checked`, both from the sender
directly to the recipient. The program never holds the funds, so it cannot lose
them, and the cost is close to a bare transfer.

**There is no allowance.** The sender signs the transaction, and Solana extends
that signature to the token transfer the program makes on the sender's behalf
inside it. Nothing is approved in advance and nothing outlives the transaction,
so there is no standing permission for anyone to misuse later.

**The contact check reads ownership, not a flag.** A contact account exists only
if this program created it, and only `settle` creates one. An address somebody
has pre-funded with lamports is owned by the system program, not by Kerb, so it
still reads as untrusted.

## cancel

```rust
pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
    let hold = &ctx.accounts.hold;
    // has_one = sender on the account constraint rejects any other signer
    // with NotSender, before this body runs.
    require!(Clock::get()?.unix_timestamp < hold.release_at, KerbError::WindowClosed);

    return_escrow_to_sender(&ctx)?;      // lamports, or vault tokens signed by the hold PDA
    close_vault_to_sender(&ctx)?;        // SPL only

    emit_cpi!(Cancelled {
        hold: hold.key(), sender: hold.sender, recipient: hold.recipient,
        mint: hold.mint, amount: hold.amount,
    });
    Ok(())
    // `close = sender` on the hold constraint zeroes it and returns its rent
}
```

The hold account is closed by Anchor at the end of the instruction, which zeroes
its data and hands its lamports to the sender. A second `cancel` or `settle` in a
later transaction finds no account and fails before any Kerb code runs.

## settle

```rust
pub fn settle(ctx: Context<Settle>) -> Result<()> {
    let hold = &ctx.accounts.hold;
    require!(Clock::get()?.unix_timestamp >= hold.release_at, KerbError::WindowOpen);

    // Trust first. The contact is created at ("contact", sender, recipient)
    // if it does not exist, funded out of the hold's own rent deposit: the
    // program debits the hold, credits the contact address, then allocates and
    // assigns it with the contact PDA's signature. The settler pays nothing
    // towards the sender's list.
    if create_contact_if_absent(&ctx)? {
        emit_cpi!(Trusted { sender: hold.sender, recipient: hold.recipient });
    }

    let delivered = if hold.mint == Pubkey::default() {
        pay_lamports_from_hold(&ctx, hold.amount)?;   // cannot fail, see Assets
        true
    } else if recipient_account_is_frozen(&ctx)? {
        move_vault_to_claim(&ctx)?;                   // the pull fallback
        false
    } else {
        // The recipient's associated token account is created if missing,
        // paid by the settler, exactly as a wallet transfer would.
        pay_tokens_from_vault(&ctx, hold.amount)?;
        true
    };

    close_vault_to_sender(&ctx)?;
    emit_cpi!(Settled {
        hold: hold.key(), sender: hold.sender, recipient: hold.recipient,
        mint: hold.mint, amount: hold.amount, delivered,
    });
    Ok(())
    // `close = sender` returns what is left of the hold's rent to the sender
}
```

`settle` is permissionless on purpose. The recipient must never need the sender
to cooperate in order to be paid, and a hold whose only settler was the sender
would be a hold the sender could abandon.

The frozen check happens before the transfer, not after it fails. A failed
cross program invocation aborts the whole transaction on Solana, so there is no
catching a refused transfer and falling back. The program has to ask first.

## forget, set_dwell, claim

```rust
pub fn forget(ctx: Context<Forget>) -> Result<()> {
    // contact is passed unchecked at ("contact", sender, recipient).
    // Absent: nothing to do, and nothing is emitted.
    if ctx.accounts.contact.owner != &crate::ID {
        return Ok(());
    }
    close_program_account(&ctx.accounts.contact, &ctx.accounts.sender)?;
    emit_cpi!(Forgotten { sender: ctx.accounts.sender.key(), recipient: ctx.accounts.recipient.key() });
    Ok(())
}

pub fn set_dwell(ctx: Context<SetDwell>, dwell_seconds: u64) -> Result<()> {
    require!(
        dwell_seconds == 0 || (MIN_DWELL..=MAX_DWELL).contains(&dwell_seconds),
        KerbError::DwellOutOfRange
    );
    if dwell_seconds == 0 {
        close_settings_if_present(&ctx)?;    // absent and zero mean the same thing
    } else {
        write_settings(&ctx, dwell_seconds)?; // init_if_needed, paid by the sender
    }
    emit_cpi!(DwellSet { sender: ctx.accounts.sender.key(), dwell_seconds });
    Ok(())
}

pub fn claim(ctx: Context<ClaimFunds>) -> Result<()> {
    // has_one = recipient on the claim constraint: only the recipient signs.
    let amount = ctx.accounts.claim.amount;
    require!(amount > 0, KerbError::NothingToClaim);

    // To any token account the recipient owns for this mint, so an account
    // that is still frozen does not keep the funds stuck.
    pay_from_claim_vault(&ctx, amount)?;
    close_claim_vault_and_claim(&ctx)?;      // rent back to whoever funded them
    emit_cpi!(Claimed { recipient: ctx.accounts.recipient.key(), mint: ctx.accounts.mint.key(), amount });
    Ok(())
}
```

## Moving lamports out of a hold

A hold account is owned by the Kerb program, so the program can debit it
directly. No system program call is involved, and none is possible: the system
program only transfers from accounts it owns.

```rust
fn pay_lamports_from_hold(ctx: &Context<Settle>, amount: u64) -> Result<()> {
    let hold = ctx.accounts.hold.to_account_info();
    let to = ctx.accounts.recipient.to_account_info();
    **hold.try_borrow_mut_lamports()? -= amount;
    **to.try_borrow_mut_lamports()? += amount;
    Ok(())
}
```

Checked arithmetic is on for the whole crate (`overflow-checks = true` in the
release profile), so the subtraction cannot wrap.

## What there is no equivalent of

**No fallback receive.** A Solana program is not paid by sending it lamports; it
has no receive hook to reject them with. Lamports sent straight to a hold address
are not tracked against any hold and are returned to the sender when the hold
closes, since closing moves every lamport the account holds. Nothing can be
stranded that way.

**No reentrancy guard.** Solana does not let a program be re-entered through a
cross program invocation, except by calling itself directly, and Kerb never
does. The only invocations Kerb makes are into the system, token and associated
token programs, and into itself for `emit_cpi!`, which carries no state change.
See [Security](security.md).

Next: [Reading state](lens.md).
