'use strict';

// Sparkles drawn on a see-through layer above everything (it never blocks touches).
const FX = (() => {
  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  const COLORS = ['#fff7ae', '#ffd166', '#9be7ff', '#c3a6ff', '#ffb3d9', '#b5ffcb'];
  let w = 0;
  let h = 0;
  let dpr = 1;
  let parts = [];
  let running = false;
  let last = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function sparkle(p, k) {
    const s = p.size * (0.5 + 0.5 * k);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0);
    ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
    ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0);
    ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
    ctx.fill();
    ctx.restore();
  }

  function tick(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const drag = Math.pow(0.2, dt);
    for (const p of parts) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy *= drag;
      p.rot += p.spin * dt;
      sparkle(p, 1 - p.age / p.life);
    }
    parts = parts.filter((p) => p.age < p.life);
    if (parts.length) requestAnimationFrame(tick);
    else {
      running = false;
      ctx.clearRect(0, 0, w, h);
    }
  }

  function run() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  function add(x, y, speed, size, life) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: size * (0.5 + Math.random() * 0.8),
      life: life * (0.7 + Math.random() * 0.5), age: 0, rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 4,
      color: U.pick(COLORS),
    });
  }

  return {
    resize,
    burst(x, y, n = 16, speed = 220, size = 8) {
      for (let i = 0; i < n; i++) add(x, y, speed, size, 1.1);
      run();
    },
    trail(x, y) {
      add(x, y, 40, 5, 0.7);
      run();
    },
    // A big, slow shower of sparkles for finishing something.
    celebrate(x, y) {
      for (let i = 0; i < 36; i++) add(x, y, 420, 11, 1.6);
      for (let i = 0; i < 14; i++) add(U.rand(0, w), U.rand(0, h), 30, 7, 1.8);
      run();
    },
  };
})();
