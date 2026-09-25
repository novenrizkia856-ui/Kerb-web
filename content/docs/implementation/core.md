# KerbCore

The only contract that holds state or custodies value.

## Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKerbCore {
    // --- constants -----------------------------------------------------
    function DEFAULT_DWELL() external view returns (uint64);
    function MIN_DWELL()     external view returns (uint64);
    function MAX_DWELL()     external view returns (uint64);

    // --- writes --------------------------------------------------------
    function send(address recipient, address asset, uint256 amount)
        external payable returns (bytes32 holdId);

    function cancel(bytes32 holdId) external;
    function settle(bytes32 holdId) external;
    function forget(address recipient) external;
    function setDwell(uint64 dwellSeconds) external;
    function claim(address asset) external;

    // --- reads ---------------------------------------------------------
    function holdIdOf(address sender, address recipient, address asset)
        external pure returns (bytes32);

    function holdOf(bytes32 holdId) external view returns (
        address sender, address recipient, address asset,
        uint256 amount, uint64 releaseAt, uint8 status
    );

    function isTrusted(address sender, address recipient) external view returns (bool);
    function trustedCount(address sender) external view returns (uint256);
    function trustedAt(address sender, uint256 index) external view returns (address);
    function pendingCount(address sender) external view returns (uint256);
    function pendingAt(address sender, uint256 index) external view returns (bytes32);
    function dwellOf(address sender) external view returns (uint64);
    function claimableOf(address recipient, address asset) external view returns (uint256);
}
```

`address asset` is `address(0)` for the native asset, and the token address for
an ERC20.

## send

```solidity
function send(address recipient, address asset, uint256 amount)
    external payable nonReentrant returns (bytes32 holdId)
{
    if (recipient == address(0))  revert ZeroRecipient();
    if (recipient == msg.sender)  revert SelfSend();
    if (amount == 0)              revert ZeroAmount();

    bool native = asset == address(0);
    if (native) {
        if (msg.value != amount) revert ValueMismatch();
    } else {
        if (msg.value != 0)      revert NativeNotAccepted();
    }

    if (_trusted[msg.sender].contains(recipient)) {
        // straight through, no storage written
        if (native) {
            _pushNative(recipient, amount);   // reverts on failure, see below
        } else {
            IERC20(asset).safeTransferFrom(msg.sender, recipient, amount);
        }
        emit Sent(msg.sender, recipient, asset, amount);
        return bytes32(0);
    }

    holdId = holdIdOf(msg.sender, recipient, asset);
    if (_holds[holdId].status == STATUS_PENDING) revert HoldPending();

    uint256 received = amount;
    if (!native) {
        uint256 before = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        received = IERC20(asset).balanceOf(address(this)) - before;
        if (received == 0) revert ZeroAmount();
    }

    uint64 releaseAt = uint64(block.timestamp) + dwellOf(msg.sender);

    _holds[holdId] = Hold({
        sender:    msg.sender,
        releaseAt: releaseAt,
        status:    STATUS_PENDING,
        recipient: recipient,
        asset:     asset,
        amount:    received
    });
    _pending[msg.sender].add(holdId);

    emit Held(holdId, msg.sender, recipient, asset, received, releaseAt);
}
```

Three details worth defending.

**`received` rather than `amount`.** A fee on transfer token delivers less than
was requested. Recording the requested amount would make the contract insolvent
against invariant 3 the moment such a token is used. Measuring the balance delta
is the only correct thing to do here. See [Assets](assets.md).

**The straight through path does not touch the contract.** For an ERC20 it is a
single `transferFrom` from sender to recipient. `KerbCore` never holds the
token, so it cannot lose it, and the gas is close to a bare transfer.

**A failed native push on the straight through path reverts.** It does not fall
back to `claimable`. On this path the sender is present and can react, so
failing loudly is better than quietly parking value in a contract.

## cancel

```solidity
function cancel(bytes32 holdId) external nonReentrant {
    Hold memory h = _holds[holdId];
    if (h.status != STATUS_PENDING)         revert HoldNotFound();
    if (h.sender != msg.sender)             revert NotSender();
    if (block.timestamp >= h.releaseAt)     revert WindowClosed();

    _pending[h.sender].remove(holdId);
    delete _holds[holdId];

    if (h.asset == address(0)) {
        _pushNative(h.sender, h.amount);
    } else {
        IERC20(h.asset).safeTransfer(h.sender, h.amount);
    }

    emit Cancelled(holdId, h.sender, h.recipient, h.asset, h.amount);
}
```

State is cleared before value moves. A reentrant call arriving during the
refund finds `STATUS_NONE` and reverts with `HoldNotFound`, so the guard is
belt and braces rather than the only defence.

A failed native refund on cancel reverts rather than falling back. The sender
asked for their money back and is present in the transaction, so a silent
fallback would hide a problem they need to know about.

## settle

```solidity
function settle(bytes32 holdId) external nonReentrant {
    Hold memory h = _holds[holdId];
    if (h.status != STATUS_PENDING)     revert HoldNotFound();
    if (block.timestamp < h.releaseAt)  revert WindowOpen();

    _pending[h.sender].remove(holdId);
    delete _holds[holdId];

    if (_trusted[h.sender].add(h.recipient)) {
        emit Trusted(h.sender, h.recipient);
    }

    bool delivered = true;
    if (h.asset == address(0)) {
        delivered = _tryPushNative(h.recipient, h.amount);
        if (!delivered) _claimable[h.recipient][address(0)] += h.amount;
    } else {
        IERC20(h.asset).safeTransfer(h.recipient, h.amount);
    }

    emit Settled(holdId, h.sender, h.recipient, h.asset, h.amount, delivered);
}
```

`settle` is permissionless on purpose. The recipient must never need the sender
to cooperate in order to be paid, and a hold whose only settler was the sender
would be a hold the sender could abandon.

`_trusted.add` returns whether the element was newly inserted, so `Trusted` is
emitted exactly once per address per sender. See
[Events and errors](../protocol/events-and-errors.md).

## forget, setDwell, claim

```solidity
function forget(address recipient) external {
    if (_trusted[msg.sender].remove(recipient)) {
        emit Forgotten(msg.sender, recipient);
    }
}

