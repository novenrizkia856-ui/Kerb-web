# Glossary

**Address poisoning.** An attack that places an address resembling one of yours
into your transaction history, so that a later copy and paste sends funds to the
attacker. Resemblance is engineered on the characters interfaces display and not
on the ones they hide. See [Address poisoning](../concepts/address-poisoning.md).

**Claim.** An account holding tokens owed to a recipient whose token account was
frozen at settlement. Withdrawn with `claim`, into any other account the
recipient owns. Exists so a frozen recipient account cannot leave a hold
permanently unresolvable.

**Contact.** The account that records one recipient on one sender's trust list,
at the address derived from `("contact", sender, recipient)`. The recipient is
trusted exactly when this account exists.

**Dwell.** The length of the cancellation window, in seconds. Defaults to 900
and can be set per sender between `MIN_DWELL` and `MAX_DWELL`. Read once, when a
hold is created. See [Parameters](../protocol/parameters.md).

**Forget.** Removing a recipient from your trust list by closing its contact
account. The only way out. After forgetting, the next transfer to that address
opens a hold again.

**Hold.** A transfer sitting in escrow during its dwell window. An account at
the address derived from `("hold", sender, recipient, mint)`, closed the moment
it settles or is cancelled.

**Lamport.** The smallest unit of SOL. One SOL is 1,000,000,000 lamports.

**Mint.** The account that defines an SPL token. Kerb addresses SOL with the all
zero key in the mint position, and reads no metadata from a mint beyond what
`transfer_checked` needs.

**PDA.** Program derived address. An address computed from seeds and a program
id, with no private key, that only that program can sign for. Every Kerb account
is one.

**Program.** Solana's term for deployed on chain code. Kerb is one program, not
yet deployed. See [The Kerb program](../implementation/core.md).

**Program id.** The address a program is deployed at. Kerb has none yet, and the
web configuration's `KERB_PROGRAM_ID` is empty until it does.

**Push and pull.** A push sends value to a recipient directly. A pull records
that value is owed and waits for the recipient to withdraw. Kerb pushes
everywhere and falls back to pull only when a recipient's token account is
frozen at settlement.

**Quote.** A client side read answering whether a proposed transfer would be
held, for how long, and whether something is already pending for the same
triple. What a compose screen runs as the user types. See
[Reading state](../implementation/lens.md).

**release_at.** The unix timestamp a hold stops being cancellable and starts
being settleable. Fixed from the cluster clock when the hold is created and never
moves afterwards, including when the sender changes their dwell.

**Rent.** The refundable deposit an account must hold to exist. Kerb's accounts
are rent exempt, and every deposit returns to the key that funded it when the
account closes.

**Settle.** Completing a hold after its window closes. Permissionless, so the
recipient never depends on the sender. Delivers the funds and adds the recipient
to the sender's trust list.

**SPL token.** A token under the SPL Token program or Token-2022. See
[Assets](../implementation/assets.md) for which Token-2022 extensions Kerb holds
and which it refuses.

**Straight through.** A transfer to a recipient already on your list. No escrow,
no hold, no wait, one instruction, no account created.

**Trust list.** The set of recipients a sender has settled a transfer to.
Written only by settlement, removed only by `forget`, and readable by anyone.
See [The trust list](../concepts/trust-list.md).

**Trusted.** An address on your trust list. Note that this word describes a
mechanical fact, that you have completed a transfer to this address before, and
not a judgement about the address or whoever controls it.

**Upgrade authority.** The key that can replace a deployed program's code. Kerb's
is revoked at deploy, so nobody can change the program. See
[Security](../implementation/security.md).

**Window.** Used interchangeably with dwell window. The period between a hold
opening and `release_at`.

Next: [FAQ](faq.md).
