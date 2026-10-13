/**
 * Bygg & Renovering Vest AS | main.js (v2)
 * UI + hero orchestration (ES module, no dependencies).
 *
 * The hero house is a Three.js scene in ./house.js, loaded with a dynamic
 * import. If WebGL is missing, the module fails or the context is lost, the
 * static SVG house in index.html takes over through the very same contract:
 *   play() skipToEnd() setBuildProgress() setPaintColor() onStage() onComplete()
 *   setPointer() setViewShift() resize() setActive() dispose()
 * plus onPaintEnd() (a repaint sweep has finished) and `ready` (shaders compiled).
 * Add ?svg to the URL to force the SVG house (handy for testing).
 */

const html = document.documentElement;
window.__brvBooted = true;
if (html.classList.contains('boot-failed')) {
  // main.js arrived after the inline safety timeout: restore the JS experience.
  html.classList.remove('no-js', 'boot-failed');
  html.classList.add('js');
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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
const FORCE_SVG = /[?&](svg|nogl)\b/.test(location.search);
if (reducedMotion) html.classList.add('reduced-motion');

/** Build stages. Same ids, order and pacing as house.js (ms = share of autoplay). */
const STAGES = [
  { id: 'blueprint', start: 0.0, end: 0.06, ms: 1150 },
  { id: 'grunnmur', start: 0.06, end: 0.16, ms: 650 },
  { id: 'bindingsverk', start: 0.16, end: 0.29, ms: 850 },
  { id: 'bjelkelag', start: 0.29, end: 0.37, ms: 500 },
  { id: 'takstoler', start: 0.37, end: 0.48, ms: 750 },
  { id: 'kledning', start: 0.48, end: 0.62, ms: 800 },
  { id: 'vinduer', start: 0.62, end: 0.71, ms: 500 },
  { id: 'tak', start: 0.71, end: 0.92, ms: 950 },
  { id: 'maling', start: 0.92, end: 0.985, ms: 1350 },
  { id: 'ferdig', start: 0.985, end: 1.0, ms: 500 },
];
const STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s]));

/** What the caption says while the house is being built. */
const LABELS = {
  blueprint: 'Tegner huset…',
  grunnmur: 'Støper grunnmuren…',
  bindingsverk: 'Reiser bindingsverket…',
  bjelkelag: 'Legger bjelkelaget…',
  takstoler: 'Setter opp takstolene…',
  kledning: 'Setter opp kledningen…',
  vinduer: 'Setter inn vinduer og dør…',
  tak: 'Legger taket…',
  maling: 'Maler huset i {farge}…',
  ferdig: 'Ferdig. Velkommen hjem.',
};
const DEFAULT_COLOR = '#2E5C7A';

/* --------------------------------------------------------------------------
   DOM
   -------------------------------------------------------------------------- */
const dom = {
  nav: $('#nav'),
  navToggle: $('#nav-toggle'),
  menu: $('#menu'),
  hero: $('#top'),
  canvas: $('#hero-canvas'),
  house: $('#hero-house'),
  svg: $('#hero-house-svg'),
  caption: $('#build-caption-text'),
  status: $('#hero-status'),
  replay: $('#replay'),
  replayLabel: $('#replay-label'),
  hint: $('#paint-hint'),
  swatches: $$('.swatch'),
  swatchRow: $('.paint__swatches'),
  swash: $('.hero__swash'),
  gallerySection: $('#prosjekter'),
  gallery: $('#gallery-grid'),
  form: $('#contact-form'),
  formStatus: $('#form-status'),
  footer: $('#footer'),
};

/* --------------------------------------------------------------------------
   Hero scene host: one facade over the WebGL house or the SVG house.
   Every call is guarded, so a bug in a scene never breaks the page.
   -------------------------------------------------------------------------- */
const warned = new Set();
const Scene = {
  impl: null,
  kind: 'none',
  unsubs: [],
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
  has(name) { return !!this.impl && typeof this.impl[name] === 'function'; },
};

/** re-sends the hero scroll-out state to a freshly adopted scene (set in setupHeroObservers) */
let syncScrollOut = () => {};

const hero = {
  complete: false,
  stage: '',
  color: DEFAULT_COLOR,
  visible: true,
  captionTimer: 0,
  completeGuard: 0,
  nudged: false,
};

const HINT_BUILDING = 'Du kan velge farge mens vi bygger.';

function swatchFor(hex) {
  return dom.swatches.find((s) => (s.dataset.color || '').toLowerCase() === String(hex).toLowerCase());
}
/** the colour's name as on the swatch ("Fjordblå"), for the start of a sentence */
function colorName(hex) {
  const b = swatchFor(hex);
  return b ? b.querySelector('.swatch__name').textContent.trim() : 'Ny farge';
}
/** the colour inside a sentence, lower case and neuter ("malt i fjordblått") */
function colorInline(hex) {
  const b = swatchFor(hex);
  return (b && b.dataset.inline) || colorName(hex).toLowerCase();
}

function setCaption(text) {
  if (dom.caption && dom.caption.textContent !== text) dom.caption.textContent = text;
}
function setHint(text) {
  if (dom.hint && dom.hint.textContent !== text) dom.hint.textContent = text;
}
/** the one live region in the hero: only key moments, never every build step */
function announce(text) {
  if (!dom.status) return;
  if (dom.status.textContent === text) dom.status.textContent = '';
  dom.status.textContent = text;
}
function setReplayLabel() {
  if (dom.replayLabel) dom.replayLabel.textContent = hero.complete ? 'Bygg på nytt' : 'Vis ferdig hus';
}

