/* app.js
   The application shell. Four states: compose, review, holding, settled.

   It talks to a source rather than to a chain or to mock data, and the two
   sources in app-source.js have the same shape. Before a wallet is connected
   the demo source drives it, exactly as before: invented contacts, a twenty
   second window, nothing signed. Connect a wallet on the right chain and the
   chain source takes over, with the same screens doing real work.

   Switching between them rebuilds the view rather than patching it, because a
   half swapped screen showing demo contacts next to a real pending is worse
   than a blank moment. */

import { isAddress, truncate } from '../../config/config.js';
import { announce } from './copy.js';
import { chainSource, demoSource } from './app-source.js';
import { mountWindow } from './kerb-visuals.js';
import { Typer, prefersReducedMotion } from './motion.js';

const STATES = ['compose', 'review', 'holding', 'settled'];

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
  const reviewWindowWrap = root.querySelector('[data-review-window]');
  const contactsList = root.querySelector('[data-contacts]');
  const contactsEmpty = root.querySelector('[data-contacts-empty]');
  const pendingsSection = root.querySelector('[data-pendings-section]');
  const pendingsList = root.querySelector('[data-pendings]');
  const pendingsEmpty = root.querySelector('[data-pendings-empty]');
  const statusEl = root.querySelector('[data-app-status]');
  const demoWindows = root.querySelectorAll('[data-demo-window]');
  const liveWindow = root.querySelector('[data-live-window]');
  const releaseTextEl = root.querySelector('[data-holding="releaseText"]');
  const countdownEl = root.querySelector('[data-holding="countdown"]');
  const notice = root.querySelector('.app-notice');

  const reviewWindow = mountWindow(reviewWindowWrap?.querySelector('[data-kerb-window]'));
  const holdingWindow = mountWindow(panels.get('holding').querySelector('[data-kerb-window]'));

  let source = demoSource();
  let contacts = [];
  let draft = { token: '', tokenAddress: '', to: '', amount: '' };
  let busy = false;
  let heldId = null;
  let pendingTimer = null;

  /* Seconds to add to the device clock to get the chain's. Resynced whenever
     the lists reload, so it cannot drift far, and every window decision below
     goes through `now()` rather than reading `Date.now()` directly. */
  let chainOffset = 0;

  const now = () => Math.floor(Date.now() / 1000) + chainOffset;

  async function syncClock() {
    try {
      const chain = await source.now();
      chainOffset = chain - Math.floor(Date.now() / 1000);
    } catch {
      /* Keep the last offset. A stale offset is closer than none. */
    }
  }

  /* --- status ------------------------------------------------------------- */

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text ?? '';
    statusEl.hidden = !text;
  }

  function setBusy(on) {
    busy = on;
    for (const button of root.querySelectorAll('[data-action]')) {
      button.disabled = on;
    }
    if (!on) syncAddressState();
  }

  /* --- token select -------------------------------------------------------- */

  async function renderTokens() {
    if (!tokenEl) return;
    const list = await source.tokens();
    tokenEl.replaceChildren();
    for (const t of list) {
      const opt = document.createElement('option');
      opt.value = t.address === 'custom' ? 'custom' : t.symbol;
      opt.textContent = t.symbol;
      opt.dataset.address = t.address ?? '';
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

  /** The token argument KerbCore wants: the zero address for native, or the
      pasted ERC-20 address. */
  function selectedToken() {
    if (!source.live) return { ok: true, token: '', symbol: tokenEl?.value ?? '' };
    if (tokenEl?.value !== 'custom') {
      return { ok: true, token: '', symbol: tokenEl?.value ?? 'ETH' };
    }
    const address = (tokenAddressEl?.value ?? '').trim();
    if (!isAddress(address)) return { ok: false, token: '', symbol: '' };
    return { ok: true, token: address, symbol: 'token' };
  }

  /* --- contacts ------------------------------------------------------------ */

  function contactRow(contact, fresh) {
    const li = document.createElement('li');
    li.className = 'contact';

    const addr = document.createElement('code');
    addr.className = 'contact-addr';
    addr.textContent = truncate(contact.address);

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
    if (contactsEmpty) contactsEmpty.hidden = contacts.length > 0;
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

  /* --- open pendings -------------------------------------------------------
     Only shown on the live source. The demo has no concept of several holds at
     once and inventing one would be demonstrating a feature that does not
     exist. */

  function countdown(seconds) {
    if (seconds <= 0) return 'due';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function pendingRow(p) {
    const li = document.createElement('li');
    li.className = 'contact';

    const addr = document.createElement('code');
    addr.className = 'contact-addr';
    addr.textContent = truncate(p.to);

    const amount = document.createElement('span');
    amount.className = 'contact-label';
    amount.textContent = p.amountText;

    const left = Math.max(0, p.releaseAt - now());
    const when = document.createElement('span');
    when.className = 'contact-when';
    when.dataset.releaseAt = String(p.releaseAt);
    when.textContent = countdown(left);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn-corner btn--sm';
    action.textContent = left > 0 ? 'Cancel' : 'Settle';
    action.addEventListener('click', async () => {
      if (busy) return;
      /* Recomputed here, not reused from render time. The ticker relabels this
         button when the window closes, and a handler branching on the value
         captured when the row was built would send a cancel that the contract
         is now certain to reject. */
      const stillWaiting = p.releaseAt - now() > 0;
      setBusy(true);
      try {
        if (stillWaiting) {
          await source.cancel(p.id, setStatus);
          announce('Cancelled', 'cancel');
        } else {
          await source.settle(p.id, setStatus);
          announce('Settled');
        }
        await Promise.all([reloadPendings(), reloadContacts()]);
      } catch (error) {
        announce(error.message || 'That did not go through');
      } finally {
        setStatus('');
        setBusy(false);
      }
    });

    li.append(addr, amount, when, action);
    return li;
  }

  async function reloadPendings() {
    if (!pendingsSection) return;
    if (!source.live) {
      pendingsSection.hidden = true;
      return;
    }
    pendingsSection.hidden = false;

    await syncClock();

    let rows = [];
    try {
      rows = await source.pendings();
    } catch (error) {
      console.warn('[kerb.app] could not read pendings:', error);
      if (pendingsEmpty) {
        pendingsEmpty.hidden = false;
        pendingsEmpty.textContent = error.message || 'Could not read your pending transfers.';
      }
      pendingsList?.replaceChildren();
      return;
    }

    pendingsList?.replaceChildren(...rows.map(pendingRow));
    if (pendingsEmpty) {
      pendingsEmpty.hidden = rows.length > 0;
      pendingsEmpty.textContent = 'Nothing waiting.';
    }
  }

  /* One timer for every row, rather than one per row. The labels are the only
     thing that changes each second, and a row whose window has just closed
     swaps its own button. */
  function startPendingTicker() {
    stopPendingTicker();
    pendingTimer = window.setInterval(() => {
      /* Every countdown on the page, including the one in the holding panel,
         so there is a single clock rather than one per widget. */
      const stamp = now();
      for (const cell of root.querySelectorAll('[data-release-at]')) {
        const releaseAt = Number(cell.dataset.releaseAt);
        if (!releaseAt) continue;
        const left = Math.max(0, releaseAt - stamp);
        cell.textContent = countdown(left);
        const button = cell.parentElement?.querySelector('button');
        if (button && left === 0 && button.textContent !== 'Settle') button.textContent = 'Settle';
      }
    }, 1000);
  }

  function stopPendingTicker() {
    if (pendingTimer) window.clearInterval(pendingTimer);
    pendingTimer = null;
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
      /* The live check is a network round trip, so a later keystroke must not
         be overwritten by an earlier reply arriving out of order. */
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
        ? 'Paste an address to check your list.'
        : valid
          ? known
            ? 'This address goes straight through.'
            : 'A first send here waits in your window.'
          : 'That does not look like an address yet.';
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
      token: token.token,
      symbol: token.symbol,
      to: (toEl?.value ?? '').trim(),
      amount: (amountEl?.value ?? '').trim(),
    };
    if (!isAddress(draft.to) || !draft.amount || !token.ok) return;

    let preview;
    try {
      preview = await source.preview({ amount: draft.amount, token: draft.token });
    } catch (error) {
      announce(error.message || 'That amount is not valid');
      return;
    }
    draft.preview = preview;

    root.querySelector('[data-review="token"]').textContent = preview.symbol ?? draft.symbol;
    root.querySelector('[data-review="to"]').textContent = truncate(draft.to);
    root.querySelector('[data-review="amount"]').textContent = preview.text;

    let known = false;
    try {
      known = await source.isKnown(draft.to);
    } catch {
      known = false;
    }
    draft.known = known;

    if (reviewWindowWrap) reviewWindowWrap.hidden = known || source.live;
    if (!known && !source.live) reviewWindow?.reset();

    show('review');
  }

  async function toHolding() {
    setBusy(true);
    let result;
    try {
      result = await source.submit(
        { token: draft.token, to: draft.to, amount: draft.amount },
        setStatus,
      );
    } catch (error) {
      setStatus('');
      setBusy(false);
      announce(error.message || 'That did not go through');
      return;
    }
    setStatus('');
    setBusy(false);

    if (result.kind === 'direct') {
      heldId = null;
      toSettled();
      return;
    }

    heldId = result.id;
    root.querySelector('[data-holding="to"]').textContent = truncate(draft.to);
    root.querySelector('[data-holding="amount"]').textContent = draft.preview?.text ?? draft.amount;

    show('holding');
    holdingWindow?.reset();

    if (source.live) {
      /* The demo widget animates a fixed twenty seconds, read once when it was
         mounted and not changeable afterwards. Against a real window of fifteen
         minutes to seven days that is not a countdown, it is a wrong number
         moving convincingly, so live mode hides it and shows the real release
         instead. The hold does not resolve itself either: settlement is a
         separate transaction somebody has to send. */
      const view = (await source.pendings().catch(() => [])).find(
        (p) => String(p.id) === String(heldId),
      );
      if (view && countdownEl && releaseTextEl) {
        countdownEl.dataset.releaseAt = String(view.releaseAt);
        countdownEl.textContent = countdown(Math.max(0, view.releaseAt - now()));
        releaseTextEl.textContent = new Date(view.releaseAt * 1000).toLocaleString();
      }
      await reloadContacts();
      await reloadPendings();
    } else {
      holdingWindow?.start(() => {
        if (current === 'holding') toSettled();
      });
    }
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

  async function cancelHold() {
    if (!source.live || heldId === null) {
      toCompose('Cancelled');
      return;
    }
    setBusy(true);
    try {
      await source.cancel(heldId, setStatus);
      heldId = null;
      await Promise.all([reloadPendings(), reloadContacts()]);
      toCompose('Cancelled');
    } catch (error) {
      announce(error.message || 'The cancel did not go through');
    } finally {
      setStatus('');
      setBusy(false);
    }
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
    cancel: cancelHold,
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
    else if (current === 'holding') cancelHold();
  });

  /* --- source switching ------------------------------------------------------ */

  async function useSource(next) {
    source = next;
    heldId = null;

    for (const el of demoWindows) el.hidden = source.live;
    if (liveWindow) liveWindow.hidden = !source.live;
    if (reviewWindowWrap && source.live) reviewWindowWrap.hidden = true;
    if (countdownEl) countdownEl.dataset.releaseAt = '0';

    if (notice) {
      notice.textContent = source.live
        ? 'Live on chain. Every action below is a real transaction you sign.'
        : 'Demo data. Connect a wallet to use the deployed contracts.';
    }

    await renderTokens();
    toCompose();
    await Promise.all([reloadContacts(), reloadPendings()]);

    if (source.live) {
      /* Prefer the dwell the contract actually has over the one in config. */
      try {
        source.dwellSeconds = await source.refreshDwell();
      } catch {
        /* config default stands */
      }
      startPendingTicker();
    } else {
      stopPendingTicker();
    }
  }

  useSource(demoSource());

  return {
    /** Called by main.js whenever the wallet state changes. */
    async setWallet({ connected, account, onKerbChain, config }) {
      const wantLive =
        connected && onKerbChain && Boolean(config?.contracts?.core?.address);
      if (wantLive === source.live && (!wantLive || source.account === account)) return;
      await useSource(wantLive ? chainSource(config, account) : demoSource());
    },
  };
}
