/* solana-read.js
   Read-only Solana JSON-RPC, and nothing else.

   Three reads cover everything the app shows: the SOL balance of the connected
   key, the SPL token accounts it owns under both token programs, and the
   decimals of a mint. All three are plain `fetch` calls against the configured
   RPC. A library for that would be more surface than the thing it replaces,
   and would bring transaction building along with it, which this site has no
   use for.

   There is no `sendTransaction`, `simulateTransaction` or
   `requestAirdrop` here, and no function that takes a transaction. Reading is
   the whole of it. */

import {
  SOL,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  mintLabel,
  rpcUrl,
} from '../../config/solana.js';

let requestId = 0;

async function rpc(config, method, params) {
  requestId += 1;
  const response = await fetch(rpcUrl(config), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }),
  });
  if (!response.ok) throw new Error(`RPC ${method} answered HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`RPC ${method}: ${body.error.message ?? 'error'}`);
  return body.result;
}

/** Lamports, as a BigInt. */
export async function solBalance(config, owner) {
  const result = await rpc(config, 'getBalance', [owner, { commitment: 'confirmed' }]);
  return BigInt(result?.value ?? 0);
}

/**
 * Every SPL token the key holds a non zero balance of, one row per mint,
 * across the classic token program and Token-2022.
 *
 * @returns {Promise<Array<{ mint: string, amount: bigint, decimals: number, symbol: string }>>}
 */
export async function tokenBalances(config, owner) {
  const programs = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];
  const answers = await Promise.all(
    programs.map((programId) =>
      rpc(config, 'getTokenAccountsByOwner', [
        owner,
        { programId },
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ]).catch((error) => {
        /* One program failing should not blank the other's balances. */
        console.warn('[kerb.read] token accounts could not be read:', error);
        return { value: [] };
      }),
    ),
  );

  const byMint = new Map();
  for (const answer of answers) {
    for (const account of answer?.value ?? []) {
      const info = account?.account?.data?.parsed?.info;
      const mint = info?.mint;
      const raw = info?.tokenAmount?.amount;
      if (!mint || raw === undefined) continue;
      const amount = BigInt(raw);
      const decimals = Number(info.tokenAmount.decimals ?? 0);
      const existing = byMint.get(mint);
      if (existing) existing.amount += amount;
      else byMint.set(mint, { mint, amount, decimals, symbol: mintLabel(config, mint) });
    }
  }
  return [...byMint.values()].filter((t) => t.amount > 0n);
}

/** A mint's decimals, or null when the key is not a mint. */
export async function mintDecimals(config, mint) {
  const result = await rpc(config, 'getTokenSupply', [mint]);
  const decimals = result?.value?.decimals;
  return Number.isInteger(decimals) ? decimals : null;
}

/* --- units ---------------------------------------------------------------------
   Amounts are integers of the smallest unit throughout, and only become
   decimal text at the edge. A float would turn 0.1 SOL into 99999999 lamports
   somewhere along the way. */

export function parseUnits(value, decimals) {
  const text = String(value ?? '').trim();
  if (!/^\d*(\.\d*)?$/.test(text) || text === '' || text === '.') {
    throw new Error('That amount is not a number.');
  }
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals) {
    throw new Error(`That token has ${decimals} decimal places at most.`);
  }
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0');
}

export function formatUnits(value, decimals, maxFractionDigits = 6) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  let fraction = (value % base).toString().padStart(decimals, '0').slice(0, maxFractionDigits);
  fraction = fraction.replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export { SOL };
