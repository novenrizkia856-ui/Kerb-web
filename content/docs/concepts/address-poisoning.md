# Address poisoning

## The attack

A Solana address is a 32 byte public key, written in base58 as 32 to 44
characters. Almost no interface shows all of them. Wallets, explorers and
dashboards truncate, because forty odd characters do not fit and nobody reads
them anyway. The usual display is the first four characters, an ellipsis, and
the last four:

```
example address, not a deployment

ZtQWM4ZkTjPu3yo5EWyQgbJJzstEfc7THPKmxFUsvWN     what the chain stores
ZtQW…svWN                                       what you are shown
```

Address poisoning attacks that truncation directly. The attacker generates a
vanity key whose **first characters and last characters match one of yours**,
leaving the middle, the part no interface displays, completely different. Then
they send you something worthless: a single lamport, a spam token, a transfer
of an amount too small to notice.

That transfer does one thing, and it is the only thing it needs to do. It puts
the attacker's address **into your transaction history**, sitting right next to
the real one, rendered identically.

Days later you go to repeat a transfer. You open your history, you find the
entry, you copy the address, you paste it, you check the first four characters
and the last four, and they match. They match because they were built to match.

## Why it works

It works because of a gap between two things:

| What the chain stores | What you compare |
|---|---|
| 32 bytes, 256 bits | 8 base58 characters, under 47 bits |

Finding a key that matches four characters at each end is not a cryptographic
break. It is a vanity search: generate keys until one fits. That takes real
compute, but it is priced in hours of rented GPU time, not in anything a user
would ever notice, and an attacker only has to pay it once per victim address.
The security of the full key is irrelevant, because the full key is not what the
human checks.

## The scale

| Figure | Meaning | Source |
|---|---|---|
| 270M | poisoning transactions measured | USENIX Security 2025 |
| 17M | distinct addresses targeted | USENIX Security 2025 |
| 3 of 53 | wallets that warn the user at all | Wallet security study 2025 |

Those measurements come from chains other than Solana. The mechanism they
measure, a truncated display and a history anyone can write to, is the same on
Solana, where sending a lamport or creating a token account for someone costs a
fraction of a cent.

The third number is the important one. This is not an exotic attack. It is a
well documented, industrial scale attack, and the overwhelming majority of
wallets render the poisoned entry exactly the same way they render the real one.

## Why the usual answers do not close it

**Checking more characters.** Asking users to compare all forty odd characters is
asking them to do something they will not do, and the attack simply moves to
whichever characters the new interface shows.

**Address books.** A manually maintained contact list works, right up until the
user adds an entry by copying it out of the poisoned history. The list inherits
the problem it was supposed to solve.

**Blocklists.** Someone has to publish the list, someone has to trust the
publisher, and the attacker generates a fresh key per victim. This also
reintroduces an authority, which is exactly what a noncustodial protocol is
trying to avoid.

**Warnings at signing time.** Better, and three wallets out of fifty three do
it. A warning still puts the decision in the same place it already failed: a
human comparing truncated strings under time pressure.

Kerb takes a different route. It does not try to tell a good address from a bad
one, because it cannot. It changes **when the decision becomes final**.

Next: [The asymmetry](the-asymmetry.md).
