/* copy.js
   Clipboard affordance and the single shared announcement region.

   The reference's own copy affordance swaps a menu item's text to `Copied` for
   1200ms inside a try/catch that swallows failures. That timing and that
   failure policy are kept. The visible toast and the aria-live region are an
   addition required by brief section 12, styled from the reference's own
   surface, border and mono label treatment. */

const TOAST_MS = 1200;

let region = null;

function ensureRegion() {
  if (region && region.isConnected) return region;
  region = document.querySelector('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  return region;
}

/**
 * Announce a short message through the one shared polite region.
 * @param {string} message
 * @param {'default'|'cancel'} [state]
 */
export function announce(message, state = 'default') {
  const host = ensureRegion();
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (state !== 'default') toast.dataset.state = state;
  toast.textContent = message;
  host.appendChild(toast);
  window.setTimeout(() => toast.remove(), TOAST_MS);
}

async function writeClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wire a copy button. `resolve` returns the string to copy, or an empty string
 * when there is nothing to copy yet.
 *
 * @param {HTMLElement} button
 * @param {() => string} resolve
 * @param {{ emptyMessage?: string, successMessage?: string, label?: string }} [options]
 */
export function attachCopy(button, resolve, options = {}) {
  if (!button) return;

  const emptyMessage = options.emptyMessage ?? 'Not live yet';
  const successMessage = options.successMessage ?? 'Copied';
  if (options.label) button.setAttribute('aria-label', options.label);

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    const value = resolve();

    if (!value) {
      announce(emptyMessage);
      return;
    }

    const ok = await writeClipboard(value);
    if (ok) announce(successMessage);
  });
}
