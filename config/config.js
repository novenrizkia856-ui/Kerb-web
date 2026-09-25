/* config.js
   The only place the site learns about addresses, networks and links.
   Implements brief section 9: the render rules in 9.2, the validator in 9.3 and
   the truncation helper in 9.4. Nothing here throws and nothing here blanks the
   page. Every failure is a console.warn and a safe fallback. */

import { attachCopy } from '../assets/js/copy.js';
import {
  NETWORKS,
  explorerAddressUrl,
  isPublicKey,
  networkInfo,
  programId,
  tokenMintText,
} from './solana.js';

export { explorerAddressUrl };

const CONFIG_URL = new URL('./kerb.config.json', import.meta.url);

export const COPY = {
  tokenEmpty: 'Coming Soon',
  programEmpty: 'Not deployed',
  notLive: 'Not live yet',
  copied: 'Copied',
};

/* --- 9.4 truncation ---------------------------------------------------------
   First four characters, the ellipsis character, the last four. The same
   `ABCD…WXYZ` shape Solana wallets use, so what this page shows is what a
   wallet popup would show next to it. */
export function truncate(address) {
  if (typeof address !== 'string' || address.length <= 10) return address ?? '';
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** Every address on the site is a Solana public key. */
export const isAddress = isPublicKey;

/* --- fallback ---------------------------------------------------------------
   Used when the config file cannot be read at all. Every address stays empty so
   the page renders its `Coming Soon` and `Not deployed` states rather than
   nothing. */
const FALLBACK = {
  meta: { productName: 'Kerb', siteUrl: '', ogTitle: 'Kerb', ogDescription: '' },
  solana: {
    SOLANA_NETWORK: 'mainnet-beta',
    SOLANA_RPC_URL: '',
    EXPLORER_BASE_URL: '',
    KERB_TOKEN_MINT: '',
    KERB_TOKEN_SYMBOL: 'KERB',
    KERB_PROGRAM_ID: '',
    TREASURY_ADDRESS: '',
  },
  defaults: { dwellSeconds: 900, minDwellSeconds: 60, maxDwellSeconds: 604800 },
  links: { x: '', github: '', docs: '' },
  flags: { appEnabled: true, showProgramSection: true },
  wallet: { enabled: true },
};

/* --- 9.3 validation ---------------------------------------------------------
   One console.warn per failure. Never throws. */
export function validate(config) {
  const warn = (message) => console.warn(`[kerb.config] ${message}`);
  const solana = config?.solana ?? {};

  for (const key of ['KERB_TOKEN_MINT', 'KERB_PROGRAM_ID', 'TREASURY_ADDRESS']) {
    const value = solana[key];
    if (value === '' || value === null || value === undefined) continue;
    if (isPublicKey(value)) continue;
    /* The mint is still shown as written. Only its explorer link and the
       wallet balance stay off until it is a real key. */
    const note = key === 'KERB_TOKEN_MINT' ? ', shown as written with no explorer link' : '';
    warn(`solana.${key} is not a valid Solana public key${note}: ${String(value)}`);
  }

  if (!NETWORKS[solana.SOLANA_NETWORK]) {
    warn(
      `solana.SOLANA_NETWORK must be one of ${Object.keys(NETWORKS).join(', ')}, ` +
        `received: ${String(solana.SOLANA_NETWORK)}`,
    );
  }

  for (const key of ['EXPLORER_BASE_URL', 'SOLANA_RPC_URL']) {
    const value = solana[key];
    if (value && !String(value).startsWith('https://')) {
      warn(`solana.${key} must start with https:// when set, received: ${String(value)}`);
    }
  }

  const { dwellSeconds, minDwellSeconds, maxDwellSeconds } = config?.defaults ?? {};
  if (!Number.isFinite(dwellSeconds) || dwellSeconds < minDwellSeconds || dwellSeconds > maxDwellSeconds) {
    warn(
      `defaults.dwellSeconds must sit between ${String(minDwellSeconds)} and ` +
        `${String(maxDwellSeconds)}, received: ${String(dwellSeconds)}`,
    );
  }

  return config;
}

/* --- load ------------------------------------------------------------------ */

let cached = null;

export async function loadConfig() {
  if (cached) return cached;
  try {
    const response = await fetch(CONFIG_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cached = validate(await response.json());
  } catch (error) {
    console.warn('[kerb.config] could not be read, falling back to empty values:', error);
    cached = FALLBACK;
  }
  return cached;
}

/* --- 9.2 render rules ------------------------------------------------------ */

function show(el, visible) {
  if (!el) return;
  el.hidden = !visible;
}

/** Base58 is case sensitive, so an address must never pick up the uppercase
    the label styling around it applies. The attribute is only set while the
    element holds an address, so `Coming Soon` stays in capitals. */
export function markAddress(el, holdsAddress) {
  if (!el) return;
  if (holdsAddress) el.dataset.address = '';
  else delete el.dataset.address;
}

/**
 * Token mint strip.
 *
 * empty  value reads `Coming Soon`, copy button present in a disabled state,
 *        clicking it announces `Not live yet` and copies nothing, explorer link
 *        hidden.
 * filled anything in KERB_TOKEN_MINT reads truncated, copy button active and
 *        copies the full value, announces `Copied`. The explorer link shows
 *        only when the value is a real Solana key.
 */
function renderTokenStrip(config, root) {
  const strip = root.querySelector('[data-token-strip]');
  if (!strip) return;

  const address = tokenMintText(config);
  const live = Boolean(address);

  const valueEl = strip.querySelector('[data-token-value]');
  const copyEl = strip.querySelector('[data-token-copy]');
  const linkEl = strip.querySelector('[data-token-link]');

  if (valueEl) {
    valueEl.textContent = live ? truncate(address) : COPY.tokenEmpty;
    markAddress(valueEl, live);
    if (live) valueEl.title = address;
  }

  if (copyEl) {
    copyEl.setAttribute('aria-disabled', String(!live));
    /* The accessible name has to contain the visible text, WCAG 2.5.3. The
       inert state is carried by aria-disabled, not by the name. */
    copyEl.setAttribute('aria-label', 'Copy token mint address');
    attachCopy(copyEl, () => (live ? address : ''), {
      emptyMessage: COPY.notLive,
      successMessage: COPY.copied,
    });
  }

  if (linkEl) {
    const url = explorerAddressUrl(config, address);
    show(linkEl, live && Boolean(url));
    if (url) linkEl.setAttribute('href', url);
  }
}

/**
 * On chain rows: the Kerb program and the token mint.
 *
 * empty  value reads `Not deployed` for the program and `Coming Soon` for the
 *        mint, copy hidden, explorer hidden.
 * valid  value reads truncated, copy active, explorer shown.
 */
function renderProgram(config, root) {
  const section = root.querySelector('[data-program-section]');

  if (config?.flags?.showProgramSection === false) {
    section?.remove();
    root.querySelectorAll('[data-program-rule], [data-program-label]').forEach((el) => el.remove());
    return;
  }
  if (!section) return;

  const entries = {
    program: { address: programId(config), empty: COPY.programEmpty, label: 'Copy program ID' },
    mint: { address: tokenMintText(config), empty: COPY.tokenEmpty, label: 'Copy token mint address' },
  };

  section.querySelectorAll('[data-account]').forEach((row) => {
    const entry = entries[row.dataset.account];
    if (!entry) return;
    const { address } = entry;
    const live = Boolean(address);

    const valueEl = row.querySelector('[data-account-value]');
    const copyEl = row.querySelector('[data-account-copy]');
    const linkEl = row.querySelector('[data-account-link]');

    if (valueEl) {
      valueEl.textContent = live ? truncate(address) : entry.empty;
      markAddress(valueEl, live);
      if (live) valueEl.title = address;
    }

    show(copyEl, live);
    if (copyEl && live) {
      attachCopy(copyEl, () => address, {
        successMessage: COPY.copied,
        label: entry.label,
      });
    }

    const url = explorerAddressUrl(config, address);
    show(linkEl, live && Boolean(url));
    if (linkEl && url) linkEl.setAttribute('href', url);
  });

  root.querySelectorAll('[data-network-name]').forEach((el) => {
    el.textContent = networkInfo(config).label;
  });
}

/** Any empty links.* entry has its footer link removed from the DOM. A group
    left with no links goes too, so no orphan heading is left behind. */
function renderLinks(config, root) {
  root.querySelectorAll('[data-link]').forEach((el) => {
    const key = el.dataset.link;
    const url = config?.links?.[key] ?? '';
    if (!url) {
      el.remove();
      return;
    }
    el.setAttribute('href', url);
  });

  root.querySelectorAll('[data-link-group]').forEach((group) => {
    if (!group.querySelector('[data-link]')) group.remove();
  });
}

/** flags.appEnabled false disables every Open App control. */
function renderAppGate(config, root) {
  const enabled = config?.flags?.appEnabled !== false;
  root.querySelectorAll('[data-app-link]').forEach((el) => {
    if (enabled) return;
    el.setAttribute('aria-disabled', 'true');
    el.removeAttribute('href');
    el.addEventListener('click', (event) => event.preventDefault());
  });
}

/** meta.siteUrl fills the canonical link and the og:url. Empty removes both. */
function renderMeta(config, root) {
  const siteUrl = config?.meta?.siteUrl ?? '';
  root.querySelectorAll('[data-site-url]').forEach((el) => {
    if (!siteUrl) {
      /* Only drop the ones that would otherwise be empty. A tag that already
         carries a working relative value is better than no tag: crawlers read
         the raw HTML and never run this function, so removing it here would
         take away the only version they ever see. */
      const existing = el.tagName === 'META' ? el.getAttribute('content') : el.getAttribute('href');
      if (!existing) el.remove();
      return;
    }
    const path = el.dataset.siteUrl || '';
    const value = `${siteUrl.replace(/\/$/, '')}${path}`;
    if (el.tagName === 'META') el.setAttribute('content', value);
    else el.setAttribute('href', value);
  });
}

export async function applyConfig(root = document) {
  const config = await loadConfig();
  renderMeta(config, root);
  renderTokenStrip(config, root);
  renderProgram(config, root);
  renderLinks(config, root);
  renderAppGate(config, root);
  return config;
}
