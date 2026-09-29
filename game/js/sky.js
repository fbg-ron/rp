'use strict';

// The calm night sky behind every screen: soft nebula clouds, twinkling stars and
// now and then a shooting star.
const Sky = (() => {
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let base = null;
  let stars = [];
  let shooting = null;
  let nextShoot = 6;
  let last = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    base = document.createElement('canvas');
    base.width = canvas.width;
    base.height = canvas.height;
    const b = base.getContext('2d');
    b.scale(dpr, dpr);
    const g = b.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#090e2a');
    g.addColorStop(0.55, '#131944');
    g.addColorStop(1, '#221a4c');
    b.fillStyle = g;
    b.fillRect(0, 0, w, h);

    const R = U.rng(7);
    const big = Math.max(w, h);
    [262, 200, 318, 232, 186].forEach((hue) => {
      const x = R() * w;
      const y = R() * h;
      const r = (0.25 + R() * 0.35) * big;
      const n = b.createRadialGradient(x, y, 0, x, y, r);
      n.addColorStop(0, `hsla(${hue},70%,55%,0.11)`);
      n.addColorStop(1, `hsla(${hue},70%,55%,0)`);
      b.fillStyle = n;
      b.fillRect(0, 0, w, h);
    });

    const faint = Math.round((w * h) / 2600);
    for (let i = 0; i < faint; i++) {
      b.fillStyle = `rgba(255,255,255,${0.12 + R() * 0.35})`;
      b.beginPath();
      b.arc(R() * w, R() * h, R() < 0.9 ? 0.6 : 1.1, 0, Math.PI * 2);
      b.fill();
    }

    stars = [];
    const bright = Math.round((w * h) / 9000);
    for (let i = 0; i < bright; i++) {
      const tint = R();
      stars.push({
        x: R() * w,
        y: R() * h,
        r: 0.7 + R() * 1.5,
        phase: R() * Math.PI * 2,
        speed: 0.3 + R() * 1.1,
        color: tint < 0.15 ? '255,236,190' : tint < 0.35 ? '200,220,255' : '255,255,255',
      });
    }
  }

  function frame(t) {
    requestAnimationFrame(frame);
    if (t - last < 33) return; // 30 frames a second is plenty for twinkling
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const time = t / 1000;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const s of stars) {
      const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
      ctx.fillStyle = `rgba(${s.color},${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.r > 1.7) {
        ctx.strokeStyle = `rgba(${s.color},${a * 0.35})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(s.x - s.r * 3, s.y);
        ctx.lineTo(s.x + s.r * 3, s.y);
        ctx.moveTo(s.x, s.y - s.r * 3);
        ctx.lineTo(s.x, s.y + s.r * 3);
        ctx.stroke();
      }
    }

    nextShoot -= dt;
    if (!shooting && nextShoot <= 0) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      shooting = { x: U.rand(0.2, 0.8) * w, y: U.rand(0, 0.35) * h, vx: dir * U.rand(380, 520), vy: U.rand(160, 260), life: 0.9, age: 0 };
      nextShoot = U.rand(9, 20);
    }
    if (shooting) {
      const s = shooting;
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const k = Math.sin(Math.PI * Math.min(1, s.age / s.life));
      const tail = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.25, s.y - s.vy * 0.25);
      tail.addColorStop(0, `rgba(255,255,255,${0.85 * k})`);
      tail.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = tail;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.25, s.y - s.vy * 0.25);
      ctx.stroke();
      if (s.age >= s.life) shooting = null;
    }
  }

  return {
    resize,
    start() {
      resize();
      requestAnimationFrame(frame);
    },
  };
})();
