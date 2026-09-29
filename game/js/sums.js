'use strict';

// Space math: adding (and, once that's easy, taking away) with pictures.
// Drag or tap the answer. A wrong answer floats back, and the pictures count
// themselves out loud to help. It gets harder slowly, and easier again if needed.
const Sums = (() => {
  const THINGS = ['star', 'moon', 'rocket', 'ufo', 'earth', 'saturn'];
  const NW = U.NUMBER_WORDS;
  const T = U.timers();
  let level = U.store.get('mathLevel', 1);
  let streak = 0;
  let struggles = 0;
  let board = null;
  let slot = null;
  let groupA = null;
  let groupB = null;
  let problem = null;
  let solved = false;
  let helped = false;
  let helping = false;

  function makeProblem() {
    let p = null;
    for (let tries = 0; tries < 20; tries++) {
      const op = level >= 3 && Math.random() < 0.4 ? '-' : '+';
      let a;
      let b;
      if (op === '+') {
        const sum = U.randInt(2, level === 1 ? 5 : 10);
        a = U.randInt(1, sum - 1);
        b = sum - a;
      } else {
        a = U.randInt(2, level >= 4 ? 10 : 5);
        b = U.randInt(1, a - 1);
      }
      p = { a, b, op, ans: op === '+' ? a + b : a - b, thing: U.pick(THINGS) };
      if (!problem || problem.a !== a || problem.b !== b || problem.op !== op) break;
    }
    return p;
  }

  function options(ans) {
    const set = new Set([ans]);
    for (const n of U.shuffle([ans - 1, ans + 1, ans + 2, ans - 2])) {
      if (n >= 1 && n <= 10 && set.size < 3) set.add(n);
    }
    while (set.size < 3) set.add(U.randInt(1, 10));
    return U.shuffle([...set]);
  }

  const words = (p) => `${U.capitalize(NW[p.a])} ${p.op === '+' ? 'plus' : 'take away'} ${NW[p.b]}`;

  function group(parent, n, thing, away, ghost) {
    const g = U.el('div', 'group' + (ghost ? ' ghost' : ''), parent);
    const pics = U.el('div', 'pics', g);
    pics.style.setProperty('--cols', Math.min(n, 5));
    const px = Math.min(window.innerWidth, window.innerHeight) * 0.1;
    for (let i = 0; i < n; i++) {
      const t = U.el('div', 'thing' + (i >= n - away ? ' away' : ''), pics);
      t.appendChild(Art.node(thing, px));
    }
    U.el('div', 'num', g).textContent = n;
    return g;
  }

  function build() {
    T.clear();
    board.innerHTML = '';
    board.classList.remove('leaving');
    solved = false;
    helped = false;
    helping = false;
    problem = makeProblem();
    const p = problem;

    const eq = U.el('div', 'eq pop-in', board);
    groupA = group(eq, p.a, p.thing, p.op === '-' ? p.b : 0, false);
    U.el('div', 'eq-sign', eq).textContent = p.op === '+' ? '+' : '−';
    groupB = group(eq, p.b, p.thing, 0, p.op === '-');
    U.el('div', 'eq-sign', eq).textContent = '=';
    slot = U.el('div', 'eq-slot', eq);
    U.el('span', 'q', slot).textContent = '?';

    const tray = U.el('div', 'choices', board);
    options(p.ans).forEach((n, i) => {
      const c = U.el('button', 'choice pop-in', tray);
      c.style.animationDelay = 0.2 + i * 0.1 + 's';
      c.dataset.n = n;
      c.setAttribute('aria-label', String(n));
      const ball = U.el('div', 'choice-ball c' + (n % 6), c);
      ball.textContent = n;
      ball.style.animationDelay = -i * 1.3 + 's';
      U.draggable(c, {
        onPick: () => Speech.number(n),
        onTap: () => answer(c, true),
        onDrop: (x, y) => (U.near(slot, x, y, 0.4) ? answer(c, false) : false),
      });
    });

    T.after(500, () => Speech.say(words(p) + '?'));
    // Taking away: the last few pictures float off.
    if (p.op === '-') {
      [...groupA.querySelectorAll('.thing.away')].forEach((t, i) => T.after(1700 + i * 200, () => t.classList.add('gone')));
    }
  }

  function answer(c, fromTap) {
    if (solved) return false;
    const n = +c.dataset.n;
    const s = U.center(slot);
    if (n === problem.ans) {
      solved = true;
      c.dataset.locked = '1';
      U.moveCenterTo(c, s.x, s.y, true);
      slot.classList.add('filled');
      success();
      return true;
    }
    if (fromTap) {
      U.moveCenterTo(c, s.x, s.y, true);
      T.after(450, () => U.goHome(c));
    }
    Sound.soft();
    help();
    return false;
  }

  function help() {
    helped = true;
    if (helping) return;
    helping = true;
    const items =
      problem.op === '+'
        ? [...groupA.querySelectorAll('.thing'), ...groupB.querySelectorAll('.thing')]
        : [...groupA.querySelectorAll('.thing:not(.away)')];
    T.after(600, () => Speech.say("Let's count!"));
    items.forEach((t, i) =>
      T.after(1600 + i * 750, () => {
        t.classList.add('lit');
        Sound.count(i + 1);
        Speech.number(i + 1);
      })
    );
    T.after(1600 + items.length * 750 + 600, () => {
      items.forEach((t) => t.classList.remove('lit'));
      helping = false;
    });
  }

  function success() {
    T.clear();
    helping = false;
    if (helped) {
      streak = 0;
      struggles++;
    } else {
      streak++;
      struggles = 0;
    }
    if (streak >= 4 && level < 4) {
      level++;
      streak = 0;
    }
    if (struggles >= 3 && level > 1) {
      level--;
      struggles = 0;
    }
    U.store.set('mathLevel', level);

    board.querySelectorAll('.choice:not([data-locked])').forEach(U.goHome);
    board.querySelectorAll('.thing').forEach((t) => t.classList.remove('lit'));
    board.querySelectorAll('.thing.away').forEach((t) => t.classList.add('gone'));
    board.querySelectorAll('.group:not(.ghost) .thing:not(.away)').forEach((t) => t.classList.add('happy'));
    Sound.success();
    Speech.say(`${words(problem)} is ${NW[problem.ans]}!`);
    const s = U.center(slot);
    FX.celebrate(s.x, s.y);
    T.after(3400, () => board.classList.add('leaving'));
    T.after(4000, build);
  }

  function enter(root) {
    UI.chrome(root, 'Space math');
    board = U.el('div', 'sums-board', root);
    problem = null;
    build();
  }

  function exit() {
    T.clear();
  }

  function resize() {
    if (solved) {
      const c = board.querySelector('.choice[data-locked]');
      const s = U.center(slot);
      if (c) U.moveCenterTo(c, s.x, s.y, false);
    }
  }

  return { enter, exit, resize };
})();
