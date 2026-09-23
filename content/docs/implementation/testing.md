# Testing

The Kerb program's upgrade authority is revoked at deploy. There is no path from
a discovered bug to a fix, only a path to abandoning the deployment. That makes
the test suite the main line of defence rather than a formality, and it should
be written before the program is considered done.

Suggested stack: Anchor for the program, LiteSVM or `solana-program-test` for
fast in process tests with direct control of the `Clock` sysvar, and Trident for
fuzzing.

## Unit tests

### send, straight through

- SOL to a trusted recipient moves the exact lamports and creates no account
- An SPL token to a trusted recipient calls `transfer_checked` sender to
  recipient directly, and the vault is never touched
- Emits `Sent` with the right fields
- A contact address pre-funded with lamports but not owned by Kerb reads as
  untrusted

### send, new recipient

- Creates a hold with `release_at == clock + dwell_of(sender)`
- Emits `Held`
- Fails `HoldPending` on a second send to the same triple
- Allows a second send to the same recipient with a different mint
- Records the received amount, not the requested amount, for a transfer fee mint
- Fails `ZeroRecipient`, `SelfSend`, `ZeroAmount` on each bad input
- Fails `BelowRentExempt` at 890,879 lamports and succeeds at 890,880
- Fails `RecipientExecutable` for a program account
- Fails `UnsupportedMint` for a mint with a transfer hook, a permanent delegate,
  or confidential transfers
- Succeeds when the hold address was pre-funded with lamports

### cancel

- Only the sender can sign it
- Fails `WindowClosed` at exactly `release_at`
- Succeeds at `release_at - 1`
- Returns the full held amount
- Closes the hold and the vault and returns both rent deposits to the sender
- Does **not** create a contact
- A second cancel fails with the account missing

### settle

- Anyone can sign it, tested from a third key
- Fails `WindowOpen` at `release_at - 1`
- Succeeds at exactly `release_at`
- Delivers the full amount
- Creates the contact and emits `Trusted` once
- A second settlement to the same recipient does not emit `Trusted` again
- Funds the contact from the hold's rent: the settler's balance changes by the
  fee and, if needed, the recipient's token account rent, and nothing else
- Creates the recipient's associated token account when it is missing
- A frozen recipient account routes to a claim and emits
  `Settled { delivered: false }` rather than failing
- A second settle fails with the account missing
- Succeeds when the contact address was pre-funded with lamports

### forget, set_dwell, claim

- `forget` closes and emits, and is a silent no op on an absent entry
- After `forget`, the next send to that recipient opens a hold again
- `set_dwell` accepts the bounds exactly, rejects one below `MIN_DWELL` and one
  above `MAX_DWELL`
- `set_dwell(0)` closes the settings account and the effective dwell returns to
  `DEFAULT_DWELL`
- A dwell change does not move the `release_at` of an existing hold
- `claim` pays into a destination other than the frozen account, closes the
  claim, fails `NothingToClaim` at zero, and fails for any signer but the
  recipient

## Property and invariant tests

Run these under Trident with a flow that randomly calls `send`, `cancel`,
`settle`, `forget`, `set_dwell` and `claim` across several keys, SOL, a classic
SPL mint, a Token-2022 mint with a transfer fee, and a mint with a freeze
authority that freezes recipient accounts at random, while warping the clock.

| # | Property |
|---|---|
| 1 | Every open hold has `amount > 0` and a `release_at` inside the dwell bounds of its creation |
| 2 | Every Kerb account sits at the PDA derived from its own fields |
| 3 | **Solvency.** Every hold's escrow and every claim's vault holds at least its `amount` |
| 4 | A contact exists only if a settle happened for that pair and no forget since |
| 5 | Every settings account's dwell is inside the bounds |
| 6 | A key cannot change any other key's contacts, settings, holds or claims, except by settling a hold exactly as opened |
| 7 | Total value in equals total value out plus what is still held, per mint, net of transfer fees withheld |

Property 3 is the one that matters most. Property 6 is the one that expresses
the entire security claim of the protocol and should be asserted after every
single call.

## Fuzz targets

- `send` with amounts across the full `u64` range, against mints with fuzzed
  decimals and supply
- `set_dwell` across the full `u64` range, asserting only the bounds are accepted
- Clock warps between send and settle across a wide range, asserting the
  boundary at exactly `release_at`
- Transfer fee mints with a fuzzed fee from 0 to the maximum basis points,
  asserting the stored amount always equals the vault delta
- Account substitution: every instruction called with each account swapped for
  a plausible wrong one, asserting it fails

## Adversarial tests

Write tests that try to cheat with accounts rather than with code, since that is
where Solana programs break:

- `settle` with the recipient's token account replaced by the settler's own
- `cancel` signed by the recipient, and by a third key
- `claim` with a claim account belonging to another recipient
- A hold for one mint settled with a vault of another mint
- The same account passed in two mutable positions
- A pre-funded hold, contact and settings address for every instruction that
  creates one
- A closed hold revived within the same transaction by sending it lamports

None may move more than the hold amount, and the solvency invariant must hold
afterwards.

## Compute targets

Not correctness, but worth measuring and keeping honest, since the straight
through path being cheap is part of the argument for using Kerb at all.

| Path | Target |
|---|---|
| `send` straight through, SOL | a system transfer plus one account read |
| `send` straight through, SPL | a `transfer_checked` plus one account read |
| `send` opening a hold | two account creations and one transfer |
| `settle` | one transfer, at most one account creation, two closes |

## Differential check against the frontend

The web app truncates addresses and validates public keys itself. Once the
program exists, add a test that a set of random keys truncates identically in
the program's client library and in the JavaScript helper in `config/config.js`,
and that `isPublicKey` in `config/solana.js` accepts exactly the keys
`PublicKey` accepts, so a display in the app can never disagree with one derived
from chain state.

## What is not covered yet

No formal verification is planned. No audit has been scheduled. When either
happens this page should record who, what version and what was found. Until it
does, this suite is all there is.

Next: [Frontend integration](../integration/frontend.md).
