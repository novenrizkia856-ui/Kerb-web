/* wallet.js
   Solana wallet connection for the Kerb app shell.

   Two ways in, and the order matters.

   Wallet Standard first. Phantom, Solflare, Backpack and most other Solana
   wallets register themselves on a browser event rather than fighting over a
   window global, so a browser with three extensions installed offers three
   choices instead of whichever one won the race. This is the same discovery
   @solana/wallet-adapter runs underneath; the event protocol is small enough
   that nothing needs importing to take part in it, which suits a site with no
   bundler.

   Injected globals second, for a wallet old enough to predate the standard
   (`window.phantom.solana`, `window.solflare`, `window.backpack`). Only used
   for a wallet that did not register itself, so nothing is offered twice.

   What this file does NOT do, on purpose: sign. It never reads the
   `solana:signTransaction`, `solana:signAndSendTransaction`,
   `solana:signMessage` or `solana:signIn` features of a wallet, and it never
   calls `signTransaction`, `signAllTransactions` or `sendTransaction` on an
   injected provider. Connecting, reading the public key and disconnecting are
   the whole surface. Kerb's Solana program is not live, so there is nothing
   for a wallet to sign, and the safest way to guarantee nothing is signed is
   for no code path to ask. */

/* --- the wallets this page will suggest when none is installed --------------- */
export const SUGGESTED_WALLETS = [
  { name: 'Phantom', url: 'https://phantom.com/download' },
  { name: 'Solflare', url: 'https://solflare.com/download' },
  { name: 'Backpack', url: 'https://backpack.app/downloads' },
];

/* --- Wallet Standard discovery ------------------------------------------------
   The page announces `wallet-standard:app-ready` with a `register` function,
   and every wallet already loaded calls it. A wallet that loads later fires
   `wallet-standard:register-wallet` with a callback, and the page hands the
   same `register` to it. Either order ends in the same place. */

const discovered = new Map();

function isSolanaWallet(wallet) {
  return (
    typeof wallet?.name === 'string' &&
    Array.isArray(wallet.chains) &&
    wallet.chains.some((chain) => String(chain).startsWith('solana:')) &&
    typeof wallet.features?.['standard:connect']?.connect === 'function'
  );
}

/** The first account on a Solana chain, or the first account at all. */
function pickAccount(accounts) {
  const list = Array.isArray(accounts) ? accounts : [];
  const solana = list.find((a) => a?.chains?.some?.((c) => String(c).startsWith('solana:')));
  return String((solana ?? list[0])?.address ?? '');
}

function standardEntry(wallet) {
  return {
    id: `standard:${wallet.name}`,
    name: wallet.name,
    icon: typeof wallet.icon === 'string' ? wallet.icon : '',
    async connect({ silent = false } = {}) {
      const feature = wallet.features['standard:connect'];
      const result = await feature.connect(silent ? { silent: true } : undefined);
      return pickAccount(result?.accounts ?? wallet.accounts);
    },
    async disconnect() {
      await wallet.features['standard:disconnect']?.disconnect?.();
    },
    subscribe(fn) {
      const off = wallet.features['standard:events']?.on?.('change', (changes) => {
        if (changes && 'accounts' in changes) fn(pickAccount(changes.accounts));
      });
      return typeof off === 'function' ? off : () => {};
    },
  };
}

const registry = Object.freeze({
  register(...wallets) {
    for (const wallet of wallets) {
      if (!isSolanaWallet(wallet)) continue;
      discovered.set(wallet.name, standardEntry(wallet));
    }
    return () => {
      for (const wallet of wallets) discovered.delete(wallet?.name);
    };
  },
});

function startDiscovery() {
  if (typeof window === 'undefined') return;
  window.addEventListener('wallet-standard:register-wallet', (event) => {
    try {
      event.detail?.(registry);
    } catch (error) {
      console.warn('[kerb.wallet] a wallet failed to register:', error);
    }
  });
  try {
    window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: registry }));
  } catch (error) {
    console.warn('[kerb.wallet] wallet discovery could not start:', error);
  }
}

startDiscovery();

/* --- injected fallback -------------------------------------------------------- */

function keyToString(key) {
  if (!key) return '';
  return String(typeof key.toBase58 === 'function' ? key.toBase58() : key);
}

