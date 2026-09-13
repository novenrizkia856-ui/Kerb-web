/* config.js
   The only place the site learns about addresses, chains and links.
   Implements brief section 9: the render rules in 9.2, the validator in 9.3 and
   the truncation helper in 9.4. Nothing here throws and nothing here blanks the
   page. Every failure is a console.warn and a safe fallback. */

import { attachCopy } from '../assets/js/copy.js';

const CONFIG_URL = new URL('./kerb.config.json', import.meta.url);

const ADDRESS_SHAPE = /^0x[a-fA-F0-9]{40}$/;

export const COPY = {
  tokenEmpty: 'Coming Soon',
  contractEmpty: 'Not deployed',
  notLive: 'Not live yet',
  copied: 'Copied',
};

/* --- 9.4 truncation ---------------------------------------------------------
   First six characters, the ellipsis character, the last four. */
export function truncate(address) {
  if (typeof address !== 'string' || address.length <= 10) return address ?? '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function isAddress(value) {
  return typeof value === 'string' && ADDRESS_SHAPE.test(value);
}

/* --- fallback ---------------------------------------------------------------
   Used when the config file cannot be read at all. Every address stays empty so
   the page renders its `Coming Soon` and `Not deployed` states rather than
   nothing. */
const FALLBACK = {
  meta: { productName: 'Kerb', siteUrl: '', ogTitle: 'Kerb', ogDescription: '' },
  chain: {
    id: 0,
    name: '',
    rpcUrl: '',
    explorerBaseUrl: '',
    explorerAddressPath: '/address/',
    explorerTxPath: '/tx/',
    nativeCurrency: { name: '', symbol: '', decimals: 18 },
  },
  contracts: {
    core: { address: '', deployBlock: null, verified: false },
    lens: { address: '', deployBlock: null, verified: false },
  },
  token: { address: '', symbol: '', decimals: 18 },
  defaults: { dwellSeconds: 900, minDwellSeconds: 60, maxDwellSeconds: 604800 },
  links: { x: '', github: '', docs: '' },
  flags: { appEnabled: true, appMode: 'mock', showContractsSection: true },
  wallet: { walletConnectProjectId: '', enabled: true },
};

/* --- 9.3 validation ---------------------------------------------------------
   One console.warn per failure. Never throws. */
export function validate(config) {
  const warn = (message) => console.warn(`[kerb.config] ${message}`);

  const addressFields = [
    ['token.address', config?.token?.address],
    ['contracts.core.address', config?.contracts?.core?.address],
    ['contracts.lens.address', config?.contracts?.lens?.address],
  ];

  for (const [path, value] of addressFields) {
    if (value === '' || value === null || value === undefined) continue;
    if (!isAddress(value)) warn(`${path} is not a valid address: ${String(value)}`);
  }

  const chainId = config?.chain?.id;
  if (!Number.isInteger(chainId) || chainId <= 0) {
    warn(`chain.id must be a positive integer, received: ${String(chainId)}`);
  }

  const explorer = config?.chain?.explorerBaseUrl;
  if (explorer && !String(explorer).startsWith('https://')) {
    warn(`chain.explorerBaseUrl must start with https:// when set, received: ${String(explorer)}`);
  }

  const rpc = config?.chain?.rpcUrl;
  if (rpc && !String(rpc).startsWith('https://')) {
    warn(`chain.rpcUrl must start with https:// when set, received: ${String(rpc)}`);
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

/* --- explorer links -------------------------------------------------------- */

export function explorerAddressUrl(config, address) {
  const base = config?.chain?.explorerBaseUrl;
  if (!base || !isAddress(address)) return '';
  const path = config?.chain?.explorerAddressPath ?? '/address/';
  return `${String(base).replace(/\/$/, '')}${path}${address}`;
}

/* --- 9.2 render rules ------------------------------------------------------ */

function show(el, visible) {
  if (!el) return;
  el.hidden = !visible;
}

/**
 * Token CA strip.
 *
 * empty  value reads `Coming Soon`, copy button present in a disabled state,
 *        clicking it announces `Not live yet` and copies nothing, explorer link
 *        hidden.
 * valid  value reads truncated, copy button active and copies the full address,
 *        announces `Copied`, explorer link shown.
 */
function renderTokenStrip(config, root) {
  const strip = root.querySelector('[data-token-strip]');
  if (!strip) return;

  const address = config?.token?.address ?? '';
  const live = isAddress(address);

  const valueEl = strip.querySelector('[data-token-value]');
  const copyEl = strip.querySelector('[data-token-copy]');
  const linkEl = strip.querySelector('[data-token-link]');

  if (valueEl) {
    valueEl.textContent = live ? truncate(address) : COPY.tokenEmpty;
  }

  if (copyEl) {
    copyEl.setAttribute('aria-disabled', String(!live));
    /* The accessible name has to contain the visible text, WCAG 2.5.3. The
       inert state is carried by aria-disabled, not by the name. */
    copyEl.setAttribute('aria-label', 'Copy token address');
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
 * Contract rows.
 *
 * empty  value reads `Not deployed`, copy hidden, explorer hidden.
 * valid  value reads truncated, copy active, explorer shown.
 */
function renderContracts(config, root) {
  const section = root.querySelector('[data-contracts]');

  if (config?.flags?.showContractsSection === false) {
    section?.remove();
    return;
  }
  if (!section) return;

  section.querySelectorAll('[data-contract]').forEach((row) => {
    const key = row.dataset.contract;
    const address = config?.contracts?.[key]?.address ?? '';
    const live = isAddress(address);

    const valueEl = row.querySelector('[data-contract-value]');
    const copyEl = row.querySelector('[data-contract-copy]');
    const linkEl = row.querySelector('[data-contract-link]');

    if (valueEl) valueEl.textContent = live ? truncate(address) : COPY.contractEmpty;

    show(copyEl, live);
    if (copyEl && live) {
      attachCopy(copyEl, () => address, {
        successMessage: COPY.copied,
        label: `Copy ${key} address`,
      });
    }

    const url = explorerAddressUrl(config, address);
    show(linkEl, live && Boolean(url));
    if (linkEl && url) linkEl.setAttribute('href', url);
  });

  root.querySelectorAll('[data-chain-name]').forEach((el) => {
    el.textContent = config?.chain?.name ?? '';
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
  renderContracts(config, root);
  renderLinks(config, root);
  renderAppGate(config, root);
  return config;
}
