/* app-mock.js
   MOCK DATA ONLY. Nothing in this file touches a wallet, an RPC endpoint or a
   program. The public keys below are invented for the demo and are the only
   address shaped strings anywhere in this repository outside config/, the
   hero figures and the documentation's illustrations.

   The countdown runs at MOCK_DWELL_SECONDS rather than the configured
   defaults.dwellSeconds so the demo is watchable, per brief section 10. */

/** Demo countdown length in seconds. Brief section 10 state 3. */
export const MOCK_DWELL_SECONDS = 20;

/** MOCK contacts. Three seeded entries, as required by brief section 10. */
export const MOCK_CONTACTS = [
  {
    // MOCK public key, randomly generated, owned by nobody
    address: 'ZtQWM4ZkTjPu3yo5EWyQgbJJzstEfc7THPKmxFUsvWN',
    label: 'Exchange deposit',
    settledAt: '2026 08 14',
  },
  {
    // MOCK public key, randomly generated, owned by nobody
    address: 'DFcLLHxG8dVhm5k92JmBogJ6SsbiB3sdiTD7ATQdrQdo',
    label: 'Hardware wallet',
    settledAt: '2026 08 29',
  },
  {
    // MOCK public key, randomly generated, owned by nobody
    address: '3khSWK11sUBdatqHYZawgzmXYyuvknWEUQAfeAZU8vSj',
    label: 'Payroll',
    settledAt: '2026 09 02',
  },
];

/** MOCK tokens offered in the compose form. */
export const MOCK_TOKENS = [
  { symbol: 'SOL', decimals: 9 },
  { symbol: 'USDC', decimals: 6 },
  { symbol: 'USDT', decimals: 6 },
];

/** True when the address already sits on the mock contact list. Base58 is
    case sensitive, so the comparison is exact. */
export function isKnown(address) {
  if (typeof address !== 'string') return false;
  const needle = address.trim();
  return MOCK_CONTACTS.some((contact) => contact.address === needle);
}
