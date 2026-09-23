/* app.js
   The application shell. Four states: compose, review, holding, settled.

   It talks to a source rather than to a wallet or to mock data, and the two
   sources in app-source.js have the same shape. Before a wallet is connected
   the demo source drives it: invented contacts, a twenty second window,
   nothing signed. Connect a Solana wallet and the wallet source takes over,
   reading real balances into the same screens.

   With a wallet connected the flow stops at review. The Kerb program is not
   live on Solana, so the review shows exactly what the send would do and says
   plainly that it will not be sent. No state after review is reachable in that
   mode, and no code in this file can reach a wallet's signing features: the
   sources are the only thing it talks to, and neither of them has one.

   Switching between sources rebuilds the view rather than patching it, because
   a half swapped screen showing demo contacts next to real balances is worse
   than a blank moment. */

import { isAddress, markAddress, truncate } from '../../config/config.js';
import { announce } from './copy.js';
import { demoSource, walletSource } from './app-source.js';
import { mountWindow } from './kerb-visuals.js';
import { Typer, prefersReducedMotion } from './motion.js';

const STATES = ['compose', 'review', 'holding', 'settled'];

const COPY = {
  noticeDemo:
    'Demo data. Nothing is signed or sent. Connect a Solana wallet to preview a send with your own balances.',
  noticePreview:
    'Wallet connected, read only. Balances are live from Solana. Sending stays off until the Kerb program is live.',
  notLive: 'Solana execution is not active yet. Nothing will be signed or sent.',
  confirm: 'Confirm',
  confirmOff: 'Not live',
  contactsEmptyDemo: 'No contacts yet.',
  contactsEmptyPreview: 'Your list is kept by the Kerb program, which is not live on Solana yet.',
};

