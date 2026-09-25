# Parameters

## Constants

These are compiled into `KerbCore` as `constant` and cannot be changed by
anybody, including whoever deploys it. There is no setter, no governance and no
upgrade path that could introduce one.

```solidity
uint64 public constant DEFAULT_DWELL = 900;      // 15 minutes
uint64 public constant MIN_DWELL     = 60;       // 1 minute
uint64 public constant MAX_DWELL     = 604800;   // 7 days
```

| Constant | Seconds | Why this value |
|---|---|---|
| `DEFAULT_DWELL` | 900 | Long enough to notice a mispaste from the confirmation screen or from the recipient saying nothing arrived. Short enough that a genuine first payment is not meaningfully delayed. |
| `MIN_DWELL` | 60 | Below a minute the window stops being a window. It exists so that a sender who wants Kerb mostly out of the way still gets a real chance to act. |
| `MAX_DWELL` | 604800 | A week is the longest a hold can sit before the recipient can be paid. Beyond that the escrow stops being a speed bump and starts being a liability. |

The same three values appear in the web configuration under `defaults`, where
they are used for display and validation only. The contract is authoritative.

## Per sender dwell

```solidity
function setDwell(uint64 seconds_) external;
function dwellOf(address sender) public view returns (uint64);
```

`setDwell` writes `_dwell[msg.sender]`. It reverts with `DwellOutOfRange` unless
`MIN_DWELL <= seconds_ <= MAX_DWELL`, or `seconds_ == 0`.

Passing zero clears the override and returns the sender to the protocol default.
`dwellOf` resolves it:

```solidity
function dwellOf(address sender) public view returns (uint64) {
    uint64 d = _dwell[sender];
    return d == 0 ? DEFAULT_DWELL : d;
}
```

Emits `DwellSet(sender, seconds_)`.

## When the dwell is read

The dwell is read **once**, at the moment a hold is created, and baked into
`releaseAt`. Changing your dwell afterwards does not move any hold that is
already pending.

This matters. If the dwell were read at settle time instead, a sender could
extend a hold indefinitely to keep a recipient waiting, which turns a protection
into a griefing tool. Reading it once at creation means the recipient knows the
release time from the moment the hold appears and it cannot move.

```
send()      dwellOf(sender) is read here, releaseAt is fixed
   |
setDwell()  no effect on the hold above
   |
settle()    uses the releaseAt stored earlier
```

## Asset parameters

There are none. Kerb has no per asset configuration: no allowlist, no
blocklist, no decimals table, no minimum amount, no maximum amount. Any address
that behaves like an ERC20 can be sent, and the native asset is addressed as
`address(0)`.

A per asset minimum was considered as a mitigation for the dust trust risk and
rejected. Setting a minimum requires knowing what a given token is worth, which
requires a price feed, which requires an oracle. Kerb does not have one and
adding one would introduce exactly the kind of trusted external dependency the
protocol is built to avoid.

## Fees

There are none, at any layer.

```
protocol fee ......... 0
deployer fee ......... 0
settle fee ........... 0
cancel fee ........... 0
```

There is no fee recipient address in the contract. Users pay gas to the network
and nothing to Kerb. The absence is structural: there is no field to set a fee
into and no function that could set one.

## Summary of what can change after deployment

| Thing | Who can change it | How |
|---|---|---|
| Your dwell | you | `setDwell`, within the fixed bounds |
| Your trust list | you | by settling a transfer, or by `forget` |
| Your pending holds | you, and anyone for settle after release | `send`, `cancel`, `settle` |
| `DEFAULT_DWELL`, `MIN_DWELL`, `MAX_DWELL` | nobody | they are compile time constants |
| Fees | nobody | there are none to change |
| Contract logic | nobody | there is no upgrade path |

Next: [Events and errors](events-and-errors.md).
