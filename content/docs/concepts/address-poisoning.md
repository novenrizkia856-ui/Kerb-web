# Address poisoning

## The attack

An address on a public chain is twenty bytes shown as forty hexadecimal
characters. Almost no interface shows all forty. Wallets, explorers and block
scanners truncate, because forty characters do not fit and nobody reads them
anyway. The usual display is the first few characters, an ellipsis, and the last
few:

```
example address, not a deployment

0x71C7656EC7ab88b098defB751B7401B5f6d8976F     what the chain stores
0x71C7…976F                                    what you are shown
```

Address poisoning attacks that truncation directly. The attacker generates a
vanity address whose **first characters and last characters match one of yours**,
leaving the middle, the part no interface displays, completely different. Then
they send you something worthless: a zero value transfer, one wei, a spam token.

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
| 20 bytes, 160 bits of entropy | roughly 8 characters, 32 bits at best |

Finding an address that collides on the first six and last four hex characters
is not a cryptographic break. It is a search over a space small enough that
commodity hardware does it in seconds. The security of the full address is
irrelevant, because the full address is not what the human checks.

## The scale

| Figure | Meaning | Source |
|---|---|---|
| 270M | poisoning transactions measured | USENIX Security 2025 |
| 17M | distinct addresses targeted | USENIX Security 2025 |
| 3 of 53 | wallets that warn the user at all | Wallet security study 2025 |

The third number is the important one. This is not an exotic attack. It is a
well documented, industrial scale attack, and the overwhelming majority of
wallets render the poisoned entry exactly the same way they render the real one.

## Why the usual answers do not close it

**Checking more characters.** Asking users to compare all forty characters is
asking them to do something they will not do, and the attack simply moves to
whichever characters the new interface shows.

**Address books.** A manually maintained contact list works, right up until the
user adds an entry by copying it out of the poisoned history. The list inherits
the problem it was supposed to solve.

**Blocklists.** Someone has to publish the list, someone has to trust the
publisher, and the attacker generates a fresh address per victim. This also
reintroduces an authority, which is exactly what a noncustodial protocol is
trying to avoid.

**Warnings at signing time.** Better, and three wallets out of fifty three do
it. A warning still puts the decision in the same place it already failed: a
human comparing truncated strings under time pressure.

Kerb takes a different route. It does not try to tell a good address from a bad
one, because it cannot. It changes **when the decision becomes final**.

Next: [The asymmetry](the-asymmetry.md).
