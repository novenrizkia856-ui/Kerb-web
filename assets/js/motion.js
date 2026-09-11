/* motion.js
   Motion ported from the reference frontend, de minified but otherwise
   unchanged. Every constant here is recorded in notes/DESIGN-SYSTEM.md section
   4.2. No animation library is used because the reference uses none. */

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------------------
   Small numeric helpers, exactly as the reference defines them.
   ------------------------------------------------------------------------ */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const snap = (v, step) => Math.round(v / step) * step;
const remap = (v, inLo, inHi, outLo, outHi) =>
  ((v - inLo) * (outHi - outLo)) / (inHi - inLo) + outLo;

/* Per character start offset. Cubic bezier with control points
   P1 = (0, 0.75) and P2 = (0.75, 0), solved for x by Newton then bisection. */
function bezierOffset(x, epsilon = 1e-6) {
  const bx = (t) => 3 * (1 - t) ** 2 * t * 0 + 3 * (1 - t) * t ** 2 * 0.75 + t ** 3;
  const by = (t) => 3 * (1 - t) ** 2 * t * 0.75 + 3 * (1 - t) * t ** 2 * 0 + t ** 3;
  const dx = (t) => 3 * (1 - t) ** 2 * 0 + 6 * (1 - t) * t * 0.75 + 3 * t ** 2 * 0.25;

  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = bx(t) - x;
    if (Math.abs(err) < epsilon) return by(t);
    const slope = dx(t);
    if (Math.abs(slope) < 1e-6) break;
    t -= err / slope;
  }

  let lo = 0;
  let hi = 1;
  t = x;
  while (lo < hi) {
    const at = bx(t);
    if (Math.abs(at - x) < epsilon) break;
    if (at < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return by(t);
}

/* ---------------------------------------------------------------------------
   Typer. Per character scramble reveal. DESIGN-SYSTEM 4.2 A.
   ------------------------------------------------------------------------ */

const VARIATIONS = [
  'charFill',
  'charInverse',
  'charAccent',
  'charAccentInverse',
  'charAccentFill',
  'charBorder',
];

export class Typer {
  constructor(element, options = {}) {
    this.element = element;
    this.originalContent = element.innerHTML;
    this.source = element.textContent || '';
    this.length = this.source.replace(/\s/g, '').length;
    this.fps = options.fps ?? 20;
    this.cycles = options.cycles ?? 3;
    this.cycleLength = options.cycleLength ?? 0.5;
    this.frames = this.length ? this.fps * (1 + 0.01 * this.length) : 0;
    this.frame = 0;
    this.loop = null;
    this.delay = options.delay ?? 0;
    this.delayTimer = null;
    this.charNodes = [];
    this.type = 'initial';
    this.divisor = this.length > 1 ? this.length - 1 : 1;
    this.denominator = this.frames - this.frames * this.cycleLength || 1;
    this.variations = (options.variations ?? [...VARIATIONS]).slice();
    this.shuffle();
    this.initVisible = options.initVisible ?? false;

    if (!this.length) return;

    if (this.initVisible) {
      this.type = 'done';
      this.element.dataset.typerType = 'done';
    } else {
      this.build();
      this.applyFrame();
      this.element.dataset.typerType = 'initial';
    }
  }

  build() {
    this.element.innerHTML = '';
    this.charNodes = [];
    const parts = this.source.split(/(\s+)/);
    let index = 0;

    for (const part of parts) {
      if (part.trim() === '') {
        this.element.append(document.createTextNode(part));
        continue;
      }
      const word = document.createElement('span');
      word.className = 'word';
      for (const character of part.split('')) {
        const cp = snap(bezierOffset(index / this.divisor), 0.05);
        const span = document.createElement('span');
        span.className = 'char charInit';
        span.textContent = character || ' ';
        this.charNodes.push({ el: span, cp, currentClass: 'char charInit' });
        index += 1;
        word.appendChild(span);
      }
      this.element.appendChild(word);
    }
  }

  in() { this.setType('in'); }
  out() { this.setType('out'); }
  inOut() { this.setType('inout'); }

  setType(type) {
    if (type === this.type && type !== 'inout') return;
    if (type !== 'initial' && this.length && !this.charNodes.length) this.build();
    this.type = type;
    this.element.dataset.typerType = type;
    this.stopLoop();
    this.frame = 0;
    this.applyFrame();
    if (type !== 'initial' && this.charNodes.length) this.startLoop();
  }

  startLoop() {
    if (this.loop || this.delayTimer || !this.charNodes.length || this.type === 'initial') return;
    this.shuffle();
    const start = () => {
      this.delayTimer = null;
      if (this.loop || this.type === 'initial') return;
      this.applyFrame();
      this.loop = window.setInterval(() => this.tick(), 1000 / this.fps);
    };
    if (this.delay > 0) this.delayTimer = window.setTimeout(start, 1000 * this.delay);
    else start();
  }

  stopLoop() {
    if (this.delayTimer) {
      window.clearTimeout(this.delayTimer);
      this.delayTimer = null;
    }
    if (this.loop) {
      window.clearInterval(this.loop);
      this.loop = null;
    }
  }

  tick() {
    const total = this.type === 'inout' ? 2 * this.frames : this.frames;
    this.frame = clamp(this.frame + 1, 0, total);
    this.applyFrame();
    if (this.frame >= total) {
      this.stopLoop();
      this.type = 'done';
      this.element.dataset.typerType = 'done';
      this.restore();
    }
  }

  restore() {
    this.element.innerHTML = this.originalContent;
    this.charNodes = [];
  }

  applyFrame() {
    if (!this.length || !this.charNodes.length) return;

    if (this.type === 'initial') {
      this.charNodes.forEach((node) => this.setClass(node, 'char charInit'));
      return;
    }

    const direction =
      this.type === 'inout' && this.frame > this.frames
        ? 'out'
        : this.type === 'inout'
          ? 'in'
          : this.type;

    const progress =
      (this.type === 'inout' && direction === 'out' ? this.frame - this.frames : this.frame) /
      this.denominator;

    for (const node of this.charNodes) {
      let local = clamp(snap(progress - node.cp, 0.1), 0, 1);
      let variant = 'charInit';
      if (local > 0) {
        const step = Math.round(remap(local, 0, 1, 0, this.cycles));
        variant = this.variations[step % this.variations.length];
      }
      if (local >= 1) variant = '';

      const mid = variant ? `char ${variant}` : 'char';
      const next =
        direction === 'in'
          ? local <= 0 ? 'char charInit' : local >= 1 ? 'char' : mid
          : local <= 0 ? 'char' : local >= 1 ? 'char charInit' : mid;

      this.setClass(node, next);
    }
  }

  setClass(node, className) {
    if (className === node.currentClass) return;
    node.currentClass = className;
    node.el.className = className;
  }

  shuffle() {
    this.variations.sort(() => 0.5 - Math.random());
  }

  destroy() {
    this.stopLoop();
    this.element.innerHTML = this.originalContent;
    delete this.element.dataset.typerType;
  }
}

export class TyperGroup {
  constructor(elements, options = {}, stagger = 0.15) {
    this.typers = elements.map((el, i) => new Typer(el, { ...options, delay: i * stagger }));
  }
  in() { this.typers.forEach((t) => t.in()); }
  out() { this.typers.forEach((t) => t.out()); }
  destroy() { this.typers.forEach((t) => t.destroy()); }
}

/* ---------------------------------------------------------------------------
   Scroll reveal. This is the reference's entire scroll system: one
   IntersectionObserver at threshold 0.6 that disconnects on first fire.
   DESIGN-SYSTEM 4.4.
   ------------------------------------------------------------------------ */

export function revealOnce(element, run, threshold = 0.6) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      run();
      observer.disconnect();
    },
    { threshold },
  );
  observer.observe(element);
  return observer;
}