function injectedEntry(name, provider) {
  return {
    id: `injected:${name}`,
    name,
    icon: '',
    async connect({ silent = false } = {}) {
      const result = await provider.connect(silent ? { onlyIfTrusted: true } : undefined);
      return keyToString(result?.publicKey ?? provider.publicKey);
    },
    async disconnect() {
      await provider.disconnect?.();
    },
    subscribe(fn) {
      /* A null key on accountChanged means the wallet moved to an account this
         site was never shown. Treated as a disconnect rather than guessed at. */
      const onAccount = (key) => fn(keyToString(key));
      const onDisconnect = () => fn('');
      provider.on?.('accountChanged', onAccount);
      provider.on?.('disconnect', onDisconnect);
      return () => {
        const off = provider.off ?? provider.removeListener;
        off?.call(provider, 'accountChanged', onAccount);
        off?.call(provider, 'disconnect', onDisconnect);
      };
    },
  };
}

function injectedWallets() {
  if (typeof window === 'undefined') return [];
  const found = [];
  const candidates = [
    ['Phantom', window.phantom?.solana],
    ['Solflare', window.solflare],
    ['Backpack', window.backpack],
  ];
  for (const [name, provider] of candidates) {
    if (provider && typeof provider.connect === 'function') found.push(injectedEntry(name, provider));
  }
  /* The generic global, only when nothing more specific was found. */
  if (!found.length && window.solana && typeof window.solana.connect === 'function') {
    found.push(injectedEntry('Solana wallet', window.solana));
  }
  return found;
}

export function listWallets() {
  const standard = [...discovered.values()];
  const names = new Set(standard.map((w) => w.name.toLowerCase()));
  const legacy = injectedWallets().filter((w) => !names.has(w.name.toLowerCase()));
  return [...standard, ...legacy];
}

/* --- state -------------------------------------------------------------------- */

const state = {
  entry: null,
  account: '',
  walletName: '',
  unsubscribe: null,
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

function reset() {
  state.unsubscribe?.();
  state.entry = null;
  state.account = '';
  state.walletName = '';
  state.unsubscribe = null;
  try {
    window.localStorage.removeItem('kerb-wallet');
  } catch {
    /* storage can be unavailable; the session still disconnects */
  }
  emit();
}

function adopt(entry, account) {
  state.unsubscribe?.();
  state.entry = entry;
  state.account = account;
  state.walletName = entry.name || 'Wallet';
  state.unsubscribe = entry.subscribe((next) => {
    if (!next) {
      reset();
      return;
    }
    state.account = next;
    emit();
  });
  try {
    window.localStorage.setItem('kerb-wallet', entry.name);
  } catch {
    /* remembering the choice is a convenience, not a requirement */
  }
  emit();
}

/* --- connecting ------------------------------------------------------------------
   Every failure here is returned, never thrown at the caller's feet. A user
   who closes the wallet popup has not caused an error worth a stack trace, and
   the button has to go back to its resting state either way. The raw error
   goes to the console for whoever is debugging; the person gets a sentence. */

function friendly(error) {
  const text = String(error?.message ?? '').toLowerCase();
  if (error?.code === 4001 || text.includes('reject') || text.includes('denied')) {
    return 'Connection rejected.';
  }
  return 'Could not connect to that wallet.';
}

export async function connect(entry) {
  if (!entry) return { ok: false, reason: 'No wallet found.' };
  try {
    const account = await entry.connect();
    if (!account) return { ok: false, reason: 'No account was shared.' };
    adopt(entry, account);
    return { ok: true };
  } catch (error) {
    console.warn('[kerb.wallet] connect failed:', error);
    return { ok: false, reason: friendly(error) };
  }
}

export async function disconnect() {
  const entry = state.entry;
  try {
    await entry?.disconnect();
  } catch {
    /* a wallet that will not let go is still gone as far as this page is
       concerned, so fall through to the local reset */
  }
  reset();
}

/* --- reconnecting -----------------------------------------------------------------
   Only ever silent. A silent connect does not prompt, so a visitor who has not
   authorised this site sees nothing, and one who has is picked up where they
   left off. Wallets can register a beat after the page loads, so the
   remembered one is given a short while to appear. */
export async function restore() {
  let remembered = '';
  try {
    remembered = window.localStorage.getItem('kerb-wallet') || '';
  } catch {
    return { ok: false };
  }
  if (!remembered) return { ok: false };

  let entry = null;
  for (let waited = 0; waited <= 1000 && !entry; waited += 100) {
    entry = listWallets().find((w) => w.name === remembered) ?? null;
    if (!entry) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!entry) return { ok: false };

  try {
    const account = await entry.connect({ silent: true });
    if (!account) return { ok: false };
    adopt(entry, account);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function getState() {
  return snapshot();
}
