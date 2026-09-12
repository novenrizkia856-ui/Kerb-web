/* abi.js
   The small amount of ABI coding this app actually needs.

   Why this exists rather than an import. A browser has no keccak256: SubtleCrypto
   offers SHA-256 and nothing in the Keccak family, so computing a selector at
   runtime means shipping a hash implementation. Kerb's contracts are immutable
   and their selectors can never change, so the selectors are computed once from
   the deployed contracts with `cast sig` and written down. That removes the hash,
   the dependency, and a class of silent mistakes where a mistyped signature
   produces a plausible-looking selector that calls nothing.

   The consequence, stated so nobody is surprised by it: these tables are only
   correct for the contracts in `config/kerb.config.json`. Point the site at a
   different KerbCore and the selectors still apply, because the ABI is the same.
   Change the ABI and they must be regenerated.

   Everything encoded here is a 32 byte word, and every return shape is either a
   fixed run of words or one dynamic array of fixed structs. No general purpose
   encoder is needed for that and none is provided. */

/* --- selectors, from `cast sig` against the deployed contracts -------------- */

export const SELECTOR = {
  // KerbCore, writes
  send: '0779afe6', // send(address,address,uint256)
  cancel: '40e58ee5', // cancel(uint256)
  settle: '8df82800', // settle(uint256)
  trust: '44c52b15', // trust(address,bytes32)
  untrust: 'eea327e0', // untrust(address)
  setDwell: '9f983862', // setDwell(uint64)
  claim: '1e83409a', // claim(address)

  // KerbCore, reads
  isTrusted: '6713e230', // isTrusted(address,address)
  effectiveDwell: '4adbae72', // effectiveDwell(address)
  pendings: '7965df39', // pendings(uint256)
  contactCount: 'dd351fb3', // contactCount(address)
  nextId: '61b8ce8c', // nextId()

  // KerbLens
  contactsPage: 'dc347ca5', // contactsPage(address,uint256,uint256)
  pendingsOf: '09e62bbf', // pendingsOf(uint256[])
  summary: '9522a80a', // summary(address)

  // ERC20
  allowance: 'dd62ed3e', // allowance(address,address)
  approve: '095ea7b3', // approve(address,uint256)
  balanceOf: '70a08231', // balanceOf(address)
  decimals: '313ce567', // decimals()
  symbol: '95d89b41', // symbol()
};

/* --- event topics, from `cast keccak` --------------------------------------
   `id`, `from` and `to` are indexed on the lifecycle events, so a user's own
   pendings can be found by filtering topic 2 on their address without reading
   every log the contract ever wrote. */

export const TOPIC = {
  Held: '0x266364c22be9039b1cd688e2aceb61f54ebaea9a0b83ad59adf06452b179d6ec',
  Sent: '0xe9baa9cd6123e3a8e3c7eb87abf18c81b426473f4530382eec740fd0f0b5be7c',
  Settled: '0x9d2acb46d9552e37aaa893947c9f8ac0d602c196d6712108d21e3c304f1848cb',
  Cancelled: '0x811c2be6e15200c830aa95aff1f88c40ea33bfaeaecb6c8e30b7accbd50216bc',
  Trusted: '0x41338c061cd044670350f732406fec3df72f38e9b9fad87917757a30c6c18b3c',
  Untrusted: '0x0358725b3689e00b692a020d06dea2eefb77a20c6e403830e8262868eb0cfdd6',
};

/* --- encoding --------------------------------------------------------------- */

const ZERO = '0'.repeat(64);

export function padHex(value) {
  return String(value).replace(/^0x/i, '').toLowerCase().padStart(64, '0');
}

export function encodeAddress(address) {
  const clean = String(address ?? '').replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(clean)) throw new Error(`not an address: ${address}`);
  return clean.padStart(64, '0');
}

export function encodeUint(value) {
  const n = BigInt(value);
  if (n < 0n) throw new Error('negative value');
  return n.toString(16).padStart(64, '0');
}

/** A short label as bytes32: left aligned bytes, right padded, the way the
    contract's `label` mapping stores it. Anything over 31 bytes is refused
    rather than silently truncated into a different label. */
export function encodeLabel(text) {
  if (!text) return ZERO;
  const bytes = new TextEncoder().encode(String(text));
  if (bytes.length > 31) throw new Error('label is longer than 31 bytes');
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex.padEnd(64, '0');
}

export function decodeLabel(word) {
  const hex = String(word ?? '').replace(/^0x/i, '');
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    const b = Number.parseInt(hex.slice(i, i + 2), 16);
    if (!b) break;
    bytes.push(b);
  }
  try {
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return '';
  }
}