/** the brush stroke under «alt.» takes the house colour (and is painted in with a wipe) */
function paintSwash(hex, wipe = true) {
  if (!dom.hero) return;
  dom.hero.style.setProperty('--paint', hex);
  dom.hero.classList.add('has-paint');
  if (!wipe || reducedMotion || !dom.swash) return;
  dom.swash.classList.remove('is-wiping');
  void dom.swash.getBoundingClientRect();
  dom.swash.classList.add('is-wiping');
}
function clearSwash() {
  if (!dom.hero) return;
  dom.hero.classList.remove('has-paint');
  if (dom.swash) dom.swash.classList.remove('is-wiping');
}

/** a replay started: back to the building state */
function resetToBuilding() {
  hero.complete = false;
  clearTimeout(hero.captionTimer);
  if (dom.hero) dom.hero.classList.remove('is-built');
  clearSwash();
  setReplayLabel();
  setCaption(LABELS.blueprint);
  setHint(HINT_BUILDING);
  hero.building = true;
  announce('Huset bygges. Du kan velge farge.');
}

function onStage(ev) {
  const id = ev && ev.id;
  if (!id) return;
  if (id !== 'ferdig' && hero.complete) resetToBuilding();
  hero.stage = id;
  clearTimeout(hero.captionTimer);
  const label = LABELS[id] ? LABELS[id].replace('{farge}', colorInline(hero.color)) : (ev.label || '');
  if (label) setCaption(label);
  if (id === 'maling') {
    setHint('');
    paintSwash(hero.color, true);
  }
}

function onComplete() {
  clearTimeout(hero.completeGuard);
  if (hero.complete) return;
  hero.complete = true;
  hero.stage = 'ferdig';
  if (dom.hero) {
    dom.hero.classList.add('is-built');
    if (!dom.hero.classList.contains('has-paint')) paintSwash(hero.color, true);
  }
  setCaption(LABELS.ferdig);
  setReplayLabel();
  setHint('');
  if (hero.building) announce(LABELS.ferdig);
  hero.building = false;
  // the first time the house is done: nudge the colour swatches once
  if (!hero.nudged && !reducedMotion && dom.swatchRow) {
    hero.nudged = true;
    dom.swatchRow.classList.add('is-nudging');
    setTimeout(() => dom.swatchRow.classList.remove('is-nudging'), 2400);
  }
}

/** a repaint sweep reached the last board */
function onPaintEnd() {
  if (!hero.complete) return;
  clearTimeout(hero.captionTimer);
  const text = `Ferdig malt i ${colorInline(hero.color)}.`;
  setCaption(text);
  announce(text);
}

function adopt(impl, kind) {
  if (!impl || impl === Scene.impl) return;
  const prev = Scene.impl;
  Scene.unsubs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } });
  Scene.unsubs = [];
  Scene.impl = impl;
  Scene.kind = kind;
  if (prev && prev.dispose) { try { prev.dispose(); } catch (e) { /* ignore */ } }
  html.dataset.scene = kind;

  if (Scene.has('onStage')) Scene.unsubs.push(Scene.call('onStage', onStage) || (() => {}));
  if (Scene.has('onComplete')) Scene.unsubs.push(Scene.call('onComplete', onComplete) || (() => {}));
  if (Scene.has('onPaintEnd')) Scene.unsubs.push(Scene.call('onPaintEnd', onPaintEnd) || (() => {}));

  Scene.call('resize');
  applyViewShift(true);
  Scene.call('setPaintColor', hero.color, { animate: false });
  Scene.call('setActive', hero.visible && !document.hidden);
  syncScrollOut();

  hero.complete = false;
  if (dom.hero) dom.hero.classList.remove('is-built');
  setReplayLabel();

  if (reducedMotion || !Scene.has('play')) {
    Scene.call('skipToEnd');
    onComplete();
  } else {
    resetToBuilding();
    Scene.call('play', { duration: 8000 });
  }
}

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

let fallbackTaken = false;
function useFallback(reason) {
  if (fallbackTaken || !dom.svg) return;
  fallbackTaken = true;
  const impl = createSvgHouse({ svg: dom.svg, host: dom.house, reducedMotion });
  adopt(impl, 'svg');
  console.info(`[BRV] Viser SVG-huset (${reason}).`);
}

let slowTimer = 0;
let lostTimer = 0;
async function initScene() {
  if (FORCE_SVG) { useFallback('valgt med ?svg'); return; }
  if (!dom.canvas || !hasWebGL()) { useFallback('WebGL er ikke tilgjengelig'); return; }
  slowTimer = setTimeout(() => useFallback('3D-huset laster tregt'), 6000);
  try {
    const mod = await import('./house.js');
    if (fallbackTaken) return;
    if (typeof mod.createHouseScene !== 'function') throw new Error('createHouseScene() mangler i house.js');
    const impl = mod.createHouseScene({ canvas: dom.canvas, reducedMotion, isMobile });
    if (!impl) throw new Error('WebGL-konteksten kunne ikke opprettes');
    // wait for the shaders (compiled off the main thread where the driver allows it)
    if (impl.ready && typeof impl.ready.then === 'function') {
      await Promise.race([impl.ready.catch(() => {}), new Promise((r) => setTimeout(r, 4000))]);
    }
    clearTimeout(slowTimer);
    if (fallbackTaken) { try { impl.dispose && impl.dispose(); } catch (e) { /* ignore */ } return; }
    adopt(impl, 'webgl');
  } catch (err) {
    clearTimeout(slowTimer);
    console.warn('[BRV] 3D-huset kunne ikke startes:', err);
    useFallback('feil ved lasting av 3D');
  }
}

