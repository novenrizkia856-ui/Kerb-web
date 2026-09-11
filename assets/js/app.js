/* app.js
   The mock application shell in brief section 10. Four states, demo data only.
   There is no wallet library, no RPC call and no signing anywhere in this file.

   Built from the ported components: .panel for the card, .input-well for the
   fields, .btn-solid and .btn-ghost for the actions, .chip for the address
   state, .cells for the contacts list. The waiting window is visual A from
   kerb-visuals.js, driven rather than autostarted. */

import { isAddress, truncate } from '../../config/config.js';
import { announce } from './copy.js';
import { MOCK_CONTACTS, MOCK_TOKENS, MOCK_DWELL_SECONDS, isKnown } from './app-mock.js';
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
  const toEl = root.querySelector('[data-field="to"]');
  const amountEl = root.querySelector('[data-field="amount"]');
  const hintEl = root.querySelector('[data-to-hint]');
  const stateChip = root.querySelector('[data-send-state]');
  const reviewBtn = root.querySelector('[data-action="review"]');
  const reviewWindowWrap = root.querySelector('[data-review-window]');
  const contactsList = root.querySelector('[data-contacts]');
  const contactsEmpty = root.querySelector('[data-contacts-empty]');

  /* The demo runs at MOCK_DWELL_SECONDS rather than the configured
     defaults.dwellSeconds so the hold is watchable. Brief section 10. */
  for (const el of root.querySelectorAll('[data-kerb-window]')) {
    el.dataset.dwell = String(MOCK_DWELL_SECONDS);
  }
  const reviewWindow = mountWindow(reviewWindowWrap?.querySelector('[data-kerb-window]'));
  const holdingWindow = mountWindow(panels.get('holding').querySelector('[data-kerb-window]'));

  const contacts = MOCK_CONTACTS.map((c) => ({ ...c }));
  let draft = { token: '', to: '', amount: '' };

  /* --- token options, from mock data ------------------------------------- */
  if (tokenEl && !tokenEl.options.length) {
    for (const t of MOCK_TOKENS) {
      const opt = document.createElement('option');
      opt.value = t.symbol;
      opt.textContent = t.symbol;
      tokenEl.append(opt);
    }
  }

  /* --- contacts list ------------------------------------------------------ */

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

  /* --- state machine ------------------------------------------------------ */

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

  /* --- compose ------------------------------------------------------------ */

  function syncAddressState() {
    const value = (toEl?.value ?? '').trim();
    draft.to = value;

    const valid = isAddress(value);
    const known = valid && isKnown(value);

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

    if (reviewBtn) {
      const ready = valid && Boolean((amountEl?.value ?? '').trim());
      reviewBtn.disabled = !ready;
    }
  }

  toEl?.addEventListener('input', syncAddressState);
  amountEl?.addEventListener('input', syncAddressState);

  /* --- transitions -------------------------------------------------------- */

  function toReview() {
    draft = {
      token: tokenEl?.value ?? '',
      to: (toEl?.value ?? '').trim(),
      amount: (amountEl?.value ?? '').trim(),
    };
    if (!isAddress(draft.to) || !draft.amount) return;

    root.querySelector('[data-review="token"]').textContent = draft.token;
    root.querySelector('[data-review="to"]').textContent = truncate(draft.to);
    root.querySelector('[data-review="amount"]').textContent = `${draft.amount} ${draft.token}`;

    const known = isKnown(draft.to);
    if (reviewWindowWrap) reviewWindowWrap.hidden = known;
    if (!known) reviewWindow?.reset();

    show('review');
  }

  function toHolding() {
    if (isKnown(draft.to)) {
      toSettled();
      return;
    }

    root.querySelector('[data-holding="to"]').textContent = truncate(draft.to);
    root.querySelector('[data-holding="amount"]').textContent = `${draft.amount} ${draft.token}`;

    show('holding');
    holdingWindow?.reset();
    holdingWindow?.start(() => {
      if (current === 'holding') toSettled();
    });
  }

  function toSettled() {
    holdingWindow?.cancel();

    root.querySelector('[data-settled="to"]').textContent = truncate(draft.to);
    root.querySelector('[data-settled="amount"]').textContent = `${draft.amount} ${draft.token}`;

    if (!isKnown(draft.to)) {
      contacts.push({
        address: draft.to,
        label: 'New contact',
        settledAt: 'just now',
      });
    }

    show('settled');
    renderContacts(draft.to);
  }

  function toCompose(message) {
    holdingWindow?.cancel();
    reviewWindow?.reset();
    show('compose');
    if (message) announce(message, 'cancel');
  }

  /* --- wiring ------------------------------------------------------------- */

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
    const run = actions[trigger.dataset.action];
    if (run) run();
  });

  /* Escape backs out of review and cancels a hold, matching the reference's
     own Escape handling on its dismissible surfaces. */
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (current === 'review') toCompose();
    else if (current === 'holding') toCompose('Cancelled');
  });

  renderContacts();
  syncAddressState();
  show('compose', { moveFocus: false });

  return { show, toCompose, toReview, toHolding, toSettled };
}
