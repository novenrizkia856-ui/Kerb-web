/* kerb.js
   Reads and writes against the deployed KerbCore and KerbLens.

   Every call goes through the connected wallet's provider, so the app uses the
   same node the user's wallet uses. There is no second RPC endpoint to
   configure, rate limit, or disagree with the wallet about what the chain says.

   Reads are `eth_call` and return decoded values. Writes are
   `eth_sendTransaction` and return a hash; nothing here waits for a receipt
   except `waitForReceipt`, which the caller opts into.

   A deliberate omission: gas is never estimated or set here. The wallet does
   that, and a wallet that estimates its own gas gives the user a figure they can
   see and reject before signing. */

import { getState, getProvider } from './wallet.js';
import {
  SELECTOR,
  TOPIC,
  calldata,
  decodeContactsPage,
  decodePending,
  decodePendingsOf,
  decodeSummary,
  encodeAddress,
  encodeLabel,
  encodeUint,
  encodeUintArray,
  toAddress,
  toBigInt,
  toNumber,
} from './abi.js';

export const NATIVE = '0x0000000000000000000000000000000000000000';

export function isNative(token) {
  return !token || String(token).toLowerCase() === NATIVE;
}

/* --- plumbing --------------------------------------------------------------- */

async function request(method, params) {
  const provider = getProvider();
  if (!provider) throw new Error('No wallet connected.');
  return provider.request({ method, params });
}

async function ethCall(to, data) {
  if (!to) throw new Error('No contract address configured.');
  return request('eth_call', [{ to, data }, 'latest']);
}

function core(config) {
  const address = config?.contracts?.core?.address;
  if (!address) throw new Error('KerbCore address is not configured.');
  return address;
}

function lens(config) {
  const address = config?.contracts?.lens?.address;
  if (!address) throw new Error('KerbLens address is not configured.');
  return address;
}

/* --- reads ------------------------------------------------------------------ */

export async function isTrusted(config, user, target) {
  const data = calldata(SELECTOR.isTrusted, encodeAddress(user), encodeAddress(target));
  const result = await ethCall(core(config), data);
  return toBigInt(String(result).replace(/^0x/, '')) !== 0n;
}

export async function summary(config, user) {
  const data = calldata(SELECTOR.summary, encodeAddress(user));
  return decodeSummary(await ethCall(lens(config), data));
}

export async function contactsPage(config, user, offset = 0, limit = 50) {
  const data = calldata(
    SELECTOR.contactsPage,
    encodeAddress(user),
    encodeUint(offset),
    encodeUint(limit),
  );
  return decodeContactsPage(await ethCall(lens(config), data));
}

export async function pendingsOf(config, ids) {
  if (!ids.length) return [];
  const data = `0x${SELECTOR.pendingsOf}${encodeUintArray(ids)}`;
  return decodePendingsOf(await ethCall(lens(config), data));
}

export async function pending(config, id) {
  const data = calldata(SELECTOR.pendings, encodeUint(id));
  return decodePending(await ethCall(core(config), data));
}

/* --- the user's own pendings ------------------------------------------------
   Found from logs rather than from a contract view, because KerbCore keeps no
   per-user index of pending ids and adding one would be storage every user pays
   for so that a frontend can skip a log query.

   `Held` has `id`, `from` and `to` indexed, so filtering topic 2 on the user's
   address returns exactly their own holds. The ids are then resolved in one
   `pendingsOf` call, which is what the lens is for. */
export async function myPendings(config, user) {
  const from = config?.contracts?.core?.deployBlock;
  const filter = {
    address: core(config),
    topics: [TOPIC.Held, null, `0x${encodeAddress(user)}`],
    fromBlock: from ? `0x${Number(from).toString(16)}` : '0x0',
    toBlock: 'latest',
  };

  let logs = [];
  try {
    logs = (await request('eth_getLogs', [filter])) ?? [];
  } catch (error) {
    /* Some nodes cap the block range on eth_getLogs. Say so rather than
       rendering an empty list that looks like "you have no pendings". */
    console.warn('[kerb] eth_getLogs failed:', error);
    throw new Error('Could not read your pending transfers from this node.');
  }

  const ids = logs.map((log) => toBigInt(String(log.topics?.[1] ?? '0x0').slice(2)));
  const unique = [...new Set(ids.map(String))].map(BigInt);
  if (!unique.length) return [];

  const views = await pendingsOf(config, unique);
  /* Only the ones still open. A settled or cancelled id decodes to all zeros,
     which is the contract clearing the slot, not an error. */
  return views.filter((v) => v.open);
}

/** The chain's clock, not the device's.

    `cancel` and `settle` are decided by `block.timestamp`, so a UI that works
    out which of them is available from `Date.now()` is asking the wrong clock.
    A user whose laptop is a few minutes fast would be offered Settle on a hold
    the contract still considers open, and the transaction would revert in their
    face with no explanation the app could give. */
export async function chainTime() {
  const block = await request('eth_getBlockByNumber', ['latest', false]);
  return toNumber(String(block?.timestamp ?? '0x0').slice(2));
}

/* --- ERC20 ------------------------------------------------------------------ */

export async function erc20Meta(config, token) {
  if (isNative(token)) {
    const currency = config?.chain?.nativeCurrency ?? {};
    return { symbol: currency.symbol || 'ETH', decimals: Number(currency.decimals ?? 18) };
  }
  const [decimalsHex, symbolHex] = await Promise.all([
    ethCall(token, `0x${SELECTOR.decimals}`).catch(() => null),
    ethCall(token, `0x${SELECTOR.symbol}`).catch(() => null),
  ]);

  const decimals = decimalsHex ? toNumber(String(decimalsHex).replace(/^0x/, '')) : 18;
  return { symbol: decodeSymbol(symbolHex) || 'TOKEN', decimals: decimals || 18 };
}

