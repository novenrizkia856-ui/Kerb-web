# Protocol overview

## One program, no read program

| Piece | Role | Holds state | Deployed |
|---|---|---|---|
| The Kerb program | Everything that writes. Escrow, holds, trust lists, dwell settings | in accounts it owns | once, upgrade authority revoked |
| Reads | Everything that reads. Derived views for wallets and frontends | no | not deployed at all, it is client code |

A read helper is often deployed as a second program, because on many chains the
only way to shape storage into an answer is to run code next to it. On Solana
every account is directly readable over RPC, and program derived
addresses can be computed by anyone. So the read surface lives in the client:
derive the address, fetch the account, decode it. Nothing to deploy, nothing to
trust, and a better read shape later is a library change. See
[Reading state](../implementation/lens.md).

## What the program has, and does not have

```rust
#[program]
pub mod kerb {
    // no admin key, no authority account
    // no pause
    // no upgrade path: the upgrade authority is set to none at deploy
    // no global config account, so nothing to initialise
    // no fee, no fee recipient, no treasury
    // no oracle, no price feed
    // no token of its own
    // no dependency beyond the system, token and associated token programs
}
```

Every one of those absences is load bearing. A pause instruction is a key that
can freeze your funds. A fee recipient is an address that must be trusted. An
upgrade authority is permission to replace the rules after you have relied on
them. The Kerb claim is that the only key affecting your Kerb state is your own,
and each of these would falsify it.

The practical consequence is that a bug cannot be patched. It can only be
abandoned, by everyone moving to a new deployment and rebuilding their trust
lists through fresh settled transfers. That trade is made deliberately and is
why [Testing](../implementation/testing.md) is specified as tightly as it is.

## Data ownership

Every piece of state is its own account, at a program derived address (PDA)
computed from the keys it belongs to.

```
Kerb program
  |
  +-- per sender                    seeds: "settings", sender
  |     +-- dwell override          u64, zero means use the protocol default
  |
  +-- per sender and recipient      seeds: "contact", sender, recipient
  |     +-- contact                 exists exactly when the recipient is trusted
  |
  +-- per sender, recipient, mint   seeds: "hold", sender, recipient, mint
  |     +-- hold                    amount, release_at
  |     +-- vault                   the escrowed tokens, or the lamports themselves
  |
  +-- per recipient and mint        seeds: "claim", recipient, mint
        +-- claim                   the pull fallback, see Assets
```

Nothing is global. Every address is derived from the sender, or for a claim from
the recipient, so no two users' state can collide and no instruction can reach
an account that is not derived from the keys it was given.

Native SOL is addressed with the all zero key, `11111111111111111111111111111111`,
in the mint position.

## The write surface

Six instructions. That is the entire mutable interface.

| Instruction | Signer | Effect |
|---|---|---|
| `send` | the sender | moves funds straight through, or opens a hold |
| `cancel` | the hold's sender, before `release_at` | returns funds, trusts nothing |
| `settle` | anyone, at or after `release_at` | delivers funds, appends to the sender's list |
| `forget` | the sender, for their own list | removes a recipient from the signer's list |
| `set_dwell` | the sender, for themselves | sets the signer's dwell inside the fixed bounds |
| `claim` | a recipient owed a blocked delivery | withdraws the pull fallback balance |

Full semantics are in [The Kerb program](../implementation/core.md).

## The read surface

Every account above is readable by anyone with an RPC endpoint. The questions an
interface asks, will this send be held, when would it release, what is on my
list, what is pending, are answered by deriving an address and fetching it, or
by one filtered query for a whole list. See
[Reading state](../implementation/lens.md).

## Network

| Field | Value |
|---|---|
| Network | Solana |
| Cluster | `mainnet-beta` at launch, `devnet` for testing |
| Native currency | SOL, 9 decimals, the smallest unit is a lamport |
| Program id | none yet, the program is not deployed |

The program id will be published in `config/kerb.config.json` in the web
repository, as `solana.KERB_PROGRAM_ID`, once deployment happens. The site
renders `Not deployed` until then, and nothing in the codebase hardcodes a
program id.

Next: [Transfer lifecycle](lifecycle.md).
