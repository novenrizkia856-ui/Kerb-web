/* solana.js
   Everything the site knows about Solana itself, as opposed to about Kerb.

   The values come from the `solana` block of kerb.config.json. The keys there
   are named after the environment variables a framework build would use
   (NEXT_PUBLIC_SOLANA_RPC_URL and so on) so the mapping is obvious, but this is
   a static site with no build step to substitute an env var into, so the JSON
   file is the source of truth. `tools/solana-env.py` copies env vars into it
   for anyone who would rather keep them in a .env file.

   Nothing here signs, sends or builds a transaction. Reading a key, shaping an
   explorer link and naming a cluster is the whole surface. */

/* --- clusters ---------------------------------------------------------------
   `mainnet-beta` is the name Solana's own tooling uses, and the one the
   explorer's `cluster` query parameter expects, so it is the name used here. */
export const NETWORKS = {
  'mainnet-beta': {
    label: 'Solana Mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerCluster: '',
  },
  devnet: {
    label: 'Solana Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    explorerCluster: 'devnet',
  },
  testnet: {
    label: 'Solana Testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    explorerCluster: 'testnet',
  },
};

export const DEFAULT_NETWORK = 'mainnet-beta';

/* SOL is fixed by the runtime, not by configuration. */
export const SOL = { symbol: 'SOL', decimals: 9 };

/* The two token programs a wallet can hold SPL balances under. Public, fixed
   program ids, not Kerb's. */
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

/* Labels for a handful of well known mainnet mints, so a wallet's USDC reads as
   USDC rather than as a truncated key. Display only: nothing is decided on the
   strength of a label, and an unknown mint shows its own address. */
const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';

const KNOWN_MINTS = {
  'mainnet-beta': {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
  },
};

/* --- reading the config ----------------------------------------------------- */

export function solanaConfig(config) {
  return config?.solana ?? {};
}

export function network(config) {
  const value = solanaConfig(config).SOLANA_NETWORK;
  return NETWORKS[value] ? value : DEFAULT_NETWORK;
}

export function networkInfo(config) {
  return NETWORKS[network(config)];
}

/** The configured RPC endpoint, or the cluster's public one when none is set.

    Devnet and testnet's public endpoints answer a browser. Mainnet's does not:
    api.mainnet-beta.solana.com returns 403 to any request carrying a browser
    origin, so on mainnet SOLANA_RPC_URL has to name a provider endpoint that
    allows this site's domain. Until it does, every balance reads as
    unavailable and nothing else changes. */
export function rpcUrl(config) {
  return solanaConfig(config).SOLANA_RPC_URL || networkInfo(config).rpcUrl;
}

export function tokenMint(config) {
  const value = solanaConfig(config).KERB_TOKEN_MINT ?? '';
  return isPublicKey(value) ? value : '';
}

export function tokenSymbol(config) {
  return solanaConfig(config).KERB_TOKEN_SYMBOL || 'KERB';
}

export function programId(config) {
  const value = solanaConfig(config).KERB_PROGRAM_ID ?? '';
  return isPublicKey(value) ? value : '';
}

export function mintLabel(config, mint) {
  if (mint && mint === tokenMint(config)) return tokenSymbol(config);
  /* The wrapped SOL mint is the same key on every cluster. */
  if (mint === WRAPPED_SOL_MINT) return 'wSOL';
  return KNOWN_MINTS[network(config)]?.[mint] ?? '';
}

/* --- keys ---------------------------------------------------------------------
   A Solana public key is 32 bytes written in base58, which comes out at 32 to
   44 characters. A string of base58 characters is not enough on its own: plenty
   of 44 character strings decode to 33 bytes. Decoding is the only honest
   check, and it is small enough to do by hand rather than import. */

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_SHAPE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function base58Decode(text) {
  let value = 0n;
  for (const char of text) {
    const digit = BASE58.indexOf(char);
    if (digit < 0) return null;
    value = value * 58n + BigInt(digit);
  }
  const bytes = [];
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn));
    value >>= 8n;
  }
  for (const char of text) {
    if (char !== '1') break;
    bytes.unshift(0);
  }
  return bytes;
}

export function isPublicKey(value) {
  if (typeof value !== 'string' || !BASE58_SHAPE.test(value)) return false;
  return base58Decode(value)?.length === 32;
}

/* --- explorer ------------------------------------------------------------------
   Solana Explorer's layout: `/address/<key>` for wallets, programs and mints
   alike, and `?cluster=` for anything that is not mainnet. Built from config so
   a devnet build never links to mainnet. There is no transaction link because
   this site never produces a transaction signature to link to. */

export function explorerAddressUrl(config, address) {
  const base = String(solanaConfig(config).EXPLORER_BASE_URL || '').replace(/\/$/, '');
  if (!base || !isPublicKey(address)) return '';
  const cluster = networkInfo(config).explorerCluster;
  const query = cluster ? `?cluster=${cluster}` : '';
  return `${base}/address/${address}${query}`;
}
