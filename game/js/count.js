'use strict';

// Count the moons: tap each moon to hear its number. There are no wrong answers.
const Count = (() => {
  const PLANETS = ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'planet', 'pluto'];
  const MOONS = ['moon', 'europa', 'ganymede', 'callisto', 'io', 'titan', 'triton', 'charon', 'enceladus', 'titania'];
  const T = U.timers();
  let round = U.store.get('countRound', 0);
  let stage = null;
  let planet = null;
  let numEl = null;
  let total = 0;
  let counted = 0;
  let lastTotal = 0;
  let done = false;

  function restart(elm, cls) {
    elm.classList.remove(cls);
    void elm.offsetWidth;
    elm.classList.add(cls);
  }

  function tapMoon(m, tag) {
    if (done) return;
    if (m.classList.contains('counted')) {
      restart(m, 'wiggle');
      Sound.soft();
      return;
    }
    counted++;
    m.classList.add('counted');
    tag.textContent = counted;
    numEl.textContent = counted;
    restart(numEl, 'bump');
    Sound.count(counted);
    Speech.number(counted);
    const c = U.center(m);
    FX.burst(c.x, c.y, 10, 140, 6);
    if (counted === total) finish();
  }

  function finish() {
    done = true;
    round++;
    U.store.set('countRound', round);
    T.after(1000, () => {
      Speech.say(`${U.capitalize(U.NUMBER_WORDS[total])} ${total === 1 ? 'moon' : 'moons'}!`);
      Sound.success();
      planet.classList.add('glow');
      const c = U.center(planet);
      FX.celebrate(c.x, c.y);
    });
    T.after(3800, () => stage.classList.add('leaving'));
    T.after(4400, () => newRound(false));
  }

  function newRound(first) {
    T.clear();
    stage.innerHTML = '';
    stage.classList.remove('leaving');
    done = false;
    counted = 0;
    // Start small and slowly allow more moons, up to ten.
    const max = Math.min(10, 4 + Math.floor(round / 3));
    do total = U.randInt(1, max);
    while (total === lastTotal);
    lastTotal = total;

    const small = Math.min(window.innerWidth, window.innerHeight);
    planet = U.el('div', 'count-planet pop-in', stage);
    planet.appendChild(Art.node(U.pick(PLANETS), small * 0.3, 'count-planet-art'));
    numEl = U.el('div', 'count-num', planet);

    const moonKey = U.pick(MOONS);
    const offset = U.rand(0, Math.PI * 2);
    for (let i = 0; i < total; i++) {
      const a = offset + (i * Math.PI * 2) / total + U.rand(-0.12, 0.12);
      const m = U.el('button', 'moon-btn pop-in' + (total > 5 ? ' small' : ''), stage);
      m.setAttribute('aria-label', 'Moon');
      m.style.left = 50 + Math.cos(a) * 39 + '%';
      m.style.top = 50 + Math.sin(a) * 37 + '%';
      m.style.animationDelay = 0.15 + i * 0.08 + 's';
      const bob = U.el('div', 'bob', m);
      bob.style.animationDelay = -U.rand(0, 5) + 's';
      bob.appendChild(Art.node(moonKey, small * 0.13));
      const tag = U.el('div', 'moon-tag', bob);
      U.onTap(m, () => tapMoon(m, tag));
    }
    T.after(first ? 700 : 450, () => Speech.say('How many moons?'));
  }

  function enter(root) {
    UI.chrome(root, 'Count the moons');
    stage = U.el('div', 'count-stage', root);
    lastTotal = 0;
    newRound(true);
  }

  function exit() {
    T.clear();
  }

  return { enter, exit };
})();
