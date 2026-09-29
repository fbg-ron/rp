'use strict';

// The home screen: five big floating buttons, one per activity.
const Home = (() => {
  const TILES = [
    { id: 'explore', label: 'Planets', say: 'Planets!', art: 'saturn', scale: 0.42 },
    { id: 'count', label: 'Count', say: "Let's count!", art: 'moon', scale: 0.64, badge: '123' },
    { id: 'sums', label: 'Math', say: 'Space math!', art: 'earth', scale: 0.64, badge: '1+2' },
    { id: 'words', label: 'Words', say: 'Words!', art: 'star', scale: 0.92, badge: 'ABC' },
    { id: 'trace', label: 'Write', say: "Let's write!", art: 'comet', scale: 0.86, badge: 'A', outline: true },
  ];
  let busy = false;

  function toggle(parent, icon, label, get, set) {
    const b = UI.button(parent, icon, label, 'small');
    const sync = () => b.classList.toggle('off', !get());
    sync();
    U.onTap(b, () => {
      set(!get());
      sync();
      Sound.pop();
    });
  }

  function enter(root) {
    busy = false;
    const top = U.el('div', 'home-top', root);
    U.el('div', 'title', top).textContent = 'Little Orbit';
    const toggles = U.el('div', 'toggles', top);
    toggle(toggles, 'music', 'Music', () => Sound.musicOn, (v) => (Sound.musicOn = v));
    toggle(toggles, 'voice', 'Voice', () => Speech.on, (v) => (Speech.on = v));

    const grid = U.el('div', 'home-grid', root);
    const orbPx = Math.min(Math.min(window.innerWidth, window.innerHeight) * 0.26, 170);
    TILES.forEach((t, i) => {
      const b = U.el('button', 'tile', grid);
      b.style.setProperty('--i', i);
      b.setAttribute('aria-label', t.label);
      const orb = U.el('div', 'tile-orb', b);
      const art = Art.node(t.art, orbPx * t.scale, 'tile-art');
      art.style.setProperty('--s', t.scale);
      orb.appendChild(art);
      if (t.badge) U.el('div', 'tile-badge' + (t.outline ? ' outline' : ''), orb).textContent = t.badge;
      U.el('div', 'tile-label', b).textContent = t.label;
      U.onTap(b, () => {
        if (busy) return;
        busy = true;
        Sound.chime(i * 2);
        Speech.say(t.say);
        const c = U.center(orb);
        FX.burst(c.x, c.y, 18);
        b.classList.add('chosen');
        setTimeout(() => App.go(t.id), 380);
      });
    });
  }

  return { enter };
})();
