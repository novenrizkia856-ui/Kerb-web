# FAQ

## Custody and control

### Does Kerb hold my funds?

Only during a hold, and only funds you put there yourself. A transfer to an
address on your list never touches the contract at all: for an ERC20 it moves
directly from you to the recipient in a single `transferFrom`.

During a hold the contract custodies the amount. There is no owner, no pause and
no sweep function, so the only two ways value leaves are `cancel` back to you
and `settle` to the recipient.

### Can Kerb freeze my money?

No. There is no pause, no blocklist and no administrative role of any kind. The
contract has no function that a third party can call to affect your funds. The
only party who can stop a hold reaching its recipient is you, with `cancel`, and
only before `releaseAt`.

### Does a stolen key mean Kerb protects me?

No. An attacker holding your key holds your authority. They can send, wait out
the dwell, settle, cancel anything you try to reclaim, set your dwell to the
minimum, and forget your real contacts. Kerb is not a recovery mechanism and
must never be described as one. See
[Threat model](../concepts/threat-model.md).

### Can somebody see who is on my list?

Yes. Kerb stores trust lists in public contract storage and emits public events.
Anyone can read who has trusted whom, in either direction. Kerb provides no
privacy and nothing in its design should be read as providing any.

## The mechanism

### What if nobody calls settle?

Anyone can, including the recipient, and the Kerb app does it automatically. A
hold that nobody settles sits in escrow indefinitely, which is why `settle` is
deliberately permissionless rather than restricted to the sender.

### Can I get my money back after the window closes?

No. The cutoff is hard. After `releaseAt` the funds belong to the recipient and
the only available action is `settle`. A soft cutoff was considered and rejected
because it would mean a recipient never reaches certainty. See
[The dwell window](../concepts/dwell-window.md).

### Why not just check the address more carefully?

Because the attack is built specifically to defeat that check. A poisoned
address is generated to match the characters your interface shows you. Checking
harder means checking more characters, and the attack moves to whichever
characters the new interface displays. Kerb avoids the comparison entirely.

### Why can I not just add an address to my list directly?

Because the whole claim would collapse. "Written only by your completed sends"
is a strong property. "Written by your completed sends, or by anything that can
get you to sign one more transaction" is not, and an attacker who can get you to
paste an address into a send field can get you to paste it into a trust field
just as easily. See [The asymmetry](../concepts/the-asymmetry.md).

## Cost

### Is there a token?

No. There is no Kerb token, no airdrop, no points, no supply and no presale. The
site shows a token contract address field reading `Coming Soon`, which is a
placeholder in the interface and not a commitment that one will exist.

### Is there a fee?

No. Not at the protocol level, not to a deployer, not on settle, not on cancel.
There is no fee recipient address in the contract, so there is no field anyone
could set one into.

### What does it cost to use?

Gas, to the network. A straight through transfer should cost close to a bare
transfer plus one storage read. A held transfer costs the escrow write, and the
later settle recovers much of that through the storage refund when the hold is
deleted.

## Tokens

### What happens with a fee on transfer token?

The amount recorded is what actually arrived, not what was requested, so a
cancelled hold returns the reduced amount. The difference was taken by the token
on the way in and Kerb never had it. See [Assets](../implementation/assets.md).

### What about rebasing tokens?

Do not use them with Kerb. Amounts are stored absolutely rather than as shares,
so a rebase drifts the hold away from the contract balance in either direction.
This is a documented limitation, not a bug to be worked around later.

## Status

### Can I use Kerb for large amounts?

The contracts are not audited and not deployed. Until they are, the answer is
no, and this page should not be read as encouragement. When they are deployed
the answer is still your own judgement, informed by whoever audited them.

### What chain does this run on?

Robinhood Chain, chain id 4663. Addresses are published in
`config/kerb.config.json` in the web repository once deployment happens, and the
site reads them from there with no rebuild.

### Is it audited?

No. Nothing in this specification has been audited, and there is no
implementation to audit yet. When there is one, the
[Threat model](../concepts/threat-model.md) and
[Honest limits](limits.md) pages will record who, what version and what they
found.

Next: [Honest limits](limits.md).