/* Wires every [data-typed] container. `data-typed="load"` fires on mount with
   the hero's 0.15s stagger, anything else waits for the observer at 0.12s. */
export function initTypers(root = document) {
  const reduced = prefersReducedMotion();
  const groups = [];

  root.querySelectorAll('[data-typed]').forEach((host) => {
    const segments = Array.from(host.querySelectorAll('[data-typer]'));
    if (!segments.length) return;

    const onLoad = host.dataset.typed === 'load';
    const stagger = onLoad ? 0.15 : 0.12;
    const group = new TyperGroup(segments, { fps: 20, cycles: 3, initVisible: reduced }, stagger);
    groups.push(group);

    if (reduced) return;
    if (onLoad) group.in();
    else revealOnce(host, () => group.in());
  });

  return groups;
}

/* ---------------------------------------------------------------------------
   Nav morph. DESIGN-SYSTEM 4.2 B. Threshold is scrollY > 12.
   ------------------------------------------------------------------------ */

export function initNavMorph(nav) {
  if (!nav) return;
  const sync = () => {
    nav.dataset.scrolled = String(window.scrollY > 12);
  };
  sync();
  window.addEventListener('scroll', sync, { passive: true });
  return sync;
}

/* ---------------------------------------------------------------------------
   ASCII rain. DESIGN-SYSTEM 4.2 C. 54 rows of 220 glyphs, one logical frame
   every 110ms, per column period of 3 to 9 frames with a random phase.
   ------------------------------------------------------------------------ */

