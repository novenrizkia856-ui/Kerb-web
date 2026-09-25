/* wallet-ui.js
   The connect button, the wallet picker, and the network banner.

   Keeps the DOM in one place and the chain logic in wallet.js, so this file is
   only ever deciding what a state should look like, never what it means.

   Three states the button can be in:

     disconnected  reads `Connect wallet`, opens the picker
     wrong chain   reads the truncated account, and a banner above the app
                   offers to switch. The app stays visible rather than blanking,
                   because a reader who has not connected at all sees the same
                   screen and there is no reason to punish the one who has.
     connected     reads the truncated account, opens a small menu with the
                   explorer link and disconnect

   Nothing here blanks the page and nothing throws. A visitor with no wallet
   extension gets a picker that says so. */

import { truncate, explorerAddressUrl } from '../../config/config.js';
import { announce } from './copy.js';
import {
  connectInjected,
  connectWalletConnect,
  disconnect,
  isOnKerbChain,
  listInjected,
  onWalletChange,
  restore,
  switchChain,
} from './wallet.js';

let dialog = null;

function closeDialog() {
  if (!dialog) return;
  dialog.remove();
  dialog = null;
  document.removeEventListener('keydown', onEscape);
}

function onEscape(event) {
  if (event.key === 'Escape') closeDialog();
}

/* --- the picker -------------------------------------------------------------
   Built fresh each time it opens, because the set of installed wallets can
   change between openings and a cached list would offer one that has been
   uninstalled. */
function openPicker(config, anchor) {
  closeDialog();

  const wallets = listInjected();
  const wcId = config?.wallet?.walletConnectProjectId ?? '';

  dialog = document.createElement('div');
  dialog.className = 'wallet-picker panel';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Choose a wallet');

  const list = document.createElement('div');
  list.className = 'wallet-picker-list';

  for (const wallet of wallets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wallet-option panel-hover';
    button.textContent = wallet.name;
    button.addEventListener('click', async () => {
      button.disabled = true;
      const result = await connectInjected(wallet, config);
      button.disabled = false;
      if (result.ok) closeDialog();
      else announce(result.reason);
    });
    list.append(button);
  }

  if (wcId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wallet-option panel-hover';
    button.textContent = 'WalletConnect';
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Opening…';
      const result = await connectWalletConnect(config);
      button.disabled = false;
      button.textContent = 'WalletConnect';
      if (result.ok) closeDialog();
      else announce(result.reason);
    });
    list.append(button);
  }

  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'wallet-empty';
    empty.textContent = 'No wallet found in this browser.';
    list.append(empty);
  }

  dialog.append(list);
  document.body.append(dialog);
  place(dialog, anchor);

  document.addEventListener('keydown', onEscape);
  requestAnimationFrame(() => {
    const first = dialog?.querySelector('button');
    first?.focus();
    document.addEventListener('click', onOutside, { once: true });
  });
}

function onOutside(event) {
  if (dialog && !dialog.contains(event.target)) closeDialog();
}

function place(el, anchor) {
  const rect = anchor.getBoundingClientRect();
  el.style.position = 'absolute';
  el.style.top = `${window.scrollY + rect.bottom + 8}px`;
  /* Pinned to the anchor's right edge so it never runs off a narrow viewport. */
  el.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
  el.style.zIndex = '60';
}

/* --- the account menu ------------------------------------------------------- */
function openAccountMenu(config, anchor, account) {
  closeDialog();

  dialog = document.createElement('div');
  dialog.className = 'wallet-picker panel';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Wallet');

  const list = document.createElement('div');
  list.className = 'wallet-picker-list';

  const url = explorerAddressUrl(config, account);
  if (url) {
    const link = document.createElement('a');
    link.className = 'wallet-option panel-hover';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.textContent = 'View on explorer';
    list.append(link);
  }

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'wallet-option panel-hover';
  copy.textContent = 'Copy address';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(account);
      announce('Copied');
    } catch {
      announce('Could not copy');
    }
    closeDialog();
  });
  list.append(copy);

  const off = document.createElement('button');
  off.type = 'button';
  off.className = 'wallet-option panel-hover';
  off.textContent = 'Disconnect';
  off.addEventListener('click', async () => {
    await disconnect();
    closeDialog();
    announce('Disconnected');
  });
  list.append(off);

  dialog.append(list);
  document.body.append(dialog);
  place(dialog, anchor);

  document.addEventListener('keydown', onEscape);
  requestAnimationFrame(() => {
    dialog?.querySelector('button, a')?.focus();
    document.addEventListener('click', onOutside, { once: true });
  });
}

/* --- the wrong network banner ----------------------------------------------- */
function syncBanner(config, state) {
  const host = document.querySelector('[data-wallet-banner]');
  if (!host) return;

  const wrong = state.connected && !isOnKerbChain(config);
  host.hidden = !wrong;
  if (!wrong) {
    host.replaceChildren();
    return;
  }
  if (host.dataset.built === '1') return;

  const text = document.createElement('span');
  text.textContent = `Wrong network. Kerb is on ${config?.chain?.name || 'another chain'}.`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-corner btn--sm';
  button.textContent = 'Switch';
  button.addEventListener('click', async () => {
    button.disabled = true;
    const result = await switchChain(config);
    button.disabled = false;
    if (!result.ok) announce(result.reason);
  });

  host.replaceChildren(text, button);
  host.dataset.built = '1';
}

/* --- boot ------------------------------------------------------------------- */
export function initWallet(config) {
  const button = document.querySelector('[data-wallet-connect]');
  if (!button) return null;

  if (config?.wallet?.enabled === false) {
    button.hidden = true;
    return null;
  }

  const labelEl = button.querySelector('[data-wallet-label]') ?? button;

  onWalletChange((state) => {
    if (state.connected) {
      labelEl.textContent = truncate(state.account);
      button.setAttribute('aria-label', `Wallet ${state.account}`);
      button.dataset.connected = 'true';
    } else {
      labelEl.textContent = 'Connect wallet';
      button.setAttribute('aria-label', 'Connect wallet');
      delete button.dataset.connected;
    }
    /* The banner is rebuilt from the same state change, so the button and the
       banner can never disagree about whether the chain is right. */
    host_sync(config, state);
  });

  function host_sync(cfg, state) {
    delete document.querySelector('[data-wallet-banner]')?.dataset.built;
    syncBanner(cfg, state);
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (dialog) {
      closeDialog();
      return;
    }
    const state = button.dataset.connected === 'true';
    if (state) {
      const account = button.getAttribute('aria-label')?.replace('Wallet ', '') ?? '';
      openAccountMenu(config, button, account);
    } else {
      openPicker(config, button);
    }
  });

  /* Silent, never prompts. */
  restore(config);

  return { close: closeDialog };
}
