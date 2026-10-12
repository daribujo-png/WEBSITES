/**
 * Bygg & Renovering Vest AS — main.js
 * UI + scroll orchestration (ES module, no dependencies).
 *
 * The 3D house lives in ./house.js and is loaded with a dynamic import so that
 * any failure (no WebGL, blocked module, runtime error) falls back to an SVG
 * line-drawn house driven by exactly the same API and the same scroll progress.
 */

const html = document.documentElement;
window.__brvBooted = true;
if (html.classList.contains('boot-failed')) {
  // main.js arrived after the inline safety timeout: restore the JS experience.
  html.classList.remove('no-js', 'boot-failed');
  html.classList.add('js', 'is-ready');
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const pad = (n, len = 2) => String(n).padStart(len, '0');
const SVG_NS = 'http://www.w3.org/2000/svg';
const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const reducedMotion = mq('(prefers-reduced-motion: reduce)').matches;
const finePointer = mq('(hover: hover) and (pointer: fine)').matches;
const isMobile = mq('(max-width: 760px)').matches || mq('(pointer: coarse)').matches;

const STAGE_IDS = ['tomt', 'grunnmur', 'bindingsverk', 'bjelkelag', 'takstoler', 'kledning', 'vinduer', 'tak', 'innredning', 'nokkelferdig'];
const DEFAULT_STAGES = [
  { id: 'tomt', start: 0, end: 0.08 },
  { id: 'grunnmur', start: 0.08, end: 0.19 },
  { id: 'bindingsverk', start: 0.19, end: 0.31 },
  { id: 'bjelkelag', start: 0.31, end: 0.41 },
  { id: 'takstoler', start: 0.41, end: 0.52 },
  { id: 'kledning', start: 0.52, end: 0.64 },
  { id: 'vinduer', start: 0.64, end: 0.73 },
  { id: 'tak', start: 0.73, end: 0.83 },
  { id: 'innredning', start: 0.83, end: 0.92 },
  { id: 'nokkelferdig', start: 0.92, end: 1 },
];

/* --------------------------------------------------------------------------
   DOM
   -------------------------------------------------------------------------- */
const dom = {
  canvas: $('#scene'),
  fallback: $('#scene-fallback'),
  loader: $('#loader'),
  loaderSkip: $('#loader-skip'),
  loaderCount: $('#loader-count'),
  loaderLabel: $('#loader-label'),
  loaderBar: $('#loader-bar'),
  nav: $('#nav'),
  navToggle: $('#nav-toggle'),
  menu: $('#menu'),
  hero: $('#intro'),
  heroBody: $('.hero__body'),
  crosshair: $('.crosshair'),
  crossLabel: $('.crosshair__label'),
  reel: $('#prosjekter'),
  reelSticky: $('.reel__sticky'),
  reelTrack: $('#reel-track'),
  reelFrames: $('#reel-frames'),
  reelIndex: $('#reel-index'),
  reelTotal: $('#reel-total'),
  reelBar: $('#reel-bar'),
  build: $('#byggeprosess'),
  buildSticky: $('.build__sticky'),
  buildStages: $('#build-stages'),
  buildPct: $('#build-pct'),
  rail: $('#build-rail'),
  railList: $('#build-rail-list'),
  buildLive: $('#build-live'),
  processWrap: $('.process__wrap'),
  processFill: $('#process-fill'),
  processSteps: $$('.pstep'),
  footer: $('#footer'),
  form: $('#contact-form'),
  formStatus: $('#form-status'),
};

/* --------------------------------------------------------------------------
   Scene host — one facade over either the WebGL house or the SVG fallback.
   Every call is guarded so a bug in the scene can never break scrolling.
   -------------------------------------------------------------------------- */
const warned = new Set();
const Scene = {
  impl: null,
  kind: 'none',
  ready: false,
  state: { load: 0, build: 0, mode: 'loader', active: true, px: 0, py: 0 },

  call(name, ...args) {
    const impl = this.impl;
    if (!impl || typeof impl[name] !== 'function') return undefined;
    try {
      return impl[name](...args);
    } catch (err) {
      if (!warned.has(name)) { warned.add(name); console.warn(`[BRV] scene.${name}() feilet:`, err); }
      return undefined;
    }
  },

  adopt(impl, kind) {
    if (!impl || impl === this.impl) return;
    const prev = this.impl;
    this.impl = impl;
    this.kind = kind;
    this.ready = true;
    if (prev) { try { prev.dispose && prev.dispose(); } catch (e) { /* ignore */ } }

    html.dataset.scene = kind;
    if (dom.fallback) dom.fallback.hidden = kind !== 'svg';
    if (kind !== 'webgl' && dom.canvas) dom.canvas.style.opacity = '0';

    const s = this.state;
    this.call('resize');
    this.call('setLoadProgress', s.load);
    this.call('setBuildProgress', s.build);
    this.call('setMode', s.mode);
    this.call('setPointer', s.px, s.py);
    this.call('setActive', s.active);
    this.applyViewShift();

    stages = readStages();
    buildRail();
    activeStage = -1;
    U.op = -1;
    needsMeasure = true;
    requestUpdate(true);
  },

  setLoadProgress(p) { this.state.load = p; this.call('setLoadProgress', p); },
  setBuildProgress(p, immediate = false) { this.state.build = p; this.call('setBuildProgress', p, immediate); },
  setMode(m) {
    if (m === this.state.mode) return;
    this.state.mode = m;
    this.call('setMode', m);
    this.applyViewShift();
  },
  /* Optional house.js extra: nudge the framing so the hero copy never sits on the house. */
  applyViewShift() {
    if (!this.impl || typeof this.impl.setViewShift !== 'function') return;
    const portrait = (M.vw || window.innerWidth) < (M.vh || window.innerHeight);
    if (this.state.mode === 'intro') {
      if (portrait) this.call('setViewShift', 0, 0.16);
      else this.call('setViewShift', 0.17, 0.05);
    } else {
      this.call('setViewShift', null);
    }
  },
  setPointer(x, y) { this.state.px = x; this.state.py = y; this.call('setPointer', x, y); },
  setActive(a) {
    if (a === this.state.active) return;
    this.state.active = a;
    this.call('setActive', a);
  },
  resize() { this.call('resize'); },
  get el() { return this.kind === 'svg' ? dom.fallback : this.kind === 'webgl' ? dom.canvas : null; },
};

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return false;
    const lose = gl.getExtension && gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch (e) {
    return false;
  }
}

function useFallback(reason) {
  if (Scene.kind === 'svg' || !dom.fallback) return;
  const impl = createFallbackScene({ container: dom.fallback, reducedMotion });
  Scene.adopt(impl, 'svg');
  console.info(`[BRV] Bruker SVG-tegningen av huset (${reason}).`);
}

let slowTimer = 0;
let lostTimer = 0;
async function initScene() {
  if (!dom.canvas || !hasWebGL()) { useFallback('WebGL er ikke tilgjengelig'); return; }
  // If three.js is very slow to arrive, show the SVG house meanwhile; upgrade when ready.
  slowTimer = setTimeout(() => useFallback('3D-scenen laster tregt'), 9000);
  try {
    const mod = await import('./house.js');
    if (typeof mod.createHouseScene !== 'function') throw new Error('createHouseScene() mangler i house.js');
    const impl = mod.createHouseScene({ canvas: dom.canvas, reducedMotion, isMobile });
    if (!impl) throw new Error('WebGL-konteksten kunne ikke opprettes');
    clearTimeout(slowTimer);
    Scene.adopt(impl, 'webgl');
  } catch (err) {
    clearTimeout(slowTimer);
    console.warn('[BRV] 3D-scenen kunne ikke startes:', err);
    useFallback('feil ved lasting av 3D');
  }
}

