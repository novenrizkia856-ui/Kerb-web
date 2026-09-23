/* kerb-visuals.js
   The two product visuals in brief section 8.3. Both are built only from motion
   primitives catalogued in notes/DESIGN-SYSTEM.md section 4.3. No new primitive,
   no new library, the reference's own durations and easing throughout.

   Visual A, the waiting window
     P3  travelling gradient along a hairline, for the run out and the pulse
     P7  opacity breathe, carried by the waiting label
     P2  rise and fade, for the resolve into the trusted state

   Visual B, history versus list
     History uses P2 at short irregular intervals with no gate, so entries keep
     arriving unbidden.
     List uses P1, the character scramble, fired once per settled entry. P1 is
     the slowest and most deliberate primitive in the reference, which is what
     makes the two panels read as different rhythms rather than the same one. */

import { truncate } from '../../config/config.js';
import { MOCK_CONTACTS } from './app-mock.js';
import { Typer, prefersReducedMotion, revealOnce } from './motion.js';

/* ---------------------------------------------------------------------------
   Visual A. The waiting window.
   ------------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0');
const clock = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(Math.max(0, Math.ceil(seconds)) % 60)}`;

/* One controller per element. Mounting is idempotent so the page wide pass and
   the app shell can both ask for the same window and get the same handle back,
   whichever runs first. */
const WINDOWS = new WeakMap();