const RAIN_ROWS = 54;
const RAIN_COLS = 220;
const RAIN_FRAME_MS = 110;

const glyph = (v) => (v < 0.62 ? ' ' : v < 0.81 ? '0' : '1');

/* Deterministic seed so the field is identical on every load, matching the
   server rendered field the reference shipped. */
function seedField() {
  let state = 20325838;
  const next = () => (state = (1103515245 * state + 12345) % 2147483648) / 2147483648;
  const rows = [];
  for (let r = 0; r < RAIN_ROWS; r++) {
    let row = '';
    for (let c = 0; c < RAIN_COLS; c++) row += glyph(next());
    rows.push(row);
  }
  return rows;
}

export function buildAsciiRain(container) {
  if (!container) return null;

  const base = document.createElement('div');
  base.className = 'ascii-rain';
  base.setAttribute('aria-hidden', 'true');

  const pop = document.createElement('div');
  pop.className = 'ascii-rain ascii-rain--pop';
  pop.setAttribute('aria-hidden', 'true');

  const seeded = seedField();
  const blank = ' '.repeat(RAIN_COLS);

  for (let r = 0; r < RAIN_ROWS; r++) {
    const a = document.createElement('div');
    a.textContent = seeded[r];
    base.appendChild(a);

    const b = document.createElement('div');
    b.textContent = blank;
    pop.appendChild(b);
  }

  container.prepend(pop);
  container.prepend(base);

  return { base, pop };
}