if (dom.canvas) {
  dom.canvas.addEventListener('webglcontextlost', () => {
    if (Scene.kind !== 'webgl') return;
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => useFallback('WebGL-konteksten gikk tapt'), 2500);
  });
  // house.js rebuilds its reflections and shadows on restore and carries on
  dom.canvas.addEventListener('webglcontextrestored', () => clearTimeout(lostTimer));
}

/* --------------------------------------------------------------------------
   Hero controls: swatches + replay
   -------------------------------------------------------------------------- */
function selectSwatch(btn) {
  dom.swatches.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
}

function setupHeroControls() {
  dom.swatches.forEach((btn) => {
    btn.addEventListener('click', () => {
      const hex = btn.dataset.color;
      if (!hex) return;
      // a second tap on the colour that is already on (or going on) the house changes nothing
      if (hex.toLowerCase() === hero.color.toLowerCase()) return;
      selectSwatch(btn);
      hero.color = hex;
      clearTimeout(hero.captionTimer);

      if (hero.complete) {
        Scene.call('setPaintColor', hex, { animate: !reducedMotion });
        paintSwash(hex, true);
        if (reducedMotion) {
          onPaintEnd();
        } else {
          setCaption(`Maler huset i ${colorInline(hex)}…`);
          // the scene says when the roller is done; a timer only if it can't
          if (!Scene.has('onPaintEnd')) hero.captionTimer = setTimeout(onPaintEnd, 1700);
        }
      } else {
        // Still building: the colour is used when the painters get to it.
        Scene.call('setPaintColor', hex, { animate: false });
        if (hero.stage === 'maling' || hero.stage === 'ferdig') {
          setCaption(`Maler huset i ${colorInline(hex)}…`);
          setHint('');
          paintSwash(hex, false);
        } else {
          setHint(`${colorName(hex)} er valgt. Vi maler når veggene er klare.`);
        }
      }
    });
  });

  if (dom.replay) {
    dom.replay.addEventListener('click', () => {
      if (!Scene.impl) return;
      clearTimeout(hero.captionTimer);
      if (hero.complete) {
        resetToBuilding();
        Scene.call('play', { duration: 8000 });
      } else {
        Scene.call('skipToEnd');
        // house.js fires onComplete on its next frame; make sure the UI follows either way.
        clearTimeout(hero.completeGuard);
        hero.completeGuard = setTimeout(onComplete, 900);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   Hero framing, pointer, visibility, scroll-out
   -------------------------------------------------------------------------- */
let lastShift = '';
const desktopHero = mq('(min-width: 900px)');
/**
 * Frame the 3D house. The canvas only covers the stage (plus a soft fade band), so the
 * GPU doesn't draw pixels that sit under the white scrim. house.js gets the exact region,
 * in fractions of the canvas, that the house should be fitted into:
 *   desktop: from the left edge of .hero__house to the right edge of the screen, from just
 *            under the nav bar to the bottom of the box (the colour controls sit below);
 *   phones:  the full width, from the top of the box to its bottom.
 * The same numbers feed the CSS (--stage-left / --stage-top) that sizes the canvas and its scrim.
 */
function applyViewShift(force) {
  if (!dom.hero || !dom.house) return;
  const h = dom.hero.getBoundingClientRect();
  const b = dom.house.getBoundingClientRect();
  if (!h.width || !h.height || !b.width) return;
  dom.hero.style.setProperty('--stage-left', `${Math.round(b.left - h.left)}px`);
  dom.hero.style.setProperty('--stage-top', `${Math.round(b.top - h.top)}px`);
  if (!Scene.has('setViewShift') || !dom.canvas) return;
  const c = dom.canvas.getBoundingClientRect(); // after the vars above: forces the new layout
  if (!c.width || !c.height) return;
  const navH = parseFloat(getComputedStyle(html).getPropertyValue('--nav-h')) || 76;
  let l;
  let r;
  let t;
  let btm;
  if (desktopHero.matches) {
    l = b.left - c.left;
    r = c.width;
    t = Math.max(b.top - c.top - 24, h.top + navH + 8 - c.top);
    btm = b.bottom - c.top + 8;
  } else {
    l = 0;
    r = c.width;
    t = b.top - c.top - 6;
    btm = b.bottom - c.top + 4;
  }
  const region = { left: l / c.width, right: r / c.width, top: t / c.height, bottom: btm / c.height };
  const sx = clamp((region.left + region.right) / 2 - 0.5, -0.35, 0.35);
  const sy = clamp((region.top + region.bottom) / 2 - 0.5, -0.35, 0.35);
  const key = [region.left, region.right, region.top, region.bottom].map((v) => v.toFixed(3)).join(',');
  if (!force && key === lastShift) return;
  lastShift = key;
  Scene.call('setViewShift', sx, sy, region);
}

function setupHeroObservers() {
  if (!dom.hero) return;
  const sync = () => Scene.call('setActive', hero.visible && !document.hidden);

  // Scroll: let the house turn and settle as the hero leaves the screen.
  let ticking = false;
  let lastT = -1;
  const updateScrollOut = () => {
    const r = dom.hero.getBoundingClientRect();
    const t = Math.round(clamp(-r.top / Math.max(1, r.height)) * 1000) / 1000;
    if (t !== lastT) {
      lastT = t;
      Scene.call('setScrollOut', t);
    }
  };
  const onScroll = () => {
    ticking = false;
    if (hero.visible) updateScrollOut();
  };
  syncScrollOut = () => { lastT = -1; updateScrollOut(); };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      hero.visible = e.isIntersecting;
      // a jump back to the top (Home key, «Til toppen») may land before this fires
      if (hero.visible) updateScrollOut();
      sync();
    }, { rootMargin: '0px 0px 0px 0px', threshold: 0 });
    io.observe(dom.hero);
  }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  // Pointer: a gentle tilt/orbit while the pointer is over the page.
  if (!reducedMotion && finePointer) {
    let px = 0;
    let py = 0;
    let pending = false;
    const flush = () => {
      pending = false;
      Scene.call('setPointer', px, py);
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !hero.visible) return;
      const r = dom.hero.getBoundingClientRect();
      px = clamp(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, -1, 1);
      py = clamp(-(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1), -1, 1);
      if (!pending) { pending = true; requestAnimationFrame(flush); }
    }, { passive: true });
    dom.hero.addEventListener('pointerleave', () => {
      px = 0; py = 0;
      if (!pending) { pending = true; requestAnimationFrame(flush); }
    });
  }

  // Layout changes → refit the house into its box.
  let rz = 0;
  const onResize = () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => {
      Scene.call('resize');
      applyViewShift();
    });
  };
  window.addEventListener('resize', onResize, { passive: true });
  if ('ResizeObserver' in window && dom.house) new ResizeObserver(onResize).observe(dom.house);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
}

