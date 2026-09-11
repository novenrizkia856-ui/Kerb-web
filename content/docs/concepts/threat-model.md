# Threat model

## Assumptions

Kerb assumes all of the following. If one is false, its guarantees do not hold.

| Assumption | If it fails |
|---|---|
| Your signing key is not compromised | Kerb provides nothing. See below. |
| The chain does not reorganise past the dwell window | A settled transfer could be rewritten |
| `block.timestamp` is accurate within a few seconds | The window is slightly shorter or longer than intended |
| You look at your wallet within the dwell | You never exercise the cancel you were given |
| The contract is deployed as specified and not upgraded | It cannot be, there is no upgrade path |

## What Kerb defends against

**Address poisoning.** The primary target. A lookalike address copied out of a
poisoned history is, by construction, an address you have never settled a
transfer to. It gets a hold. You get a window.

**Mistyped and misread addresses.** Not the design goal, but it falls out for
free. Any first transfer to any address you have not used before is held,
whatever the reason it is wrong.

**Clipboard hijacking malware.** Malware that swaps the address on paste
produces an address you have never sent to. Held. Note that this only helps if
the malware is not also able to sign, which takes you back to the key
assumption.

**A wrong address that looks right in every interface you have.** This is the
case the whole design exists for. Kerb never has to tell the difference, because
it only has to tell that the address is new.

## What Kerb does not defend against

**A stolen key.** An attacker with your key can send, wait out the dwell, and
settle. They can also cancel anything you try to reclaim, set your dwell to the
sixty second minimum, and call `forget` on your real contacts. A dwell window is
a delay on your own authority, and a thief holding your key holds your
authority. Kerb is not a recovery mechanism and must never be described as one.

**Sending around it.** Kerb is a contract you choose to call. A plain transfer
from your wallet to any address is unaffected by it and always available. It is
a speed bump you opt into, not a gate on your account.

**A trusted recipient who turns hostile.** Once an address is on your list,
transfers to it are immediate. If the counterparty behind that address becomes
an adversary, Kerb will not slow you down. `forget` is the remedy and it is
manual.

**The dust trust path.** Covered in detail under
[The trust list](trust-list.md). A tiny settled transfer trusts an address as
completely as a large one.

**Malicious or broken recipient contracts.** A recipient that reverts on receipt
cannot be paid by a push transfer. Kerb handles this with a pull fallback rather
than letting `settle` revert forever, described in
[Assets](../implementation/assets.md). Funds are not lost but the recipient has
to claim them.

**Anything about what the recipient does next.** Kerb moves value to an address.
It has no view on the address's behaviour afterwards.

## Adversaries considered

### An attacker who can write to your history

The base case. Cheap, industrial, already happening at the scale of hundreds of
millions of transactions. **Mitigated**, because writing to your history does
not write to your list.

### An attacker who can front run

`settle` is permissionless. An attacker who front runs a settle achieves
delivering the recipient's funds to the recipient slightly sooner. There is no
extractable value in the ordering. `cancel` is restricted to the sender, so it
cannot be front run by a third party. **Not exploitable.**

### An attacker who wants to grief you

They cannot open a hold on your behalf: `send` derives the sender from
`msg.sender` and requires the caller to supply the funds. They cannot add to
your list. They cannot cancel your holds. They cannot extend your dwell. The
attack surface for griefing is close to empty, because nothing about your state
is writable by anyone but you.

The one exception is the dust trust path, which requires you to sign.

### A validator nudging the clock

`block.timestamp` can be moved by a small amount by whoever builds the block.
Against a dwell measured in minutes, a shift of seconds is immaterial. Kerb does
not use timestamps for anything finer grained.

### A reorg

If the chain reorganises past a settlement, that settlement is rewritten along
with everything else in the reorganised range. This is not specific to Kerb.
Frontends should treat a settlement as final only after the chain's usual
finality assumption.

## Not audited

Nothing in this specification has been audited. There is no implementation yet
to audit. When there is one, this page will say who audited it, what version,
and what they found. Until it does, assume nothing here has been checked by
anyone other than its authors.

Next: [Protocol overview](../protocol/overview.md).