if (dom.canvas) {
  dom.canvas.addEventListener('webglcontextlost', () => {
    if (Scene.kind !== 'webgl') return;
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => useFallback('WebGL-konteksten gikk tapt'), 2500);
  });
  dom.canvas.addEventListener('webglcontextrestored', () => clearTimeout(lostTimer));
}

/* --------------------------------------------------------------------------
   Build stages, rail and live region
   -------------------------------------------------------------------------- */
let stages = DEFAULT_STAGES;
let activeStage = -1;
let railBtns = [];
let liveTimer = 0;
const stageEls = new Map($$('.stage', dom.buildStages || document).map((n) => [n.dataset.stage, n]));

function readStages() {
  const raw = Scene.call('getStages');
  if (Array.isArray(raw) && raw.length) {
    const ok = raw.every((s) => s && typeof s.id === 'string' && Number.isFinite(+s.start) && Number.isFinite(+s.end));
    if (ok) return raw.map((s) => ({ id: s.id, start: +s.start, end: +s.end })).sort((a, b) => a.start - b.start);
  }
  return DEFAULT_STAGES;
}

function stageIndexAt(p) {
  for (let i = stages.length - 1; i >= 0; i--) if (p >= stages[i].start) return i;
  return 0;
}

function stageLabel(s) {
  const n = stageEls.get(s.id);
  return (n && n.dataset.label) || s.id;
}

function buildRail() {
  if (!dom.railList) return;
  dom.railList.textContent = '';
  railBtns = stages.map((s, i) => {
    const li = el('li');
    const btn = el('button', 'rail-btn');
    btn.type = 'button';
    const label = stageLabel(s);
    const bar = el('span', 'rail-btn__bar');
    bar.setAttribute('aria-hidden', 'true');
    const num = el('span', 'rail-btn__n', pad(i));
    num.setAttribute('aria-hidden', 'true');
    btn.append(bar, num, el('span', 'rail-btn__label', label));
    btn.setAttribute('aria-label', `Gå til steg ${pad(i)}: ${label}`);
    btn.addEventListener('click', () => scrollToStage(i));
    li.appendChild(btn);
    dom.railList.appendChild(li);
    return btn;
  });
}

function scrollToStage(i) {
  const s = stages[i];
  if (!s) return;
  if (needsMeasure) measure();
  const frac = i === stages.length - 1 ? 0.9 : 0.62;
  const p = s.start + (s.end - s.start) * frac;
  const y = M.buildTop + p * Math.max(1, M.buildH - M.buildSticky);
  window.scrollTo({ top: Math.round(y), behavior: reducedMotion ? 'auto' : 'smooth' });
}

function setActiveStage(i, announce) {
  if (i === activeStage) return;
  activeStage = i;
  const id = stages[i] && stages[i].id;
  stageEls.forEach((n, key) => n.classList.toggle('is-active', key === id));
  railBtns.forEach((b, j) => {
    b.classList.toggle('is-active', j === i);
    b.classList.toggle('is-done', j < i);
    if (j === i) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
  clearTimeout(liveTimer);
  if (!announce || !dom.buildLive) return;
  liveTimer = setTimeout(() => {
    const n = stageEls.get(id);
    if (!n) return;
    const title = (n.querySelector('.stage__title') || {}).textContent || '';
    dom.buildLive.textContent = `Steg ${pad(i)} av ${pad(stages.length - 1)} — ${n.dataset.label}: ${title.trim()}`;
  }, 500);
}

/* --------------------------------------------------------------------------
   Measure + single rAF-throttled scroll/resize update
   -------------------------------------------------------------------------- */
const M = {
  vw: 0, vh: 0,
  reelTop: 0, reelH: 0, reelSticky: 0, reelDist: 0, frames: [],
  buildTop: 0, buildH: 0, buildSticky: 0,
  footerTop: 0, procTop: 0, procH: 0,
  light: [], navTargets: [],
};
const U = {
  lastY: -1, lastBuild: -1, lastPct: -1, reelIdx: -1, op: -1,
  navHidden: false, navScrolled: false, navLight: false, navCurrent: null,
  procP: -1, heroP: -1, reelP: -1,
};
let needsMeasure = true;
let forceUpdate = true;
let ticking = false;
let loaderDone = false;
let menuOpen = false;

const absTop = (node) => node.getBoundingClientRect().top + window.scrollY;

function measure() {
  needsMeasure = false;
  M.vw = document.documentElement.clientWidth || window.innerWidth; // excludes a classic scrollbar
  M.vh = window.innerHeight;
  const jsMode = html.classList.contains('js');

  if (jsMode && dom.reel && dom.reelTrack && dom.reelSticky) {
    M.reelSticky = dom.reelSticky.offsetHeight || M.vh;
    const trackW = dom.reelTrack.scrollWidth;
    M.reelDist = Math.max(0, trackW - M.vw);
    const h = Math.round(M.reelDist + M.reelSticky);
    if (Math.abs(dom.reel.offsetHeight - h) > 1) dom.reel.style.height = `${h}px`;
    M.frames = $$('.frame', dom.reelTrack).map((f) => ({ el: f, left: f.offsetLeft, w: f.offsetWidth }));
    M.reelTop = absTop(dom.reel);
    M.reelH = dom.reel.offsetHeight;
  }
  if (dom.build && dom.buildSticky) {
    M.buildTop = absTop(dom.build);
    M.buildH = dom.build.offsetHeight;
    M.buildSticky = dom.buildSticky.offsetHeight || M.vh;
  }
  if (dom.footer) M.footerTop = absTop(dom.footer);
  if (dom.processWrap) {
    M.procTop = absTop(dom.processWrap);
    M.procH = dom.processWrap.offsetHeight;
  }
  M.light = $$('[data-theme="light"]').map((n) => {
    const t = absTop(n);
    return [t, t + n.offsetHeight];
  });
  M.navTargets = $$('.nav__links a[href^="#"]')
    .map((a) => {
      const target = document.getElementById(a.getAttribute('href').slice(1));
      return target ? { a, top: absTop(target) } : null;
    })
    .filter(Boolean);
  M.navH = dom.nav ? dom.nav.offsetHeight : 60;

  Scene.resize();
  Scene.applyViewShift();
}

function requestUpdate(force) {
  if (force) forceUpdate = true;
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(frame);
  }
}

function frame() {
  ticking = false;
  if (needsMeasure) measure();
  update();
}

function sceneOpacity(y, vh) {
  let op = 1;
  op = lerp(op, 0.3, clamp((y + vh - M.reelTop) / vh));                     // dim behind the footage reel
  op = lerp(op, 1, clamp((y + vh * 0.9 - M.buildTop) / (vh * 0.9)));         // full for the build
  op = lerp(op, 0, clamp((y + vh - (M.buildTop + M.buildH)) / (vh * 0.8)));  // hand over to content
  op = lerp(op, 0.62, clamp((y + vh - M.footerTop) / vh));                    // finished house behind the footer
  return op;
}

function computeMode(y, vh) {
  if (!loaderDone) return 'loader';
  const mid = y + vh * 0.5;
  if (mid < M.buildTop) return 'intro';
  if (mid < M.buildTop + M.buildH) return 'build';
  return 'idle';
}

function update() {
  const y = window.scrollY;
  const vh = M.vh || window.innerHeight;
  const dy = U.lastY < 0 ? 0 : y - U.lastY;
  U.lastY = y;
  const force = forceUpdate;
  forceUpdate = false;

  /* Hero: gentle lift + fade as you leave it */
  if (!reducedMotion && dom.heroBody && loaderDone) {
    const hp = Math.round(clamp(y / (vh * 0.95)) * 1000) / 1000;
    if (hp !== U.heroP) {
      U.heroP = hp;
      dom.heroBody.style.transform = hp ? `translate3d(0, ${(-hp * 90).toFixed(1)}px, 0)` : '';
      dom.heroBody.style.opacity = hp ? String(Math.max(0, 1 - hp * 1.1).toFixed(3)) : '';
    }
  }

  /* Footage reel: pinned, vertical scroll → horizontal travel */
  if (M.reelH && dom.reelTrack) {
    const range = Math.max(1, M.reelH - M.reelSticky);
    const rp = clamp((y - M.reelTop) / range);
    const near = y + vh > M.reelTop - vh * 0.25 && y < M.reelTop + M.reelH + vh * 0.25;
    if ((near && rp !== U.reelP) || force) {
      U.reelP = rp;
      const x = rp * M.reelDist;
      dom.reelTrack.style.transform = `translate3d(${(-x).toFixed(1)}px, 0, 0)`;
      if (dom.reelBar) dom.reelBar.style.setProperty('--p', rp.toFixed(4));
      const cx = x + M.vw / 2;
      let idx = 0;
      for (let i = 0; i < M.frames.length; i++) {
        const f = M.frames[i];
        if (!reducedMotion) {
          const shift = clamp((f.left + f.w / 2 - cx) / M.vw, -1.2, 1.2);
          f.el.style.setProperty('--shift', shift.toFixed(3));
        }
        if (cx >= f.left - 24) idx = i;
      }
      if (idx !== U.reelIdx && dom.reelIndex) {
        U.reelIdx = idx;
        dom.reelIndex.textContent = pad(idx + 1);
      }
    }
  }

  /* The build: scroll progress drives the house */
  if (M.buildH && dom.build) {
    const range = Math.max(1, M.buildH - M.buildSticky);
    const bp = clamp((y - M.buildTop) / range);
    const inBuild = y + vh * 0.5 > M.buildTop && y < M.buildTop + M.buildH - vh * 0.5;
    if (Math.abs(bp - U.lastBuild) > 1e-5 || force) {
      U.lastBuild = bp;
      // Snap (no smoothing) when the build isn't on screen, e.g. after a jump to #kontakt,
      // so the footer never shows the house still assembling itself.
      Scene.setBuildProgress(bp, !inBuild);
      if (dom.rail) dom.rail.style.setProperty('--p', bp.toFixed(4));
      const pct = Math.round(bp * 100);
      if (pct !== U.lastPct && dom.buildPct) {
        U.lastPct = pct;
        dom.buildPct.textContent = pad(pct, 3);
      }
      setActiveStage(stageIndexAt(bp), inBuild);
      dom.build.classList.toggle('is-started', bp > 0.015);
    }
  }

  /* Shared canvas: visibility, mode, render loop on/off */
  const op = sceneOpacity(y, vh);
  if (Math.abs(op - U.op) > 0.003 || force) {
    U.op = op;
    const node = Scene.el;
    if (node) node.style.opacity = Scene.ready ? op.toFixed(3) : '0';
  }
  Scene.setMode(computeMode(y, vh));
  Scene.setActive(op > 0.01 && !document.hidden);

  /* Navigation */
  if (dom.nav) {
    const scrolled = y > 24;
    if (scrolled !== U.navScrolled) {
      U.navScrolled = scrolled;
      dom.nav.classList.toggle('is-scrolled', scrolled);
    }
    if (!menuOpen) {
      let hide = U.navHidden;
      if (y < vh * 0.6) hide = false;
      else if (dy > 6) hide = true;
      else if (dy < -6) hide = false;
      if (hide !== U.navHidden) {
        U.navHidden = hide;
        dom.nav.classList.toggle('is-hidden', hide);
      }
    }
    const probe = y + (M.navH || 60) * 0.5;
    const light = M.light.some(([a, b]) => probe >= a && probe < b);
    if (light !== U.navLight) {
      U.navLight = light;
      dom.nav.classList.toggle('on-light', light);
    }
    let current = null;
    for (const t of M.navTargets) if (y + vh * 0.4 >= t.top) current = t.a;
    if (current !== U.navCurrent) {
      if (U.navCurrent) U.navCurrent.removeAttribute('aria-current');
      if (current) current.setAttribute('aria-current', 'true');
      U.navCurrent = current;
    }
  }

  /* Process line */
  if (M.procH && dom.processFill) {
    const pp = Math.round(clamp((y + vh * 0.72 - M.procTop) / (M.procH * 0.9)) * 1000) / 1000;
    if (pp !== U.procP) {
      U.procP = pp;
      dom.processFill.style.setProperty('--p', String(pp));
      const n = dom.processSteps.length;
      dom.processSteps.forEach((s, i) => s.classList.toggle('is-on', pp >= (i + 0.15) / n));
    }
  }
}

/* --------------------------------------------------------------------------
   Loader — blueprint drawing itself, real readiness + eased time
   -------------------------------------------------------------------------- */
let fontsReady = !document.fonts;
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fontsReady = true; });