/* --------------------------------------------------------------------------
   SVG house: same contract as house.js, driven by the static SVG in the hero
   -------------------------------------------------------------------------- */
const MS_TOTAL = STAGES.reduce((a, s) => a + s.ms, 0);
const T_CUM = [0];
STAGES.forEach((s, i) => { T_CUM[i + 1] = T_CUM[i] + s.ms / MS_TOTAL; });

/** autoplay: normalised time u → build progress p (stage-weighted pacing) */
function timeToP(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  let i = 0;
  while (i < STAGES.length - 1 && u >= T_CUM[i + 1]) i++;
  const s = STAGES[i];
  const l = (u - T_CUM[i]) / (T_CUM[i + 1] - T_CUM[i]);
  return s.start + (s.end - s.start) * l;
}
function stageIndexAt(p) {
  if (p >= 1) return STAGES.length - 1;
  for (let i = STAGES.length - 1; i >= 0; i--) if (p >= STAGES[i].start) return i;
  return 0;
}

function createSvgHouse({ svg, host, reducedMotion: rm = false }) {
  const RAW = '#E2C9A4';
  const nums = (s) => String(s || '').trim().split(/\s+/).map(Number);
  const [cx, cy, cw, ch] = nums(svg.dataset.walls);
  const [wx0, wy0, wx1, wy1] = nums(svg.dataset.wallbox);
  const vbBuild = nums(svg.dataset.vbBuild);
  const vbDone = nums(svg.dataset.vbDone);
  const bp = $('[data-bp]', svg);
  const crane = $('[data-crane]', svg);
  const cladRect = $('[data-clad]', svg);
  const sweepRect = $('[data-sweep]', svg);
  const roller = $('[data-roller]', svg);
  const lits = $$('[data-lit]', svg);
  const items = $$('[data-s]', svg)
    .filter((n) => n !== crane)
    .map((n) => ({ el: n, s: n.dataset.s, k: n.dataset.k, o: +n.dataset.o || 0, span: +n.dataset.span || 0.4, last: -1 }));

  const cbStage = new Set();
  const cbDone = new Set();
  const cbPaint = new Set();
  const SWEEP_MS = 1500;
  let p = 0;
  let color = DEFAULT_COLOR;
  let base = RAW;
  let stageIdx = -1;
  let completeFired = false;
  let active = true;
  let raf = 0;
  let disposed = false;
  // autoplay
  let mode = 'idle'; // 'play' | 'rewind' | 'idle'
  let playDur = 8000;
  let elapsed = 0;
  let rewindFrom = 0;
  let lastNow = 0;
  // repaint sweep (after completion); a colour picked mid-sweep waits its turn
  let sweep = null; // { from, to, t }
  let pending = null;
  let lastVb = '';

  const local = (id) => clamp((p - STAGE[id].start) / (STAGE[id].end - STAGE[id].start));

  function setVar(name, v) { svg.style.setProperty(name, v); }

  function renderItems() {
    for (const it of items) {
      const st = STAGE[it.s];
      if (!st) continue;
      const sp = clamp((p - st.start) / (st.end - st.start));
      let lp = clamp((sp - it.o * (1 - it.span)) / it.span);
      lp = Math.round(lp * 1000) / 1000;
      if (lp === it.last) continue;
      it.last = lp;
      const e = easeOut(lp);
      const s = it.el.style;
      switch (it.k) {
        case 'draw':
          s.strokeDashoffset = String(1 - lp);
          s.opacity = lp > 0 ? '1' : '0';
          break;
        case 'rise':
          s.transform = `scaleY(${Math.max(0.001, e).toFixed(3)})`;
          s.opacity = lp > 0 ? '1' : '0';
          break;
        case 'grow':
          s.transform = `scale(${(0.35 + 0.65 * e).toFixed(3)})`;
          s.opacity = String(clamp(lp * 2.5));
          break;
        case 'pop':
          s.transform = `translateY(${((1 - e) * 10).toFixed(2)}px) scale(${(0.85 + 0.15 * e).toFixed(3)})`;
          s.opacity = String(clamp(lp * 2));
          break;
        case 'drop':
          s.transform = `translateY(${(-(1 - e) * 28).toFixed(2)}px)`;
          s.opacity = String(clamp(lp * 1.6));
          break;
        default: // fade
          s.transform = `translateY(${((1 - e) * 8).toFixed(2)}px)`;
          s.opacity = String(lp);
      }
    }
  }

  function setViewBox(k) {
    if (vbBuild.length !== 4 || vbDone.length !== 4) return;
    const v = vbBuild.map((b, i) => lerp(b, vbDone[i], k).toFixed(1)).join(' ');
    if (v !== lastVb) { lastVb = v; svg.setAttribute('viewBox', v); }
  }

  function placeRoller(t) {
    if (!roller) return;
    const x = cx + cw * t;
    const mid = (wy0 + wy1) / 2 + 12;
    const amp = (wy1 - wy0) * 0.3;
    const y = mid + Math.sin(t * Math.PI * 7) * amp;
    roller.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }

  function setSweep(t) {
    if (!sweepRect) return;
    sweepRect.setAttribute('width', String(Math.max(0, cw * t).toFixed(1)));
  }

  function render() {
    renderItems();

    // blueprint: draws in, then fades as the walls and roof close up
    if (bp) {
      const up = clamp(local('blueprint') * 3);
      const fade = clamp((p - STAGE.kledning.start) / (STAGE.tak.end - STAGE.kledning.start));
      bp.style.opacity = String((up * (1 - fade)).toFixed(3));
    }
    // crane: rises with the foundation, leaves while the painters work
    if (crane) {
      const rise = easeOut(clamp(local('grunnmur') / 0.9));
      const exit = easeInOut(clamp(local('maling') / 0.6));
      crane.style.transform = `translateY(${(exit * 70).toFixed(1)}px) scaleY(${Math.max(0.001, rise).toFixed(3)})`;
      crane.style.opacity = rise > 0 ? String((1 - exit).toFixed(3)) : '0';
    }
    // frame: zoom in on the house once the crane is gone
    setViewBox(easeInOut(clamp(local('maling') / 0.7)));

    // cladding goes up from the bottom
    if (cladRect) {
      const k = easeInOut(local('kledning'));
      cladRect.setAttribute('y', (cy + ch * (1 - k)).toFixed(1));
      cladRect.setAttribute('height', (ch * k).toFixed(1));
    }

    // paint: raw pine until the painters arrive, then a roller sweep
    if (sweep) {
      const t = easeInOut(clamp(sweep.t));
      setVar('--paint-base', sweep.from);
      setVar('--paint-next', sweep.to);
      setSweep(t);
      placeRoller(t);
      svg.classList.toggle('is-painting', t > 0 && t < 1);
    } else if (p < STAGE.maling.start) {
      base = RAW;
      setVar('--paint-base', RAW);
      setVar('--paint-next', color);
      setSweep(0);
      svg.classList.remove('is-painting');
    } else if (p < STAGE.ferdig.start) {
      const t = clamp(local('maling') / 0.92);
      setVar('--paint-base', RAW);
      setVar('--paint-next', color);
      setSweep(t);
      placeRoller(t);
      svg.classList.toggle('is-painting', t > 0 && t < 1);
    } else {
      base = color;
      setVar('--paint-base', color);
      setVar('--paint-next', color);
      setSweep(1);
      svg.classList.remove('is-painting');
    }

    // lights come on at the very end
    const lit = (0.62 * easeOut(local('ferdig'))).toFixed(3);
    lits.forEach((n) => { n.style.opacity = lit; });

    // stage events (not while rewinding for a replay: that would read the build backwards)
    if (mode !== 'rewind') {
      const i = stageIndexAt(p);
      if (i !== stageIdx) emitStage(i);
    }
    if (p >= 1 && !completeFired && mode !== 'rewind') {
      completeFired = true;
      cbDone.forEach((cb) => { try { cb(); } catch (e) { console.warn(e); } });
    }
  }

  function emitStage(i) {
    stageIdx = i;
    const ev = { id: STAGES[i].id, label: LABELS[STAGES[i].id] || '' };
    cbStage.forEach((cb) => { try { cb(ev); } catch (e) { console.warn(e); } });
  }

  function tick(now) {
    raf = 0;
    if (disposed || !active) return;
    // close to wall-clock time, so a slow device drops frames instead of stretching the build
    const dt = lastNow ? Math.min(250, now - lastNow) : 16;
    lastNow = now;
    let more = false;
    if (mode === 'rewind') {
      elapsed += dt;
      const k = clamp(elapsed / 700);
      p = rewindFrom * (1 - easeInOut(k));
      if (k >= 1) { mode = 'play'; elapsed = 0; p = 0; }
      more = true;
    } else if (mode === 'play') {
      elapsed += dt;
      const u = clamp(elapsed / playDur);
      p = timeToP(u);
      if (u >= 1) { p = 1; mode = 'idle'; } else more = true;
    }
    if (sweep) {
      sweep.t += dt / SWEEP_MS;
      if (sweep.t >= 1) {
        base = sweep.to;
        if (pending) {
          sweep = { from: base, to: pending, t: 0 };
          pending = null;
          more = true;
        } else {
          sweep = null;
          const ev = { color: base };
          cbPaint.forEach((cb) => { try { cb(ev); } catch (e) { console.warn(e); } });
        }
      } else more = true;
    }
    render();
    if (more) raf = requestAnimationFrame(tick);
    else lastNow = 0;
  }
  function kick() {
    if (!raf && active && !disposed) raf = requestAnimationFrame(tick);
  }

  function finishNow() {
    mode = 'idle';
    sweep = null;
    pending = null;
    p = 1;
    render();
  }

  // initial state: an empty plot on the table
  svg.style.setProperty('--paint-base', RAW);
  render();

  return {
    play({ duration = 8000 } = {}) {
      if (disposed) return;
      completeFired = false;
      sweep = null;
      pending = null;
      if (rm) { finishNow(); return; }
      playDur = Math.max(1000, +duration || 8000);
      elapsed = 0;
      lastNow = 0;
      if (p > 0.05) {
        // rewind quietly: one «blueprint» event now, the rest as the new build goes up
        mode = 'rewind';
        rewindFrom = p;
        emitStage(0);
      } else {
        mode = 'play';
        p = 0;
      }
      kick();
    },
    skipToEnd() { if (!disposed) finishNow(); },
    setBuildProgress(v, immediate = false) {
      mode = 'idle';
      p = clamp(+v || 0);
      if (p < 1) completeFired = false;
      render();
      void immediate;
    },
    setPaintColor(hex, { animate = true } = {}) {
      if (!/^#[0-9a-f]{6}$/i.test(String(hex))) return;
      const done = p >= 1 && mode === 'idle';
      const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
      if (done && animate && !rm) {
        color = hex;
        if (sweep) {
          // the roller finishes the coat it is on, then paints the newest pick
          pending = same(hex, sweep.to) ? null : hex;
          return;
        }
        if (same(hex, base)) return;
        sweep = { from: base, to: hex, t: 0 };
        lastNow = 0;
        kick();
        return;
      }
      color = hex;
      if (done) { sweep = null; pending = null; base = hex; }
      render();
    },
    onStage(cb) {
      if (typeof cb !== 'function') return () => {};
      cbStage.add(cb);
      return () => cbStage.delete(cb);
    },
    onComplete(cb) {
      if (typeof cb !== 'function') return () => {};
      cbDone.add(cb);
      return () => cbDone.delete(cb);
    },
    onPaintEnd(cb) {
      if (typeof cb !== 'function') return () => {};
      cbPaint.add(cb);
      return () => cbPaint.delete(cb);
    },
    setPointer(x, y) {
      if (rm || !host) return;
      host.style.setProperty('--ry', `${(clamp(+x || 0, -1, 1) * 5).toFixed(2)}deg`);
      host.style.setProperty('--rx', `${(clamp(+y || 0, -1, 1) * -3).toFixed(2)}deg`);
    },
    setViewShift() { /* the SVG already sits in its own box */ },
    resize() {},
    setActive(a) {
      active = !!a;
      if (!active && raf) { cancelAnimationFrame(raf); raf = 0; lastNow = 0; }
      if (active && (mode !== 'idle' || sweep)) kick();
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      cbStage.clear();
      cbDone.clear();
      cbPaint.clear();
    },
  };
}

/* --------------------------------------------------------------------------
   Navigation: hide on scroll down, current section, mobile menu
   -------------------------------------------------------------------------- */
let menuOpen = false;

function setupNavScroll() {
  const nav = dom.nav;
  if (!nav) return;
  const links = $$('.nav__links a[href^="#"]');
  const targets = links
    .map((a) => ({ a, t: document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter((x) => x.t);
  let lastY = window.scrollY;
  let hidden = false;
  let scrolled = false;
  let current = null;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    const vh = window.innerHeight;
    const s = y > 8;
    if (s !== scrolled) { scrolled = s; nav.classList.toggle('is-scrolled', s); }
    if (!menuOpen) {
      let h = hidden;
      if (y < vh * 0.5) h = false;
      else if (dy > 6) h = true;
      else if (dy < -6) h = false;
      if (h !== hidden) { hidden = h; nav.classList.toggle('is-hidden', h); }
    }
    let cur = null;
    // a hidden section (the gallery before it has photos) has no box: skip it
    for (const { a, t } of targets) if (!t.hidden && t.getBoundingClientRect().top <= vh * 0.4) cur = a;
    if (cur !== current) {
      if (current) current.removeAttribute('aria-current');
      if (cur) cur.setAttribute('aria-current', 'true');
      current = cur;
    }
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  // Show the bar again when keyboard focus lands in it.
  nav.addEventListener('focusin', () => { hidden = false; nav.classList.remove('is-hidden'); });
  update();
}

function setupMenu() {
  const { nav, navToggle: btn, menu } = dom;
  if (!nav || !btn || !menu) return;
  const label = btn.querySelector('.nav__toggle-label');
  const outside = [$('#main'), dom.footer].filter(Boolean);
  const desktop = mq('(min-width: 1024px)');
  const focusables = () => $$('a[href], button:not([disabled])', nav).filter((n) => n.getClientRects().length > 0);

  const open = () => {
    menuOpen = true;
    nav.classList.add('is-open');
    nav.classList.remove('is-hidden');
    btn.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = 'Lukk';
    btn.setAttribute('aria-label', 'Lukk menyen');
    outside.forEach((n) => { n.inert = true; });
    html.style.overflow = 'hidden';
    const first = menu.querySelector('a');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
  };
  const close = (returnFocus = true) => {
    if (!menuOpen) return;
    menuOpen = false;
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = 'Meny';
    btn.removeAttribute('aria-label');
    outside.forEach((n) => { n.inert = false; });
    html.style.overflow = '';
    if (returnFocus) btn.focus({ preventScroll: true });
  };

  btn.addEventListener('click', () => (menuOpen ? close() : open()));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) close(false); });
  document.addEventListener('keydown', (e) => {
    if (!menuOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  const onDesktop = (e) => { if (e.matches) close(false); };
  if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
}

/* --------------------------------------------------------------------------
   Reveals + marquee
   -------------------------------------------------------------------------- */
function setupReveals() {
  $$('.svc-grid, .svc-mini, .gallery__grid, .contact__list').forEach((grid) => {
    Array.from(grid.children).forEach((c, i) => c.style.setProperty('--d', `${((i % 4) * 0.08).toFixed(2)}s`));
  });
  // Gallery cards sit in a horizontal scroller on phones: they reveal together (see revealGallery).
  const targets = $$('[data-reveal]').filter((n) => !n.closest('.gallery__grid'));
  if (reducedMotion || !('IntersectionObserver' in window)) {
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
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
  targets.forEach((t) => io.observe(t));
}

function setupMarquee() {
  const m = $('.marquee');
  if (!m) return;
  // WCAG 2.2.2: the moving text can be paused (and it also pauses on hover and focus)
  const btn = $('.marquee__toggle', m);
  if (btn) {
    btn.addEventListener('click', () => {
      const stop = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(stop));
      m.classList.toggle('is-stopped', stop);
    });
  }
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(([e]) => m.classList.toggle('is-paused', !e.isIntersecting));
  io.observe(m);
}

/* --------------------------------------------------------------------------
   Fra byggeplassen: gallery from assets/footage/footage.json
   The section ships hidden. It only appears (with its nav and footer links) once
   at least MIN_SHOTS real photos or videos have loaded. No placeholders, ever.
   -------------------------------------------------------------------------- */
const MIN_SHOTS = 3;
const LAYOUT_CYCLE = ['tall', '', '', 'wide', '', 'wide'];
const safeSrc = (v) => {
  const src = String(v || '').trim();
  return src && !/^(javascript|vbscript|data):/i.test(src) ? src : '';
};

function renderGallery(items) {
  const frag = document.createDocumentFragment();
  items.forEach((item, i) => {
    const layout = item.layout === 'wide' || item.layout === 'tall' ? item.layout : LAYOUT_CYCLE[i % LAYOUT_CYCLE.length];
    const li = el('li', `shot${layout ? ` shot--${layout}` : ''}`);
    li.setAttribute('data-reveal', '');
    const fig = el('figure');
    const media = el('div', 'shot__media');
    media.dataset.type = item.type === 'video' ? 'video' : 'image';
    media.dataset.src = safeSrc(item.src);
    if (item.poster) media.dataset.poster = safeSrc(item.poster);
    if (item.alt) media.dataset.alt = String(item.alt);
    fig.append(media);
    const title = String(item.title || '').trim();
    const text = [item.caption, item.place && item.place !== 'Bergen' ? item.place : ''].filter(Boolean).join(' ');
    if (title || text) {
      const cap = el('figcaption');
      if (title) cap.append(el('strong', '', title));
      if (text) cap.append(document.createTextNode(title ? ' ' : ''), el('span', '', String(text)));
      fig.append(cap);
    }
    li.append(fig);
    frag.append(li);
  });
  dom.gallery.replaceChildren(frag);
}

let videoIO = null;
/** loads every card's photo or video; cards whose file fails are removed. Resolves with the count that loaded. */
function loadGalleryMedia() {
  const cards = $$('.shot', dom.gallery);
  if ('IntersectionObserver' in window && !reducedMotion) {
    videoIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target.querySelector('video');
        if (!v) return;
        if (e.isIntersecting) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } else v.pause();
      });
    }, { threshold: 0.25 });
  }
  const load = (card) => new Promise((resolve) => {
    const media = $('.shot__media', card);
    const src = media ? media.dataset.src : '';
    if (!src) { card.remove(); resolve(false); return; }
    const title = ($('figcaption strong', card) || {}).textContent || '';
    const alt = media.dataset.alt || (title ? `${title}, fra en jobb i Bergen og omegn` : 'Bilde fra en av jobbene våre');
    let settled = false;
    const done = (ok, node) => {
      if (settled) return;
      settled = true;
      if (ok) card.classList.add('has-media');
      else { if (node) node.remove(); card.remove(); }
      resolve(ok);
    };
    setTimeout(() => done(false), 20000);
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
      v.addEventListener('loadedmetadata', () => done(true), { once: true });
      v.addEventListener('error', () => done(false, v), { once: true });
      v.src = src;
      media.appendChild(v);
      if (videoIO) videoIO.observe(card);
    } else {
      const img = new Image();
      img.decoding = 'async';
      img.alt = alt;
      if ('fetchPriority' in img) img.fetchPriority = 'low';
      img.addEventListener('load', () => done(true), { once: true });
      img.addEventListener('error', () => done(false, img), { once: true });
      img.src = src;
      media.appendChild(img);
    }
  });
  return Promise.all(cards.map(load)).then((r) => r.filter(Boolean).length);
}

