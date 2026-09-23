/* main.js
   Boots both pages. Motion first so the shell is alive before the config
   request resolves, then the config render pass. */

import { applyConfig } from '../../config/config.js';
import {
  initAsciiRain,
  initCounters,
  initNavMorph,
  initReveals,
  initSpotWordmark,
  initTypers,
} from './motion.js';
import { initKerbVisuals } from './kerb-visuals.js';
import { initFigures } from './kerb-figures.js';
import { initApp } from './app.js';
import { initWallet } from './wallet-ui.js';
import { onWalletChange } from './wallet.js';

function initThemeToggle() {
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;

  const label = (theme) => (theme === 'light' ? 'Dark theme' : 'Light theme');

  const sync = (theme) => {
    document.documentElement.dataset.theme = theme;
    button.setAttribute('aria-label', label(theme));
    button.setAttribute('title', label(theme));
  };

  let stored = '';
  try {
    stored = window.localStorage.getItem('kerb-theme') || '';
  } catch {
    stored = '';
  }
  sync(stored === 'light' ? 'light' : 'dark');

  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    sync(next);
    try {
      window.localStorage.setItem('kerb-theme', next);
    } catch {
      /* storage can be unavailable, the toggle still works for this view */
    }
  });
}

function boot() {
  /* Tells the stylesheet that reveals are safe to hide before they run. A page
     with script off never gets the attribute, so nothing is ever hidden. */
  document.documentElement.dataset.js = 'on';

  initNavMorph(document.querySelector('[data-nav]'));
  initAsciiRain(document.querySelector('[data-ascii-rain]'));
  initSpotWordmark(document.querySelector('[data-wordmark]'));
  initTypers(document);
  initReveals(document);
  initCounters(document);
  /* The app shell claims its own windows first, then the page wide pass picks
     up whatever is left. Mounting is idempotent either way. */
  const app = initApp(document.querySelector('[data-app]'));
  initKerbVisuals(document);
  initFigures(document);
  initThemeToggle();

  /* The wallet needs the network and the addresses, so it waits for the
     config rather than reading a half built one. Everything above is already
     on screen by then, running on demo data.

     The app is told about every wallet change rather than asked: connecting,
     switching account and disconnecting all go through the same path, so
     there is no state the two can disagree about. */
  applyConfig(document).then((config) => {
    initWallet(config);
    if (app) {
      onWalletChange((state) => {
        app.setWallet({
          connected: state.connected,
          account: state.account,
          config,
        });
      });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