export function initAsciiRain(container) {
  const nodes = buildAsciiRain(container);
  if (!nodes || prefersReducedMotion()) return () => {};

  const baseRows = Array.from(nodes.base.children);
  const popRows = Array.from(nodes.pop.children);
  const baseGrid = baseRows.map((el) => (el.textContent ?? '').split(''));
  const popGrid = popRows.map(() => ' '.repeat(RAIN_COLS).split(''));

  const period = Array.from({ length: RAIN_COLS }, () => 3 + ((7 * Math.random()) | 0));
  const phase = Array.from({ length: RAIN_COLS }, (_, c) => (Math.random() * period[c]) | 0);

  let sparks = [];
  let raf = 0;
  let last = 0;
  let frame = 0;

  const step = (now) => {
    raf = requestAnimationFrame(step);
    if (now - last < RAIN_FRAME_MS) return;
    last = now;
    frame++;

    const dirtyBase = new Set();
    const dirtyPop = new Set();

    for (let c = 0; c < RAIN_COLS; c++) {
      if (frame % period[c] !== phase[c]) continue;
      for (let r = RAIN_ROWS - 1; r > 0; r--) {
        if (baseGrid[r][c] !== baseGrid[r - 1][c]) {
          baseGrid[r][c] = baseGrid[r - 1][c];
          dirtyBase.add(r);
        }
      }
      const head = glyph(Math.random());
      if (baseGrid[0][c] !== head) {
        baseGrid[0][c] = head;
        dirtyBase.add(0);
      }
    }

    for (const [r, c] of sparks) {
      popGrid[r][c] = ' ';
      dirtyPop.add(r);
    }
    sparks = [];

    if (Math.random() < 0.7) {
      const count = 2 + ((3 * Math.random()) | 0);
      for (let i = 0; i < count; i++) {
        const r = (RAIN_ROWS * Math.random()) | 0;
        const c = (RAIN_COLS * Math.random()) | 0;
        popGrid[r][c] = baseGrid[r][c] === ' ' ? '1' : baseGrid[r][c];
        dirtyPop.add(r);
        sparks.push([r, c]);
      }
    }

    dirtyBase.forEach((r) => { baseRows[r].textContent = baseGrid[r].join(''); });
    dirtyPop.forEach((r) => { popRows[r].textContent = popGrid[r].join(''); });
  };

  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/* ---------------------------------------------------------------------------
   Footer wordmark torch. DESIGN-SYSTEM 4.2 M.
   ------------------------------------------------------------------------ */

export function initSpotWordmark(host) {
  if (!host) return;
  const inner = host.querySelector('.wordmark-inner');
  if (!inner) return;

  host.addEventListener('pointermove', (event) => {
    const box = inner.getBoundingClientRect();
    inner.style.setProperty('--mx', `${event.clientX - box.left}px`);
    inner.style.setProperty('--my', `${event.clientY - box.top}px`);
    inner.style.setProperty('--spot', '1');
  });

  host.addEventListener('pointerleave', () => {
    inner.style.setProperty('--spot', '0');
  });
}

/* ---------------------------------------------------------------------------
   Scroll reveals for whole sections.

   Uses the reference's own reveal class, .fade-in, which is
   `animation: fade-in var(--dur-slow) var(--ease) both`. The `both` fill is
   what makes a delay usable: an item waits at the 0 percent keyframe rather
   than flashing in first. Stagger is 0.12s, the same value the reference gives
   its TyperGroup. No new primitive, no new value.
   ------------------------------------------------------------------------ */

const REVEAL_STAGGER_S = 0.12;

export function initReveals(root = document) {
  const groups = root.querySelectorAll('[data-reveal-group]');
  if (!groups.length) return;

  const reduced = prefersReducedMotion();

  groups.forEach((group) => {
    const items = [...group.querySelectorAll('[data-reveal]')];
    if (!items.length) return;

    if (reduced) {
      items.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    /* Anchored on a short child for the same reason the visuals are: a block
       taller than the viewport can never reach the reference's 0.6 threshold. */
    const anchor = items[0];
    revealOnce(anchor, () => {
      items.forEach((el, i) => {
        el.style.animationDelay = `${i * REVEAL_STAGGER_S}s`;
        el.classList.add('fade-in', 'is-revealed');
      });
    });
  });
}

/* ---------------------------------------------------------------------------
   Count up.

   ADDED, not ported. The reference has no number tween anywhere: its stat
   figures are static strings, recorded in notes/DESIGN-SYSTEM.md 4.3 under
   notable absences. It is added here because the three figures in the scale
   section are the one place on the page where the number itself is the
   argument, and watching 270 million arrive says more than reading it.

   It borrows the reference's easing rather than inventing one: the same
   cubic-bezier(.22, 1, .36, 1) the whole site uses, evaluated in script
   because a transition cannot drive text content.
   ------------------------------------------------------------------------ */

const COUNT_MS = 900;

/* cubic-bezier(.22, 1, .36, 1) solved for y given x, Newton then bisection.
   Same method as the typer's character offset curve. */
function easeOutQuint(x) {
  const cx = (t) => 3 * (1 - t) ** 2 * t * 0.22 + 3 * (1 - t) * t ** 2 * 0.36 + t ** 3;
  const cy = (t) => 3 * (1 - t) ** 2 * t * 1 + 3 * (1 - t) * t ** 2 * 1 + t ** 3;
  const dx = (t) => 3 * (1 - t) ** 2 * 0.22 + 6 * (1 - t) * t * (0.36 - 0.22) + 3 * t ** 2 * (1 - 0.36);

  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = cx(t) - x;
    if (Math.abs(err) < 1e-6) return cy(t);
    const slope = dx(t);
    if (Math.abs(slope) < 1e-6) break;
    t -= err / slope;
  }
  let lo = 0;
  let hi = 1;
  t = x;
  while (lo < hi) {
    const at = cx(t);
    if (Math.abs(at - x) < 1e-6) break;
    if (at < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return cy(t);
}

export function initCounters(root = document) {
  const targets = root.querySelectorAll('[data-count-to]');
  if (!targets.length) return;

  const reduced = prefersReducedMotion();

  targets.forEach((el) => {
    const to = Number(el.dataset.countTo);
    const suffix = el.dataset.countSuffix ?? '';
    if (!Number.isFinite(to)) return;

    const settle = () => { el.textContent = `${to}${suffix}`; };

    if (reduced) {
      settle();
      return;
    }

    el.textContent = `0${suffix}`;

    revealOnce(el, () => {
      const startedAt = performance.now();
      const step = (now) => {
        const x = Math.min(1, (now - startedAt) / COUNT_MS);
        el.textContent = `${Math.round(easeOutQuint(x) * to)}${suffix}`;
        if (x < 1) requestAnimationFrame(step);
        else settle();
      };
      requestAnimationFrame(step);
    });
  });
}
