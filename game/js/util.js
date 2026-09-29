'use strict';

// Small helpers shared by every screen.
const U = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Seeded random numbers, so a planet's craters look the same every time it is drawn.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(tag, cls, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  function center(elm) {
    const r = elm.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('littleorbit.' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('littleorbit.' + key, JSON.stringify(value));
      } catch (e) {
        /* storage full or disabled: progress just isn't remembered */
      }
    },
  };

  // Timers that a screen can cancel all at once when the child leaves it.
  function timers() {
    const ids = new Set();
    return {
      after(ms, fn) {
        const id = setTimeout(() => {
          ids.delete(id);
          fn();
        }, ms);
        ids.add(id);
        return id;
      },
      clear() {
        ids.forEach(clearTimeout);
        ids.clear();
      },
    };
  }

  // A forgiving tap: small fingers wobble, so allow some movement between down and up.
  function onTap(elm, fn) {
    let start = null;
    elm.addEventListener('pointerdown', (e) => {
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      try {
        elm.setPointerCapture(e.pointerId);
      } catch (err) {
        /* pointer already gone */
      }
    });
    elm.addEventListener('pointerup', (e) => {
      if (start && start.id === e.pointerId && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 40) fn(e);
      start = null;
    });
    elm.addEventListener('pointercancel', () => {
      start = null;
    });
  }

  function translateOf(elm) {
    return { x: parseFloat(elm.dataset.tx || 0), y: parseFloat(elm.dataset.ty || 0) };
  }

  function setTranslate(elm, x, y, scale) {
    elm.dataset.tx = x;
    elm.dataset.ty = y;
    elm.style.transform = `translate(${x}px, ${y}px)` + (scale ? ` scale(${scale})` : '');
  }

  // Move an element (by transform) so its center lands on a screen point.
  function moveCenterTo(elm, x, y, animate) {
    const t = translateOf(elm);
    const c = center(elm);
    elm.style.transition = animate ? 'transform .35s cubic-bezier(.2,.9,.3,1.2)' : 'none';
    setTranslate(elm, t.x + (x - c.x), t.y + (y - c.y));
  }

  // Drag and drop for toddlers: a short press counts as a tap, anything longer is a drag.
  // onDrop(x, y) returns true when the drop was accepted; otherwise the item floats home.
  function draggable(elm, { onTap: tap, onDrop, onPick } = {}) {
    let id = null;
    let sx = 0;
    let sy = 0;
    let base = { x: 0, y: 0 };
    let moved = false;
    let lastTrail = 0;

    elm.addEventListener('pointerdown', (e) => {
      if (id !== null || elm.dataset.locked) return;
      id = e.pointerId;
      try {
        elm.setPointerCapture(id);
      } catch (err) {
        /* ignore */
      }
      sx = e.clientX;
      sy = e.clientY;
      moved = false;
      base = translateOf(elm);
      elm.style.transition = 'none';
      elm.classList.add('lifted');
      if (onPick) onPick();
    });

    elm.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 14) moved = true;
      if (!moved) return;
      setTranslate(elm, base.x + dx, base.y + dy, 1.12);
      const now = performance.now();
      if (now - lastTrail > 45) {
        lastTrail = now;
        FX.trail(e.clientX, e.clientY);
      }
    });

    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      elm.classList.remove('lifted');
      if (!moved) {
        elm.style.transition = '';
        if (tap) tap();
        return;
      }
      const c = center(elm);
      const ok = onDrop ? onDrop(c.x, c.y) : false;
      if (!ok) goHome(elm);
    };
    elm.addEventListener('pointerup', end);
    elm.addEventListener('pointercancel', end);
  }

  function goHome(elm) {
    elm.style.transition = 'transform .6s cubic-bezier(.3,1.4,.5,1)';
    setTranslate(elm, 0, 0);
  }

  // Rectangle hit test with extra slack around the target.
  function near(elm, x, y, slack) {
    const r = elm.getBoundingClientRect();
    const s = (slack || 0) * Math.max(r.width, r.height);
    return x >= r.left - s && x <= r.right + s && y >= r.top - s && y <= r.bottom + s;
  }

  const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  // Spoken letter names. Text-to-speech often reads a lone "A" as "uh", so spell them out.
  const LETTER_NAMES = {
    A: 'ay', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'ef', G: 'jee', H: 'aitch', I: 'eye',
    J: 'jay', K: 'kay', L: 'el', M: 'em', N: 'en', O: 'oh', P: 'pee', Q: 'cue', R: 'ar',
    S: 'ess', T: 'tee', U: 'you', V: 'vee', W: 'double you', X: 'ex', Y: 'why', Z: 'zee',
  };

  const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

  return {
    rand, randInt, pick, clamp, lerp, ease, shuffle, rng, el, center, store, timers, onTap,
    draggable, goHome, moveCenterTo, setTranslate, near, NUMBER_WORDS, LETTER_NAMES, capitalize,
  };
})();

// Line icons used on buttons (drawn with the stroke color of the button).
const ICONS = {
  home: '<svg viewBox="0 0 24 24"><path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M6 9.6V20h12V9.6"/><path d="M10 20v-5.5h4V20"/></svg>',
  orbits: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.4" fill="currentColor"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.8"/><circle cx="18" cy="12" r="1.7" fill="currentColor"/><circle cx="5.1" cy="5.1" r="1.7" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M5 12h13"/><path d="M13 6.5 18.5 12 13 17.5"/></svg>',
  clear: '<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v4.2h4.2"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  voice: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18 6.5a8 8 0 0 1 0 11"/></svg>',
};