function showGallery(on) {
  if (dom.gallerySection) dom.gallerySection.hidden = !on;
  $$('[data-nav-gallery]').forEach((n) => { n.hidden = !on; });
}

async function loadFootage() {
  if (!dom.gallery || !dom.gallerySection) return;
  let items = null;
  try {
    const res = await fetch('assets/footage/footage.json', { cache: 'no-cache' });
    if (res.ok) items = await res.json();
  } catch (e) {
    /* file:// or offline: the section simply stays hidden */
  }
  if (!Array.isArray(items)) return;
  const valid = items.filter((it) => it && typeof it === 'object' && safeSrc(it.src)).slice(0, 24);
  if (valid.length < MIN_SHOTS) return;
  // photos are not urgent: let the hero and the 3D house load first
  if (document.readyState !== 'complete') await new Promise((r) => window.addEventListener('load', r, { once: true }));
  renderGallery(valid);
  const loaded = await loadGalleryMedia();
  if (loaded < MIN_SHOTS) {
    dom.gallery.replaceChildren();
    return;
  }
  showGallery(true);
  revealGallery();
}

/** Reveal the gallery cards together once the gallery scrolls into view. */
let galleryIO = null;
function revealGallery() {
  if (!dom.gallery) return;
  const nodes = $$('[data-reveal]:not(.is-in)', dom.gallery);
  nodes.forEach((c, i) => c.style.setProperty('--d', `${((i % 3) * 0.08).toFixed(2)}s`));
  if (reducedMotion || !('IntersectionObserver' in window)) { nodes.forEach((n) => n.classList.add('is-in')); return; }
  if (galleryIO) galleryIO.disconnect();
  galleryIO = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    $$('[data-reveal]', dom.gallery).forEach((n) => n.classList.add('is-in'));
    galleryIO.disconnect();
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
  galleryIO.observe(dom.gallery);
}

