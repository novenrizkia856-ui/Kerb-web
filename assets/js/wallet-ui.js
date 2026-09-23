/* wallet-ui.js
   The connect button, the wallet picker, and the account menu.

   Keeps the DOM in one place and the wallet logic in wallet.js, so this file is
   only ever deciding what a state should look like, never what it means.

   Two states the button can be in:

     disconnected  reads `Connect wallet`, opens the picker
     connected     reads the truncated public key, opens a small menu with the
                   full key, the balances, the explorer link, copy and
                   disconnect

   There is no wrong network state. A Solana wallet does not report which
   cluster it is pointed at, and nothing here sends a transaction for the
   cluster to matter to. Balances are read from the configured network, and the
   menu says which one.

   Nothing here blanks the page and nothing throws. A visitor with no wallet
   extension gets a picker that says so and suggests where to get one. */

import { explorerAddressUrl, markAddress, truncate } from '../../config/config.js';
import { SOL, networkInfo, tokenMint, tokenSymbol } from '../../config/solana.js';
import { announce } from './copy.js';
import { formatUnits, solBalance, tokenBalances } from './solana-read.js';
import { SUGGESTED_WALLETS, connect, disconnect, listWallets, onWalletChange, restore } from './wallet.js';

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

function option(tag, text) {
  const el = document.createElement(tag);
  if (tag === 'button') el.type = 'button';
  el.className = 'wallet-option panel-hover';
  el.textContent = text;
  return el;
}

function meta(text, { address = false } = {}) {
  const p = document.createElement('p');
  p.className = 'wallet-meta';
  if (address) p.dataset.address = '';
  p.textContent = text;
  return p;
}

/* --- the picker -------------------------------------------------------------
   Built fresh each time it opens, because the set of installed wallets can
   change between openings and a cached list would offer one that has been
   uninstalled. */
function openPicker(anchor) {
  closeDialog();

  const wallets = listWallets();

  dialog = document.createElement('div');
  dialog.className = 'wallet-picker panel';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Choose a Solana wallet');

  const list = document.createElement('div');
  list.className = 'wallet-picker-list';

  for (const wallet of wallets) {
    const button = option('button', wallet.name);
    button.addEventListener('click', async () => {
      button.disabled = true;
      const result = await connect(wallet);
      button.disabled = false;
      if (result.ok) closeDialog();
      else announce(result.reason);
    });
    list.append(button);
  }

  if (!wallets.length) {
    const empty = document.createElement('p');
    empty.className = 'wallet-empty';
    empty.textContent = 'No Solana wallet found in this browser.';
    list.append(empty);

    for (const suggestion of SUGGESTED_WALLETS) {
      const link = option('a', `Get ${suggestion.name}`);
      link.href = suggestion.url;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      list.append(link);
    }
  }

  dialog.append(list);
  document.body.append(dialog);
  place(dialog, anchor);

  document.addEventListener('keydown', onEscape);
  requestAnimationFrame(() => {
    dialog?.querySelector('button, a')?.focus();
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

/* --- the account menu -------------------------------------------------------
   The balances are read when the menu opens rather than kept warm, so a
   visitor who never opens it costs the RPC nothing. */
async function fillBalances(config, account, host) {
  const mint = tokenMint(config);
  const [lamports, spl] = await Promise.all([
    solBalance(config, account).catch(() => null),
    mint ? tokenBalances(config, account).catch(() => null) : Promise.resolve(null),
  ]);
  if (!host.isConnected) return;

  const rows = [];
  rows.push(
    meta(lamports === null ? 'SOL balance unavailable' : `${formatUnits(lamports, SOL.decimals, 4)} SOL`),
  );
  if (mint) {
    const held = spl?.find((t) => t.mint === mint);
    rows.push(
      meta(
        spl === null
          ? `${tokenSymbol(config)} balance unavailable`
          : `${held ? formatUnits(held.amount, held.decimals, 4) : '0'} ${tokenSymbol(config)}`,
      ),
    );
  }
  host.replaceChildren(...rows);
}

function openAccountMenu(config, anchor, account, walletName) {
  closeDialog();

  dialog = document.createElement('div');
  dialog.className = 'wallet-picker panel';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Wallet');

  const head = document.createElement('div');
  head.className = 'wallet-meta-group';
  head.append(meta(`${walletName} · ${networkInfo(config).label}`), meta(account, { address: true }));

  const balances = document.createElement('div');
  balances.className = 'wallet-meta-group';
  balances.append(meta('Reading balance…'));
  fillBalances(config, account, balances);

  const list = document.createElement('div');
  list.className = 'wallet-picker-list';

  const url = explorerAddressUrl(config, account);
  if (url) {
    const link = option('a', 'View on Solana Explorer');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    list.append(link);
  }

  const copy = option('button', 'Copy address');
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

  const off = option('button', 'Disconnect');
  off.addEventListener('click', async () => {
    await disconnect();
    closeDialog();
    announce('Disconnected');
  });
  list.append(off);

  dialog.append(head, balances, list);
  document.body.append(dialog);
  place(dialog, anchor);

  document.addEventListener('keydown', onEscape);
  requestAnimationFrame(() => {
    dialog?.querySelector('button, a')?.focus();
    document.addEventListener('click', onOutside, { once: true });
  });
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
  let current = { connected: false, account: '', walletName: '' };

  onWalletChange((state) => {
    current = state;
    if (state.connected) {
      labelEl.textContent = truncate(state.account);
      button.setAttribute('aria-label', `Wallet ${state.account}`);
      button.dataset.connected = 'true';
    } else {
      labelEl.textContent = 'Connect wallet';
      button.setAttribute('aria-label', 'Connect wallet');
      delete button.dataset.connected;
    }
    markAddress(labelEl, state.connected);
  });

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (dialog) {
      closeDialog();
      return;
    }
    if (current.connected) openAccountMenu(config, button, current.account, current.walletName);
    else openPicker(button);
  });

  /* Silent, never prompts. */
  restore();

  return { close: closeDialog };
}
