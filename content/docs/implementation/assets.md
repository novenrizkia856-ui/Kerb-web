# Assets

Kerb handles the native asset and ERC20 tokens. There is no allowlist and no
blocklist. `address(0)` means native, anything else is treated as an ERC20.

## Native

| Path | Behaviour |
|---|---|
| `send`, straight through | `msg.value` must equal `amount`, forwarded to the recipient with a full gas `call`. A failure reverts. |
| `send`, new recipient | `msg.value` must equal `amount`, held by the contract. |
| `cancel` | Pushed back to the sender. A failure reverts. |
| `settle` | Pushed to the recipient. A failure credits `claimable` instead of reverting. |
| `claim` | Pushed to the caller. A failure reverts. |
| bare transfer to the contract | `receive()` reverts with `NativeNotAccepted`. |

`ValueMismatch` is raised when `msg.value != amount` on a native send, and
`NativeNotAccepted` when value is attached to an ERC20 send. Both are cheap
checks that prevent value entering the contract without a hold attached to it,
which would violate the solvency invariant with no way to recover it.

## Why settle falls back and the others do not

A recipient can be a contract that reverts on receipt, whether by design, by
running out of gas in its receive hook, or by being broken. If `settle` reverted
in that case, the hold could never be resolved: the window has closed so
`cancel` is illegal, and `settle` fails forever. The funds would be stuck with
no path out and no administrator to recover them.

So `settle` uses the pull pattern as a fallback:

```solidity
bool delivered = _tryPushNative(h.recipient, h.amount);
if (!delivered) _claimable[h.recipient][address(0)] += h.amount;
```

and emits `Settled(..., delivered: false)` so an interface can tell the
recipient to call `claim`.

`cancel` and `claim` do not fall back, because in both the caller is the party
receiving the funds and is present in the transaction. Reverting tells them
something is wrong. Silently parking the money in a balance they then have to
discover would be worse.

The straight through path in `send` also does not fall back, for the same
reason: the sender is present and can react.

## ERC20

All token movement goes through a `SafeERC20` style wrapper that tolerates
tokens which return nothing instead of a boolean, and reverts with
`TransferFailed` when a token returns false.

| Path | Call |
|---|---|
| `send`, straight through | `safeTransferFrom(sender, recipient, amount)`, the contract never holds it |
| `send`, new recipient | `safeTransferFrom(sender, address(this), amount)` |
| `cancel` | `safeTransfer(sender, amount)` |
| `settle` | `safeTransfer(recipient, amount)` |
| `claim` | `safeTransfer(caller, amount)` |

### Fee on transfer tokens

A token may deliver less than was requested. On the hold path the amount stored
is the balance actually received:

```solidity
uint256 before   = IERC20(asset).balanceOf(address(this));
IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
uint256 received = IERC20(asset).balanceOf(address(this)) - before;
if (received == 0) revert ZeroAmount();
```

Recording the requested amount instead would leave the contract owing more than
it holds the first time such a token was used, breaking solvency invariant 3.

The straight through path does not need this, because the token moves directly
between two external accounts and the contract is never in the middle.

**Consequence to document for users.** A held transfer of a fee on transfer
token settles for slightly less than was sent. Cancelling returns the reduced
amount, not the original, because the fee was taken by the token on the way in
and Kerb never had it.

### Rebasing tokens

A token whose balances change without transfers, such as a positive rebase, will
drift away from the amount recorded in the hold. Kerb stores an absolute amount,
not a share, so:

- A positive rebase leaves surplus in the contract that nobody can withdraw.
  There is no sweep function and no owner, so it stays there.
- A negative rebase can make the contract unable to pay out a hold in full. The
  transfer reverts and the hold stays pending until enough balance exists.

This is a known limitation and is not worked around. Supporting rebasing tokens
correctly means storing shares and tracking a per token index, which is a large
amount of machinery for a narrow case. **Do not use Kerb with rebasing tokens.**

### Tokens with unusual behaviour

| Token behaviour | Kerb outcome |
|---|---|
| Returns nothing on transfer | Handled by the SafeERC20 wrapper |
| Returns false on failure | `TransferFailed` |
| Fee on transfer | Handled, amount recorded is what arrived |
| Rebasing | Not supported, see above |
| Blocklists a recipient | `settle` reverts, hold stays pending until unblocked |
| Reverts on zero amount transfer | Unreachable, `ZeroAmount` is checked first |
| More than one address for the same token | Two different assets as far as Kerb is concerned, and two different holds |

The blocklist row is worth noting. A token that refuses to move to a sanctioned
or frozen recipient will make `settle` revert, and there is no fallback for
ERC20 because crediting `claimable` would not help, the token still refuses to
move. The hold stays pending indefinitely. The sender cannot cancel because the
window closed. This is a genuine trap and there is currently no clean answer to
it.

**Open question.** Whether ERC20 settlement should also use a try and credit
pattern, so a blocked recipient leaves a claimable balance rather than a stuck
hold. It does not solve the underlying problem, the recipient still cannot
receive, but it does move the funds out of the hold and into a balance that can
be claimed later if the block is lifted. Leaning toward adopting it. Not yet
specified.

## Decimals

Kerb never reads `decimals()` and never scales an amount. Values are stored and
moved exactly as given. Formatting is entirely the interface concern, and the
web configuration carries `token.decimals` for display only.

Next: [Security](security.md).
