'use strict';

// Explore the solar system: drag to look around, pinch to zoom, tap anything to hear
// its name. Tapping a planet flies there so its moons can be seen going around it.
// Sizes and distances are squeezed so everything fits on one screen.
const Explore = (() => {
  const TAU = Math.PI * 2;
  const TILT = 0.55; // how flat the orbits look, as if seen from a little above
  const EARTH_YEAR = 60; // seconds for Earth to go once around the Sun

  const SUN = {
    key: 'sun', name: 'Sun', r: 38, x: 0, y: 0, moons: [],
    facts: ['The Sun is a star.', 'The Sun keeps us warm.', 'All the planets go around the Sun.'],
  };

  const moon = (key, name, r, dist, period, facts, extra) => Object.assign({ key, name, r, dist, period, facts }, extra);

  const PLANETS = [
    { key: 'mercury', name: 'Mercury', r: 7, orbit: 80, a0: 0.4, moons: [],
      facts: ['Mercury is closest to the Sun.', 'Mercury is small and rocky.', 'Mercury is the fastest planet.'] },
    { key: 'venus', name: 'Venus', r: 11, orbit: 115, a0: 2.1, moons: [],
      facts: ['Venus is the hottest planet.', 'Venus is covered in thick clouds.', 'Venus shines brightly in the night sky.'] },
    { key: 'earth', name: 'Earth', r: 12, orbit: 155, a0: 4.0,
      facts: ['Earth is our home!', 'Earth has lots of water.', 'Earth has one moon.'],
      moons: [moon('moon', 'Moon', 3.4, 24, 14, ['The Moon goes around the Earth.', 'Astronauts walked on the Moon.', 'The Moon has lots of craters.'])] },
    { key: 'mars', name: 'Mars', r: 9, orbit: 200, a0: 5.5,
      facts: ['Mars is the red planet.', 'Mars has two little moons.', 'Robot rovers drive on Mars.'],
      moons: [
        moon('phobos', 'Phobos', 1.8, 15, 6, ['Phobos is a little moon of Mars.']),
        moon('deimos', 'Deimos', 1.5, 21, 11, ['Deimos is a tiny moon of Mars.']),
      ] },
    { key: 'jupiter', name: 'Jupiter', r: 27, orbit: 285, a0: 1.2,
      facts: ['Jupiter is the biggest planet.', 'Jupiter has a giant storm called the Great Red Spot.', 'Jupiter has lots and lots of moons.'],
      moons: [
        moon('io', 'Io', 3.0, 40, 8, ['Io has lots of volcanoes.'], { say: 'Eye-oh' }),
        moon('europa', 'Europa', 2.7, 48, 11, ['Europa is covered in ice.']),
        moon('ganymede', 'Ganymede', 4.0, 58, 15, ['Ganymede is the biggest moon of all.']),
        moon('callisto', 'Callisto', 3.7, 69, 21, ['Callisto is covered in craters.']),
      ] },
    { key: 'saturn', name: 'Saturn', r: 23, orbit: 375, a0: 3.0,
      facts: ['Saturn has beautiful rings.', 'Saturn’s rings are made of ice and rock.', 'Saturn is a giant ball of gas.'],
      moons: [
        moon('enceladus', 'Enceladus', 2.0, 60, 10, ['Enceladus is a shiny, icy moon.'], { say: 'En-sell-uh-dus' }),
        moon('titan', 'Titan', 4.2, 72, 17, ['Titan is Saturn’s biggest moon.']),
      ] },
    { key: 'uranus', name: 'Uranus', r: 16, orbit: 460, a0: 5.0,
      facts: ['Uranus spins on its side.', 'Uranus is an ice giant.', 'Uranus is very, very cold.'],
      moons: [
        moon('miranda', 'Miranda', 1.8, 30, 8, ['Miranda is a small moon of Uranus.']),
        moon('titania', 'Titania', 2.6, 38, 12, ['Titania is the biggest moon of Uranus.']),
      ] },
    { key: 'neptune', name: 'Neptune', r: 15.5, orbit: 535, a0: 0.9,
      facts: ['Neptune is the farthest planet from the Sun.', 'Neptune is very windy.', 'Neptune is deep blue.'],
      moons: [moon('triton', 'Triton', 3.0, 30, 12, ['Triton is Neptune’s biggest moon.', 'Triton goes around Neptune backwards.'], { retro: true })] },
    { key: 'pluto', name: 'Pluto', r: 5, orbit: 600, a0: 2.6,
      facts: ['Pluto is a dwarf planet.', 'Pluto has a big heart on it.', 'Pluto is very, very cold.'],
      moons: [moon('charon', 'Charon', 2.6, 11, 9, ['Charon is Pluto’s biggest moon.'])] },
  ];

  const BELT_FACTS = ['This is the asteroid belt.', 'Lots of space rocks go around the Sun here.'];
  const COMET_FACTS = ['Comets are made of ice and dust.', 'A comet’s tail points away from the Sun.'];

  // Kepler-ish speeds: planets farther from the Sun go around more slowly.
  const angularSpeed = (orbit) => TAU / (EARTH_YEAR * Math.pow(orbit / 155, 1.5));
  const MOONS = [];
  PLANETS.forEach((p) => {
    p.w = angularSpeed(p.orbit);
    p.moons.forEach((m, i) => {
      m.parent = p;
      m.a0 = i * 2.1 + p.a0;
      m.w = (TAU / m.period) * (m.retro ? -1 : 1);
      MOONS.push(m);
    });
  });
  const BODIES = [SUN, ...PLANETS, ...MOONS];

  const R = U.rng(3);
  const BELT = Array.from({ length: 280 }, () => ({ a: R() * TAU, d: 224 + R() * 34, s: 0.5 + R() * 1.2 }));
  const BELT_SPEED = angularSpeed(240);

  let root = null;
  let canvas = null;
  let ctx = null;
  let card = null;
  let cardName = null;
  let cardFact = null;
  let zoomBtn = null;
  let raf = 0;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let portrait = false;
  let font = 'sans-serif';
  const cam = { x: 0, y: 0, z: 1 };
  // A tall screen shows the whole system turned sideways (rot = 90°) so it fits; the
  // view turns back to level when it flies to a planet. lift moves the view up to make
  // room for the name card.
  let rot = 0;
  let cosR = 1;
  let sinR = 0;
  let lift = 0;
  let cardShown = false;
  let fitZoom = 1;
  let maxZoom = 30;
  let follow = null;
  let flight = null;
  let selected = null;
  let zoomShown = null;
  let simT = 0;
  let lastT = 0;
  let comet = null;
  let cometTimer = 18;
  const factIndex = new Map();
  const pointers = new Map();
  let tapStart = null;
  let pinchPrev = null;

  // ---------- camera ----------

  function setRot(a) {
    rot = a;
    cosR = Math.cos(a);
    sinR = Math.sin(a);
  }

  const overviewRot = () => (portrait ? Math.PI / 2 : 0);

  function toScreen(wx, wy) {
    const u = (wx - cam.x) * cam.z;
    const v = (wy - cam.y) * cam.z * TILT;
    return [W / 2 + u * cosR - v * sinR, H / 2 - lift + u * sinR + v * cosR];
  }

  function toWorld(sx, sy) {
    const dx = sx - W / 2;
    const dy = sy - (H / 2 - lift);
    const u = dx * cosR + dy * sinR;
    const v = dy * cosR - dx * sinR;
    return [cam.x + u / cam.z, cam.y + v / (cam.z * TILT)];
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = root.clientWidth;
    H = root.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.05;
    const focused = follow || (flight && flight.to);
    const wasFit = !focused && !flight && Math.abs(cam.z - fitZoom) < fitZoom * 0.01;
    fitZoom = fitFor(overviewRot());
    maxZoom = (Math.min(W, H) * 0.45) / 5;
    setRot(focused ? 0 : overviewRot());
    if (flight) flight.r0 = flight.r1 = rot;
    cam.z = wasFit ? fitZoom : U.clamp(cam.z, minZoom(), maxZoom);
  }

  // The zoom that fits the whole solar system on screen when the view is turned by angle.
  function fitFor(angle) {
    const side = Math.abs(Math.sin(angle)) > 0.5;
    const along = side ? H : W;
    const across = side ? W : H;
    return Math.min((along * 0.92) / 1224, (across * 0.84) / (1224 * TILT + 50));
  }

  const minZoom = () => 0.75 * fitFor(rot);

  // A zoom that shows the body with all of its moons (in the level view).
  function zoomFor(b) {
    let reach = b === SUN ? b.r * 2.3 : b.r * 2.6;
    b.moons.forEach((m) => (reach = Math.max(reach, m.dist + m.r * 2)));
    if (Art.hasRings(b.key)) reach = Math.max(reach, b.r * 2.4);
    const z = Math.min((W * 0.42) / reach, (H * 0.34) / Math.max(reach * TILT, b.r * 1.15));
    return U.clamp(z, minZoom(), maxZoom);
  }

  function flyTo(body) {
    flight = {
      x: cam.x, y: cam.y, z: cam.z, r0: rot, r1: body ? 0 : overviewRot(),
      to: body, tz: body ? zoomFor(body) : fitZoom, t0: performance.now(), dur: 1400,
    };
    follow = null;
    Sound.whoosh();
  }

  function moveCamera(now) {
    if (flight) {
      const k = U.ease(U.clamp((now - flight.t0) / flight.dur, 0, 1));
      const tx = flight.to ? flight.to.x : 0;
      const ty = flight.to ? flight.to.y : 0;
      cam.x = U.lerp(flight.x, tx, k);
      cam.y = U.lerp(flight.y, ty, k);
      cam.z = flight.z * Math.pow(flight.tz / flight.z, k);
      setRot(U.lerp(flight.r0, flight.r1, k));
      if (k >= 1) {
        follow = flight.to;
        flight = null;
      }
    } else if (follow) {
      cam.x = follow.x;
      cam.y = follow.y;
    }
  }

  function clampCam() {
    const d = Math.hypot(cam.x, cam.y);
    if (d > 680) {
      cam.x *= 680 / d;
      cam.y *= 680 / d;
    }
  }

  // ---------- simulation ----------

  function place(time) {
    for (const p of PLANETS) {
      const a = p.a0 + time * p.w;
      p.x = Math.cos(a) * p.orbit;
      p.y = Math.sin(a) * p.orbit;
      for (const m of p.moons) {
        const b = m.a0 + time * m.w;
        m.x = p.x + Math.cos(b) * m.dist;
        m.y = p.y + Math.sin(b) * m.dist;
      }
    }
  }

  function updateComet(dt) {
    if (!comet) {
      cometTimer -= dt;
      if (cometTimer > 0) return;
      const a = U.rand(0, TAU);
      const b = a + Math.PI + U.rand(-0.35, 0.35);
      const sx = Math.cos(a) * 760;
      const sy = Math.sin(a) * 760;
      const ex = Math.cos(b) * 760;
      const ey = Math.sin(b) * 760;
      const len = Math.hypot(ex - sx, ey - sy);
      comet = { x: sx, y: sy, vx: ((ex - sx) / len) * 55, vy: ((ey - sy) / len) * 55, age: 0, life: len / 55 };
      return;
    }
    comet.x += comet.vx * dt;
    comet.y += comet.vy * dt;
    comet.age += dt;
    if (comet.age > comet.life) {
      comet = null;
      cometTimer = U.rand(35, 60);
    }
  }

  // ---------- drawing ----------

  // Bodies turn with the view, so rings stay lined up with their moons' orbits.
  function drawSprite(s, x, y, r, angle) {
    const d = 2 * r * s.scale;
    if (!angle) {
      ctx.drawImage(s, x - d / 2, y - d / 2, d, d);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(s, -d / 2, -d / 2, d, d);
    ctx.restore();
  }

  function orbit(cx, cy, radius) {
    const rx = radius * cam.z;
    const ry = rx * TILT;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
    ctx.stroke();
  }

  function drawBody(b, sunX, sunY, time) {
    const [x, y] = toScreen(b.x, b.y);
    const r = Math.max(b.r * cam.z, b.parent ? 1.3 : b === SUN ? 6 : 3.2);
    b.sx = x;
    b.sy = y;
    b.sr = r;
    const pad = r * 2.5 + 10;
    if (x < -pad || x > W + pad || y < -pad || y > H + pad) return;
    const px = 2 * r * dpr;
    if (b === SUN) {
      drawSprite(Art.sprite('sun', 'full', px), x, y, r);
    } else {
      const rings = Art.hasRings(b.key);
      if (rings) drawSprite(Art.sprite(b.key, 'back', px), x, y, r, rot);
      drawSprite(Art.sprite(b.key, 'body', px), x, y, r, rot);
      if (r > 2) {
        const lx = sunX - x;
        const ly = sunY - y;
        const len = Math.hypot(lx, ly) || 1;
        ctx.save();
        ctx.translate(x, y);
        Art.shade(ctx, r, lx / len, ly / len, 0.85);
        ctx.restore();
      }
      if (rings) drawSprite(Art.sprite(b.key, 'front', px), x, y, r, rot);
    }
    // Small things get a soft ring so it's clear which one was tapped.
    if (b === selected && r < 40) {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.25 * Math.sin(time * 3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.2 + 7, 0, TAU);
      ctx.stroke();
    }
  }

  function drawComet() {
    if (!comet) return;
    const [x, y] = toScreen(comet.x, comet.y);
    comet.sx = x;
    comet.sy = y;
    const fade = Math.min(1, comet.age / 2, (comet.life - comet.age) / 2);
    const d = Math.hypot(comet.x, comet.y) || 1;
    const tail = Math.min(140, 40 + 12000 / d);
    const [tx, ty] = toScreen(comet.x + (comet.x / d) * tail, comet.y + (comet.y / d) * tail);
    const g = ctx.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, `rgba(220,240,255,${0.8 * fade})`);
    g.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.strokeStyle = g;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, 5 * cam.z);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    const hr = Math.max(4, 6 * cam.z);
    const head = ctx.createRadialGradient(x, y, 0, x, y, hr);
    head.addColorStop(0, `rgba(255,255,255,${fade})`);
    head.addColorStop(1, 'rgba(180,220,255,0)');
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(x, y, hr, 0, TAU);
    ctx.fill();
  }

  function drawLabels(focus) {
    const size = U.clamp(Math.min(W, H) * 0.03, 11, 16);
    ctx.font = `700 ${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const side = Math.abs(sinR);
    const below = (b) => (b.key === 'saturn' ? U.lerp(1.05, 2.3, side) : b.key === 'uranus' ? U.lerp(1.8, 1.05, side) : 1.05);
    const show = (b) => {
      if (b.sx == null) return;
      ctx.fillStyle = b === selected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)';
      ctx.fillText(b.name, b.sx, b.sy + b.sr * below(b) + 5);
    };
    [SUN, ...PLANETS].forEach((b) => {
      if (b === selected || b.sr >= 8) show(b);
    });
    if (focus) focus.moons.forEach((m) => m.sr >= 4 && show(m));
  }

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const [sunX, sunY] = toScreen(0, 0);
    const focus = follow || (flight && flight.to) || null;

    ctx.lineWidth = 1.2;
    for (const p of PLANETS) {
      const lit = p === focus || p === selected;
      ctx.strokeStyle = lit ? 'rgba(190,210,255,0.32)' : 'rgba(170,190,255,0.13)';
      orbit(sunX, sunY, p.orbit);
    }

    ctx.fillStyle = 'rgba(205,195,180,0.5)';
    for (const a of BELT) {
      const ang = a.a + simT * BELT_SPEED;
      const [x, y] = toScreen(Math.cos(ang) * a.d, Math.sin(ang) * a.d);
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      ctx.beginPath();
      ctx.arc(x, y, U.clamp(cam.z * 0.5 * a.s, 0.5, 2.2), 0, TAU);
      ctx.fill();
    }

    if (focus && focus.moons.length) {
      const [px, py] = toScreen(focus.x, focus.y);
      ctx.strokeStyle = 'rgba(200,210,255,0.13)';
      focus.moons.forEach((m) => orbit(px, py, m.dist));
    }

    // Far things first, so near planets pass in front of the Sun.
    const list = BODIES.slice().sort((a, b) => a.y - b.y);
    for (const b of list) drawBody(b, sunX, sunY, time);
    drawComet();
    drawLabels(focus);
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    simT += dt;
    lift += ((cardShown ? Math.min(56, H * 0.09) : 0) - lift) * Math.min(1, dt * 4);
    place(simT);
    moveCamera(t);
    updateComet(dt);
    draw(t / 1000);
    const away = !!(follow || (flight && flight.to)) || Math.abs(cam.z / fitZoom - 1) > 0.08 || Math.hypot(cam.x, cam.y) > 20;
    if (away !== zoomShown) {
      zoomShown = away;
      zoomBtn.classList.toggle('hidden', !away);
    }
  }

  // ---------- touching ----------

  function hit(x, y) {
    if (comet && comet.sx != null && Math.hypot(x - comet.sx, y - comet.sy) < 34) return 'comet';
    let best = null;
    let bestScore = Infinity;
    for (const b of BODIES) {
      if (b.sx == null || (b.parent && b.sr < 3.5)) continue;
      const d = Math.hypot(x - b.sx, y - b.sy);
      const reach = Math.max(b.sr * (Art.hasRings(b.key) ? 1.7 : 1.15), 26);
      if (d < reach && d - b.sr < bestScore) {
        best = b;
        bestScore = d - b.sr;
      }
    }
    if (best) return best;
    const [wx, wy] = toWorld(x, y);
    const d = Math.hypot(wx, wy);
    return d > 216 && d < 266 ? 'belt' : null;
  }

  function nextFact(key, facts) {
    const i = factIndex.get(key) || 0;
    factIndex.set(key, i + 1);
    return facts[i % facts.length];
  }

  function showCard(name, fact) {
    cardName.innerHTML = '';
    for (const ch of name.toUpperCase()) {
      const s = U.el('span', ch === ' ' ? 'gap' : 'nc-letter', cardName);
      s.textContent = ch;
      if (/[A-Z]/.test(ch)) {
        U.onTap(s, () => {
          Speech.letter(ch);
          Sound.pop();
          s.classList.remove('boing');
          void s.offsetWidth;
          s.classList.add('boing');
        });
      }
    }
    cardFact.textContent = fact;
    cardShown = true;
    card.classList.remove('hidden', 'show');
    void card.offsetWidth;
    card.classList.add('show');
  }

  function hideCard() {
    cardShown = false;
    card.classList.add('hidden');
  }

  function select(b, x, y) {
    FX.burst(x, y, 12, 160, 7);
    if (b === 'comet') {
      const fact = nextFact('comet', COMET_FACTS);
      showCard('Comet', fact);
      Speech.say('A comet! ' + fact);
      Sound.sparkle();
      return;
    }
    if (b === 'belt') {
      const fact = nextFact('belt', BELT_FACTS);
      showCard('Asteroids', fact);
      Speech.say(fact);
      Sound.twinkle();
      return;
    }
    const fact = nextFact(b.key, b.facts);
    selected = b;
    const target = b.parent || b;
    if (follow !== target && !(flight && flight.to === target)) flyTo(target);
    showCard(b.name, fact);
    Speech.say(`${b.say || b.name}! ${fact}`);
    Sound.chime(BODIES.indexOf(b));
  }

  function pinchInfo() {
    const [a, b] = [...pointers.values()];
    return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  function applyPinch(a, b) {
    if (flight) {
      follow = flight.to;
      flight = null;
    }
    const factor = b.dist / Math.max(1, a.dist);
    if (follow) {
      cam.z = U.clamp(cam.z * factor, minZoom(), maxZoom);
      return;
    }
    const [wx, wy] = toWorld(a.mx, a.my);
    cam.z = U.clamp(cam.z * factor, minZoom(), maxZoom);
    const [nx, ny] = toWorld(b.mx, b.my);
    cam.x += wx - nx;
    cam.y += wy - ny;
    clampCam();
  }

  function onDown(e) {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    else {
      tapStart = null;
      pinchPrev = pinchInfo();
    }
  }

  function onMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const ox = p.x;
    const oy = p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size >= 2) {
      const now = pinchInfo();
      if (pinchPrev) applyPinch(pinchPrev, now);
      pinchPrev = now;
      return;
    }
    if (tapStart && Math.hypot(p.x - tapStart.x, p.y - tapStart.y) < 12) return;
    tapStart = null;
    // One finger drags the view around.
    follow = null;
    flight = null;
    const [ax, ay] = toWorld(ox, oy);
    const [bx, by] = toWorld(p.x, p.y);
    cam.x += ax - bx;
    cam.y += ay - by;
    clampCam();
  }

  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchPrev = null;
    if (e.type === 'pointerup' && tapStart && tapStart.id === e.pointerId && performance.now() - tapStart.t < 700) {
      const b = hit(e.clientX, e.clientY);
      if (b) select(b, e.clientX, e.clientY);
      else {
        FX.burst(e.clientX, e.clientY, 8, 120, 6);
        Sound.twinkle();
      }
    }
    tapStart = null;
  }

  function onWheel(e) {
    e.preventDefault();
    const f = Math.exp(-e.deltaY * 0.0015);
    applyPinch({ mx: e.clientX, my: e.clientY, dist: 100 }, { mx: e.clientX, my: e.clientY, dist: 100 * f });
  }

  // ---------- screen ----------

  function enter(r) {
    root = r;
    font = getComputedStyle(document.body).fontFamily;
    canvas = U.el('canvas', 'explore-canvas', root);
    ctx = canvas.getContext('2d');
    const chrome = UI.chrome(root, 'Solar system');
    zoomBtn = UI.button(chrome.right, 'orbits', 'See all the planets', 'hidden');
    U.onTap(zoomBtn, () => {
      selected = null;
      hideCard();
      flyTo(null);
      Speech.say('The solar system!');
    });
    card = U.el('div', 'namecard hidden', root);
    cardName = U.el('div', 'nc-name', card);
    cardFact = U.el('div', 'nc-fact', card);

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    follow = null;
    flight = null;
    selected = null;
    zoomShown = null;
    cardShown = false;
    lift = 0;
    pointers.clear();
    cam.x = 0;
    cam.y = 0;
    cam.z = fitZoom = 1;
    resize();
    cam.z = fitZoom;
    BODIES.forEach((b) => (b.sx = null));
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function exit() {
    cancelAnimationFrame(raf);
    raf = 0;
    canvas = null;
    pointers.clear();
  }

  return { enter, exit, resize };
})();
