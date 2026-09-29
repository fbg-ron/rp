'use strict';

// Space words: drag each letter bubble onto the matching faint letter to spell the word.
// Tapping a bubble says the letter and makes its spot glow.
const Words = (() => {
  const LIST = [
    { w: 'SUN', art: 'sun' },
    { w: 'MOON', art: 'moon' },
    { w: 'STAR', art: 'star' },
    { w: 'MARS', art: 'mars' },
    { w: 'UFO', art: 'ufo', say: 'U.F.O.' },
    { w: 'EARTH', art: 'earth' },
    { w: 'VENUS', art: 'venus' },
    { w: 'PLUTO', art: 'pluto' },
    { w: 'COMET', art: 'comet' },
    { w: 'ROCKET', art: 'rocket' },
    { w: 'SATURN', art: 'saturn' },
    { w: 'URANUS', art: 'uranus' },
    { w: 'PLANET', art: 'planet' },
    { w: 'GALAXY', art: 'galaxy' },
    { w: 'JUPITER', art: 'jupiter' },
    { w: 'NEPTUNE', art: 'neptune' },
    { w: 'MERCURY', art: 'mercury' },
  ];
  const T = U.timers();
  let done = U.store.get('wordsDone', 0);
  const recent = [];
  let board = null;
  let artEl = null;
  let slots = [];
  let tiles = [];
  let word = null;
  let placed = 0;

  const spoken = (x) => x.say || U.capitalize(x.w);
  const open = (s) => !s.classList.contains('filled');

  function pickWord() {
    // Short words first; longer ones join in as more words get spelled.
    const maxLen = done < 4 ? 4 : done < 9 ? 5 : 7;
    const pool = LIST.filter((x) => x.w.length <= maxLen && !recent.includes(x.w));
    const next = U.pick(pool.length ? pool : LIST);
    recent.push(next.w);
    if (recent.length > 4) recent.shift();
    return next;
  }

  function flash(list) {
    list.forEach((s) => {
      s.classList.remove('hint');
      void s.offsetWidth;
      s.classList.add('hint');
    });
  }

  function hint(t) {
    if (t.dataset.locked) return;
    Speech.letter(t.dataset.ch);
    Sound.pop();
    flash(slots.filter((s) => s.dataset.ch === t.dataset.ch && open(s)));
  }

  function place(t, s) {
    s.classList.add('filled');
    t.dataset.locked = '1';
    t.slot = s;
    t.classList.add('placed');
    const c = U.center(s);
    U.moveCenterTo(t, c.x, c.y, true);
    placed++;
    Sound.chime(placed);
    Speech.letter(t.dataset.ch);
    FX.burst(c.x, c.y, 10, 130, 6);
    if (placed === slots.length) T.after(700, finish);
  }

  function drop(t, x, y) {
    const ch = t.dataset.ch;
    let over = null;
    let best = Infinity;
    for (const s of slots) {
      if (!U.near(s, x, y, 0.3)) continue;
      const c = U.center(s);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < best) {
        best = d;
        over = s;
      }
    }
    if (!over) return false;
    let target = over.dataset.ch === ch && open(over) ? over : null;
    // Words like MOON have the same letter twice: fill whichever one is still free.
    if (!target) target = slots.find((s) => s.dataset.ch === ch && open(s) && U.near(s, x, y, 1)) || null;
    if (!target) {
      Sound.soft();
      flash(slots.filter((s) => s.dataset.ch === ch && open(s)));
      return false;
    }
    place(t, target);
    return true;
  }

  function finish() {
    done++;
    U.store.set('wordsDone', done);
    const letters = [...word.w].map((ch) => U.LETTER_NAMES[ch]).join(', ');
    Speech.say(`${letters}. ${spoken(word)}!`);
    Sound.success();
    artEl.classList.add('cheer');
    const c = U.center(artEl);
    FX.celebrate(c.x, c.y);
    slots.forEach((s, i) =>
      T.after(i * 120, () => {
        const t = tiles.find((x) => x.slot === s);
        if (t) t.firstChild.classList.add('wave');
      })
    );
    const wait = 2600 + word.w.length * 550;
    T.after(wait, () => board.classList.add('leaving'));
    T.after(wait + 600, build);
  }

  function build() {
    T.clear();
    board.innerHTML = '';
    board.classList.remove('leaving');
    word = pickWord();
    placed = 0;
    const small = Math.min(window.innerWidth, window.innerHeight);

    const head = U.el('div', 'word-head pop-in', board);
    artEl = Art.node(word.art, small * 0.26, 'word-art');
    head.appendChild(artEl);
    const row = U.el('div', 'slots', head);
    slots = [...word.w].map((ch) => {
      const s = U.el('div', 'slot', row);
      s.dataset.ch = ch;
      U.el('span', 'guide', s).textContent = ch;
      return s;
    });

    const tray = U.el('div', 'tray', board);
    tiles = U.shuffle([...word.w]).map((ch, i) => {
      const t = U.el('button', 'letter pop-in', tray);
      t.style.animationDelay = 0.25 + i * 0.07 + 's';
      t.dataset.ch = ch;
      t.setAttribute('aria-label', ch);
      const ball = U.el('div', 'letter-ball c' + (i % 6), t);
      ball.textContent = ch;
      ball.style.animationDelay = -U.rand(0, 4) + 's';
      U.draggable(t, { onTap: () => hint(t), onDrop: (x, y) => drop(t, x, y) });
      return t;
    });
    T.after(450, () => Speech.say(spoken(word)));
  }

  function enter(root) {
    UI.chrome(root, 'Space words');
    board = U.el('div', 'words-board', root);
    build();
  }

  function exit() {
    T.clear();
  }

  // Letters already in place follow their spot when the screen turns.
  function resize() {
    tiles.forEach((t) => {
      if (!t.slot) return;
      const c = U.center(t.slot);
      U.moveCenterTo(t, c.x, c.y, false);
    });
  }

  return { enter, exit, resize };
})();