function onLoaderKey(e) {
  if (e.key === 'Escape' && !loaderDone) finishLoader(false);
}

function runLoader() {
  const loading = html.classList.contains('is-loading');
  if (!loading || reducedMotion || !dom.loader) {
    finishLoader(true);
    return;
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const DUR = 2200;
  const HARD_CAP = 8000;
  const labels = [
    [0, 'Laster tegninger…'],
    [0.32, 'Måler opp tomta…'],
    [0.62, 'Sjekker lodd og vater…'],
    [0.92, 'Klar til bygging.'],
  ];
  let lastLabel = '';
  let lastPct = -1;
  const t0 = performance.now();

  const step = (now) => {
    if (loaderDone) return;
    const elapsed = now - t0;
    let p = easeInOutCubic(clamp(elapsed / DUR));
    const ready = Scene.ready && fontsReady && document.readyState === 'complete';
    if (!ready && elapsed < HARD_CAP) {
      p = Math.min(p, 0.9 + 0.08 * clamp((elapsed - DUR) / (HARD_CAP - DUR)));
    }
    Scene.setLoadProgress(p);
    const pct = Math.round(p * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      if (dom.loaderCount) dom.loaderCount.textContent = pad(pct, 3);
      if (dom.loaderBar) dom.loaderBar.style.setProperty('--p', p.toFixed(4));
    }
    let label = labels[0][1];
    for (const [th, txt] of labels) if (p >= th) label = txt;
    if (label !== lastLabel && dom.loaderLabel) {
      lastLabel = label;
      dom.loaderLabel.textContent = label;
    }
    if (p >= 1 || elapsed >= HARD_CAP) {
      finishLoader(false);
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  if (dom.loaderSkip) {
    dom.loaderSkip.addEventListener('click', (e) => {
      e.stopPropagation();
      finishLoader(false);
    });
  }
  dom.loader.addEventListener('click', () => finishLoader(false));
  window.addEventListener('keydown', onLoaderKey);
}

function finishLoader(instant) {
  if (loaderDone) return;
  loaderDone = true;
  window.removeEventListener('keydown', onLoaderKey);
  Scene.setLoadProgress(1);
  if (dom.loaderCount) dom.loaderCount.textContent = '100';
  if (dom.loaderBar) dom.loaderBar.style.setProperty('--p', '1');

  const wasLoading = html.classList.contains('is-loading');
  html.classList.remove('is-loading');
  if (wasLoading && !instant) {
    html.classList.add('is-unloading');
    setTimeout(() => html.classList.remove('is-unloading'), 950);
  }
  void document.body.offsetHeight; // commit the hidden state before entrance transitions
  requestAnimationFrame(() => {
    html.classList.add('is-ready');
    needsMeasure = true;
    requestUpdate(true);
    if (wasLoading && location.hash.length > 1) {
      let target = null;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { /* bad hash */ }
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  });
}

/* --------------------------------------------------------------------------
   Split text (word spans for staggered reveals)
   -------------------------------------------------------------------------- */
function splitWords(root, start = 0) {
  let i = start;
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 3) {
        const text = child.nodeValue;
        if (!text.trim()) return;
        const frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          const w = el('span', 'w', part);
          w.style.setProperty('--i', String(i++));
          frag.appendChild(w);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && !child.classList.contains('w')) {
        walk(child);
      }
    });
  };
  walk(root);
  return i;
}

