# FAQ

## Custody and control

### Does Kerb hold my funds?

Only during a hold, and only funds you put there yourself. A transfer to an
address on your list never touches a Kerb account at all: it moves directly from
your wallet to the recipient in a single transfer.

During a hold the funds sit in an escrow account owned by the program. There is
no admin, no pause and no sweep instruction, so the only two ways value leaves
are `cancel` back to you and `settle` to the recipient.

### Can Kerb freeze my money?

Kerb cannot. There is no pause, no blocklist and no administrative role of any
kind, and the program has no instruction a third party can sign to affect your
funds. The only party who can stop a hold reaching its recipient is you, with
`cancel`, and only before `release_at`.

A token's own issuer is a different matter. A mint with a freeze authority can
freeze any account holding that token, including a Kerb escrow. See
[Assets](../implementation/assets.md).

### Does a stolen key mean Kerb protects me?

No. An attacker holding your key holds your authority. They can send, wait out
the dwell, settle, cancel anything you try to reclaim, set your dwell to the
minimum, and forget your real contacts. Kerb is not a recovery mechanism and
must never be described as one. See
[Threat model](../concepts/threat-model.md).

### Can somebody see who is on my list?

Yes. Every contact is a public account, and every Kerb transaction is public.
Anyone can read who has trusted whom, in either direction. Kerb provides no
privacy and nothing in its design should be read as providing any.

## The mechanism

### What if nobody calls settle?

Anyone can, including the recipient, and the Kerb app will do it automatically.
A hold that nobody settles sits in escrow indefinitely, which is why `settle` is
deliberately permissionless rather than restricted to the sender.

### Can I get my money back after the window closes?

No. The cutoff is hard. After `release_at` the funds belong to the recipient and
the only available action is `settle`. A soft cutoff was considered and rejected
because it would mean a recipient never reaches certainty. See
[The dwell window](../concepts/dwell-window.md).

### Why not just check the address more carefully?

Because the attack is built specifically to defeat that check. A poisoned
address is generated to match the characters your wallet shows you. Checking
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

Not today. There is no Kerb token, no airdrop, no points and no presale, and the
protocol does not need one to work. The site shows a token mint field reading
`Coming Soon`, which is a slot in the interface and not a commitment that a
token will exist.

### Is there a fee?

No. Not at the protocol level, not to a deployer, not on settle, not on cancel.
There is no fee recipient field in the program, so there is nothing anyone could
set one into.

### What does it cost to use?

Solana's transaction fee, to the network, plus refundable rent deposits. A
straight through transfer costs about what a plain transfer does. A held
transfer also deposits rent for the hold, and the vault for a token, and all of
it comes back when the hold closes. The first settlement to a new address keeps
one small deposit in your contact account, which `forget` returns. See
[State](../protocol/state.md) for the amounts.

## Tokens

### What happens with a token that charges a transfer fee?

The amount recorded is what actually arrived in escrow, not what was requested.
The fee is taken again on the way out, so a cancelled hold returns less than was
sent. The difference was withheld by the token and Kerb never had it. See
[Assets](../implementation/assets.md).

### Which tokens will Kerb refuse to hold?

Token-2022 mints with a transfer hook, a permanent delegate, or confidential
transfers. Each of them can move or block the escrowed tokens in ways Kerb
cannot account for. You can still send them straight through to an address
already on your list.

## Status

### Can I use Kerb for large amounts?

The program is not written, not audited and not deployed. Until it is, the
answer is no, and this page should not be read as encouragement. When it is
deployed the answer is still your own judgement, informed by whoever audited it.

### What does the app do right now?

It connects a Solana wallet, reads your SOL and token balances, and walks you
through a send up to the review. It does not ask your wallet to sign anything,
and nothing is sent, because there is no program to send to yet.

### What network does this run on?

Solana, `mainnet-beta` at launch. The program id will be published in
`config/kerb.config.json` in the web repository once deployment happens, and the
site reads it from there with no rebuild.

### Is it audited?

No. Nothing in this specification has been audited, and there is no
implementation to audit yet. When there is one, the
[Threat model](../concepts/threat-model.md) and
[Honest limits](limits.md) pages will record who, what version and what they
found.

Next: [Honest limits](limits.md).