/* --------------------------------------------------------------------------
   Service tiles → preselect the service in the contact form
   -------------------------------------------------------------------------- */
function setupServiceLinks() {
  if (!dom.form) return;
  $$('[data-service]').forEach((a) => {
    a.addEventListener('click', () => {
      const v = a.dataset.service;
      const box = $$('input[name="tjeneste"]', dom.form).find((i) => i.value === v);
      if (box) box.checked = true;
    });
  });
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
    const services = data.getAll('tjeneste').map(String);

    $$('[aria-invalid="true"]', form).forEach(clearError);
    const errors = [];
    if (!name) errors.push(['f-name', 'Skriv inn navnet ditt.']);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(['f-email', 'Sjekk at e-postadressen er riktig.']);
    if (!phone && !email) errors.push(['f-phone', 'Fyll inn telefon eller e-post, så vi kan svare deg.']);
    if (!msg) errors.push(['f-msg', 'Skriv kort hva du vil gjøre.']);

    if (errors.length) {
      errors.forEach(([id, m]) => {
        const input = document.getElementById(id);
        if (input) setError(input, m);
      });
      const firstBad = document.getElementById(errors[0][0]);
      if (firstBad) firstBad.focus();
      if (dom.formStatus) dom.formStatus.textContent = errors.length === 1 ? 'Nesten der. Se over feltet som er merket.' : 'Nesten der. Se over feltene som er merket.';
      return;
    }

    const subject = `Forespørsel fra ${name}${services.length ? `: ${services.join(', ')}` : ''}`;
    const lines = [
      'Hei, Bygg & Renovering Vest!',
      '',
      msg,
      '',
      services.length ? `Gjelder: ${services.join(', ')}` : null,
      `Navn: ${name}`,
      phone ? `Telefon: ${phone}` : null,
      email ? `E-post: ${email}` : null,
      place ? `Adresse/sted: ${place}` : null,
      '',
      'Sendt fra skjemaet på byggrv.no',
    ].filter((l) => l !== null);
    const href = `mailto:post@byggrv.no?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
    if (dom.formStatus) {
      dom.formStatus.textContent = 'Åpner e-postprogrammet ditt. Skjer det ingenting? Send til post@byggrv.no eller ring 94 01 66 10.';
    }
    window.location.href = href;
  });
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
function boot() {
  setupHeroControls();
  setupHeroObservers();
  initScene();
  setupNavScroll();
  setupMenu();
  setupReveals();
  setupMarquee();
  setupServiceLinks();
  setupForm();
  loadFootage();
  $$('[data-year]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });
}

try {
  boot();
} catch (err) {
  console.error('[BRV] Oppstart feilet. Viser innholdet uten effekter.', err);
  html.classList.remove('js');
  html.classList.add('no-js', 'boot-failed');
}