function setupSplits() {
  let i = 0;
  $$('.hero__line').forEach((line) => { i = splitWords(line, i); });
  $$('[data-split]:not(.hero__line)').forEach((n) => splitWords(n));
  $$('.stage__title').forEach((n) => splitWords(n));
}

/* --------------------------------------------------------------------------
   Reveals, counters, marquee pause
   -------------------------------------------------------------------------- */
function setupReveals() {
  $$('.services__grid, .trades__grid, .process__steps, .contact__list').forEach((grid) => {
    Array.from(grid.children).forEach((c, i) => c.style.setProperty('--d', `${(i % 4) * 0.09}s`));
  });
  const targets = $$('[data-reveal], [data-split]:not(.hero__line)');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
  targets.forEach((t) => io.observe(t));
}

function setupCounters() {
  const nums = $$('[data-count]');
  nums.forEach((n) => {
    // Screen readers always get the true value; the animated digits are decorative.
    const sr = el('span', 'sr-only', n.dataset.count);
    n.after(sr);
    n.setAttribute('aria-hidden', 'true');
  });
  if (reducedMotion || !('IntersectionObserver' in window)) return;
  nums.forEach((n) => { n.textContent = n.dataset.from || '0'; });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const node = e.target;
      const to = +node.dataset.count;
      const from = +(node.dataset.from || 0);
      const t0 = performance.now();
      const dur = 1500;
      const tick = (now) => {
        const t = clamp((now - t0) / dur);
        node.textContent = String(Math.round(lerp(from, to, easeOutCubic(t))));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  nums.forEach((n) => io.observe(n));
}

function setupMarquee() {
  const m = $('.marquee');
  if (!m || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(([e]) => m.classList.toggle('is-paused', !e.isIntersecting));
  io.observe(m);
}

/* --------------------------------------------------------------------------
   Footage reel — data-driven from assets/footage/footage.json
   -------------------------------------------------------------------------- */
const PALETTES = [
  ['#5C7383', '#C9A47B'], ['#E2C9A4', '#5C7383'], ['#3E5A66', '#ECE8E1'],
  ['#C9A47B', '#3E5A66'], ['#4A5560', '#FF5A1F'], ['#E2C9A4', '#4A5560'],
];
const LAYOUT = ['wide', 'tall', 'wide', 'wide', 'tall', 'wide'];
const ICONS = ['nybygg', 'tilbygg', 'vvs', 'rehab', 'tak', 'renovering', 'ombygging'];

function iconFor(item, i) {
  if (item.icon && ICONS.includes(item.icon)) return item.icon;
  const t = String(item.title || '').toLowerCase();
  if (/bad|vvs|rør/.test(t)) return 'vvs';
  if (/tilbygg|påbygg/.test(t)) return 'tilbygg';
  if (/rehab|restaur/.test(t)) return 'rehab';
  if (/oppuss|renover/.test(t)) return 'renovering';
  if (/ombygg/.test(t)) return 'ombygging';
  if (/tak/.test(t)) return 'tak';
  if (/nybygg|bolig|hus/.test(t)) return 'nybygg';
  return ICONS[i % ICONS.length];
}

function renderFrames(items) {
  const total = items.length;
  const frag = document.createDocumentFragment();
  items.forEach((item, i) => {
    const title = String(item.title || `Prosjekt ${i + 1}`);
    const layout = item.layout === 'wide' || item.layout === 'tall' ? item.layout : LAYOUT[i % LAYOUT.length];
    const li = el('li', `frame frame--${layout}`);
    const [a, b] = PALETTES[i % PALETTES.length];
    li.style.setProperty('--a', a);
    li.style.setProperty('--b', b);

    const fig = el('figure', 'frame__fig');
    const box = el('div', 'frame__box');
    const media = el('div', 'frame__media');
    media.dataset.type = item.type === 'video' ? 'video' : 'image';
    if (item.src) media.dataset.src = String(item.src);
    if (item.poster) media.dataset.poster = String(item.poster);
    if (item.alt) media.dataset.alt = String(item.alt);

    const fb = el('div', 'frame__fallback');
    fb.setAttribute('aria-hidden', 'true');
    const draw = document.createElementNS(SVG_NS, 'svg');
    draw.setAttribute('class', 'frame__draw');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#i-${iconFor(item, i)}`);
    draw.appendChild(use);
    const len = String(Math.max(3, Math.min(16, title.length)));
    const ghost = el('span', 'frame__ghost', title);
    ghost.style.setProperty('--len', len);
    const word = el('span', 'frame__word', title);
    word.style.setProperty('--len', len);
    const tag = el('span', 'frame__tag mono');
    tag.append(el('i'), document.createTextNode(item.type === 'video' ? 'Film kommer' : 'Bilde kommer'));
    fb.append(draw, ghost, word, tag);
    box.append(media, fb);

    const cap = el('figcaption', 'frame__cap');
    cap.append(
      el('span', 'frame__idx mono', `${pad(i + 1)} / ${pad(total)}`),
      el('span', 'frame__title', title),
      el('span', 'frame__place mono', String(item.place || 'Bergen')),
    );
    if (item.caption) cap.append(el('span', 'frame__text', String(item.caption)));
    fig.append(box, cap);
    li.append(fig);
    frag.append(li);
  });
  dom.reelFrames.replaceChildren(frag);
  if (dom.reelTotal) dom.reelTotal.textContent = pad(total);
}

let videoIO = null;
function setupFrameMedia() {
  const frames = $$('.frame', dom.reelFrames || document);
  if ('IntersectionObserver' in window) {
    videoIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target.querySelector('video');
        if (!v || reducedMotion) return;
        if (e.isIntersecting) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
        else v.pause();
      });
    }, { threshold: 0.2 });
  }

  const load = (frame) => {
    const media = $('.frame__media', frame);
    if (!media || media.dataset.loaded) return;
    media.dataset.loaded = '1';
    const src = (media.dataset.src || '').trim();
    if (!src || /^(javascript|vbscript):/i.test(src)) return;
    const title = ($('.frame__title', frame) || {}).textContent || '';
    const place = ($('.frame__place', frame) || {}).textContent || '';
    const alt = media.dataset.alt || [title, place].filter(Boolean).join(' — ');
    const ok = () => { frame.classList.add('has-media'); frame.classList.remove('no-media'); };
    const fail = (node) => { node.remove(); frame.classList.add('no-media'); };

    if (media.dataset.type === 'video') {
      const v = document.createElement('video');
      v.muted = true;
      v.defaultMuted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.preload = 'metadata';
      v.setAttribute('aria-label', alt);
      if (media.dataset.poster) v.poster = media.dataset.poster;
      if (reducedMotion) v.controls = true;
      v.addEventListener('loadeddata', ok, { once: true });
      v.addEventListener('error', () => fail(v), { once: true });
      v.src = src;
      media.appendChild(v);
      if (videoIO) videoIO.observe(frame);
    } else {
      const img = new Image();
      img.decoding = 'async';
      img.alt = alt;
      img.addEventListener('load', ok, { once: true });
      img.addEventListener('error', () => fail(img), { once: true });
      img.src = src;
      media.appendChild(img);
    }
  };

  // Frames are clipped by the pinned container, so preload them all as the reel approaches.
  if (!('IntersectionObserver' in window) || !dom.reel) {
    frames.forEach(load);
    return;
  }
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    frames.forEach(load);
  }, { rootMargin: '150% 0px 150% 0px' });
  io.observe(dom.reel);
}

async function loadFootage() {
  let items = null;
  try {
    const res = await fetch('assets/footage/footage.json', { cache: 'no-cache' });
    if (res.ok) items = await res.json();
  } catch (e) {
    /* file:// or offline: keep the frames that ship in the HTML */
  }
  if (Array.isArray(items) && dom.reelFrames) {
    const valid = items.filter((it) => it && typeof it === 'object' && (it.src || it.title)).slice(0, 24);
    if (valid.length) renderFrames(valid);
  }
  setupFrameMedia();
  needsMeasure = true;
  requestUpdate(true);
}

