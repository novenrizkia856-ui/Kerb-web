/* app-source.js
   Two data sources behind one interface, so the shell in app.js does not
   branch on whether a wallet is connected.

   `demoSource` is the old mock: invented contacts, a twenty second window,
   nothing signed. It is what a visitor sees before connecting, and the app is
   usable in that state on purpose.

   `chainSource` is the deployed contracts. Same method names, same shapes, real
   money.

   Keeping them the same shape is what stops the live path from being a second,
   less tested app bolted to the side of the first one. Every method here either
   resolves with the shape the shell expects or throws with a message meant for a
   human to read. */

import { MOCK_CONTACTS, MOCK_DWELL_SECONDS, MOCK_TOKENS, isKnown } from './app-mock.js';
import * as kerb from './kerb.js';
import { parseUnits, formatUnits } from './abi.js';

/* --- demo -------------------------------------------------------------------- */

export function demoSource() {
  const contacts = MOCK_CONTACTS.map((c) => ({ ...c }));

  return {
    live: false,
    dwellSeconds: MOCK_DWELL_SECONDS,

    now: async () => Math.floor(Date.now() / 1000),
    tokens: async () => MOCK_TOKENS.map((t) => ({ ...t, address: '' })),
    contacts: async () => contacts,
    pendings: async () => [],
    isKnown: async (address) => isKnown(address),

    async preview({ amount, token }) {
      return { text: `${amount} ${token}`, amount };
    },

    /* Nothing is signed, so the shell drives its own countdown. */
    async submit({ to }) {
      return { kind: isKnown(to) ? 'direct' : 'held', id: null, demo: true };
    },

    async cancel() {
      return { ok: true };
    },

    async settle() {
      return { ok: true };
    },

    remember(address) {
      if (contacts.some((c) => c.address.toLowerCase() === address.toLowerCase())) return;
      contacts.push({ address, label: 'New contact', settledAt: 'just now' });
    },
  };
}

/* --- chain ------------------------------------------------------------------- */

export function chainSource(config, account) {
  const metaCache = new Map();

  async function meta(token) {
    const key = String(token || '').toLowerCase();
    if (!metaCache.has(key)) metaCache.set(key, await kerb.erc20Meta(config, token));
    return metaCache.get(key);
  }

  return {
    live: true,
    dwellSeconds: Number(config?.defaults?.dwellSeconds ?? 900),
    account,

    async tokens() {
      const currency = config?.chain?.nativeCurrency ?? {};
      return [
        { symbol: currency.symbol || 'ETH', decimals: Number(currency.decimals ?? 18), address: '' },
        { symbol: 'ERC-20…', decimals: 0, address: 'custom' },
      ];
    },

    now: () => kerb.chainTime(),

    async refreshDwell() {
      const s = await kerb.summary(config, account);
      return s?.dwellSeconds ?? Number(config?.defaults?.dwellSeconds ?? 900);
    },

    async contacts() {
      const { contacts } = await kerb.contactsPage(config, account, 0, 50);
      return contacts.map((c) => ({
        address: c.to,
        label: c.nickname || 'Contact',
        settledAt: c.since ? new Date(c.since * 1000).toISOString().slice(0, 10).replace(/-/g, ' ') : '',
      }));
    },

    async pendings() {
      const open = await kerb.myPendings(config, account);
      const out = [];
      for (const p of open) {
        const m = await meta(p.token);
        out.push({
          id: p.id,
          to: p.to,
          token: p.token,
          amountText: `${formatUnits(p.amount, m.decimals)} ${m.symbol}`,
          releaseAt: p.releaseAt,
          cancellable: p.cancellable,
          settleable: p.settleable,
        });
      }
      return out;
    },

    isKnown: (address) => kerb.isTrusted(config, account, address),

    async preview({ amount, token }) {
      const m = await meta(token);
      const units = parseUnits(amount, m.decimals);
      if (units <= 0n) throw new Error('Amount must be more than zero.');
      return { text: `${amount} ${m.symbol}`, amount: units, decimals: m.decimals, symbol: m.symbol };
    },

    /* The whole send, including the approval it may need first.

       `onStep` is how the shell says what is happening. A user staring at a
       wallet popup should be told which of two signatures they are looking at,
       because "approve" and "send" are not the same decision and an app that
       shows one prompt for both is training people to click through. */
    async submit({ token, to, amount }, onStep = () => {}) {
      const m = await meta(token);
      const units = parseUnits(amount, m.decimals);

      const balance = await kerb.balanceOf(config, token, account);
      if (balance < units) {
        throw new Error(`Not enough ${m.symbol}. You have ${formatUnits(balance, m.decimals)}.`);
      }

      if (!kerb.isNative(token)) {
        const allowed = await kerb.allowance(config, token, account);
        if (allowed < units) {
          onStep('Approve the token in your wallet.');
          const approveHash = await kerb.approve(config, token, units);
          onStep('Waiting for the approval to confirm.');
          const approveReceipt = await kerb.waitForReceipt(approveHash);
          if (!approveReceipt) throw new Error('The approval did not confirm in time.');
          if (!approveReceipt.success) throw new Error('The approval transaction reverted.');
        }
      }

      onStep('Confirm the transfer in your wallet.');
      const hash = await kerb.send(config, { token, to, amount: units });

      onStep('Waiting for the transfer to confirm.');
      const receipt = await kerb.waitForReceipt(hash);
      if (!receipt) throw new Error('The transfer did not confirm in time.');
      if (!receipt.success) throw new Error('The transfer reverted.');

      const id = kerb.heldIdFrom(receipt);
      if (id !== null) return { kind: 'held', id, hash };
      if (kerb.sentFrom(receipt)) return { kind: 'direct', id: null, hash };

      /* A receipt that succeeded but carries neither event is not something to
         paper over with an optimistic screen. */
      throw new Error('The transfer confirmed but reported no result.');
    },

    async cancel(id, onStep = () => {}) {
      onStep('Confirm the cancel in your wallet.');
      const hash = await kerb.cancel(config, id);
      onStep('Waiting for the cancel to confirm.');
      const receipt = await kerb.waitForReceipt(hash);
      if (!receipt) throw new Error('The cancel did not confirm in time.');
      if (!receipt.success) throw new Error('The cancel reverted. The window may have closed.');
      return { ok: true, hash };
    },

    async settle(id, onStep = () => {}) {
      onStep('Confirm the settle in your wallet.');
      const hash = await kerb.settle(config, id);
      onStep('Waiting for the settle to confirm.');
      const receipt = await kerb.waitForReceipt(hash);
      if (!receipt) throw new Error('The settle did not confirm in time.');
      if (!receipt.success) throw new Error('The settle reverted.');
      return { ok: true, hash };
    },

    remember() {
      /* The chain is the record. Nothing to remember locally, and inventing a
         local copy would be a second source of truth that drifts. */
    },
  };
}
