/* wallet.js
   Wallet connection for the Kerb app shell.

   Two ways in, and the order matters.

   EIP-6963 first. Wallets announce themselves on an event rather than fighting
   over `window.ethereum`, so a browser with three extensions installed offers
   three choices instead of whichever one won the race. Nothing is imported to
   make this work: it is a browser event and a provider object.

   WalletConnect second, and only if `wallet.walletConnectProjectId` is set in
   kerb.config.json. It is loaded from a CDN at click time, not at page load, so
   a visitor who uses an extension never downloads it.

   On the project id: it is not a secret. It travels to the browser on every
   session and anyone can read it in devtools. What protects it is the domain
   allowlist in the WalletConnect dashboard, which is why it lives in the public
   config file rather than in an environment variable. A static site has no
   build step to substitute an env var into anyway.

   Nothing here signs anything. Connecting, reading the account, and switching
   chain are the whole surface. */

/* The `+esm` suffix matters and is not interchangeable with the package's own
   `dist/index.es.js`. That file begins `import { EventEmitter } from "events"`,
   a bare specifier Node resolves and a browser cannot, so importing it fails
   with a module resolution TypeError before any WalletConnect code runs. The
   `+esm` build is bundled by jsDelivr: no bare specifiers, and its remaining
   imports are absolute paths on the same CDN origin. */
const WC_CDN = 'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.17.0/+esm';

/* --- chain ------------------------------------------------------------------
   Built from config so there is one source of truth for the chain id, and a
   mismatch between what the site thinks it is talking to and what the wallet
   is pointed at cannot happen silently. */
function chainParams(config) {
  const id = Number(config?.chain?.id ?? 0);
  if (!id) return null;
  const currency = config?.chain?.nativeCurrency ?? {};
  return {
    chainId: `0x${id.toString(16)}`,
    chainName: config?.chain?.name || `Chain ${id}`,
    nativeCurrency: {
      name: currency.name || 'Ether',
      symbol: currency.symbol || 'ETH',
      decimals: Number(currency.decimals ?? 18),
    },
    rpcUrls: [config?.chain?.rpcUrl].filter(Boolean),
    blockExplorerUrls: [config?.chain?.explorerBaseUrl].filter(Boolean),
  };
}

/* --- EIP-6963 discovery -----------------------------------------------------
   Wallets respond to the request event synchronously, so a short window is
   enough. Resolving on a timer rather than waiting for a count means a browser
   with no wallet at all does not hang the button. */
const discovered = new Map();