/** `uint256[]` as a single dynamic argument: offset, length, then the values. */
export function encodeUintArray(values) {
  const head = encodeUint(32);
  const len = encodeUint(values.length);
  return head + len + values.map(encodeUint).join('');
}

export function calldata(selector, ...words) {
  return `0x${selector}${words.join('')}`;
}

/* --- decoding ---------------------------------------------------------------
   Every read below returns either a fixed run of words or one dynamic array of
   fixed size structs, so splitting the payload into words and indexing it is the
   whole decoder. */

export function words(hex) {
  const body = String(hex ?? '').replace(/^0x/i, '');
  const out = [];
  for (let i = 0; i + 64 <= body.length; i += 64) out.push(body.slice(i, i + 64));
  return out;
}

export const toBigInt = (word) => (word ? BigInt(`0x${word}`) : 0n);
export const toNumber = (word) => Number(toBigInt(word));
export const toBool = (word) => toBigInt(word) !== 0n;
export const toAddress = (word) => `0x${String(word ?? ZERO).slice(24)}`;

/** KerbCore.pendings(id) -> (from, releaseAt, open, to, token, amount) */
export function decodePending(hex) {
  const w = words(hex);
  if (w.length < 6) return null;
  return {
    from: toAddress(w[0]),
    releaseAt: toNumber(w[1]),
    open: toBool(w[2]),
    to: toAddress(w[3]),
    token: toAddress(w[4]),
    amount: toBigInt(w[5]),
  };
}

/** KerbLens.summary(user) -> (contacts, dwellSeconds, minDwell, maxDwell) */
export function decodeSummary(hex) {
  const w = words(hex);
  if (w.length < 4) return null;
  return {
    contacts: toNumber(w[0]),
    dwellSeconds: toNumber(w[1]),
    minDwell: toNumber(w[2]),
    maxDwell: toNumber(w[3]),
  };
}

/** KerbLens.contactsPage(...) -> (Contact[] page, uint256 total)

    Head is two words: the offset of the array, then `total`. Contact is three
    static words, so the array body is a length followed by 3n words. */
export function decodeContactsPage(hex) {
  const w = words(hex);
  if (w.length < 2) return { contacts: [], total: 0 };

  const offsetWords = Number(toBigInt(w[0])) / 32;
  const total = toNumber(w[1]);
  const length = toNumber(w[offsetWords]);

  const contacts = [];
  for (let i = 0; i < length; i += 1) {
    const base = offsetWords + 1 + i * 3;
    contacts.push({
      to: toAddress(w[base]),
      nickname: decodeLabel(w[base + 1]),
      since: toNumber(w[base + 2]),
    });
  }
  return { contacts, total };
}

/** KerbLens.pendingsOf(ids) -> PendingView[]

    PendingView is nine static words: id, from, to, token, amount, releaseAt,
    open, cancellable, settleable. */
export function decodePendingsOf(hex) {
  const w = words(hex);
  if (w.length < 2) return [];

  const offsetWords = Number(toBigInt(w[0])) / 32;
  const length = toNumber(w[offsetWords]);

  const out = [];
  for (let i = 0; i < length; i += 1) {
    const b = offsetWords + 1 + i * 9;
    out.push({
      id: toBigInt(w[b]),
      from: toAddress(w[b + 1]),
      to: toAddress(w[b + 2]),
      token: toAddress(w[b + 3]),
      amount: toBigInt(w[b + 4]),
      releaseAt: toNumber(w[b + 5]),
      open: toBool(w[b + 6]),
      cancellable: toBool(w[b + 7]),
      settleable: toBool(w[b + 8]),
    });
  }
  return out;
}

/* --- units ------------------------------------------------------------------
   Decimal strings to base units and back, in BigInt throughout. A Number cannot
   hold 18 decimals of an ether value without losing the low digits, and the low
   digits are somebody's money. */

export function parseUnits(value, decimals) {
  const text = String(value ?? '').trim();
  if (!/^\d*\.?\d*$/.test(text) || text === '' || text === '.') {
    throw new Error('not a number');
  }
  const [whole = '0', frac = ''] = text.split('.');
  if (frac.length > decimals) {
    throw new Error(`more than ${decimals} decimal places`);
  }
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt((frac || '0').padEnd(decimals, '0') || '0');
}

export function formatUnits(value, decimals, maxFractionDigits = 6) {
  const n = BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  let frac = (n % base).toString().padStart(decimals, '0').slice(0, maxFractionDigits);
  frac = frac.replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : String(whole);
}