/* --------------------------------------------------------------------------
   Pointer / device tilt → scene parallax + hero crosshair
   -------------------------------------------------------------------------- */
function setupPointer() {
  if (reducedMotion) return;
  let px = 0;
  let py = 0;
  let cx = -100;
  let cy = -100;
  let pending = false;
  const nf = new Intl.NumberFormat('nb-NO');

  const flush = () => {
    pending = false;
    Scene.setPointer(px, py);
    if (dom.crosshair && finePointer && window.scrollY < (M.vh || window.innerHeight)) {
      const yy = cy + window.scrollY;
      dom.crosshair.style.setProperty('--cx', `${cx.toFixed(0)}px`);
      dom.crosshair.style.setProperty('--cy', `${yy.toFixed(0)}px`);
      if (dom.crossLabel) {
        const mmX = Math.round((cx / (M.vw || 1)) * 120) * 100;
        const mmY = Math.round((1 - cy / (M.vh || 1)) * 80) * 100;
        dom.crossLabel.textContent = `X ${nf.format(mmX)} · Y ${nf.format(mmY)} mm`;
      }
    }
  };
  const queue = () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(flush);
    }
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const w = M.vw || window.innerWidth;
    const h = M.vh || window.innerHeight;
    cx = e.clientX;
    cy = e.clientY;
    px = clamp((e.clientX / w) * 2 - 1, -1, 1);
    py = clamp(-((e.clientY / h) * 2 - 1), -1, 1);
    queue();
  }, { passive: true });

  if (dom.hero && finePointer) {
    dom.hero.addEventListener('pointerenter', () => dom.hero.classList.add('has-pointer'));
    dom.hero.addEventListener('pointerleave', () => dom.hero.classList.remove('has-pointer'));
  }

  // Device tilt on touch devices — only where no permission prompt is needed (no iOS prompt on load).
  const DOE = window.DeviceOrientationEvent;
  if (isMobile && DOE && typeof DOE.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return;
      px = clamp(e.gamma / 25, -1, 1);
      py = clamp((45 - e.beta) / 25, -1, 1);
      queue();
    }, { passive: true });
  }
}

/* --------------------------------------------------------------------------
   Mobile menu — accessible overlay with focus trap
   -------------------------------------------------------------------------- */