/** 900 reads `15 min`, 86400 reads `1 day`. */
function duration(seconds) {
  if (seconds >= 86400 && seconds % 86400 === 0) {
    const d = seconds / 86400;
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
  return `${seconds} s`;
}

export function initApp(root) {
  if (!root) return null;

  const panels = new Map(
    STATES.map((name) => [name, root.querySelector(`[data-state="${name}"]`)]),
  );
  if (![...panels.values()].every(Boolean)) return null;

  const tokenEl = root.querySelector('[data-field="token"]');
  const tokenAddressField = root.querySelector('[data-token-address-field]');
  const tokenAddressEl = root.querySelector('[data-field="tokenAddress"]');
  const toEl = root.querySelector('[data-field="to"]');
  const amountEl = root.querySelector('[data-field="amount"]');
  const hintEl = root.querySelector('[data-to-hint]');
  const stateChip = root.querySelector('[data-send-state]');
  const reviewBtn = root.querySelector('[data-action="review"]');
  const confirmBtn = root.querySelector('[data-action="confirm"]');
  const reviewWindowWrap = root.querySelector('[data-review-window]');
  const reviewRouteRow = root.querySelector('[data-review-route-row]');
  const reviewNote = root.querySelector('[data-review-note]');
  const contactsList = root.querySelector('[data-contacts]');
  const contactsEmpty = root.querySelector('[data-contacts-empty]');
  const statusEl = root.querySelector('[data-app-status]');
  const notice = root.querySelector('.app-notice');

  const reviewWindow = mountWindow(reviewWindowWrap?.querySelector('[data-kerb-window]'));
  const holdingWindow = mountWindow(panels.get('holding').querySelector('[data-kerb-window]'));

  let source = demoSource();
  let tokens = [];
  let contacts = [];
  let draft = { to: '', amount: '' };
  let busy = false;

  /* --- status ------------------------------------------------------------- */

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text ?? '';
    statusEl.hidden = !text;
  }

  /** Confirm only exists for a source that can carry a send through. With a
      real wallet it stays disabled whatever else re-enables the buttons. */
  function syncConfirm() {
    if (!confirmBtn) return;
    const off = !source.executes;
    confirmBtn.textContent = off ? COPY.confirmOff : COPY.confirm;
    if (off) confirmBtn.disabled = true;
    if (reviewNote) {
      reviewNote.textContent = off ? COPY.notLive : '';
      reviewNote.hidden = !off;
    }
  }

  function setBusy(on) {
    busy = on;
    for (const button of root.querySelectorAll('[data-action]')) {
      button.disabled = on;
    }
    syncConfirm();
    if (!on) syncAddressState();
  }

  /* --- token select -------------------------------------------------------- */

  let tokenTicket = 0;

  async function renderTokens() {
    if (!tokenEl) return;
    const ticket = ++tokenTicket;
    if (source.mode === 'preview') setStatus('Reading your balances from Solana…');
    let list;
    try {
      list = await source.tokens();
    } catch (error) {
      console.warn('[kerb.app] could not read tokens:', error);
      list = [{ key: 'SOL', symbol: 'SOL', label: 'SOL' }];
    }
    /* A wallet change mid read must not have its list overwritten by the one
       it replaced. */
    if (ticket !== tokenTicket) return;
    setStatus('');

    tokens = list;
    tokenEl.replaceChildren();
    for (const t of list) {
      const opt = document.createElement('option');
      opt.value = t.key;
      opt.textContent = t.label;
      tokenEl.append(opt);
    }
    syncTokenMode();
  }

  function syncTokenMode() {
    const custom = tokenEl?.value === 'custom';
    if (tokenAddressField) tokenAddressField.hidden = !custom;
    if (!custom && tokenAddressEl) tokenAddressEl.value = '';
    syncAddressState();
  }

  /** The token the review is about: a fixed entry from the list, or a pasted
      SPL mint. */
  function selectedToken() {
    const key = tokenEl?.value ?? '';
    if (key !== 'custom') {
      const entry = tokens.find((t) => t.key === key);
      return entry ? { ok: true, ...entry } : { ok: false };
    }
    const mint = (tokenAddressEl?.value ?? '').trim();
    if (!isAddress(mint)) return { ok: false };
    return { ok: true, key: mint, mint, symbol: '' };
  }

  /* --- contacts ------------------------------------------------------------ */

  function contactRow(contact, fresh) {
    const li = document.createElement('li');
    li.className = 'contact';

    const addr = document.createElement('code');
    addr.className = 'contact-addr';
    addr.dataset.address = '';
    addr.textContent = truncate(contact.address);
    addr.title = contact.address;

    const label = document.createElement('span');
    label.className = 'contact-label';
    label.textContent = contact.label;

    const when = document.createElement('span');
    when.className = 'contact-when';
    when.textContent = contact.settledAt;

    li.append(addr, label, when);

    if (fresh && !prefersReducedMotion()) {
      li.classList.add('stage-in');
      new Typer(addr, { fps: 20, cycles: 3 }).in();
    }
    return li;
  }

  function renderContacts(freshAddress) {
    if (!contactsList) return;
    contactsList.replaceChildren();
    for (const c of contacts) {
      contactsList.append(contactRow(c, c.address === freshAddress));
    }
    if (contactsEmpty) {
      contactsEmpty.hidden = contacts.length > 0;
      contactsEmpty.textContent =
        source.mode === 'preview' ? COPY.contactsEmptyPreview : COPY.contactsEmptyDemo;
    }
  }

  async function reloadContacts(freshAddress) {
    try {
      contacts = await source.contacts();
    } catch (error) {
      console.warn('[kerb.app] could not read contacts:', error);
      contacts = [];
    }
    renderContacts(freshAddress);
  }

  /* --- state machine ------------------------------------------------------- */

  function focusFirst(panel) {
    const target = panel.querySelector(
      'button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])',
    );
    if (target) target.focus();
  }

  let current = 'compose';

  function show(name, { moveFocus = true } = {}) {
    current = name;
    for (const [key, panel] of panels) panel.hidden = key !== name;
    if (moveFocus) focusFirst(panels.get(name));
  }

  /* --- compose ------------------------------------------------------------- */

  let knownToken = 0;

  async function syncAddressState() {
    const value = (toEl?.value ?? '').trim();
    draft.to = value;

    const valid = isAddress(value);
    let known = false;

    if (valid) {
      /* A later keystroke must not be overwritten by an earlier answer
         arriving out of order. */
      const ticket = ++knownToken;
      try {
        const answer = await source.isKnown(value);
        if (ticket !== knownToken) return;
        known = answer;
      } catch {
        if (ticket !== knownToken) return;
        known = false;
      }
    }

    if (stateChip) {
      stateChip.hidden = !valid;
      if (valid) {
        stateChip.textContent = known ? 'On your list' : 'New address';
        stateChip.dataset.kind = known ? 'known' : 'new';
      } else {
        delete stateChip.dataset.kind;
      }
    }

    if (hintEl) {
      hintEl.textContent = !value
        ? 'Paste a Solana address to check your list.'
        : valid
          ? known
            ? 'This address goes straight through.'
            : 'A first send here waits in your window.'
          : 'That does not look like a Solana address yet.';
    }

    if (reviewBtn && !busy) {
      const token = selectedToken();
      reviewBtn.disabled = !(valid && token.ok && Boolean((amountEl?.value ?? '').trim()));
    }
  }

  toEl?.addEventListener('input', syncAddressState);
  amountEl?.addEventListener('input', syncAddressState);
  tokenAddressEl?.addEventListener('input', syncAddressState);
  tokenEl?.addEventListener('change', syncTokenMode);

  /* --- transitions ---------------------------------------------------------- */

  async function toReview() {
    const token = selectedToken();
    draft = {
      to: (toEl?.value ?? '').trim(),
      amount: (amountEl?.value ?? '').trim(),
    };
    if (!isAddress(draft.to) || !draft.amount || !token.ok) return;

    setBusy(true);
    let preview;
    try {
      preview = await source.preview({ amount: draft.amount, token, to: draft.to });
    } catch (error) {
      announce(error.message || 'That amount is not valid');
      return;
    } finally {
      setBusy(false);
    }
    draft.preview = preview;

    const tokenCell = root.querySelector('[data-review="token"]');
    const amountCell = root.querySelector('[data-review="amount"]');
    tokenCell.textContent = preview.symbol;
    amountCell.textContent = preview.text;
    /* A mint with no known symbol is shown as its truncated key, which has to
       keep its case like any other address. */
    const mintShown = preview.symbol.includes('…');
    markAddress(tokenCell, mintShown);
    markAddress(amountCell, mintShown);
    root.querySelector('[data-review="to"]').textContent = truncate(draft.to);

    let known = false;
    try {
      known = await source.isKnown(draft.to);
    } catch {
      known = false;
    }
    draft.known = known;

    const demo = source.mode === 'demo';
    if (reviewWindowWrap) reviewWindowWrap.hidden = known || !demo;
    if (!known && demo) reviewWindow?.reset();

    /* Outside the demo there is no countdown to watch, so the route is stated
       instead: what the send would do if it could be sent. */
    if (reviewRouteRow) {
      reviewRouteRow.hidden = demo;
      const value = reviewRouteRow.querySelector('[data-review="route"]');
      if (value) {
        value.textContent = known ? 'Direct' : `Held ${duration(source.dwellSeconds)}`;
      }
    }

    syncConfirm();
    show('review');
  }

  async function toHolding() {
    /* Belt and braces. The button is disabled for a source that does not
       execute, and this refuses anyway if it is ever reached. */
    if (!source.executes) {
      announce(COPY.notLive);
      return;
    }

    setBusy(true);
    let result;
    try {
      result = await source.submit({ to: draft.to, amount: draft.amount });
    } catch (error) {
      announce(error.message || 'That did not go through');
      return;
    } finally {
      setStatus('');
      setBusy(false);
    }

    if (result.kind === 'direct') {
      toSettled();
      return;
    }

    root.querySelector('[data-holding="to"]').textContent = truncate(draft.to);
    root.querySelector('[data-holding="amount"]').textContent = draft.preview?.text ?? draft.amount;

    show('holding');
    holdingWindow?.reset();
    holdingWindow?.start(() => {
      if (current === 'holding') toSettled();
    });
  }

  async function toSettled() {
    holdingWindow?.cancel();

    root.querySelector('[data-settled="to"]').textContent = truncate(draft.to);
    root.querySelector('[data-settled="amount"]').textContent =
      draft.preview?.text ?? draft.amount;

    if (!draft.known) source.remember(draft.to);

    show('settled');
    await reloadContacts(draft.to);
  }

  function toCompose(message) {
    holdingWindow?.cancel();
    reviewWindow?.reset();
    show('compose');
    if (message) announce(message, 'cancel');
  }

  /* --- wiring --------------------------------------------------------------- */

  const actions = {
    review: toReview,
    back: () => toCompose(),
    confirm: toHolding,
    cancel: () => toCompose('Cancelled'),
    done: () => {
      if (toEl) toEl.value = '';
      if (amountEl) amountEl.value = '';
      syncAddressState();
      toCompose();
    },
  };

  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger || !root.contains(trigger)) return;
    if (busy) return;
    const run = actions[trigger.dataset.action];
    if (run) run();
  });

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || busy) return;
    if (current === 'review') toCompose();
    else if (current === 'holding') toCompose('Cancelled');
  });

  /* --- source switching ------------------------------------------------------ */

  async function useSource(next) {
    source = next;

    if (reviewWindowWrap && source.mode !== 'demo') reviewWindowWrap.hidden = true;
    if (notice) notice.textContent = source.mode === 'demo' ? COPY.noticeDemo : COPY.noticePreview;

    toCompose();
    syncConfirm();
    await Promise.all([renderTokens(), reloadContacts()]);
  }

  useSource(demoSource());

  return {
    /** Called by main.js whenever the wallet state changes. */
    async setWallet({ connected, account, config }) {
      const wantPreview = connected && Boolean(account);
      const isPreview = source.mode === 'preview';
      if (wantPreview === isPreview && (!wantPreview || source.account === account)) return;
      await useSource(wantPreview ? walletSource(config, account) : demoSource());
    },
  };
}