export function mountWindow(root) {
  if (!root) return null;
  if (WINDOWS.has(root)) return WINDOWS.get(root);
  root.dataset.kwinMounted = 'true';

  const dwell = Number(root.dataset.dwell) || 20;
  const timeEl = root.querySelector('[data-kwin-time]');
  const fillEl = root.querySelector('[data-kwin-fill]');
  const labelEl = root.querySelector('[data-kwin-label]');
  const reduced = prefersReducedMotion();

  let raf = 0;
  let startedAt = 0;
  let onSettle = null;

  const paint = (progress) => {
    if (fillEl) fillEl.style.backgroundPositionX = `${100 - 100 * progress}%`;
    if (timeEl) timeEl.textContent = clock(dwell * (1 - progress));
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const settle = () => {
    stop();
    root.dataset.kwinState = 'settled';
    paint(1);
    if (timeEl) timeEl.textContent = clock(0);
    if (labelEl) {
      labelEl.textContent = 'Settled';
      if (!reduced) {
        labelEl.classList.remove('stage-in');
        void labelEl.offsetWidth;
        labelEl.classList.add('stage-in');
      }
    }
    const done = onSettle;
    onSettle = null;
    if (done) done();
  };

  const tick = (now) => {
    const elapsed = (now - startedAt) / 1000;
    const progress = Math.min(1, elapsed / dwell);
    paint(progress);
    if (progress >= 1) {
      settle();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const start = (whenDone) => {
    onSettle = whenDone ?? null;
    if (reduced) {
      settle();
      return;
    }
    stop();
    root.dataset.kwinState = 'holding';
    if (labelEl) {
      labelEl.textContent = 'Holding';
      labelEl.classList.remove('stage-in');
    }
    startedAt = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const cancel = () => {
    stop();
    onSettle = null;
    reset();
  };

  function reset() {
    stop();
    root.dataset.kwinState = 'idle';
    if (labelEl) {
      labelEl.textContent = 'Holding';
      labelEl.classList.remove('stage-in');
    }
    paint(0);
  }

  reset();

  /* Display instances start themselves the first time they scroll into view,
     on the reference's own observer: threshold 0.6, disconnected on first fire.
     Instances driven by the app shell opt out with data-autostart="false". */
  if (root.dataset.autostart !== 'false') {
    if (reduced) settle();
    /* The observer is anchored on the row rather than the whole block. The
       reference only ever applied threshold 0.6 to headings, which are always
       shorter than the viewport. An element taller than the viewport can never
       reach 60 percent visibility, so the threshold itself is kept exactly and
       a short child carries it. */
    else revealOnce(root.querySelector('.kwin-row') ?? root, () => start());
  }

  const controller = { start, cancel, settle, reset, dwell };
  WINDOWS.set(root, controller);
  return controller;
}

/* ---------------------------------------------------------------------------
   Visual B. History versus list.
   ------------------------------------------------------------------------ */

/* A small deterministic generator so the noise entries are identical on every
   load and no address shaped literal is written into this file. Same linear
   congruential form the reference uses to seed its glyph field. */
function seededRandom(seed) {
  let state = seed;
  return () => (state = (1103515245 * state + 12345) % 2147483648) / 2147483648;
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Chars(rand, count) {
  let out = '';
  for (let i = 0; i < count; i++) out += BASE58[(rand() * 58) | 0];
  return out;
}

/* A Solana public key is 43 or 44 base58 characters. Only its truncated form is
   ever shown, so the noise only has to look like one. */
function noiseAddress(rand) {
  return base58Chars(rand, 44);
}

/* A poisoned entry keeps the head and the tail of a real address and changes
   only the middle, which is the part a truncated display never shows. On Solana
   the head and tail are the four characters each side that wallets render, and
   a vanity generator reaches both in minutes. That is the whole attack, so the
   lookalike renders identically to the real row. */
function poison(address, rand) {
  const head = address.slice(0, 4);
  const tail = address.slice(-4);
  return head + base58Chars(rand, address.length - 8) + tail;
}

const HISTORY_MIN_MS = 700;
const HISTORY_MAX_MS = 1300;
const HISTORY_ROWS = 5;
const LIST_INTERVAL_MS = 6000;

/* The history stream is bounded. Twelve arrivals is more than enough to show
   that entries keep coming from outside, and a stream that never stops would
   be auto starting motion running past five seconds with no way to pause it,
   which WCAG 2.2.2 does not allow. It also means no row is left sitting
   mid fade forever, which is a contrast problem as well as a motion one. */
const HISTORY_MAX_PUSHES = 12;

function row(text, tag, kind) {
  const li = document.createElement('li');
  li.className = 'asym-row';
  li.dataset.kind = kind;

  const code = document.createElement('code');
  code.dataset.address = '';
  code.textContent = text;

  const badge = document.createElement('span');
  badge.className = 'tag';
  badge.textContent = tag;

  li.append(code, badge);
  return li;
}

export function mountPanels(root) {
  if (!root || root.dataset.panelsMounted === 'true') return null;
  root.dataset.panelsMounted = 'true';

  const historyFeed = root.querySelector('[data-feed="history"]');
  const listFeed = root.querySelector('[data-feed="list"]');
  if (!historyFeed || !listFeed) return null;

  const reduced = prefersReducedMotion();
  const rand = seededRandom(20325838);
  const known = MOCK_CONTACTS.map((c) => c.address);

  /* The history stream: mostly noise, with a poisoned lookalike of one of the
     user's real addresses every few entries. */
  let historyIndex = 0;
  const nextHistoryEntry = () => {
    historyIndex += 1;
    if (historyIndex % 3 === 0) {
      const real = known[(historyIndex / 3 - 1) % known.length];
      return { text: truncate(poison(real, rand)), tag: 'not yours', kind: 'fake' };
    }
    return { text: truncate(noiseAddress(rand)), tag: 'inbound', kind: 'noise' };
  };

  const pushHistory = () => {
    const entry = nextHistoryEntry();
    const li = row(entry.text, entry.tag, entry.kind);
    /* rise-in rather than stage-in: these rows arrive in --state-danger,
       which measures 4.89 to 1 and so drops under the contrast line for the
       whole of a fade. Sliding without fading has no failing frame. */
    if (!reduced) li.classList.add('rise-in');
    historyFeed.prepend(li);
    while (historyFeed.children.length > HISTORY_ROWS) historyFeed.lastElementChild.remove();
  };

  /* The list: one entry per settled send, revealed with the character scramble.
     Nothing is ever removed. */
  let listIndex = 0;
  const pushList = () => {
    if (listIndex >= known.length) return false;
    const text = truncate(known[listIndex]);
    listIndex += 1;

    const li = row(text, 'settled', 'settled');
    listFeed.append(li);

    if (!reduced) {
      const code = li.querySelector('code');
      const typer = new Typer(code, { fps: 20, cycles: 3 });
      typer.in();
    }
    return true;
  };

  let historyTimer = 0;
  let listTimer = 0;

  const scheduleHistory = () => {
    if (historyIndex >= HISTORY_MAX_PUSHES) return;
    const wait = HISTORY_MIN_MS + Math.random() * (HISTORY_MAX_MS - HISTORY_MIN_MS);
    historyTimer = window.setTimeout(() => {
      pushHistory();
      scheduleHistory();
    }, wait);
  };

  const scheduleList = () => {
    listTimer = window.setTimeout(() => {
      if (pushList()) scheduleList();
    }, LIST_INTERVAL_MS);
  };

  const run = () => {
    for (let i = 0; i < 3; i++) pushHistory();
    pushList();
    if (reduced) {
      for (let i = 0; i < 2; i++) pushHistory();
      while (pushList());
      return;
    }
    scheduleHistory();
    scheduleList();
  };

  if (reduced) run();
  /* Anchored on the first panel head for the same reason as the window above:
     the stage is taller than a short viewport, a head never is. */
  else revealOnce(root.querySelector('.asym-head') ?? root, run);

  return {
    stop() {
      window.clearTimeout(historyTimer);
      window.clearTimeout(listTimer);
    },
  };
}

/* ------------------------------------------------------------------------- */

export function initKerbVisuals(scope = document) {
  const windows = [...scope.querySelectorAll('[data-kerb-window]')].map(mountWindow);
  const panels = [...scope.querySelectorAll('[data-kerb-panels]')].map(mountPanels);
  return { windows, panels };
}
