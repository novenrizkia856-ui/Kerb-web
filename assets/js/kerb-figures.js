/* kerb-figures.js
   Three figures for the landing page.

   The brief for these was "add visuals, not abstract ones like the other
   projects". So none of these is a shape standing in for an idea. Each one
   draws the actual subject of the sentence next to it:

     wallets  fifty three squares, one per wallet in the study, three of them
              marked. The claim is "3 of 53" and the figure is countable, so a
              reader can check it rather than take it
     paths    the two routes a send takes, as the rows the app itself renders,
              with real truncated addresses and the same state tags
     idl      the Kerb program's instruction list, read out of its IDL, beside
              the privileged instructions that are not in it

   The third one is the one that had to be generated rather than written. A
   hand typed list of "instructions Kerb does not have" is a claim about a
   program; a list filtered against the IDL is a reading of it. If somebody
   ever added `pause`, the figure would stop asserting it was absent. The
   program is not deployed yet, so the IDL is the planned interface, and the
   caption says so. */

import { prefersReducedMotion } from './motion.js';

/* --- 1. the wallet grid ------------------------------------------------------ */

const WALLETS_TOTAL = 53;
const WALLETS_WARNING = 3;

/* Spread rather than clustered at the start. Three adjacent squares in a
   corner read as a legend; three scattered read as a sample, which is what
   they are. */
const WARNING_AT = new Set([7, 26, 41]);

function mountWalletGrid(figure) {
  const host = figure.querySelector('[data-fig-grid]');
  if (!host || host.childElementCount) return;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < WALLETS_TOTAL; i += 1) {
    const cell = document.createElement('span');
    cell.className = 'fig-cell';
    if (WARNING_AT.has(i)) cell.dataset.kind = 'trust';
    frag.append(cell);
  }
  host.append(frag);

  /* One label for the whole grid. Fifty three announcements of "square" is
     not information. */
  host.setAttribute('role', 'img');
  host.setAttribute(
    'aria-label',
    `${WALLETS_TOTAL} wallets tested. ${WALLETS_WARNING} warn you about a poisoned address.`,
  );
}

/* --- 2. the instruction figure ------------------------------------------------
   The privileged instructions a program like this would have if it had an
   admin. Each is checked against the IDL before it is shown as absent. */

const PRIVILEGED = [
  'set_admin(new_admin: Pubkey)',
  'pause()',
  'set_upgrade_authority(new: Pubkey)',
  'set_fee(bps: u16)',
  'sweep(vault: Pubkey)',
  'freeze(user: Pubkey)',
];

/* The ones worth showing as present. A wall of signatures is not a figure, it
   is a data dump. These are the five a reader would want to check for. */
const HIGHLIGHT = ['send', 'cancel', 'settle', 'forget', 'set_dwell'];

function typeName(type) {
  if (typeof type === 'string') return type;
  if (Array.isArray(type?.array)) return `[${typeName(type.array[0])}; ${type.array[1]}]`;
  return 'bytes';
}

function signature(entry) {
  return `${entry.name}(${entry.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(', ')})`;
}

function idlRow(text, kind) {
  const li = document.createElement('li');
  li.className = 'idl-row';
  if (kind) li.dataset.kind = kind;

  const code = document.createElement('code');
  code.textContent = text;
  li.append(code);
  return li;
}

async function mountIdlFigure(figure) {
  const presentHost = figure.querySelector('[data-idl-present]');
  const absentHost = figure.querySelector('[data-idl-absent]');
  if (!presentHost || !absentHost || presentHost.childElementCount) return;

  let idl = null;
  try {
    const url = new URL('../../config/idl/kerb.json', import.meta.url);
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    idl = await response.json();
  } catch (error) {
    /* The section reads fine without the figure, so a failed fetch removes it
       rather than leaving two empty columns and a caption claiming to have
       read something. */
    console.warn('[kerb.figures] could not read the IDL:', error);
    figure.remove();
    return;
  }

  const functions = Array.isArray(idl?.instructions) ? idl.instructions : [];
  const names = new Set(functions.map((e) => e.name.toLowerCase()));

  for (const name of HIGHLIGHT) {
    const entry = functions.find((e) => e.name === name);
    if (entry) presentHost.append(idlRow(signature(entry), 'trust'));
  }

  /* Only claim an instruction is missing after checking. The figure is an
     assertion about the program's interface and it should be able to fail. */
  let shown = 0;
  for (const candidate of PRIVILEGED) {
    const bare = candidate.slice(0, candidate.indexOf('(')).toLowerCase();
    if (names.has(bare)) continue;
    absentHost.append(idlRow(candidate, 'absent'));
    shown += 1;
  }

  if (!shown) {
    console.warn('[kerb.figures] every privileged instruction was present in the IDL');
    figure.remove();
    return;
  }

  const count = figure.querySelector('[data-idl-count]');
  if (count) count.textContent = String(functions.length);
}

/* --- boot -------------------------------------------------------------------- */

export function initFigures(scope = document) {
  for (const figure of scope.querySelectorAll('[data-fig="wallets"]')) {
    mountWalletGrid(figure);
  }
  for (const figure of scope.querySelectorAll('[data-fig="idl"]')) {
    mountIdlFigure(figure);
  }

  /* The paths figure is static HTML. Nothing here builds it, because nothing
     about it changes, and a figure that can be read with scripting off is
     better than one that cannot. The only thing script adds is the arrival
     accent, and only when motion is welcome. */
  if (!prefersReducedMotion()) {
    for (const figure of scope.querySelectorAll('[data-fig="paths"]')) {
      figure.dataset.animate = 'true';
    }
  }
}
