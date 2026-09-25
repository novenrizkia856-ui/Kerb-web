/* app-mock.js
   MOCK DATA ONLY. Nothing in this file touches a wallet, an RPC endpoint or a
   contract. The addresses below are invented for the demo and are the only
   address shaped strings anywhere in this repository outside config/.

   The countdown runs at MOCK_DWELL_SECONDS rather than the configured
   defaults.dwellSeconds so the demo is watchable, per brief section 10. */

/** Demo countdown length in seconds. Brief section 10 state 3. */
export const MOCK_DWELL_SECONDS = 20;

/** MOCK contacts. Three seeded entries, as required by brief section 10. */
export const MOCK_CONTACTS = [
  {
    // MOCK address, not a real deployment
    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    label: 'Exchange deposit',
    settledAt: '2026 08 14',
  },
  {
    // MOCK address, not a real deployment
    address: '0x4E83362442B8d1beC281594CEA3050c8EB01311C',
    label: 'Hardware wallet',
    settledAt: '2026 08 29',
  },
  {
    // MOCK address, not a real deployment
    address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    label: 'Payroll',
    settledAt: '2026 09 02',
  },
];

/** MOCK tokens offered in the compose form. */
export const MOCK_TOKENS = [
  { symbol: 'ETH', decimals: 18 },
  { symbol: 'USDC', decimals: 6 },
  { symbol: 'WBTC', decimals: 8 },
];

/** True when the address already sits on the mock contact list. */
export function isKnown(address) {
  if (typeof address !== 'string') return false;
  const needle = address.trim().toLowerCase();
  return MOCK_CONTACTS.some((contact) => contact.address.toLowerCase() === needle);
}
