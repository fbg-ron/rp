'use strict';

// Star writing: trace a big letter or number with a finger. The finger leaves glowing
// star dust; once most of the shape is covered it lights up and is said out loud.
// Drawing outside the lines is fine too.
const Trace = (() => {
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const WORDS = {
    A: 'Astronaut', B: 'Blast off', C: 'Comet', D: 'Dwarf planet', E: 'Earth', F: 'Full moon',
    G: 'Galaxy', H: 'Helmet', I: 'Io', J: 'Jupiter', K: 'Kepler', L: 'Launch', M: 'Moon',
    N: 'Neptune', O: 'Orbit', P: 'Planet', Q: 'Quasar', R: 'Rocket', S: 'Sun', T: 'Telescope',
    U: 'Uranus', V: 'Venus', W: 'Weightless', X: 'X-ray', Y: 'Year', Z: 'Zero gravity',
  };
  const SAY = { Io: 'Eye-oh' };
  const PRAISE = ['Beautiful!', 'Wonderful!', 'Great writing!', 'So sparkly!'];
  const DONE_AT = 0.55; // share of the shape to cover
  const T = U.timers();

  let mode = U.store.get('traceMode', 'ABC');
  const index = { ABC: U.store.get('traceABC', 0), 123: U.store.get('trace123', 0) };
  let stage = null;
  let guide = null;
  let gctx = null;
  let paint = null;
  let pctx = null;
  let modeBtn = null;
  let nextBtn = null;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let font = 'sans-serif';
  let glyph = 'A';
  let g = { size: 100, x: 0, y: 0 };
  let points = [];
  let covered = 0;
  let complete = false;
  let brush = 30;
  let hue = 0;
  let rect = null;
  const strokes = new Map();

  function current() {
    const list = mode === 'ABC' ? LETTERS : NUMBERS;
    return list[((index[mode] % list.length) + list.length) % list.length];
  }

  // Size and place the glyph so it fills most of the stage, centered.
  function layout() {
    const c = gctx;
    c.font = `900 100px ${font}`;
    const m = c.measureText(glyph);
    const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight || 60;
    const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 72;
    const size = 100 * Math.min((W * 0.72) / w, (H * 0.8) / h);
    const k = size / 100;
    g = {
      size,
      x: W / 2 + ((m.actualBoundingBoxLeft - m.actualBoundingBoxRight) * k) / 2,
      y: H / 2 + ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * k) / 2,
    };
    brush = U.clamp(size * 0.1, 20, 72);
  }

  function drawGuide(done) {
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gctx.clearRect(0, 0, W, H);
    gctx.font = `900 ${g.size}px ${font}`;
    gctx.textAlign = 'left';
    gctx.textBaseline = 'alphabetic';
    gctx.lineJoin = 'round';
    if (done) {
      gctx.shadowColor = 'rgba(255,210,90,0.9)';
      gctx.shadowBlur = 30;
      gctx.fillStyle = 'rgba(255,214,102,0.5)';
    } else {
      gctx.fillStyle = 'rgba(255,255,255,0.1)';
    }
    gctx.fillText(glyph, g.x, g.y);
    gctx.shadowBlur = 0;
    gctx.setLineDash(done ? [] : [Math.max(6, g.size * 0.025), Math.max(8, g.size * 0.03)]);
    gctx.lineWidth = Math.max(3, g.size * 0.012);
    gctx.strokeStyle = done ? 'rgba(255,236,170,0.95)' : 'rgba(255,255,255,0.45)';
    gctx.strokeText(glyph, g.x, g.y);
    gctx.setLineDash([]);
  }

  // Sample points inside the glyph; tracing "covers" them.
  function sample() {
    const step = Math.max(6, Math.round(Math.min(W, H) / 60));
    const cw = Math.ceil(W / step);
    const ch = Math.ceil(H / step);
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const x = c.getContext('2d');
    x.scale(1 / step, 1 / step);
    x.font = `900 ${g.size}px ${font}`;
    x.textAlign = 'left';
    x.textBaseline = 'alphabetic';
    x.fillStyle = '#fff';
    x.fillText(glyph, g.x, g.y);
    const data = x.getImageData(0, 0, cw, ch).data;
    points = [];
    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++) {
        if (data[(j * cw + i) * 4 + 3] > 140) points.push({ x: (i + 0.5) * step, y: (j + 0.5) * step, hit: false });
      }
    }
    covered = 0;
  }

  function sayGlyph() {
    if (mode === 'ABC') Speech.letter(glyph);
    else Speech.number(+glyph);
  }

  function show() {
    T.clear();
    complete = false;
    strokes.clear();
    glyph = current();
    modeBtn.textContent = mode === 'ABC' ? '123' : 'ABC';
    nextBtn.classList.remove('ready');
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, paint.width, paint.height);
    layout();
    drawGuide(false);
    sample();
    T.after(300, sayGlyph);
  }

  function step(d) {
    index[mode] += d;
    U.store.set(mode === 'ABC' ? 'traceABC' : 'trace123', index[mode]);
    show();
  }

  function finish() {
    complete = true;
    drawGuide(true);
    Sound.success();
    if (mode === 'ABC') {
      const name = U.LETTER_NAMES[glyph];
      const word = WORDS[glyph];
      Speech.say(`${name}! ${name} is for ${SAY[word] || word}.`);
    } else {
      Speech.say(`${U.capitalize(U.NUMBER_WORDS[+glyph])}! ${U.pick(PRAISE)}`);
    }
    const r = stage.getBoundingClientRect();
    FX.celebrate(r.left + W / 2, r.top + H / 2);
    for (let i = 0; i < 6; i++) {
      T.after(i * 160, () => {
        const p = U.pick(points);
        if (p) FX.burst(r.left + p.x, r.top + p.y, 8, 120, 7);
      });
    }
    nextBtn.classList.add('ready');
  }

  function cover(x0, y0, x1, y1) {
    const rad = brush * 0.7;
    const r2 = rad * rad;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    for (const p of points) {
      if (p.hit) continue;
      const t = U.clamp(((p.x - x0) * dx + (p.y - y0) * dy) / len2, 0, 1);
      const ex = x0 + dx * t - p.x;
      const ey = y0 + dy * t - p.y;
      if (ex * ex + ey * ey <= r2) {
        p.hit = true;
        covered++;
      }
    }
    if (!complete && points.length && covered / points.length >= DONE_AT) finish();
  }

  function segment(x0, y0, x1, y1) {
    hue = (hue + Math.hypot(x1 - x0, y1 - y0) * 0.35) % 360;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.lineCap = 'round';
    pctx.lineJoin = 'round';
    pctx.beginPath();
    pctx.moveTo(x0, y0);
    pctx.lineTo(x1, y1);
    // The colored glow goes underneath what's already drawn, so the bright core of
    // earlier strokes is never covered and the line stays smooth.
    pctx.globalCompositeOperation = 'destination-over';
    pctx.shadowColor = `hsla(${hue},100%,70%,0.9)`;
    pctx.shadowBlur = brush * 0.5;
    pctx.strokeStyle = `hsl(${hue},95%,66%)`;
    pctx.lineWidth = brush;
    pctx.stroke();
    pctx.globalCompositeOperation = 'source-over';
    pctx.shadowBlur = 0;
    pctx.strokeStyle = '#fffbe8';
    pctx.lineWidth = brush * 0.24;
    pctx.stroke();
  }

  function down(e) {
    try {
      paint.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    rect = paint.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    strokes.set(e.pointerId, { x, y, dist: 0 });
    segment(x, y, x + 0.01, y);
    cover(x, y, x, y);
  }

  function move(e) {
    const s = strokes.get(e.pointerId);
    if (!s) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of list.length ? list : [e]) {
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < 1.5) continue;
      segment(s.x, s.y, x, y);
      cover(s.x, s.y, x, y);
      s.dist += d;
      if (s.dist > 28) {
        s.dist = 0;
        FX.trail(ev.clientX, ev.clientY);
      }
      s.x = x;
      s.y = y;
    }
  }

  function up(e) {
    strokes.delete(e.pointerId);
  }

  function resize() {
    if (!stage) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth;
    H = stage.clientHeight;
    [guide, paint].forEach((c) => {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    });
    show();
  }

  function enter(root) {
    font = getComputedStyle(document.body).fontFamily;
    const chrome = UI.chrome(root, 'Star writing');
    modeBtn = U.el('button', 'round-btn text-btn', chrome.right);
    modeBtn.setAttribute('aria-label', 'Letters or numbers');
    const clearBtn = UI.button(chrome.right, 'clear', 'Start again');
    nextBtn = UI.button(chrome.right, 'next', 'Next one');
    U.onTap(modeBtn, () => {
      mode = mode === 'ABC' ? '123' : 'ABC';
      U.store.set('traceMode', mode);
      Sound.pop();
      show();
    });
    U.onTap(clearBtn, () => {
      Sound.pop();
      show();
    });
    U.onTap(nextBtn, () => {
      Sound.chime(3);
      step(1);
    });

    stage = U.el('div', 'trace-stage', root);
    guide = U.el('canvas', 'trace-guide', stage);
    gctx = guide.getContext('2d');
    paint = U.el('canvas', 'trace-paint', stage);
    pctx = paint.getContext('2d');
    paint.addEventListener('pointerdown', down);
    paint.addEventListener('pointermove', move);
    paint.addEventListener('pointerup', up);
    paint.addEventListener('pointercancel', up);
    resize();
  }

  function exit() {
    T.clear();
    stage = null;
  }

  return { enter, exit, resize };
})();
