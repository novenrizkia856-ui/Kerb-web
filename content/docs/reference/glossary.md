# Glossary

**Address poisoning.** An attack that places an address resembling one of yours
into your transaction history, so that a later copy and paste sends funds to the
attacker. Resemblance is engineered on the characters interfaces display and not
on the ones they hide. See [Address poisoning](../concepts/address-poisoning.md).

**Asset.** What is being moved. `address(0)` for the native asset, otherwise an
ERC20 token address. Kerb reads no metadata from a token and never scales an
amount.

**Claimable.** A balance owed to a recipient after a native push failed during
settlement. Withdrawn with `claim`. Exists so a recipient contract that rejects
a push cannot leave a hold permanently unresolvable.

**Dwell.** The length of the cancellation window, in seconds. Defaults to 900
and can be set per sender between `MIN_DWELL` and `MAX_DWELL`. Read once, when a
hold is created. See [Parameters](../protocol/parameters.md).

**Forget.** Removing a recipient from your trust list. The only way out. After
forgetting, the next transfer to that address opens a hold again.

**Hold.** A transfer sitting in escrow during its dwell window. Identified by
`holdId`, deleted from storage the moment it settles or is cancelled.

**holdId.** `keccak256(abi.encode(sender, recipient, asset))`. Derivable
offchain before a transaction is sent, stable across time, and scoped to the
sender so two senders can never collide.

**KerbCore.** The contract holding all state and all value. No owner, no pause,
no upgrade path, no fee. See [KerbCore](../implementation/core.md).

**KerbLens.** A stateless read contract that shapes `KerbCore` storage into the
queries an interface needs. Replaceable without touching `KerbCore`.

**Pending.** The single non terminal hold status. Settled and cancelled holds
are deleted rather than stored, so pending is the only status ever read from
storage.

**Push and pull.** A push sends value to a recipient directly. A pull records
that value is owed and waits for the recipient to withdraw. Kerb pushes
everywhere and falls back to pull only when a native push fails during
settlement.

**Quote.** A `KerbLens` read answering whether a proposed transfer would be
held, for how long, and whether something is already pending for the same
triple. What a compose screen calls as the user types.

**releaseAt.** The timestamp a hold stops being cancellable and starts being
settleable. Fixed when the hold is created and never moves afterwards, including
when the sender changes their dwell.

**Settle.** Completing a hold after its window closes. Permissionless, so the
recipient never depends on the sender. Delivers the funds and appends the
recipient to the sender trust list.

**Straight through.** A transfer to a recipient already on your list. No escrow,
no hold, no wait, one transaction, no storage written.

**Trust list.** The set of recipients a sender has settled a transfer to.
Written only by settlement, removed only by `forget`, and readable by anyone.
See [The trust list](../concepts/trust-list.md).

**Trusted.** An address on your trust list. Note that this word describes a
mechanical fact, that you have completed a transfer to this address before, and
not a judgement about the address or whoever controls it.

**Window.** Used interchangeably with dwell window. The period between a hold
opening and `releaseAt`.

Next: [FAQ](faq.md).
