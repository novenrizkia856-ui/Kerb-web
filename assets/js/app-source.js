/* app-source.js
   Two data sources behind one interface, so the shell in app.js does not
   branch on whether a wallet is connected more than it has to.

   `demoSource` is the walkthrough: invented contacts, a twenty second window,
   nothing signed, nothing sent, no network request at all. It is what a
   visitor sees before connecting, and the app is usable in that state on
   purpose.

   `walletSource` is a connected Solana wallet, read only. It reads the wallet's
   real SOL and SPL balances so the compose form offers what the wallet
   actually holds and the review checks the amount against it. It stops at the
   review: the Kerb program is not live on Solana, so there is nothing to send
   a transaction to, and this source has no method that would build, sign or
   send one. `executes: false` is how the shell knows to show the non-live
   state instead of moving on.

   Every method here either resolves with the shape the shell expects or throws
   with a message meant for a human to read. */

import { MOCK_CONTACTS, MOCK_DWELL_SECONDS, MOCK_TOKENS, isKnown } from './app-mock.js';
import { SOL, formatUnits, mintDecimals, parseUnits, solBalance, tokenBalances } from './solana-read.js';
import { mintLabel, tokenMint, tokenSymbol } from '../../config/solana.js';

function shortMint(mint) {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

/* --- demo -------------------------------------------------------------------- */

export function demoSource() {
  const contacts = MOCK_CONTACTS.map((c) => ({ ...c }));

  return {
    mode: 'demo',
    executes: true,
    account: '',
    dwellSeconds: MOCK_DWELL_SECONDS,

    tokens: async () => MOCK_TOKENS.map((t) => ({ key: t.symbol, label: t.symbol, symbol: t.symbol })),
    contacts: async () => contacts,
    isKnown: async (address) => isKnown(address),

    async preview({ amount, token }) {
      if (!/^\d*(\.\d*)?$/.test(amount) || !(Number(amount) > 0)) {
        throw new Error('Amount must be more than zero.');
      }
      return { text: `${amount} ${token.symbol}`, symbol: token.symbol };
    },

    /* Demo state only. The shell drives its own countdown and nothing leaves
       the page. */
    async submit({ to }) {
      return { kind: isKnown(to) ? 'direct' : 'held' };
    },

    remember(address) {
      if (contacts.some((c) => c.address === address)) return;
      contacts.push({ address, label: 'New contact', settledAt: 'just now' });
    },
  };
}

/* --- connected wallet, read only ------------------------------------------------ */

export function walletSource(config, account) {
  const kerbMint = tokenMint(config);

  async function readBalances() {
    const [lamports, spl] = await Promise.all([
      solBalance(config, account).catch((error) => {
        console.warn('[kerb.app] SOL balance could not be read:', error);
        return null;
      }),
      tokenBalances(config, account).catch((error) => {
        console.warn('[kerb.app] token balances could not be read:', error);
        return null;
      }),
    ]);
    return { lamports, spl };
  }

  return {
    mode: 'preview',
    executes: false,
    account,
    dwellSeconds: Number(config?.defaults?.dwellSeconds ?? 900),

    /* SOL first, the Kerb token second when a mint is configured, then
       whatever else the wallet holds, then a free entry for any other mint. */
    async tokens() {
      const { lamports, spl } = await readBalances();
      const withBalance = (symbol, amount, decimals) =>
        amount === null || decimals === null
          ? symbol
          : `${symbol} · ${formatUnits(amount, decimals, 4)}`;

      const list = [
        { key: 'SOL', symbol: SOL.symbol, label: withBalance(SOL.symbol, lamports, SOL.decimals) },
      ];

      if (kerbMint) {
        const held = spl?.find((t) => t.mint === kerbMint);
        list.push({
          key: kerbMint,
          mint: kerbMint,
          symbol: tokenSymbol(config),
          label: withBalance(tokenSymbol(config), held ? held.amount : spl ? 0n : null, held?.decimals ?? null),
        });
      }

      for (const t of spl ?? []) {
        if (t.mint === kerbMint) continue;
        const symbol = t.symbol || shortMint(t.mint);
        list.push({ key: t.mint, mint: t.mint, symbol, label: withBalance(symbol, t.amount, t.decimals) });
      }

      list.push({ key: 'custom', symbol: '', label: 'Other SPL token…' });
      return list;
    },

    /* The list lives in the Kerb program, and the program is not live, so
       there is no list to read. An empty list is the truth, not a fallback. */
    contacts: async () => [],
    isKnown: async () => false,

    /** Validates the send against the wallet's own balances and returns what
        the review shows. Reads fresh, so a balance that changed since the form
        was filled is the one checked. */
    async preview({ amount, token, to }) {
      if (to === account) throw new Error('That is your own address.');

      const { lamports, spl } = await readBalances();
      let decimals;
      let balance;
      let symbol;

      if (token.key === 'SOL') {
        ({ decimals } = SOL);
        symbol = SOL.symbol;
        balance = lamports;
      } else {
        const held = spl?.find((t) => t.mint === token.mint);
        symbol = token.symbol || mintLabel(config, token.mint) || shortMint(token.mint);
        if (held) {
          decimals = held.decimals;
          balance = held.amount;
        } else {
          decimals = await mintDecimals(config, token.mint).catch(() => null);
          if (decimals === null) throw new Error('That is not a token mint this network knows.');
          balance = spl ? 0n : null;
        }
      }

      const units = parseUnits(amount, decimals);
      if (units <= 0n) throw new Error('Amount must be more than zero.');
      if (balance !== null && units > balance) {
        throw new Error(`Not enough ${symbol}. You have ${formatUnits(balance, decimals)}.`);
      }

      return { text: `${amount} ${symbol}`, symbol };
    },

    remember() {
      /* The program would be the record. Nothing to remember locally, and a
         local copy would be a list the program never wrote. */
    },
  };
}
