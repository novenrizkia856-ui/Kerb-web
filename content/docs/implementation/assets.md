# Assets

Kerb handles SOL and SPL tokens, under both the classic SPL Token program and
Token-2022. There is no allowlist and no blocklist. The all zero key in the mint
position means SOL; anything else must be a mint owned by one of the two token
programs.

## SOL

| Path | Behaviour |
|---|---|
| `send`, straight through | A system transfer from the sender's wallet to the recipient. |
| `send`, new recipient | A system transfer into the hold account, where the lamports sit above its rent deposit. |
| `cancel` | Debited from the hold, credited to the sender. |
| `settle` | Debited from the hold, credited to the recipient. |
| lamports sent straight to a hold address | Untracked, and returned to the sender when the hold closes, with its rent. |

A program can always debit an account it owns and credit any writable account,
so a SOL settlement has only two ways to fail, and `send` closes both before a
hold exists:

**The recipient is an executable account.** The runtime refuses to change a
program account's balance. `send` fails with `RecipientExecutable`.

**The recipient would be left below the rent exempt minimum.** An account that
holds nothing and receives less than 890,880 lamports would end up neither empty
nor rent exempt, and the runtime rejects that. `send` requires every SOL hold to
be at least that amount, `BelowRentExempt` otherwise, so any recipient ends up
exempt.

So a SOL settlement cannot be refused, and SOL needs no pull fallback.

## SPL tokens

All token movement uses `transfer_checked`, which carries the mint and its
decimals, so a mismatched mint or a wrong decimals assumption fails rather than
moving the wrong thing.

| Path | Call |
|---|---|
| `send`, straight through | sender's token account to the recipient's, signed by the sender. The program never holds it. |
| `send`, new recipient | sender's token account to the hold's vault, signed by the sender |
| `cancel` | vault to the sender's token account, signed by the hold PDA |
| `settle` | vault to the recipient's associated token account, signed by the hold PDA, creating that account if it is missing |
| `settle`, recipient account frozen | vault to a claim vault for the recipient, signed by the hold PDA |
| `claim` | claim vault to any token account the recipient owns, signed by the claim PDA |

### Why settle falls back and the others do not

A mint with a freeze authority can freeze any token account. If the recipient's
account is frozen at settlement, a transfer into it fails, and a failed
transfer aborts the whole transaction. The hold could then never be resolved:
the window has closed so `cancel` is illegal, and `settle` fails forever.

So `settle` checks the recipient's account state first, and when it is frozen
moves the tokens to a claim account keyed by the recipient and mint, emitting
`Settled { delivered: false }`. The recipient can `claim` them into any other
account they own, which may not be frozen.

`cancel` and `claim` do not fall back, because in both the signer is the party
receiving the funds and is present in the transaction. Failing tells them
something is wrong. Silently parking the money somewhere they then have to
discover would be worse.

### Transfer fees

A Token-2022 mint with the transfer fee extension withholds a fee on every
transfer. On the hold path the amount stored is what actually arrived in the
vault:

```rust
let before = ctx.accounts.vault.amount;
token_transfer_checked(/* sender -> vault */)?;
ctx.accounts.vault.reload()?;
let received = ctx.accounts.vault.amount - before;
require!(received > 0, KerbError::ZeroAmount);
```

Recording the requested amount instead would leave the hold owing more than its
vault holds the first time such a mint was used, breaking invariant 3.

**Consequence to document for users.** The fee is taken on every hop. A held
transfer of such a token pays it into escrow and again on the way out, so the
recipient receives less than a direct transfer would deliver, and a cancel
returns less than was sent. Kerb never has the difference; the mint withholds it.

### Token-2022 extensions

| Extension | Kerb outcome |
|---|---|
| Transfer fee | Supported, as above |
| Metadata, metadata pointer, group, interest bearing display | Irrelevant to movement, supported |
| Immutable owner, memo required, CPI guard on the sender's account | Supported, or fails cleanly at `send` with the token program's error |
| Default account state frozen | The vault would be created frozen, so `send` fails. Nothing is lost. |
| Transfer hook | **Refused** on the hold path with `UnsupportedMint`. A hook is arbitrary code run on every transfer, and one that later refuses the vault's transfer strands the hold. |
| Permanent delegate | **Refused** on the hold path. A permanent delegate can move tokens out of any account of that mint, including the vault, breaking invariant 3. |
| Confidential transfer | **Refused** on the hold path. The vault cannot see the amount it received. |
| Non transferable | Cannot be sent at all; the token program refuses. |

The refusals apply only to the hold path, where Kerb has to hold the tokens
safely for the length of the window. The straight through path moves tokens
directly between two wallets that already chose to hold that mint, and Kerb is
not in the middle.

### Freeze authority on the vault

This is the trap, and it should be stated plainly. A mint's freeze authority can
freeze **any** account of that mint, the vault included. Many widely held mints,
stablecoins among them, keep a freeze authority.

If the issuer freezes a hold's vault, the tokens cannot move out of it. `cancel`
fails, `settle` fails, and the claim fallback does not help, because the frozen
account is the source, not the destination. The hold stays open until the
issuer thaws the vault, possibly forever.

Kerb cannot prevent this without refusing every mint that has a freeze
authority, which would exclude most of the tokens people actually send. It is
accepted and documented instead. See [Honest limits](../reference/limits.md).

**Open question.** Whether the hold path should refuse mints with a freeze
authority unless the sender opts in explicitly. It would make the trap a choice
rather than a surprise. Not yet specified.

## Decimals

Kerb never scales an amount. Values are stored and moved exactly as given, in
the mint's smallest unit, and `transfer_checked` confirms the decimals the
client assumed. Formatting is entirely the interface's concern.

Next: [Security](security.md).