function setupMenu() {
  const { nav, navToggle: btn, menu } = dom;
  if (!nav || !btn || !menu) return;
  const label = btn.querySelector('.nav__toggle-label');
  const outside = [$('#main'), dom.footer].filter(Boolean);
  const desktop = mq('(min-width: 1080px)');

  const focusables = () => $$('a[href], button:not([disabled])', nav).filter((n) => n.getClientRects().length > 0);

  const open = () => {
    menuOpen = true;
    nav.classList.add('is-open');
    nav.classList.remove('is-hidden');
    U.navHidden = false;
    btn.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = 'Lukk';
    outside.forEach((n) => { n.inert = true; });
    html.style.overflow = 'hidden';
    const first = menu.querySelector('a');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 80);
  };
  const close = (returnFocus = true) => {
    if (!menuOpen) return;
    menuOpen = false;
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = 'Meny';
    outside.forEach((n) => { n.inert = false; });
    html.style.overflow = '';
    if (returnFocus) btn.focus({ preventScroll: true });
  };

  btn.addEventListener('click', () => (menuOpen ? close() : open()));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) close(false);
  });
  document.addEventListener('keydown', (e) => {
    if (!menuOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  const onDesktop = (e) => { if (e.matches) close(false); };
  if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
}

/* --------------------------------------------------------------------------
   Contact form → prefilled mailto:
   -------------------------------------------------------------------------- */
function setupForm() {
  const form = dom.form;
  if (!form) return;

  const setError = (input, msg) => {
    const field = input.closest('.field');
    const id = `${input.id}-err`;
    let err = document.getElementById(id);
    if (!err && field) {
      err = el('p', 'field__err');
      err.id = id;
      field.appendChild(err);
    }
    if (err) err.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', id);
  };
  const clearError = (input) => {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    const err = document.getElementById(`${input.id}-err`);
    if (err) err.remove();
  };

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute('aria-invalid') === 'true') clearError(t);
    if (t && (t.id === 'f-email' || t.id === 'f-phone')) {
      ['f-email', 'f-phone'].forEach((id) => {
        const n = document.getElementById(id);
        if (n && n.getAttribute('aria-invalid') === 'true' && (n.value.trim() || t.value.trim())) clearError(n);
      });
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const get = (k) => String(data.get(k) || '').trim();
    const name = get('navn');
    const phone = get('telefon');
    const email = get('epost');
    const place = get('sted');
    const msg = get('melding');
    const type = get('type') || 'Prosjekt';

    $$('[aria-invalid="true"]', form).forEach(clearError);
    const errors = [];
    if (!name) errors.push(['f-name', 'Skriv inn navnet ditt.']);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(['f-email', 'Sjekk at e-postadressen er riktig.']);
    if (!phone && !email) errors.push(['f-phone', 'Oppgi telefon eller e-post, så vi kan svare deg.']);
    if (!msg) errors.push(['f-msg', 'Fortell kort om prosjektet.']);

    if (errors.length) {
      errors.forEach(([id, m]) => {
        const input = document.getElementById(id);
        if (input) setError(input, m);
      });
      const firstBad = document.getElementById(errors[0][0]);
      if (firstBad) firstBad.focus();
      if (dom.formStatus) dom.formStatus.textContent = `Nesten der — ${errors.length === 1 ? 'ett felt' : `${errors.length} felt`} må fylles ut.`;
      return;
    }

    const subject = `Forespørsel: ${type} – ${name}`;
    const lines = [
      'Hei, Bygg & Renovering Vest!',
      '',
      msg,
      '',
      '—',
      `Prosjekttype: ${type}`,
      `Navn: ${name}`,
      phone ? `Telefon: ${phone}` : null,
      email ? `E-post: ${email}` : null,
      place ? `Adresse / sted: ${place}` : null,
      '',
      'Sendt fra skjemaet på byggrv.no',
    ].filter((l) => l !== null);
    const href = `mailto:post@byggrv.no?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
    if (dom.formStatus) {
      dom.formStatus.textContent = 'Åpner e-postprogrammet ditt … Skjer det ingenting? Send direkte til post@byggrv.no eller ring 94 01 66 10.';
    }
    window.location.href = href;
  });
}

/* --------------------------------------------------------------------------
   SVG fallback scene — same API as house.js, line-drawn axonometric house
   -------------------------------------------------------------------------- */
function createFallbackScene({ container, reducedMotion: rm = false }) {
  const W = 7.2;          // width (m)
  const L = 11;           // length (m)
  const F = 0.6;          // foundation height
  const TOP = 5.6;        // top of walls
  const MID = 3.1;        // floor joists
  const T = Math.tan((35 * Math.PI) / 180);
  const RIDGE = TOP + (W / 2) * T;
  const OV = 0.45;
  const EAVE = TOP - OV * T;
  const KX = Math.cos(Math.PI / 6) * 20;
  const KY = 0.5 * 20;
  const KH = 20;

  const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const r2 = (n) => Math.round(n * 100) / 100;
  const pr = (x, y, z) => {
    const sx = (x - z) * KX;
    const sy = (x + z) * KY - y * KH;
    if (sx < bounds.x0) bounds.x0 = sx;
    if (sx > bounds.x1) bounds.x1 = sx;
    if (sy < bounds.y0) bounds.y0 = sy;
    if (sy > bounds.y1) bounds.y1 = sy;
    return [sx, sy];
  };
  const pathOf = (pls) => pls
    .map((pl) => pl.map((p, i) => {
      const [sx, sy] = pr(p[0], p[1], p[2]);
      return `${i ? 'L' : 'M'}${r2(sx)} ${r2(sy)}`;
    }).join(''))
    .join('');
  const roofAt = (x) => TOP + (W / 2 - Math.abs(x - W / 2)) * T;
  const rect = (y, x0, z0, x1, z1) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]];

  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (parent) parent.appendChild(n);
    return n;
  };

  const svg = mk('svg', { class: 'fb-svg', focusable: 'false', 'aria-hidden': 'true' });
  const defs = mk('defs', {}, svg);
  const warm = mk('radialGradient', { id: 'fb-warm' }, defs);
  mk('stop', { offset: '0', 'stop-color': '#FFC27A', 'stop-opacity': '.55' }, warm);
  mk('stop', { offset: '1', 'stop-color': '#FF8A3C', 'stop-opacity': '0' }, warm);

  const items = Object.fromEntries(STAGE_IDS.map((id) => [id, []]));
  const ghostItems = [];
  const group = (cls, stage) => {
    const g = mk('g', { class: cls }, svg);
    if (stage) g.dataset.stage = stage;
    return g;
  };

  // Paint order (back → front)
  const gBg = group('fb-bg');
  const gSpill = group('fb-spill-g');
  const gGhost = group('fb-ghost');
  const G = {};
  ['tomt', 'grunnmur', 'bindingsverk', 'bjelkelag', 'takstoler', 'kledning', 'vinduer'].forEach((id) => { G[id] = group('fb-layer', id); });
  G.innredning = group('fb-layer', 'innredning');
  G.tak = group('fb-layer', 'tak');
  G.nokkelferdig = group('fb-layer', 'nokkelferdig');

  const push = (id, node, kind, d, span, max) => items[id].push({ el: node, kind, d, span, max, last: -1 });
  const ln = (id, pls, d = 0, cls = '', span = 0.35, parent) => {
    const n = mk('path', { d: pathOf(pls), pathLength: 1, class: `fb-ln ${cls}`.trim() }, parent || G[id]);
    push(id, n, 'ln', d, span, 1);
    return n;
  };
  const fl = (id, pts, cls, d = 0, max = 1, span = 0.6, parent) => {
    const n = mk('path', { d: `${pathOf([pts])}Z`, class: `fb-fill ${cls}` }, parent || G[id]);
    push(id, n, 'fill', d, span, max);
    return n;
  };
  const gh = (pls, cls = '') => {
    const n = mk('path', { d: pathOf(pls), pathLength: 1, class: `fb-ln ${cls}`.trim() }, gGhost);
    ghostItems.push({ el: n, kind: 'ln', d: 0, span: 0.3, max: 1, last: -1 });
  };
  const label = (txt, p, rot) => {
    const [sx, sy] = pr(p[0], p[1], p[2]);
    const t = mk('text', { x: r2(sx), y: r2(sy), class: 'fb-dim', 'text-anchor': 'middle', transform: `rotate(${rot} ${r2(sx)} ${r2(sy)})` }, gGhost);
    t.textContent = txt;
    ghostItems.push({ el: t, kind: 'fill', d: 1, span: 0.15, max: 1, last: -1 });
  };

  /* Blueprint ghost (loader) */
  gh([rect(0, 0, 0, W, L)]);
  gh([[[0, 0, 0], [0, TOP, 0]], [[W, 0, 0], [W, TOP, 0]], [[W, 0, L], [W, TOP, L]], [[0, 0, L], [0, TOP, L]]]);
  gh([rect(TOP, 0, 0, W, L)]);
  gh([[[-OV, EAVE, -OV], [W / 2, RIDGE, -OV], [W + OV, EAVE, -OV]]]);
  gh([[[-OV, EAVE, L + OV], [W / 2, RIDGE, L + OV], [W + OV, EAVE, L + OV]]]);
  gh([[[W / 2, RIDGE, -OV], [W / 2, RIDGE, L + OV]], [[W + OV, EAVE, -OV], [W + OV, EAVE, L + OV]], [[-OV, EAVE, -OV], [-OV, EAVE, L + OV]]]);
  const DZ = L + 2.2;
  const DX = W + 2.2;
  gh([[[0, 0, DZ], [W, 0, DZ]], [[0, 0, DZ - 0.35], [0, 0, DZ + 0.35]], [[W, 0, DZ - 0.35], [W, 0, DZ + 0.35]]]);
  gh([[[DX, 0, 0], [DX, 0, L]], [[DX - 0.35, 0, 0], [DX + 0.35, 0, 0]], [[DX - 0.35, 0, L], [DX + 0.35, 0, L]]]);
  gh([[[W + 1.2, 0, L + 1.2], [W + 1.2, RIDGE, L + 1.2]], [[W + 0.9, RIDGE, L + 1.2], [W + 1.5, RIDGE, L + 1.2]]]);
  ghostItems.forEach((it, i, arr) => { if (it.kind === 'ln') it.d = i / arr.length; });
  label('7 200', [W / 2, 0, DZ + 1.1], 30);
  label('11 000', [DX + 1.1, 0, L / 2], -30);
  label('+8 120', [W + 1.9, RIDGE + 0.4, L + 1.2], 0);

  /* 00 Tomta: plot, stakes, string lines */
  ln('tomt', [rect(0, -2.6, -2.4, W + 2.6, L + 2.8)], 0, 'fb-ln--soft', 0.5);
  const S = 1.4;
  const SY = 0.35;
  [[-S, 0], [W + S, 0], [-S, L], [W + S, L], [0, -S], [0, L + S], [W, -S], [W, L + S]]
    .forEach(([x, z], i) => ln('tomt', [[[x, 0, z], [x, 0.62, z]]], 0.15 + i * 0.04, '', 0.25));
  [
    [[-S, SY, 0], [W + S, SY, 0]], [[-S, SY, L], [W + S, SY, L]],
    [[0, SY, -S], [0, SY, L + S]], [[W, SY, -S], [W, SY, L + S]],
  ].forEach((s, i) => ln('tomt', [s], 0.5 + i * 0.08, 'fb-string', 0.3));
  [[0, 0], [W, 0], [W, L], [0, L]]
    .forEach(([x, z], i) => ln('tomt', [[[x - 0.3, 0, z], [x + 0.3, 0, z]], [[x, 0, z - 0.3], [x, 0, z + 0.3]]], 0.8 + i * 0.04, '', 0.2));

  /* 01 Grunnmur */
  ln('grunnmur', [rect(0, -0.8, -0.8, W + 0.8, L + 0.8)], 0, 'fb-ln--soft', 0.3);
  fl('grunnmur', [[0, 0, L], [W, 0, L], [W, F, L], [0, F, L]], 'fb-concrete', 0.25, 0.85);
  fl('grunnmur', [[W, 0, 0], [W, 0, L], [W, F, L], [W, F, 0]], 'fb-concrete', 0.3, 0.7);
  fl('grunnmur', [[0, F, 0], [W, F, 0], [W, F, L], [0, F, L]], 'fb-concrete-top', 0.4, 0.55);
  ln('grunnmur', [
    [[0, 0, L], [W, 0, L], [W, 0, 0]],
    rect(F, 0, 0, W, L),
    [[0, 0, L], [0, F, L]], [[W, 0, L], [W, F, L]], [[W, 0, 0], [W, F, 0]],
  ], 0.2, '', 0.5);
  for (let z = 0.55, i = 0; z < L; z += 1.1, i++) ln('grunnmur', [[[0.25, F, z], [W - 0.25, F, z]]], 0.55 + i * 0.03, 'fb-ln--thin', 0.2);
  for (let x = 0.6, i = 0; x < W; x += 1.2, i++) ln('grunnmur', [[[x, F, 0.25], [x, F, L - 0.25]]], 0.6 + i * 0.04, 'fb-ln--thin', 0.2);

  /* 02 Bindingsverk */
  ln('bindingsverk', [rect(F + 0.05, 0, 0, W, L)], 0, '', 0.25);
  const studs = [];
  for (let x = 0; x <= W + 1e-6; x += 0.6) { studs.push([x, 0]); studs.push([x, L]); }
  for (let z = 0.6; z < L - 1e-6; z += 0.6) { studs.push([0, z]); studs.push([W, z]); }
  studs.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  studs.forEach(([x, z], i) => ln('bindingsverk', [[[x, F, z], [x, TOP, z]]], 0.08 + (i / studs.length) * 0.82, '', 0.12));
  ln('bindingsverk', [rect(TOP, 0, 0, W, L)], 0.85, '', 0.15);

  /* 03 Bjelkelag */
  ln('bjelkelag', [rect(MID, 0, 0, W, L)], 0, '', 0.3);
  fl('bjelkelag', [[0, MID, 0], [W, MID, 0], [W, MID, L], [0, MID, L]], 'fb-floor', 0.5, 0.14, 0.5);
  for (let z = 0.6, i = 0; z < L - 1e-6; z += 0.6, i++) ln('bjelkelag', [[[0, MID, z], [W, MID, z]]], 0.1 + i * 0.045, '', 0.15);

  /* 04 Takstoler */
  const trussZ = [];
  for (let z = 0; z < L - 0.1; z += 1.2) trussZ.push(z);
  trussZ.push(L);
  trussZ.forEach((z, i) => {
    const q1 = W / 4;
    const q3 = (3 * W) / 4;
    ln('takstoler', [
      [[-OV, EAVE, z], [W / 2, RIDGE, z], [W + OV, EAVE, z]],
      [[0, TOP, z], [W, TOP, z]],
      [[W / 2, TOP, z], [W / 2, RIDGE, z]],
      [[q1, roofAt(q1), z], [W / 2, TOP, z], [q3, roofAt(q3), z]],
    ], (i / trussZ.length) * 0.85, '', 0.15);
  });
  ln('takstoler', [[[W / 2, RIDGE, 0], [W / 2, RIDGE, L]]], 0.9, '', 0.1);

  /* 05 Kledning */
  fl('kledning', [[W, F, 0], [W, F, L], [W, TOP, L], [W, TOP, 0]], 'fb-clad', 0, 0.97, 0.55);
  fl('kledning', [[0, F, L], [W, F, L], [W, TOP, L], [W / 2, RIDGE, L], [0, TOP, L]], 'fb-clad fb-clad--front', 0.1, 0.97, 0.55);
  const boards = [];
  for (let z = 0.22; z < L - 0.05; z += 0.22) boards.push([[W, F, z], [W, TOP, z]]);
  for (let x = 0.22; x < W - 0.05; x += 0.22) boards.push([[x, F, L], [x, roofAt(x), L]]);
  boards.sort((a, b) => (a[0][0] - a[0][2]) - (b[0][0] - b[0][2]));
  boards.forEach((b, i) => ln('kledning', [b], 0.15 + (i / boards.length) * 0.8, 'fb-board', 0.1));
  ln('kledning', [
    [[W, F, L], [W, TOP, L]],
    [[W, TOP, 0], [W, TOP, L], [W / 2, RIDGE, L], [0, TOP, L]],
    [[0, F, L], [0, TOP, L]],
  ], 0.9, '', 0.1);

  /* 06 Vinduer & dører */
  const frontWin = [[2.0, 1.0], [5.2, 1.0], [5.2, 6.0], [3.6, 7.12], [2.0, 6.0]].map(([x, y]) => [x, y, L]);
  const sideWins = [
    [1.4, 3.2, 1.5, 2.9], [7.6, 9.6, 1.5, 2.9], [1.9, 2.9, 3.8, 4.9], [4.4, 6.6, 4.0, 4.9], [8.1, 9.1, 3.8, 4.9],
  ].map(([z0, z1, y0, y1]) => [[W, y0, z0], [W, y0, z1], [W, y1, z1], [W, y1, z0]]);
  const door = [[W, F, 5.0], [W, F, 6.0], [W, 2.9, 6.0], [W, 2.9, 5.0]];
  const allWins = [frontWin, ...sideWins];
  allWins.forEach((w, i) => {
    fl('vinduer', w, 'fb-glass', 0.05 + i * 0.12, 0.95, 0.3);
    ln('vinduer', [[...w, w[0]]], 0.05 + i * 0.12, '', 0.3);
  });
  fl('vinduer', door, 'fb-door', 0.72, 1, 0.25);
  ln('vinduer', [[...door, door[0]]], 0.72, '', 0.25);
  ln('vinduer', [[[3.6, 1.0, L], [3.6, 7.12, L]], [[2.0, MID, L], [5.2, MID, L]], [[2.0, 6.0, L], [5.2, 6.0, L]]], 0.3, '', 0.3);
  sideWins.forEach((w, i) => {
    const zc = (w[0][2] + w[1][2]) / 2;
    ln('vinduer', [[[W, w[0][1], zc], [W, w[2][1], zc]]], 0.2 + i * 0.12, 'fb-ln--thin', 0.2);
  });

  /* 08 Innredning: lights on (drawn under the roof group) */
  allWins.forEach((w, i) => fl('innredning', w, 'fb-warm', 0.1 + i * 0.13, i === 0 ? 0.78 : 0.7, 0.25));
  {
    const [sx, sy] = pr(W / 2, 0, L + 1.8);
    const spill = mk('ellipse', { cx: r2(sx), cy: r2(sy), rx: 74, ry: 26, class: 'fb-fill fb-spill', transform: `rotate(30 ${r2(sx)} ${r2(sy)})` }, gSpill);
    push('innredning', spill, 'fill', 0.3, 0.7, 1);
    const [lx, ly] = pr(W, 3.25, 5.5);
    const lamp = mk('circle', { cx: r2(lx), cy: r2(ly), r: 1.3, class: 'fb-fill fb-warm' }, G.innredning);
    push('innredning', lamp, 'fill', 0.85, 0.15, 1);
  }

  /* 07 Tak: standing-seam roof, gutter, downpipe */
  const zA = -OV;
  const zB = L + OV;
  fl('tak', [[W / 2, RIDGE, zA], [W / 2, RIDGE, zB], [-OV, EAVE, zB], [-OV, EAVE, zA]], 'fb-roof fb-roof--back', 0, 0.98, 0.45);
  fl('tak', [[W / 2, RIDGE, zA], [W / 2, RIDGE, zB], [W + OV, EAVE, zB], [W + OV, EAVE, zA]], 'fb-roof', 0.05, 0.98, 0.45);
  const seams = [];
  for (let z = zA + 0.25; z < zB - 0.05; z += 0.5) {
    seams.push([[W / 2, RIDGE, z], [W + OV, EAVE, z]]);
    seams.push([[W / 2, RIDGE, z], [-OV, EAVE, z]]);
  }
  seams.forEach((s, i) => ln('tak', [s], 0.2 + (i / seams.length) * 0.6, 'fb-seam', 0.12));
  ln('tak', [
    [[W / 2, RIDGE, zA], [W / 2, RIDGE, zB]],
    [[-OV, EAVE, zB], [W / 2, RIDGE, zB], [W + OV, EAVE, zB]],
    [[W + OV, EAVE, zA], [W + OV, EAVE, zB]],
    [[-OV, EAVE, zA], [-OV, EAVE, zB]],
  ], 0.1, '', 0.4);
  ln('tak', [
    [[W + OV + 0.05, EAVE - 0.15, zA], [W + OV + 0.05, EAVE - 0.15, zB]],
    [[W + OV + 0.05, EAVE - 0.15, zB - 0.25], [W + OV + 0.05, 0.25, zB - 0.25], [W + 0.1, 0.1, zB - 0.25]],
  ], 0.85, '', 0.15);

  /* 09 Nøkkelferdig: trees, path, landscape, rain */
  const spruce = (x, z, h, d) => {
    const [bx, by] = pr(x, 0, z);
    const parts = [`M${r2(bx)} ${r2(by)}L${r2(bx)} ${r2(by - h)}`];
    for (let k = 0; k < 4; k++) {
      const y0 = by - h * (0.18 + k * 0.2);
      const w = h * 0.3 * (1 - k * 0.2);
      parts.push(`M${r2(bx - w)} ${r2(y0)}L${r2(bx)} ${r2(y0 - h * 0.34)}L${r2(bx + w)} ${r2(y0)}`);
    }
    bounds.y0 = Math.min(bounds.y0, by - h);
    const n = mk('path', { d: parts.join(''), pathLength: 1, class: 'fb-ln' }, G.nokkelferdig);
    push('nokkelferdig', n, 'ln', d, 0.3, 1);
  };
  spruce(W + 3.6, 0.6, 96, 0.1);
  spruce(W + 2.5, L - 1, 78, 0.2);
  spruce(-1.5, L + 2.6, 86, 0.3);
  [W + 0.7, W + 1.5, W + 2.3].forEach((x, i) => {
    ln('nokkelferdig', [rect(0, x - 0.25, 5.2, x + 0.25, 5.8)], 0.35 + i * 0.08, 'fb-ln--soft', 0.2);
  });

  // viewBox from the house geometry
  const pad = 34;
  const vb = {
    x: bounds.x0 - pad,
    y: bounds.y0 - pad * 2.2,
    w: bounds.x1 - bounds.x0 + pad * 2,
    h: bounds.y1 - bounds.y0 + pad * 3.2,
  };
  svg.setAttribute('viewBox', `${r2(vb.x)} ${r2(vb.y)} ${r2(vb.w)} ${r2(vb.h)}`);

  // Deterministic "random" for the landscape
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const ridgeLine = (baseY, amp, step) => {
    const pts = [];
    for (let x = vb.x - 20; x <= vb.x + vb.w + 20; x += step) pts.push([x, baseY - amp * (0.35 + rnd() * 0.65)]);
    return pts;
  };
  const toPoly = (pts, baseY) => `M${r2(pts[0][0])} ${r2(baseY)}${pts.map(([x, y]) => `L${r2(x)} ${r2(y)}`).join('')}L${r2(pts[pts.length - 1][0])} ${r2(baseY)}Z`;
  const horizon = vb.y + vb.h * 0.36;
  const far = ridgeLine(horizon, vb.h * 0.2, vb.w / 9);
  const near = ridgeLine(horizon + 6, vb.h * 0.12, vb.w / 13);
  const mFar = mk('path', { d: toPoly(far, horizon + 8), class: 'fb-fill fb-mtn fb-mtn--far' }, gBg);
  const mNear = mk('path', { d: toPoly(near, horizon + 10), class: 'fb-fill fb-mtn' }, gBg);
  push('nokkelferdig', mFar, 'fill', 0, 0.9, 0.5);
  push('nokkelferdig', mNear, 'fill', 0.15, 0.85, 1);
  const crest = mk('path', { d: `M${near.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L')}`, pathLength: 1, class: 'fb-ln fb-ln--soft' }, gBg);
  push('nokkelferdig', crest, 'ln', 0.2, 0.5, 1);
  for (let k = 0; k < 7; k++) {
    const y = horizon + 14 + k * 5;
    const x0 = vb.x + rnd() * vb.w * 0.3;
    const x1 = x0 + vb.w * (0.2 + rnd() * 0.35);
    const n = mk('path', { d: `M${r2(x0)} ${r2(y)}L${r2(x1)} ${r2(y)}`, pathLength: 1, class: 'fb-ln fb-water' }, gBg);
    push('nokkelferdig', n, 'ln', 0.25 + k * 0.05, 0.4, 1);
  }
  const rain = mk('g', { class: 'fb-rain' }, G.nokkelferdig);
  for (let k = 0; k < 34; k++) {
    const x = vb.x + rnd() * (vb.w + vb.h * 0.3);
    const drop = mk('path', { d: `M${r2(x)} ${r2(vb.y)}L${r2(x - vb.h * 0.28)} ${r2(vb.y + vb.h)}`, class: 'fb-drop' }, rain);
    drop.style.animationDelay = `${(-rnd() * 0.7).toFixed(2)}s`;
    drop.style.strokeDashoffset = String(Math.round(rnd() * 24));
  }
  push('nokkelferdig', rain, 'fill', 0.35, 0.65, 1);

  /* ---------- runtime ---------- */
  container.replaceChildren(svg);
  container.hidden = false;
  container.dataset.mode = 'loader';

  let target = 0;
  let current = 0;
  let active = true;
  let raf = 0;
  let currentId = '';
  const stagesDef = DEFAULT_STAGES;

  const apply = (list, p) => {
    for (const it of list) {
      let lp = clamp((p - it.d * (1 - it.span)) / it.span);
      lp = Math.round(lp * 1000) / 1000;
      if (lp === it.last) continue;
      it.last = lp;
      if (it.kind === 'ln') it.el.style.strokeDashoffset = String(1 - lp);
      else it.el.style.opacity = String(lp * it.max);
    }
  };
  const render = () => {
    for (const s of stagesDef) apply(items[s.id], clamp((current - s.start) / (s.end - s.start)));
    let id = '';
    if (current > 0.002 && current < 0.995) {
      const s = stagesDef.find((st) => current >= st.start && current < st.end);
      if (s) id = s.id;
    }
    if (id !== currentId) {
      if (currentId && G[currentId]) G[currentId].classList.remove('is-current');
      if (id && G[id]) G[id].classList.add('is-current');
      currentId = id;
    }
  };
  const tick = () => {
    raf = 0;
    const diff = target - current;
    current = rm || Math.abs(diff) < 0.0004 ? target : current + diff * 0.14;
    render();
    if (current !== target && active) raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!raf && active) raf = requestAnimationFrame(tick);
  };

  apply(ghostItems, 0);
  render();

  return {
    setLoadProgress(p) { apply(ghostItems, clamp(+p || 0)); },
    setBuildProgress(p, immediate = false) {
      target = clamp(+p || 0);
      if (immediate) { current = target; render(); }
      kick();
    },
    setMode(mode) { container.dataset.mode = mode; },
    setPointer(x, y) {
      if (rm) return;
      svg.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`);
      svg.style.setProperty('--rx', `${(y * 3).toFixed(2)}deg`);
    },
    getStages() { return stagesDef.map((s) => ({ ...s })); },
    resize() {},
    setActive(a) {
      active = !!a;
      container.classList.toggle('is-paused', !active);
      if (active) kick();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      container.replaceChildren();
      container.hidden = true;
    },
  };
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
function boot() {
  setupSplits();
  buildRail();
  setActiveStage(0, false);
  runLoader();
  initScene();
  setupReveals();
  setupCounters();
  setupMarquee();
  setupMenu();
  setupForm();
  setupPointer();
  loadFootage();

  $$('[data-year]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });

  window.addEventListener('scroll', () => requestUpdate(false), { passive: true });
  window.addEventListener('resize', () => { needsMeasure = true; requestUpdate(true); }, { passive: true });
  window.addEventListener('orientationchange', () => { needsMeasure = true; requestUpdate(true); });
  window.addEventListener('load', () => { needsMeasure = true; requestUpdate(true); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Scene.setActive(false);
    else { forceUpdate = true; requestUpdate(true); }
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { needsMeasure = true; requestUpdate(true); });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => { needsMeasure = true; requestUpdate(true); });
    const main = $('#main');
    if (main) ro.observe(main);
    if (dom.reelTrack) ro.observe(dom.reelTrack);
  }

  needsMeasure = true;
  requestUpdate(true);
}

try {
  boot();
} catch (err) {
  console.error('[BRV] Oppstart feilet — viser innholdet uten effekter.', err);
  html.classList.remove('js', 'is-loading', 'is-unloading');
  html.classList.add('no-js', 'boot-failed');
}
