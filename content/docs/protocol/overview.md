# Protocol overview

## Two contracts

| Contract | Role | State | Deployed |
|---|---|---|---|
| `KerbCore` | Everything that writes. Escrow, holds, trust lists, dwell settings | yes | once, immutable |
| `KerbLens` | Everything that reads. Derived views for wallets and frontends | no | once, immutable |

The split exists so the read surface can be rich without making the write
surface large. `KerbLens` holds no state, custodies nothing, and can be
redeployed without touching `KerbCore` if a better read shape is wanted later.
`KerbCore` cannot be redeployed in any meaningful sense, because the trust lists
live in it.

## What KerbCore has, and does not have

```solidity
contract KerbCore {
    // no owner
    // no admin role
    // no pause
    // no upgrade path, no proxy, no delegatecall
    // no fee, no fee recipient, no treasury
    // no oracle, no price feed
    // no token
    // no external dependency beyond the ERC20 interface
}
```

Every one of those absences is load bearing. A pause function is a key that can
freeze your funds. A fee recipient is an address that must be trusted. An
upgrade path is permission to replace the rules after you have relied on them.
The Kerb claim is that the only key affecting your Kerb state is your own, and
each of these would falsify it.

The practical consequence is that a bug cannot be patched. It can only be
abandoned, by everyone moving to a new deployment and rebuilding their trust
lists through fresh settled transfers. That trade is made deliberately and is
why [Testing](../implementation/testing.md) is specified as tightly as it is.

## Data ownership

```
KerbCore
  |
  +-- per sender
  |     +-- dwell override            uint64, zero means use the protocol default
  |     +-- trusted recipients        set of addresses
  |     +-- pending hold ids          set of bytes32
  |
  +-- per hold, keyed by holdId
  |     +-- sender, recipient, asset, amount, releaseAt, status
  |
  +-- per recipient and asset
        +-- claimable balance         the pull fallback, see Assets
```

Nothing is keyed globally except the holds mapping, and a hold id is derived
from the sender, so no two senders can collide.

## The write surface

Six functions. That is the entire mutable interface.

| Function | Caller | Effect |
|---|---|---|
| `send` | anyone | moves funds straight through, or opens a hold |
| `cancel` | the hold sender, before `releaseAt` | returns funds, trusts nothing |
| `settle` | anyone, at or after `releaseAt` | delivers funds, appends to the sender list |
| `forget` | anyone, for their own list | removes a recipient from the caller list |
| `setDwell` | anyone, for themselves | sets the caller dwell inside the fixed bounds |
| `claim` | a recipient owed a failed push | withdraws the pull fallback balance |

Full signatures and semantics are in [KerbCore](../implementation/core.md).

## The read surface

`KerbCore` exposes its mappings as public getters. `KerbLens` wraps them in the
shapes an interface actually wants: will this send be held, when would it
release, what is on my list, what is pending. See
[KerbLens](../implementation/lens.md).

## Chain

| Field | Value |
|---|---|
| Network | Robinhood Chain |
| Chain id | 4663 |
| Native currency | ETH, 18 decimals |

Addresses will be published in `config/kerb.config.json` in the web repository
once deployment happens. The site renders `Coming Soon` and `Not deployed` until
then, and nothing in the codebase hardcodes an address.

Next: [Transfer lifecycle](lifecycle.md).