function startDiscovery() {
  if (typeof window === 'undefined') return;
  window.addEventListener('eip6963:announceProvider', (event) => {
    const detail = event.detail;
    if (!detail?.info?.uuid || !detail?.provider) return;
    discovered.set(detail.info.uuid, detail);
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

startDiscovery();

export function listInjected() {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  const found = [...discovered.values()].map((d) => ({
    id: d.info.uuid,
    name: d.info.name,
    icon: d.info.rdns ? d.info.icon : '',
    provider: d.provider,
  }));

  /* A wallet that predates EIP-6963 only ever sets window.ethereum. Include it,
     but not twice: if anything announced itself, the announcements are better
     information than the global. */
  if (!found.length && window.ethereum) {
    found.push({ id: 'injected', name: 'Browser wallet', icon: '', provider: window.ethereum });
  }
  return found;
}

/* --- state ------------------------------------------------------------------ */

const state = {
  provider: null,
  account: '',
  chainId: 0,
  walletName: '',
};

const listeners = new Set();

export function onWalletChange(fn) {
  listeners.add(fn);
  fn(snapshot());
  return () => listeners.delete(fn);
}

function snapshot() {
  return {
    connected: Boolean(state.account),
    account: state.account,
    chainId: state.chainId,
    walletName: state.walletName,
  };
}

function emit() {
  const s = snapshot();
  for (const fn of listeners) {
    try {
      fn(s);
    } catch (error) {
      console.warn('[kerb.wallet] listener threw:', error);
    }
  }
}

function bind(provider) {
  if (!provider?.on) return;
  provider.on('accountsChanged', (accounts) => {
    state.account = accounts?.[0] ?? '';
    if (!state.account) reset();
    else emit();
  });
  provider.on('chainChanged', (hex) => {
    state.chainId = Number.parseInt(hex, 16) || 0;
    emit();
  });
  provider.on('disconnect', () => reset());
}

function reset() {
  state.provider = null;
  state.account = '';
  state.chainId = 0;
  state.walletName = '';
  try {
    window.localStorage.removeItem('kerb-wallet');
  } catch {
    /* storage can be unavailable; the session still disconnects */
  }
  emit();
}

/* --- connecting -------------------------------------------------------------
   Every failure here is returned, never thrown at the caller's feet. A user
   who closes the wallet popup has not caused an error worth a stack trace, and
   the button has to go back to its resting state either way. */

export async function connectInjected(entry, config) {
  const provider = entry?.provider;
  if (!provider) return { ok: false, reason: 'No wallet found.' };

  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (!accounts?.length) return { ok: false, reason: 'No account was shared.' };

    state.provider = provider;
    state.account = accounts[0];
    state.walletName = entry.name || 'Wallet';

    const hex = await provider.request({ method: 'eth_chainId' });
    state.chainId = Number.parseInt(hex, 16) || 0;

    bind(provider);
    try {
      window.localStorage.setItem('kerb-wallet', entry.id);
    } catch {
      /* remembering the choice is a convenience, not a requirement */
    }
    emit();

    const wanted = Number(config?.chain?.id ?? 0);
    if (wanted && state.chainId !== wanted) {
      await switchChain(config);
    }
    return { ok: true };
  } catch (error) {
    if (error?.code === 4001) return { ok: false, reason: 'Connection rejected.' };
    return { ok: false, reason: error?.message || 'Could not connect.' };
  }
}

export async function connectWalletConnect(config) {
  const projectId = config?.wallet?.walletConnectProjectId ?? '';
  if (!projectId) {
    return { ok: false, reason: 'WalletConnect is not configured.' };
  }

  const params = chainParams(config);
  if (!params) return { ok: false, reason: 'No chain configured.' };

  try {
    const { EthereumProvider } = await import(/* @vite-ignore */ WC_CDN);
    const provider = await EthereumProvider.init({
      projectId,
      chains: [Number(config.chain.id)],
      optionalChains: [Number(config.chain.id)],
      showQrModal: true,
      rpcMap: { [Number(config.chain.id)]: config.chain.rpcUrl },
      metadata: {
        name: config?.meta?.productName || 'Kerb',
        description: config?.meta?.ogDescription || '',
        url: window.location.origin,
        icons: [`${window.location.origin}/assets/img/icon.svg`],
      },
    });

    await provider.connect();
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (!accounts?.length) return { ok: false, reason: 'No account was shared.' };

    state.provider = provider;
    state.account = accounts[0];
    state.walletName = 'WalletConnect';
    state.chainId = Number(provider.chainId) || Number(config.chain.id);

    bind(provider);
    emit();
    return { ok: true };
  } catch (error) {
    if (error?.code === 4001) return { ok: false, reason: 'Connection rejected.' };
    /* The CDN import is the fragile part of this path, so a failure here is
       reported as what it is rather than as a wallet problem. The message the
       browser gives for an unresolvable module is unhelpful on its own, so the
       real one goes to the console for whoever is debugging it. */
    if (error instanceof TypeError) {
      console.warn('[kerb.wallet] WalletConnect module failed to load:', error);
      return { ok: false, reason: 'WalletConnect could not be loaded. Check the console.' };
    }
    return { ok: false, reason: error?.message || 'Could not connect.' };
  }
}

export async function disconnect() {
  const provider = state.provider;
  try {
    if (provider?.disconnect) await provider.disconnect();
  } catch {
    /* a provider that will not let go is still gone as far as this page is
       concerned, so fall through to the local reset */
  }
  reset();
}

/* --- chain switching --------------------------------------------------------
   Try to switch, and if the wallet has never heard of the chain, add it and
   switch again. 4902 is the code for "unrecognised chain". */
export async function switchChain(config) {
  const provider = state.provider;
  const params = chainParams(config);
  if (!provider || !params) return { ok: false, reason: 'Not connected.' };

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: params.chainId }],
    });
    state.chainId = Number(config.chain.id);
    emit();
    return { ok: true };
  } catch (error) {
    if (error?.code === 4902 || error?.data?.originalError?.code === 4902) {
      try {
        await provider.request({ method: 'wallet_addEthereumChain', params: [params] });
        state.chainId = Number(config.chain.id);
        emit();
        return { ok: true };
      } catch (addError) {
        return { ok: false, reason: addError?.message || 'Could not add the network.' };
      }
    }
    if (error?.code === 4001) return { ok: false, reason: 'Network switch rejected.' };
    return { ok: false, reason: error?.message || 'Could not switch network.' };
  }
}

/* --- reconnecting -----------------------------------------------------------
   Only ever silent. `eth_accounts` does not prompt, so a visitor who has not
   authorised this site sees nothing, and one who has is picked up where they
   left off. */
export async function restore(config) {
  let remembered = '';
  try {
    remembered = window.localStorage.getItem('kerb-wallet') || '';
  } catch {
    return { ok: false };
  }
  if (!remembered) return { ok: false };

  const entry = listInjected().find((w) => w.id === remembered);
  if (!entry) return { ok: false };

  try {
    const accounts = await entry.provider.request({ method: 'eth_accounts' });
    if (!accounts?.length) return { ok: false };

    state.provider = entry.provider;
    state.account = accounts[0];
    state.walletName = entry.name || 'Wallet';
    const hex = await entry.provider.request({ method: 'eth_chainId' });
    state.chainId = Number.parseInt(hex, 16) || 0;
    bind(entry.provider);
    emit();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function getState() {
  return snapshot();
}

/** The raw EIP-1193 provider, for `kerb.js` to send its own requests through.
    Null when nothing is connected, so every caller has to decide what to do
    about that rather than getting a stub that silently fails. */
export function getProvider() {
  return state.provider;
}

export function isOnKerbChain(config) {
  const wanted = Number(config?.chain?.id ?? 0);
  return Boolean(wanted) && state.chainId === wanted;
}

/* --- reads ------------------------------------------------------------------
   `eth_call` through the connected wallet, so a read uses the same node the
   user's wallet uses and there is no second RPC to configure or rate limit.

   Deliberately hand rolled rather than pulling in an ABI encoder: the app needs
   four reads, all of them taking one or two addresses and returning one word.
   A library for that is more surface than the thing it replaces. */

function padAddress(address) {
  return String(address).replace(/^0x/, '').toLowerCase().padStart(64, '0');
}

export async function call(to, selector, args = []) {
  const provider = state.provider;
  if (!provider) return null;
  const data = `0x${selector}${args.map(padAddress).join('')}`;
  try {
    return await provider.request({ method: 'eth_call', params: [{ to, data }, 'latest'] });
  } catch (error) {
    console.warn('[kerb.wallet] eth_call failed:', error);
    return null;
  }
}