/** `symbol()` is a string on most tokens and a bytes32 on some old ones. Try the
    string layout first and fall back to reading it as fixed bytes. */
function decodeSymbol(hex) {
  if (!hex) return '';
  const body = String(hex).replace(/^0x/, '');
  if (body.length <= 64) {
    return bytesToText(body);
  }
  try {
    const offset = Number(BigInt(`0x${body.slice(0, 64)}`)) * 2;
    const length = Number(BigInt(`0x${body.slice(offset, offset + 64)}`)) * 2;
    return bytesToText(body.slice(offset + 64, offset + 64 + length));
  } catch {
    return bytesToText(body.slice(0, 64));
  }
}

function bytesToText(hex) {
  const bytes = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const b = Number.parseInt(hex.slice(i, i + 2), 16);
    if (!b) continue;
    bytes.push(b);
  }
  try {
    return new TextDecoder().decode(new Uint8Array(bytes)).trim();
  } catch {
    return '';
  }
}

export async function balanceOf(config, token, user) {
  if (isNative(token)) {
    const hex = await request('eth_getBalance', [user, 'latest']);
    return toBigInt(String(hex).replace(/^0x/, ''));
  }
  const data = calldata(SELECTOR.balanceOf, encodeAddress(user));
  return toBigInt(String(await ethCall(token, data)).replace(/^0x/, ''));
}

export async function allowance(config, token, owner) {
  if (isNative(token)) return null; // native needs no approval
  const data = calldata(SELECTOR.allowance, encodeAddress(owner), encodeAddress(core(config)));
  return toBigInt(String(await ethCall(token, data)).replace(/^0x/, ''));
}

/** Approves exactly `amount`, not the maximum.

    Kerb's own claim is that an unlimited approval to KerbCore is safe, and drill
    D1 is the evidence. That is a claim about KerbCore, not about every contract
    a user will ever approve, and an app that habituates people to signing
    unlimited approvals is teaching the habit that gets them drained somewhere
    else. Exact approval costs one more transaction on a repeat send of a larger
    amount, and the user can always raise it themselves. */
export async function approve(config, token, amount) {
  const { account } = getState();
  const data = calldata(SELECTOR.approve, encodeAddress(core(config)), encodeUint(amount));
  return request('eth_sendTransaction', [{ from: account, to: token, data }]);
}

/* --- writes ----------------------------------------------------------------- */

export async function send(config, { token, to, amount }) {
  const { account } = getState();
  const native = isNative(token);
  const data = calldata(
    SELECTOR.send,
    encodeAddress(native ? NATIVE : token),
    encodeAddress(to),
    encodeUint(amount),
  );

  const tx = { from: account, to: core(config), data };
  if (native) tx.value = `0x${BigInt(amount).toString(16)}`;
  return request('eth_sendTransaction', [tx]);
}

export async function cancel(config, id) {
  const { account } = getState();
  return request('eth_sendTransaction', [
    { from: account, to: core(config), data: calldata(SELECTOR.cancel, encodeUint(id)) },
  ]);
}

export async function settle(config, id) {
  const { account } = getState();
  return request('eth_sendTransaction', [
    { from: account, to: core(config), data: calldata(SELECTOR.settle, encodeUint(id)) },
  ]);
}

export async function trust(config, target, label = '') {
  const { account } = getState();
  const data = calldata(SELECTOR.trust, encodeAddress(target), encodeLabel(label));
  return request('eth_sendTransaction', [{ from: account, to: core(config), data }]);
}

export async function untrust(config, target) {
  const { account } = getState();
  const data = calldata(SELECTOR.untrust, encodeAddress(target));
  return request('eth_sendTransaction', [{ from: account, to: core(config), data }]);
}

export async function setDwell(config, seconds) {
  const { account } = getState();
  const data = calldata(SELECTOR.setDwell, encodeUint(seconds));
  return request('eth_sendTransaction', [{ from: account, to: core(config), data }]);
}

/* --- receipts ---------------------------------------------------------------
   Polled, because `eth_subscribe` is not available over every transport and a
   poll that works everywhere beats a subscription that works on some wallets.

   A reverted transaction is a returned result with `status: 0`, not a thrown
   error, and the caller has to look. Treating "the node answered" as "it
   worked" is how an app tells somebody their transfer succeeded when it did
   not. */
export async function waitForReceipt(hash, { timeoutMs = 120000, intervalMs = 1500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = await request('eth_getTransactionReceipt', [hash]).catch(() => null);
    if (receipt) {
      return { ...receipt, success: toBigInt(String(receipt.status ?? '0x0').slice(2)) === 1n };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

/** The id KerbCore issued, read out of the `Held` log in the receipt.

    Returns null for a send that took the direct path, which emits `Sent` and no
    id at all. That is not a failure: it is what happens when the recipient was
    already on the list, and the caller uses the null to tell the two apart. */
export function heldIdFrom(receipt) {
  const log = receipt?.logs?.find(
    (entry) => String(entry.topics?.[0] ?? '').toLowerCase() === TOPIC.Held,
  );
  if (!log) return null;
  return toBigInt(String(log.topics[1]).slice(2));
}

export function sentFrom(receipt) {
  return Boolean(
    receipt?.logs?.some(
      (entry) => String(entry.topics?.[0] ?? '').toLowerCase() === TOPIC.Sent,
    ),
  );
}

export { toAddress };
