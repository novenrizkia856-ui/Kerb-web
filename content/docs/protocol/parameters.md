# Parameters

## Constants

These are compiled into the Kerb program as `const` and cannot be changed by
anybody once the program's upgrade authority is revoked, including whoever
deployed it. There is no setter, no governance and no config account that could
introduce one.

```rust
pub const DEFAULT_DWELL: u64 = 900;      // 15 minutes
pub const MIN_DWELL: u64 = 60;           // 1 minute
pub const MAX_DWELL: u64 = 604_800;      // 7 days
```

| Constant | Seconds | Why this value |
|---|---|---|
| `DEFAULT_DWELL` | 900 | Long enough to notice a mispaste from the confirmation screen or from the recipient saying nothing arrived. Short enough that a genuine first payment is not meaningfully delayed. |
| `MIN_DWELL` | 60 | Below a minute the window stops being a window. It exists so that a sender who wants Kerb mostly out of the way still gets a real chance to act. |
| `MAX_DWELL` | 604800 | A week is the longest a hold can sit before the recipient can be paid. Beyond that the escrow stops being a speed bump and starts being a liability. |

The same three values appear in the web configuration under `defaults`, where
they are used for display and validation only. The program is authoritative.

## Per sender dwell

```rust
pub fn set_dwell(ctx: Context<SetDwell>, dwell_seconds: u64) -> Result<()>;
```

`set_dwell` writes the signer's settings account, creating it on first use. It
fails with `DwellOutOfRange` unless `MIN_DWELL <= dwell_seconds <= MAX_DWELL`,
or `dwell_seconds == 0`.

Passing zero clears the override and returns the sender to the protocol default.
The settings account is closed in that case and its rent returned, since an
absent account and a zero override mean the same thing. The effective dwell is
resolved like this, on chain and off:

```rust
fn dwell_of(settings: Option<&Settings>) -> u64 {
    match settings {
        Some(s) if s.dwell_seconds != 0 => s.dwell_seconds,
        _ => DEFAULT_DWELL,
    }
}
```

Emits `DwellSet { sender, dwell_seconds }`.

## When the dwell is read

The dwell is read **once**, at the moment a hold is created, and baked into
`release_at`. Changing your dwell afterwards does not move any hold that is
already pending.

This matters. If the dwell were read at settle time instead, a sender could
extend a hold indefinitely to keep a recipient waiting, which turns a protection
into a griefing tool. Reading it once at creation means the recipient knows the
release time from the moment the hold appears and it cannot move.

```
send        dwell_of(sender) is read here, release_at is fixed
   |
set_dwell   no effect on the hold above
   |
settle      uses the release_at stored earlier
```

## Asset parameters

Almost none. Kerb has no per mint configuration: no allowlist, no blocklist, no
decimals table, no maximum amount. Any mint owned by the SPL Token program or
the Token-2022 program can be sent, subject to the extension rules in
[Assets](../implementation/assets.md), and SOL is addressed with the all zero
key.

There is exactly one minimum, and it is not a price. A SOL hold must be at least
the rent exempt minimum for an empty account, 890,880 lamports, because a
smaller amount can fail to land in a recipient account that holds nothing yet,
and a settlement that cannot land would strand the hold. The runtime sets that
number, not Kerb.

A value based minimum was considered as a mitigation for the dust trust risk and
rejected. Setting one requires knowing what a given token is worth, which
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

There is no fee recipient field in the program. Users pay Solana's transaction
fee to the network, optionally a priority fee, and refundable rent deposits for
the accounts they create. Nothing goes to Kerb. The absence is structural: there
is no field to set a fee into and no instruction that could set one. A
`TREASURY_ADDRESS` exists in the web configuration for the site's own use; the
program has no knowledge of it.

## Summary of what can change after deployment

| Thing | Who can change it | How |
|---|---|---|
| Your dwell | you | `set_dwell`, within the fixed bounds |
| Your trust list | you | by settling a transfer, or by `forget` |
| Your pending holds | you, and anyone for settle after release | `send`, `cancel`, `settle` |
| `DEFAULT_DWELL`, `MIN_DWELL`, `MAX_DWELL` | nobody | they are compile time constants |
| Fees | nobody | there are none to change |
| Program logic | nobody | the upgrade authority is revoked at deploy |

Next: [Events and errors](events-and-errors.md).
