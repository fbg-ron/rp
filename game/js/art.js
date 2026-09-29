'use strict';

// Planets, moons and space things, all painted in code (there are no image files).
// Each body is painted once per size into a small canvas "sprite" that is reused.
const Art = (() => {
  const TAU = Math.PI * 2;

  // How each body looks. Colors are loosely based on real photos.
  const LOOKS = {
    sun: { sun: true, seed: 1 },
    mercury: { base: ['#bdb6ae', '#7e7770'], craters: 22, craterDark: 'rgba(60,55,50,0.32)', seed: 2 },
    venus: { base: ['#f7e3ad', '#d3a55c'], swirls: ['rgba(255,247,222,0.5)', 'rgba(190,135,70,0.35)'], atmo: [255, 230, 170, 0.5], seed: 3 },
    earth: { earth: true, atmo: [120, 190, 255, 0.65], seed: 4 },
    moon: { base: ['#e2e2e2', '#a2a2a2'], maria: 6, craters: 16, craterDark: 'rgba(80,80,80,0.28)', seed: 5 },
    mars: { base: ['#e8804f', '#a9451f'], patches: 'rgba(110,35,15,0.35)', caps: 'rgba(255,255,255,0.9)', seed: 6 },
    jupiter: { bands: ['#f3e5ca', '#cf9a63', '#ecd6ad', '#b97b4a', '#f4e8d0', '#d7ab79', '#efdcb8', '#bb8657', '#f3e5ca', '#d2a06e'], spot: true, seed: 7 },
    saturn: { bands: ['#f6e9c4', '#e5cc92', '#f2e2b6', '#dcc083', '#f1e4c0', '#dfc58c', '#f4e6c2'], rings: 'saturn', tilt: -0.2, seed: 8 },
    uranus: { base: ['#d2f6f8', '#72c6d0'], faintBands: 'rgba(255,255,255,0.09)', rings: 'uranus', atmo: [170, 240, 255, 0.45], seed: 9 },
    neptune: { base: ['#6a8ff5', '#2a42ad'], faintBands: 'rgba(255,255,255,0.07)', darkSpot: true, atmo: [120, 160, 255, 0.5], seed: 10 },
    pluto: { base: ['#e6caa8', '#a8805f'], patches: 'rgba(120,70,45,0.3)', heart: true, seed: 11 },
    planet: { bands: ['#ead2ff', '#b58ae8', '#dcbcff', '#9d70d8', '#efd9ff', '#c29cf0'], rings: 'purple', tilt: 0.18, seed: 12 },
    phobos: { base: ['#a39180', '#65574a'], craters: 9, craterDark: 'rgba(40,30,25,0.35)', seed: 13 },
    deimos: { base: ['#bcad99', '#7d6d5b'], craters: 6, craterDark: 'rgba(50,40,30,0.3)', seed: 14 },
    io: { base: ['#f6e889', '#d4ad3c'], dots: ['rgba(160,70,20,0.55)', 'rgba(255,250,210,0.6)', 'rgba(200,110,30,0.5)'], seed: 15 },
    europa: { base: ['#f6f0e6', '#c9baa6'], lines: 'rgba(150,95,60,0.5)', seed: 16 },
    ganymede: { base: ['#b8ab9c', '#776b60'], patches: 'rgba(235,225,210,0.35)', craters: 8, craterDark: 'rgba(60,50,40,0.25)', seed: 17 },
    callisto: { base: ['#85786d', '#4c423a'], brightDots: 30, seed: 18 },
    titan: { base: ['#f3c56a', '#c3842a'], faintBands: 'rgba(255,240,200,0.1)', atmo: [255, 200, 120, 0.5], seed: 19 },
    enceladus: { base: ['#ffffff', '#d3e0ec'], stripes: 'rgba(120,170,220,0.5)', seed: 20 },
    titania: { base: ['#bdb3aa', '#857a71'], craters: 10, craterDark: 'rgba(50,45,40,0.28)', seed: 21 },
    miranda: { base: ['#cfc8c1', '#948c84'], patches: 'rgba(90,80,70,0.25)', seed: 22 },
    triton: { base: ['#f2ddd6', '#b89c93'], pinkCap: true, seed: 23 },
    charon: { base: ['#bfb8b1', '#88807a'], redCap: true, craters: 6, craterDark: 'rgba(50,45,40,0.25)', seed: 24 },
  };

  // Ring bands: [inner, outer, color], in planet radii. k squashes the circle into a tilted ellipse.
  const RINGS = {
    saturn: { k: 0.3, rot: 0, extent: 2.4, bands: [[1.22, 1.5, 'rgba(190,170,130,0.35)'], [1.5, 1.94, 'rgba(236,218,172,0.92)'], [2.0, 2.28, 'rgba(214,194,150,0.78)']] },
    uranus: { k: 0.22, rot: 1.35, extent: 1.8, bands: [[1.55, 1.62, 'rgba(200,240,255,0.45)'], [1.68, 1.72, 'rgba(200,240,255,0.3)']] },
    purple: { k: 0.3, rot: 0, extent: 2.3, bands: [[1.3, 1.7, 'rgba(230,200,255,0.55)'], [1.78, 2.18, 'rgba(200,160,250,0.75)']] },
  };

  // ---------- small drawing helpers ----------

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, TAU);
    ctx.fill();
  }

  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU);
    ctx.fill();
  }

  function withBlur(ctx, px, fn) {
    const canBlur = 'filter' in ctx && px > 0.6;
    if (canBlur) ctx.filter = `blur(${px.toFixed(1)}px)`;
    fn();
    if (canBlur) ctx.filter = 'none';
  }

  function spots(ctx, r, R, n, color, min, max) {
    for (let i = 0; i < n; i++) {
      const a = R() * TAU;
      const d = Math.sqrt(R()) * r * 0.9;
      ctx.fillStyle = Array.isArray(color) ? color[Math.floor(R() * color.length)] : color;
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (min + R() * (max - min)), r * (min + R() * (max - min)) * 0.8, R() * TAU);
    }
  }

  function wavyBands(ctx, r, colors, R, wobble) {
    const n = colors.length;
    const h = (2 * r) / n;
    for (let i = 0; i < n; i++) {
      const y0 = -r + i * h - h * 0.2;
      const y1 = y0 + h * 1.4;
      const ph = R() * TAU;
      const amp = r * wobble * (0.3 + R() * 0.7);
      const fr = 2 + R() * 4;
      ctx.beginPath();
      for (let x = -1.4; x <= 1.41; x += 0.1) ctx.lineTo(x * r, y0 + Math.sin(x * fr + ph) * amp);
      for (let x = 1.4; x >= -1.41; x -= 0.1) ctx.lineTo(x * r, y1 + Math.sin(x * fr + ph + 1.3) * amp);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
    }
  }

  // ---------- bodies ----------

  function paintSun(ctx, r) {
    const R = U.rng(11);
    const glow = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.9);
    glow.addColorStop(0, 'rgba(255,200,90,0.55)');
    glow.addColorStop(0.35, 'rgba(255,160,60,0.18)');
    glow.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = glow;
    circle(ctx, 0, 0, r * 1.9);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    const g = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.45, '#ffe066');
    g.addColorStop(0.8, '#ffae34');
    g.addColorStop(1, '#f07c1e');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    withBlur(ctx, r * 0.05, () => {
      for (let i = 0; i < 26; i++) {
        const a = R() * TAU;
        const d = Math.sqrt(R()) * r * 0.9;
        ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,220,0.35)' : 'rgba(240,120,20,0.25)';
        circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.06 + R() * 0.1));
      }
    });
    ctx.restore();
  }

  function paintEarth(ctx, r, R) {
    const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#4aa3f0');
    g.addColorStop(1, '#1b58b0');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);

    const LAND = [[-0.38, -0.18, 0.44], [0.32, 0.28, 0.38], [0.5, -0.46, 0.22], [-0.22, 0.6, 0.2]];
    withBlur(ctx, r * 0.006, () => {
      for (const [cx, cy, s] of LAND) {
        ctx.fillStyle = R() < 0.5 ? '#4caf50' : '#5cb85c';
        for (let i = 0; i < 9; i++) {
          const a = R() * TAU;
          const d = R() * s * 0.6 * r;
          circle(ctx, cx * r + Math.cos(a) * d, cy * r + Math.sin(a) * d, s * r * (0.3 + R() * 0.35));
        }
        ctx.fillStyle = 'rgba(170,140,80,0.5)';
        for (let i = 0; i < 3; i++) {
          const a = R() * TAU;
          const d = R() * s * 0.4 * r;
          circle(ctx, cx * r + Math.cos(a) * d, cy * r + Math.sin(a) * d, s * r * 0.18 * (0.5 + R()));
        }
      }
    });
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    withBlur(ctx, r * 0.015, () => {
      ellipse(ctx, 0, -r * 0.96, r * 0.5, r * 0.16);
      ellipse(ctx, 0, r * 0.97, r * 0.4, r * 0.12);
    });
    withBlur(ctx, r * 0.012, () => {
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        ctx.lineWidth = r * (0.04 + R() * 0.06);
        const y = (R() * 1.6 - 0.8) * r;
        const x0 = (R() * 1.6 - 1.2) * r;
        const len = (0.4 + R() * 0.7) * r;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.bezierCurveTo(x0 + len * 0.3, y - r * 0.1, x0 + len * 0.7, y + r * 0.1, x0 + len, y);
        ctx.stroke();
      }
    });
  }

  function heart(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.95, -s * 0.2, -s * 0.4, -s * 0.95, 0, -s * 0.4);
    ctx.bezierCurveTo(s * 0.4, -s * 0.95, s * 0.95, -s * 0.2, 0, s * 0.35);
    ctx.fill();
  }

  // The body's surface, without day/night shading (that is added separately).
  function paintBody(ctx, key, r) {
    const L = LOOKS[key];
    const R = U.rng(L.seed * 7919);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    if (L.tilt) ctx.rotate(L.tilt);

    if (L.earth) paintEarth(ctx, r, R);
    if (L.base) {
      const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
      g.addColorStop(0, L.base[0]);
      g.addColorStop(1, L.base[1]);
      ctx.fillStyle = g;
      ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
    }
    if (L.bands) {
      ctx.fillStyle = L.bands[0];
      ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
      withBlur(ctx, r * 0.035, () => wavyBands(ctx, r, L.bands, R, 0.06));
    }
    if (L.swirls) {
      withBlur(ctx, r * 0.07, () => wavyBands(ctx, r, [L.swirls[0], 'rgba(0,0,0,0)', L.swirls[1], 'rgba(0,0,0,0)', L.swirls[0], L.swirls[1]], R, 0.15));
    }
    if (L.faintBands) {
      withBlur(ctx, r * 0.05, () => {
        ctx.fillStyle = L.faintBands;
        for (let i = 0; i < 5; i++) ctx.fillRect(-r * 1.5, -r + (i * 2 + 0.5) * r * 0.2, r * 3, r * (0.08 + R() * 0.1));
      });
    }
    if (L.patches) withBlur(ctx, r * 0.06, () => spots(ctx, r, R, 7, L.patches, 0.12, 0.3));
    if (L.maria) withBlur(ctx, r * 0.05, () => spots(ctx, r, R, L.maria, 'rgba(95,95,100,0.35)', 0.14, 0.32));
    if (L.dots) withBlur(ctx, r * 0.015, () => spots(ctx, r, R, 18, L.dots, 0.03, 0.09));
    if (L.brightDots) spots(ctx, r, R, L.brightDots, 'rgba(240,235,225,0.7)', 0.015, 0.05);
    if (L.craters) {
      for (let i = 0; i < L.craters; i++) {
        const a = R() * TAU;
        const d = Math.sqrt(R()) * r * 0.85;
        const cr = r * (0.04 + R() * 0.11);
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        ctx.fillStyle = L.craterDark;
        circle(ctx, x, y, cr);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = Math.max(0.5, cr * 0.25);
        ctx.beginPath();
        ctx.arc(x, y, cr, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
    }
    if (L.lines) {
      ctx.strokeStyle = L.lines;
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        ctx.lineWidth = r * (0.015 + R() * 0.02);
        const a = R() * TAU;
        const b = a + Math.PI * (0.5 + R());
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.quadraticCurveTo((R() - 0.5) * r, (R() - 0.5) * r, Math.cos(b) * r, Math.sin(b) * r);
        ctx.stroke();
      }
    }
    if (L.stripes) {
      ctx.strokeStyle = L.stripes;
      ctx.lineCap = 'round';
      ctx.lineWidth = r * 0.04;
      for (let i = 0; i < 4; i++) {
        const y = r * (0.3 + i * 0.13);
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, y);
        ctx.quadraticCurveTo(0, y - r * 0.12, r * 0.5, y + r * 0.05);
        ctx.stroke();
      }
    }
    if (L.caps) {
      ctx.fillStyle = L.caps;
      withBlur(ctx, r * 0.04, () => {
        ellipse(ctx, 0, -r * 0.94, r * 0.42, r * 0.16);
        ellipse(ctx, 0, r * 0.96, r * 0.3, r * 0.1);
      });
    }
    if (L.pinkCap) {
      ctx.fillStyle = 'rgba(255,214,214,0.7)';
      withBlur(ctx, r * 0.05, () => ellipse(ctx, 0, r * 0.72, r * 0.85, r * 0.38));
    }
    if (L.redCap) {
      ctx.fillStyle = 'rgba(110,55,40,0.55)';
      withBlur(ctx, r * 0.06, () => ellipse(ctx, 0, -r * 0.86, r * 0.55, r * 0.28));
    }
    if (L.spot) {
      withBlur(ctx, r * 0.015, () => {
        ctx.fillStyle = 'rgba(196,86,52,0.95)';
        ellipse(ctx, r * 0.28, r * 0.3, r * 0.26, r * 0.14);
        ctx.fillStyle = 'rgba(226,130,90,0.8)';
        ellipse(ctx, r * 0.28, r * 0.3, r * 0.17, r * 0.08);
      });
    }
    if (L.darkSpot) {
      withBlur(ctx, r * 0.02, () => {
        ctx.fillStyle = 'rgba(20,35,110,0.7)';
        ellipse(ctx, -r * 0.25, -r * 0.12, r * 0.22, r * 0.12);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ellipse(ctx, -r * 0.2, -r * 0.28, r * 0.2, r * 0.035, 0.1);
      });
    }
    if (L.heart) {
      ctx.fillStyle = 'rgba(250,238,222,0.95)';
      ctx.save();
      ctx.translate(r * 0.18, r * 0.14);
      ctx.rotate(0.35);
      withBlur(ctx, r * 0.02, () => heart(ctx, r * 0.55));
      ctx.restore();
    }

    // Limb darkening: the edge of a ball looks a little darker than the middle.
    const limb = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = limb;
    ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
    ctx.restore();
  }

  function paintAtmo(ctx, key, r) {
    const c = LOOKS[key].atmo;
    if (!c) return;
    const g = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.16);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    g.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`);
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = g;
    circle(ctx, 0, 0, r * 1.16);
  }

  // half: 'back' (behind the planet), 'front' (in front of it) or 'all'.
  function paintRings(ctx, key, r, half) {
    const L = LOOKS[key];
    const S = RINGS[L.rings];
    ctx.save();
    ctx.rotate((L.tilt || 0) + S.rot);
    if (half !== 'all') {
      ctx.beginPath();
      if (half === 'back') ctx.rect(-r * 3, -r * 3, r * 6, r * 3);
      else ctx.rect(-r * 3, 0, r * 6, r * 3);
      ctx.clip();
    }
    for (const [a, b, color] of S.bands) {
      ctx.beginPath();
      ctx.ellipse(0, 0, b * r, b * r * S.k, 0, 0, TAU);
      ctx.moveTo(a * r, 0);
      ctx.ellipse(0, 0, a * r, a * r * S.k, 0, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill('evenodd');
    }
    ctx.restore();
  }

  // Day and night: (lx, ly) points toward the light. The far side fades into shadow.
  function shade(ctx, r, lx, ly, strength) {
    const g = ctx.createRadialGradient(lx * r * 0.5, ly * r * 0.5, 0, lx * r * 0.25, ly * r * 0.25, r * 1.3);
    g.addColorStop(0, 'rgba(255,255,255,0.16)');
    g.addColorStop(0.35, 'rgba(255,255,255,0)');
    g.addColorStop(0.62, 'rgba(0,0,10,0)');
    g.addColorStop(1, `rgba(2,4,18,${strength})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.005, 0, TAU);
    ctx.fill();
  }

  // ---------- other space things ----------

  function paintStar(ctx, r) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,214,90,0.9)';
    ctx.shadowBlur = r * 0.2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const d = i % 2 === 0 ? r * 0.72 : r * 0.33;
      ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d + r * 0.06);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.05, 0, 0, r * 0.8);
    g.addColorStop(0, '#fffbd6');
    g.addColorStop(0.5, '#ffd84a');
    g.addColorStop(1, '#f5a524');
    ctx.fillStyle = g;
    ctx.lineJoin = 'round';
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = '#ffd24a';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function paintUfo(ctx, r) {
    const dome = ctx.createLinearGradient(0, -r * 0.5, 0, 0);
    dome.addColorStop(0, 'rgba(190,240,255,0.95)');
    dome.addColorStop(1, 'rgba(90,170,230,0.9)');
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.05, r * 0.36, r * 0.42, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = dome;
    ctx.fill();
    // A friendly little alien waves from inside.
    ctx.fillStyle = '#7ddc6a';
    circle(ctx, 0, -r * 0.2, r * 0.15);
    ctx.strokeStyle = '#7ddc6a';
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.34);
    ctx.lineTo(0, -r * 0.4);
    ctx.stroke();
    ctx.fillStyle = '#ffe066';
    circle(ctx, 0, -r * 0.42, r * 0.04);
    ctx.fillStyle = '#1b2a1b';
    circle(ctx, -r * 0.055, -r * 0.23, r * 0.03);
    circle(ctx, r * 0.055, -r * 0.23, r * 0.03);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ellipse(ctx, -r * 0.17, -r * 0.26, r * 0.05, r * 0.12, -0.5);

    const saucer = ctx.createLinearGradient(0, -r * 0.14, 0, r * 0.26);
    saucer.addColorStop(0, '#eef1f8');
    saucer.addColorStop(0.6, '#aab2c8');
    saucer.addColorStop(1, '#6d7690');
    ctx.fillStyle = saucer;
    ellipse(ctx, 0, r * 0.05, r * 0.92, r * 0.24);
    ctx.fillStyle = 'rgba(60,66,90,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.12, r * 0.5, r * 0.12, 0, 0, Math.PI);
    ctx.fill();
    const LIGHTS = ['#ff6b6b', '#ffd93d', '#6bff95', '#6bc5ff', '#d36bff'];
    ctx.save();
    ctx.shadowBlur = r * 0.08;
    LIGHTS.forEach((c, i) => {
      const x = (-0.6 + i * 0.3) * r;
      const y = r * 0.05 + Math.sqrt(Math.max(0, 1 - Math.pow(x / (r * 0.92), 2))) * r * 0.12;
      ctx.shadowColor = c;
      ctx.fillStyle = c;
      circle(ctx, x, y, r * 0.05);
    });
    ctx.restore();
  }

  function paintComet(ctx, r) {
    const hx = r * 0.42;
    const hy = -r * 0.42;
    const dust = ctx.createLinearGradient(hx, hy, -r * 0.8, r * 0.8);
    dust.addColorStop(0, 'rgba(255,250,235,0.9)');
    dust.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.beginPath();
    ctx.moveTo(hx, hy - r * 0.1);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.05, -r * 0.95, r * 0.5);
    ctx.quadraticCurveTo(-r * 0.85, r * 0.8, -r * 0.55, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.05, r * 0.2, hx + r * 0.1, hy);
    ctx.closePath();
    ctx.fillStyle = dust;
    ctx.fill();
    const ion = ctx.createLinearGradient(hx, hy, -r * 0.95, r * 0.6);
    ion.addColorStop(0, 'rgba(140,210,255,0.9)');
    ion.addColorStop(1, 'rgba(140,210,255,0)');
    ctx.strokeStyle = ion;
    ctx.lineWidth = r * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(-r * 0.95, r * 0.62);
    ctx.stroke();
    const head = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.3);
    head.addColorStop(0, 'rgba(255,255,255,1)');
    head.addColorStop(0.3, 'rgba(210,240,255,0.9)');
    head.addColorStop(1, 'rgba(150,210,255,0)');
    ctx.fillStyle = head;
    circle(ctx, hx, hy, r * 0.3);
  }

  function paintRocket(ctx, r) {
    ctx.save();
    ctx.rotate(0.35);
    const flame = ctx.createLinearGradient(0, r * 0.45, 0, r * 0.95);
    flame.addColorStop(0, 'rgba(255,240,150,1)');
    flame.addColorStop(0.5, 'rgba(255,150,40,0.9)');
    flame.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, r * 0.45);
    ctx.quadraticCurveTo(0, r * 1.15, r * 0.16, r * 0.45);
    ctx.closePath();
    ctx.fillStyle = flame;
    ctx.fill();

    ctx.fillStyle = '#ff5a5f';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.2, r * 0.05);
      ctx.lineTo(s * r * 0.46, r * 0.42);
      ctx.lineTo(s * r * 0.46, r * 0.56);
      ctx.lineTo(s * r * 0.2, r * 0.42);
      ctx.closePath();
      ctx.fill();
    });

    const body = ctx.createLinearGradient(-r * 0.24, 0, r * 0.24, 0);
    body.addColorStop(0, '#c9cfdc');
    body.addColorStop(0.45, '#ffffff');
    body.addColorStop(1, '#aab2c4');
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.88);
    ctx.bezierCurveTo(r * 0.3, -r * 0.6, r * 0.26, -r * 0.1, r * 0.22, r * 0.46);
    ctx.lineTo(-r * 0.22, r * 0.46);
    ctx.bezierCurveTo(-r * 0.26, -r * 0.1, -r * 0.3, -r * 0.6, 0, -r * 0.88);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ff5a5f';
    ctx.fillRect(-r, -r, 2 * r, r * 0.5);
    ctx.restore();

    ctx.fillStyle = '#3a4a6b';
    circle(ctx, 0, -r * 0.16, r * 0.14);
    ctx.fillStyle = '#6fd3ff';
    circle(ctx, 0, -r * 0.16, r * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    circle(ctx, -r * 0.035, -r * 0.2, r * 0.03);
    ctx.fillStyle = '#e04850';
    ctx.fillRect(-r * 0.03, r * 0.2, r * 0.06, r * 0.3);
    ctx.restore();
  }

  function paintGalaxy(ctx, r) {
    const R = U.rng(99);
    ctx.save();
    ctx.rotate(-0.45);
    ctx.scale(1, 0.62);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
    core.addColorStop(0, 'rgba(255,248,225,1)');
    core.addColorStop(0.3, 'rgba(255,220,170,0.6)');
    core.addColorStop(1, 'rgba(200,150,255,0)');
    ctx.fillStyle = core;
    circle(ctx, 0, 0, r * 0.5);
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 260; i++) {
        const t = i / 260;
        const a = t * 3.4 * Math.PI + arm * Math.PI + (R() - 0.5) * 0.5;
        const d = r * (0.1 + t * 0.82) + (R() - 0.5) * r * 0.1;
        ctx.fillStyle = `hsla(${40 + t * 200},90%,${85 - t * 20}%,${0.9 - t * 0.5})`;
        circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.008 + R() * 0.022) * (1.2 - t * 0.5));
      }
    }
    ctx.restore();
  }

  const THINGS = { star: paintStar, ufo: paintUfo, comet: paintComet, rocket: paintRocket, galaxy: paintGalaxy };

  // ---------- sprites ----------

  // How much bigger than the body's disc a sprite must be (for glow and rings).
  function extentOf(key, layer) {
    if (THINGS[key]) return 1;
    const L = LOOKS[key];
    if (L.sun) return 1.9;
    if (L.rings && layer !== 'body') return RINGS[L.rings].extent;
    return L.atmo ? 1.16 : 1.02;
  }

  const SIZES = [32, 64, 128, 256, 512];
  const cache = new Map();

  // layer: 'body' (no shading), 'back' / 'front' (ring halves) or 'full' (ready to show).
  // px is the wanted disc diameter in device pixels.
  function sprite(key, layer, px) {
    const E = extentOf(key, layer);
    // Ring sprites are big canvases, so they stop growing sooner (saves memory).
    const cap = E > 1.5 && key !== 'sun' ? 256 : 512;
    const d = Math.min(SIZES.find((s) => s >= px) || 512, cap);
    const id = key + ':' + layer + ':' + d;
    let c = cache.get(id);
    if (c) return c;
    if (cache.size > 120) cache.clear(); // keep memory small; sprites are cheap to repaint
    const side = Math.ceil(d * E);
    c = document.createElement('canvas');
    c.width = c.height = side;
    c.scale = side / d;
    const g = c.getContext('2d');
    g.translate(side / 2, side / 2);
    const r = d / 2;
    const L = LOOKS[key];
    if (THINGS[key]) THINGS[key](g, r);
    else if (L.sun) paintSun(g, r);
    else if (layer === 'body') {
      paintBody(g, key, r);
      paintAtmo(g, key, r);
    } else if (layer === 'back' || layer === 'front') paintRings(g, key, r, layer);
    else {
      if (L.rings) paintRings(g, key, r, 'back');
      paintBody(g, key, r);
      shade(g, r, -0.62, -0.78, 0.7);
      paintAtmo(g, key, r);
      if (L.rings) paintRings(g, key, r, 'front');
    }
    cache.set(id, c);
    return c;
  }

  const urls = new Map();
  function url(key, cssPx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = sprite(key, 'full', cssPx * dpr);
    const id = key + ':' + s.width;
    let u = urls.get(id);
    if (!u) {
      u = s.toDataURL();
      urls.set(id, u);
    }
    return u;
  }

  // A DOM element showing a body. Size it with CSS (width/height of the wrapper);
  // rings and glow spill outside the wrapper, just like the real thing.
  function node(key, cssPx, cls) {
    const wrap = U.el('div', 'body' + (cls ? ' ' + cls : ''));
    const img = U.el('img', '', wrap);
    img.alt = '';
    img.draggable = false;
    img.src = url(key, cssPx);
    img.style.width = extentOf(key, 'full') * 100 + '%';
    return wrap;
  }

  const hasRings = (key) => !!(LOOKS[key] && LOOKS[key].rings);

  return { sprite, shade, url, node, hasRings };
})();