function setDwell(uint64 dwellSeconds) external {
    if (dwellSeconds != 0 && (dwellSeconds < MIN_DWELL || dwellSeconds > MAX_DWELL)) {
        revert DwellOutOfRange();
    }
    _dwell[msg.sender] = dwellSeconds;
    emit DwellSet(msg.sender, dwellSeconds);
}

function claim(address asset) external nonReentrant {
    uint256 amount = _claimable[msg.sender][asset];
    if (amount == 0) revert NothingToClaim();
    _claimable[msg.sender][asset] = 0;

    if (asset == address(0)) {
        _pushNative(msg.sender, amount);
    } else {
        IERC20(asset).safeTransfer(msg.sender, amount);
    }
    emit Claimed(msg.sender, asset, amount);
}
```

`forget` is a no op on an absent entry, and emits nothing in that case.

## Native transfer helpers

```solidity
function _tryPushNative(address to, uint256 amount) private returns (bool ok) {
    (ok, ) = to.call{value: amount}("");
}

function _pushNative(address to, uint256 amount) private {
    if (!_tryPushNative(to, amount)) revert TransferFailed();
}
```

A full gas `call` is used rather than `transfer` or `send`. The 2300 gas stipend
is a historical artefact that breaks legitimate recipient contracts, and the
reentrancy it was meant to prevent is handled here by clearing state first and
by the guard.

## Receive

```solidity
receive() external payable {
    revert NativeNotAccepted();
}
```

The contract must not accept a bare transfer. Native value only enters through
`send`, where it is attached to a hold. Anything else would be untracked against
invariant 3 and unrecoverable, since there is no sweep function and no owner.

Next: [KerbLens](lens.md).
