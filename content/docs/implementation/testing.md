# Testing

`KerbCore` cannot be upgraded or paused. There is no path from a discovered bug
to a fix, only a path to abandoning the deployment. That makes the test suite
the main line of defence rather than a formality, and it should be written
before the contract is considered done.

Suggested stack: Foundry, for `forge test`, `forge fuzz` and `forge invariant`.

## Unit tests

### send, straight through

- Native to a trusted recipient moves the exact value and writes no storage
- ERC20 to a trusted recipient calls `transferFrom` sender to recipient directly
- Returns `bytes32(0)`
- Emits `Sent` with the right arguments
- Reverts `ValueMismatch` when `msg.value != amount` for native
- Reverts `NativeNotAccepted` when value is attached to an ERC20 send
- Reverts on a failing native push rather than falling back

### send, new recipient

- Creates a hold with `releaseAt == block.timestamp + dwellOf(sender)`
- Adds the id to the sender pending set
- Emits `Held`
- Reverts `HoldPending` on a second send to the same triple
- Allows a second send to the same recipient with a different asset
- Records the received amount, not the requested amount, for a fee on transfer token
- Reverts `ZeroRecipient`, `SelfSend`, `ZeroAmount` on each bad input

### cancel

- Only the sender can call it
- Reverts `WindowClosed` at exactly `releaseAt`
- Succeeds at `releaseAt - 1`
- Returns the full held amount
- Deletes the hold and removes it from the pending set
- Does **not** add the recipient to the trust list
- Reverts `HoldNotFound` on a second cancel

### settle

- Anyone can call it, tested from a third address
- Reverts `WindowOpen` at `releaseAt - 1`
- Succeeds at exactly `releaseAt`
- Delivers the full amount
- Adds the recipient to the trust list and emits `Trusted` once
- A second settlement to the same recipient does not emit `Trusted` again
- Reverts `HoldNotFound` on a second settle
- Native push to a rejecting contract credits `claimable` and emits
  `Settled(delivered: false)` rather than reverting

### forget, setDwell, claim

- `forget` removes and emits, and is a silent no op on an absent entry
- After `forget`, the next send to that recipient opens a hold again
- `setDwell` accepts the bounds exactly, rejects one below `MIN_DWELL` and one
  above `MAX_DWELL`
- `setDwell(0)` clears the override and `dwellOf` returns `DEFAULT_DWELL`
- A dwell change does not move the `releaseAt` of an existing hold
- `claim` zeroes the balance before pushing, reverts `NothingToClaim` at zero

## Property and invariant tests

Run these under `forge invariant` with a handler that randomly calls `send`,
`cancel`, `settle`, `forget`, `setDwell` and `claim` across several actors, a
native asset and at least two token types.

| # | Property |
|---|---|
| 1 | No hold ever has a status other than none or pending after a call returns |
| 2 | `_pending[s]` contains exactly the ids of pending holds whose sender is `s` |
| 3 | **Solvency.** For each asset, contract balance is at least the sum of pending amounts plus claimable balances |
| 4 | A recipient appears in `_trusted[s]` only if a settle happened for that pair, and disappears only through `forget` |
| 5 | `_dwell[s]` is zero or inside the bounds |
| 6 | An actor cannot change any other actor trust list, dwell, holds or claimable balance |
| 7 | Total value in is equal to total value out plus what is still held |

Property 3 is the one that matters most. Property 6 is the one that expresses
the entire security claim of the protocol and should be asserted after every
single handler call.

## Fuzz targets

- `send` with fuzzed amounts across the full `uint256` range against a token
  with a fuzzed total supply
- `setDwell` across the full `uint64` range, asserting only the bounds are
  accepted
- Time warping between send and settle across a wide range, asserting the
  boundary at exactly `releaseAt`
- Fee on transfer tokens with a fuzzed fee from 0 to 100 percent, asserting the
  stored amount always equals the delta

## Adversarial tests

Write a malicious recipient contract that, on receiving native value, attempts
each of:

- `settle` on the same hold id
- `settle` on a different pending hold
- `cancel` on the hold being settled
- `send` back to the original sender
- `forget` on its own list
- `claim`

None may succeed in extracting more than the hold amount, and the solvency
invariant must hold afterwards.

Also test a recipient that consumes all forwarded gas, and one that reverts
unconditionally, confirming the `claimable` fallback rather than a revert.

## Gas targets

Not correctness, but worth measuring and keeping honest, since the straight
through path being cheap is part of the argument for using Kerb at all.

| Path | Target |
|---|---|
| `send` straight through, native | bare transfer plus one cold SLOAD |
| `send` straight through, ERC20 | bare `transferFrom` plus one cold SLOAD |
| `send` opening a hold | four storage writes plus one set insertion |
| `settle` | the write cost largely refunded by the delete |

## Differential check against the frontend

The web app computes the same truncation and the same `willHold` decision that
the contracts do. Once the contracts exist, add a test that a set of random
addresses truncates identically in Solidity and in the JavaScript helper in
`config/config.js`, so a display in the app can never disagree with a display
derived from chain state.

## What is not covered yet

No formal verification is planned. No audit has been scheduled. When either
happens this page should record who, what version and what was found. Until it
does, this suite is all there is.

Next: [Frontend integration](../integration/frontend.md).
