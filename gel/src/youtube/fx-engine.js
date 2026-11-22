/* Gel's animated backgrounds for YouTube: one canvas, many effects.
   Runs in Gel's preview and, unchanged, inside the Gel for YouTube browser extension.
   Plain JavaScript with no dependencies. Pauses when the tab is hidden and draws a
   single still frame when the computer asks for reduced motion. */
(function (root) {
  'use strict';

  var EFFECTS = [
    { id: 'aurora', name: 'Aurora' },
    { id: 'petals', name: 'Falling petals' },
    { id: 'snow', name: 'Snow' },
    { id: 'pixels', name: 'Pixel rain' },
    { id: 'storm', name: 'Neon storm' },
    { id: 'ocean', name: 'Deep ocean' },
    { id: 'leaves', name: 'Autumn leaves' },
    { id: 'stars', name: 'Starry night' },
    { id: 'fireflies', name: 'Fireflies' },
    { id: 'embers', name: 'Rising embers' },
    { id: 'hearts', name: 'Floating hearts' },
    { id: 'galaxy', name: 'Galaxy' },
    { id: 'synthwave', name: 'Synthwave grid' },
    { id: 'code', name: 'Digital rain' },
    { id: 'bokeh', name: 'Bokeh lights' },
    { id: 'lava', name: 'Lava lamp' },
    { id: 'confetti', name: 'Confetti' },
    { id: 'sparkles', name: 'Sparkles' },
    { id: 'bubbles', name: 'Bubbles' },
  ];

  // Particles per 1280x800 at amount 1
  var BASE = { petals: 34, snow: 120, pixels: 70, storm: 140, ocean: 26, leaves: 22, stars: 150, fireflies: 34, embers: 60, hearts: 20, galaxy: 140, code: 46, bokeh: 22, lava: 7, confetti: 70, sparkles: 34, bubbles: 30, aurora: 4, synthwave: 60 };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function hexToRgb(h) {
    h = String(h || '#ffffff').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(c, a) { var r = hexToRgb(c); return 'rgba(' + r[0] + ',' + r[1] + ',' + r[2] + ',' + a + ')'; }

  // Soft round glow, drawn once per colour and reused.
  var glowCache = {};
  function glowSprite(color) {
    if (glowCache[color]) return glowCache[color];
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, rgba(color, 1));
    grad.addColorStop(0.25, rgba(color, 0.6));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glowCache[color] = c;
    return c;
  }

  function heartPath(g, s) {
    g.beginPath();
    g.moveTo(0, s * 0.35);
    g.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.95, 0, -s * 0.45);
    g.bezierCurveTo(s * 0.45, -s * 0.95, s * 0.9, -s * 0.25, 0, s * 0.35);
    g.closePath();
  }
  function starPath(g, s) {
    g.beginPath();
    for (var i = 0; i < 8; i++) {
      var r = i % 2 === 0 ? s : s * 0.18;
      var a = (Math.PI / 4) * i;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  }

  // ---------- Effects ----------
  // Each effect: setup(e) makes particles; step(e, p, dt) moves one; draw(e, g) paints everything.
  var FX = {};

  function falling(e, opts) {
    return {
      x: rand(-0.1, 1.1) * e.W, y: rand(-0.1, 1) * e.H, vx: rand(opts.vx[0], opts.vx[1]), vy: rand(opts.vy[0], opts.vy[1]),
      s: rand(opts.s[0], opts.s[1]), r: rand(0, 6.28), vr: rand(-opts.spin, opts.spin), ph: rand(0, 6.28), c: pick(e.colors), a: rand(opts.a[0], opts.a[1]), z: Math.random(),
    };
  }
  function wrapFall(e, p, margin) {
    if (p.y > e.H + margin) { p.y = -margin; p.x = rand(-0.1, 1.1) * e.W; }
    if (p.x > e.W + margin) p.x = -margin;
    if (p.x < -margin) p.x = e.W + margin;
  }
  function wrapRise(e, p, margin) {
    if (p.y < -margin) { p.y = e.H + margin; p.x = rand(0, 1) * e.W; }
  }

  FX.petals = {
    make: function (e) { return falling(e, { vx: [10, 40], vy: [25, 55], s: [7, 14], spin: 1.5, a: [0.55, 0.95] }); },
    step: function (e, p, dt) { p.ph += dt * 1.6; p.x += (p.vx + Math.sin(p.ph) * 30) * dt; p.y += p.vy * dt; p.r += p.vr * dt; wrapFall(e, p, 30); },
    draw: function (e, g, p) {
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.ph)));
      g.globalAlpha = p.a; g.fillStyle = p.c;
      g.beginPath(); g.moveTo(0, -p.s); g.quadraticCurveTo(p.s, -p.s * 0.2, 0, p.s); g.quadraticCurveTo(-p.s, -p.s * 0.2, 0, -p.s); g.fill();
      g.restore();
    },
  };

  FX.leaves = {
    make: function (e) { return falling(e, { vx: [-10, 30], vy: [30, 60], s: [10, 18], spin: 2, a: [0.6, 0.95] }); },
    step: function (e, p, dt) { p.ph += dt * 1.2; p.x += (p.vx + Math.sin(p.ph) * 45) * dt; p.y += p.vy * dt; p.r += p.vr * dt; wrapFall(e, p, 40); },
    draw: function (e, g, p) {
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(Math.cos(p.ph * 0.7), 1);
      g.globalAlpha = p.a; g.fillStyle = p.c;
      g.beginPath(); g.moveTo(0, -p.s); g.quadraticCurveTo(p.s * 0.9, 0, 0, p.s); g.quadraticCurveTo(-p.s * 0.9, 0, 0, -p.s); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -p.s); g.lineTo(0, p.s); g.stroke();
      g.restore();
    },
  };

  FX.snow = {
    make: function (e) { var p = falling(e, { vx: [-8, 8], vy: [15, 45], s: [1, 3.4], spin: 0, a: [0.4, 0.95] }); p.vy *= 0.5 + p.z; p.s *= 0.6 + p.z; return p; },
    step: function (e, p, dt) { p.ph += dt; p.x += (p.vx + Math.sin(p.ph) * 12) * dt; p.y += p.vy * dt; wrapFall(e, p, 10); },
    draw: function (e, g, p) { g.globalAlpha = p.a; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 6.283); g.fill(); },
  };

  FX.pixels = {
    make: function (e) { var p = falling(e, { vx: [0, 0], vy: [40, 110], s: [3, 7], spin: 0, a: [0.5, 1] }); p.s = Math.round(p.s); return p; },
    step: function (e, p, dt) { p.y += p.vy * dt; wrapFall(e, p, 10); },
    draw: function (e, g, p) { g.globalAlpha = p.a; g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); g.globalAlpha = p.a * 0.35; g.fillRect(Math.round(p.x), Math.round(p.y) - p.s * 2, p.s, p.s); },
  };

  FX.storm = {
    setup: function (e) { e.flash = 0; e.nextBolt = rand(3, 8); e.bolt = null; },
    make: function (e) { var p = falling(e, { vx: [-160, -120], vy: [650, 950], s: [14, 30], spin: 0, a: [0.25, 0.6] }); return p; },
    step: function (e, p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; wrapFall(e, p, 40); },
    before: function (e, g, dt) {
      e.nextBolt -= dt;
      if (e.nextBolt <= 0) {
        e.nextBolt = rand(4, 10); e.flash = 1;
        var x = rand(0.15, 0.85) * e.W, y = 0, pts = [[x, y]];
        while (y < e.H * rand(0.45, 0.75)) { x += rand(-40, 40); y += rand(20, 50); pts.push([x, y]); }
        e.bolt = pts;
      }
      if (e.flash > 0) {
        g.globalAlpha = e.flash * 0.18; g.fillStyle = e.colors[0]; g.fillRect(0, 0, e.W, e.H);
        if (e.bolt) {
          g.globalAlpha = Math.min(1, e.flash * 1.4); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.shadowColor = e.colors[0]; g.shadowBlur = 18;
          g.beginPath(); for (var i = 0; i < e.bolt.length; i++) g.lineTo(e.bolt[i][0], e.bolt[i][1]); g.stroke(); g.shadowBlur = 0;
        }
        e.flash -= dt * 2.2;
      }
    },
    draw: function (e, g, p) {
      g.globalAlpha = p.a; g.strokeStyle = p.c; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); g.stroke();
    },
  };

  FX.bubbles = {
    make: function (e) { var p = falling(e, { vx: [-6, 6], vy: [-60, -25], s: [4, 16], spin: 0, a: [0.35, 0.8] }); return p; },
    step: function (e, p, dt) { p.ph += dt * 1.5; p.x += (p.vx + Math.sin(p.ph) * 14) * dt; p.y += p.vy * dt; wrapRise(e, p, 30); },
    draw: function (e, g, p) {
      g.globalAlpha = p.a; g.strokeStyle = p.c; g.lineWidth = 1.4;
      g.beginPath(); g.arc(p.x, p.y, p.s, 0, 6.283); g.stroke();
      g.globalAlpha = p.a * 0.7; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x - p.s * 0.35, p.y - p.s * 0.35, p.s * 0.22, 0, 6.283); g.fill();
    },
  };

  FX.ocean = {
    setup: function (e) { e.rays = []; for (var i = 0; i < 6; i++) e.rays.push({ x: rand(0, 1), w: rand(0.05, 0.14), ph: rand(0, 6.28), sp: rand(0.15, 0.35) }); },
    before: function (e, g, dt) {
      for (var i = 0; i < e.rays.length; i++) {
        var r = e.rays[i]; r.ph += dt * r.sp;
        var x = (r.x + Math.sin(r.ph) * 0.05) * e.W, w = r.w * e.W;
        var grad = g.createLinearGradient(0, 0, 0, e.H);
        grad.addColorStop(0, rgba(e.colors[0], 0.16 + 0.08 * Math.sin(r.ph * 2)));
        grad.addColorStop(1, rgba(e.colors[0], 0));
        g.globalAlpha = 1; g.fillStyle = grad;
        g.beginPath(); g.moveTo(x - w * 0.3, 0); g.lineTo(x + w * 0.3, 0); g.lineTo(x + w * 1.4 + e.W * 0.08, e.H); g.lineTo(x - w * 0.6 + e.W * 0.08, e.H); g.closePath(); g.fill();
      }
    },
    make: function (e) { return FX.bubbles.make(e); },
    step: function (e, p, dt) { FX.bubbles.step(e, p, dt); },
    draw: function (e, g, p) { FX.bubbles.draw(e, g, p); },
  };

  FX.hearts = {
    make: function (e) { return falling(e, { vx: [-8, 8], vy: [-45, -20], s: [8, 16], spin: 0, a: [0.45, 0.9] }); },
    step: function (e, p, dt) { p.ph += dt * 1.4; p.x += (p.vx + Math.sin(p.ph) * 20) * dt; p.y += p.vy * dt; wrapRise(e, p, 30); },
    draw: function (e, g, p) { g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(p.ph) * 0.25); g.globalAlpha = p.a; g.fillStyle = p.c; heartPath(g, p.s); g.fill(); g.restore(); },
  };

  FX.sparkles = {
    make: function (e) { return { x: rand(0, e.W), y: rand(0, e.H), s: rand(4, 11), t: rand(0, 1), d: rand(1.4, 3.2), c: pick(e.colors) }; },
    step: function (e, p, dt) { p.t += dt / p.d; if (p.t > 1) { p.t = 0; p.x = rand(0, e.W); p.y = rand(0, e.H); } },
    draw: function (e, g, p) {
      var k = Math.sin(p.t * Math.PI);
      g.save(); g.translate(p.x, p.y); g.rotate(p.t * 1.6); g.scale(k, k); g.globalAlpha = k;
      g.drawImage(glowSprite(p.c), -p.s * 1.5, -p.s * 1.5, p.s * 3, p.s * 3);
      g.fillStyle = p.c; starPath(g, p.s); g.fill(); g.restore();
    },
  };

  function twinkleStar(e) { return { x: rand(0, e.W), y: rand(0, e.H), s: rand(0.5, 1.8), ph: rand(0, 6.28), sp: rand(0.6, 2.2), c: pick(e.colors) }; }
  function shootingStars(e, g, dt) {
    e.nextShot -= dt;
    if (e.nextShot <= 0) { e.nextShot = rand(5, 12); e.shot = { x: rand(0.1, 0.7) * e.W, y: rand(0, 0.3) * e.H, t: 0 }; }
    if (e.shot) {
      var s = e.shot; s.t += dt;
      var x = s.x + s.t * 520, y = s.y + s.t * 260, len = 120;
      var grad = g.createLinearGradient(x, y, x - len, y - len / 2);
      grad.addColorStop(0, rgba(e.colors[0], 0.9)); grad.addColorStop(1, rgba(e.colors[0], 0));
      g.globalAlpha = Math.max(0, 1 - s.t / 1.2); g.strokeStyle = grad; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - len, y - len / 2); g.stroke();
      if (s.t > 1.2) e.shot = null;
    }
  }
  FX.stars = {
    setup: function (e) { e.nextShot = rand(2, 6); e.shot = null; },
    before: shootingStars,
    make: twinkleStar,
    step: function (e, p, dt) { p.ph += dt * p.sp; },
    draw: function (e, g, p) { g.globalAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(p.ph)); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 6.283); g.fill(); },
  };

  FX.galaxy = {
    setup: function (e) {
      e.nextShot = rand(3, 8); e.shot = null; e.clouds = [];
      for (var i = 0; i < 5; i++) e.clouds.push({ x: rand(0.1, 0.9), y: rand(0.15, 0.85), r: rand(0.25, 0.45), ph: rand(0, 6.28), c: e.colors[i % e.colors.length] });
    },
    before: function (e, g, dt) {
      g.globalCompositeOperation = 'lighter';
      for (var i = 0; i < e.clouds.length; i++) {
        var c = e.clouds[i]; c.ph += dt * 0.05;
        var x = (c.x + Math.cos(c.ph) * 0.06) * e.W, y = (c.y + Math.sin(c.ph * 1.3) * 0.05) * e.H, r = c.r * Math.max(e.W, e.H);
        g.globalAlpha = 0.16; g.drawImage(glowSprite(c.c), x - r, y - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = 'source-over';
      shootingStars(e, g, dt);
    },
    make: twinkleStar,
    step: FX.stars.step,
    draw: FX.stars.draw,
  };

  FX.embers = {
    make: function (e) { var p = falling(e, { vx: [-10, 10], vy: [-70, -30], s: [1.5, 3.5], spin: 0, a: [0.5, 1] }); return p; },
    step: function (e, p, dt) { p.ph += dt * 3; p.x += (p.vx + Math.sin(p.ph * 0.5) * 18) * dt; p.y += p.vy * dt; wrapRise(e, p, 20); },
    draw: function (e, g, p) { var f = 0.6 + 0.4 * Math.sin(p.ph * 2.3); g.globalAlpha = p.a * f; g.drawImage(glowSprite(p.c), p.x - p.s * 4, p.y - p.s * 4, p.s * 8, p.s * 8); },
  };

  FX.fireflies = {
    make: function (e) { return { x: rand(0, e.W), y: rand(0.15, 1) * e.H, a: rand(0, 6.28), sp: rand(12, 30), s: rand(2, 4), ph: rand(0, 6.28), c: pick(e.colors) }; },
    step: function (e, p, dt) {
      p.a += rand(-1.2, 1.2) * dt; p.ph += dt * 1.4;
      p.x += Math.cos(p.a) * p.sp * dt; p.y += Math.sin(p.a) * p.sp * dt;
      if (p.x < -20) p.x = e.W + 20; if (p.x > e.W + 20) p.x = -20; if (p.y < -20) p.y = e.H + 20; if (p.y > e.H + 20) p.y = -20;
    },
    draw: function (e, g, p) { var k = Math.max(0, Math.sin(p.ph)); g.globalAlpha = 0.15 + 0.85 * k; g.drawImage(glowSprite(p.c), p.x - p.s * 5, p.y - p.s * 5, p.s * 10, p.s * 10); },
  };

  FX.bokeh = {
    make: function (e) { return { x: rand(0, e.W), y: rand(0, e.H), r: rand(25, 90), vx: rand(-8, 8), vy: rand(-10, -3), ph: rand(0, 6.28), c: pick(e.colors) }; },
    step: function (e, p, dt) { p.ph += dt * 0.5; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y < -p.r) { p.y = e.H + p.r; p.x = rand(0, e.W); } if (p.x < -p.r) p.x = e.W + p.r; if (p.x > e.W + p.r) p.x = -p.r; },
    draw: function (e, g, p) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 + 0.1 * Math.sin(p.ph); g.drawImage(glowSprite(p.c), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); g.globalCompositeOperation = 'source-over'; },
  };

  FX.lava = {
    make: function (e) { return { x: rand(0.1, 0.9) * e.W, y: rand(0, 1) * e.H, r: rand(0.12, 0.24) * Math.max(e.W, e.H), vy: rand(-18, 18) || 8, ph: rand(0, 6.28), c: pick(e.colors) }; },
    step: function (e, p, dt) {
      p.ph += dt * 0.35; p.y += p.vy * dt; p.x += Math.sin(p.ph) * 10 * dt;
      if (p.y < -p.r * 0.3 || p.y > e.H + p.r * 0.3) p.vy = -p.vy;
    },
    draw: function (e, g, p) { g.globalCompositeOperation = 'lighter'; var s = 1 + 0.12 * Math.sin(p.ph * 2); g.globalAlpha = 0.33; g.drawImage(glowSprite(p.c), p.x - p.r * s, p.y - p.r * s, p.r * 2 * s, p.r * 2 * s); g.globalCompositeOperation = 'source-over'; },
  };

  FX.confetti = {
    make: function (e) { var p = falling(e, { vx: [-30, 30], vy: [60, 130], s: [4, 8], spin: 4, a: [0.75, 1] }); return p; },
    step: function (e, p, dt) { p.ph += dt * 6; p.x += (p.vx + Math.sin(p.ph * 0.3) * 25) * dt; p.y += p.vy * dt; p.r += p.vr * dt; wrapFall(e, p, 20); },
    draw: function (e, g, p) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.ph)); g.globalAlpha = p.a; g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s, p.s, p.s * 2); g.restore(); },
  };

  var GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>/*+=';
  FX.code = {
    setup: function (e) { e.font = Math.round(Math.max(12, Math.min(18, e.W / 80))); },
    make: function (e) { return { x: Math.floor(rand(0, e.W / (e.font || 14))) * (e.font || 14), y: rand(-e.H, e.H), sp: rand(50, 140), len: Math.floor(rand(6, 18)), chars: [], t: 0, c: pick(e.colors) }; },
    step: function (e, p, dt) {
      p.y += p.sp * dt; p.t += dt;
      if (p.t > 0.12) { p.t = 0; p.chars.unshift(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]); if (p.chars.length > p.len) p.chars.length = p.len; }
      if (p.y - p.len * e.font > e.H) { p.y = rand(-e.H * 0.5, 0); p.x = Math.floor(rand(0, e.W / e.font)) * e.font; }
    },
    draw: function (e, g, p) {
      g.font = e.font + 'px Consolas, "Courier New", monospace'; g.fillStyle = p.c;
      for (var i = 0; i < p.chars.length; i++) { g.globalAlpha = i === 0 ? 1 : 0.7 * (1 - i / p.len); g.fillText(p.chars[i], p.x, p.y - i * e.font); }
    },
  };

  FX.synthwave = {
    setup: function (e) { e.off = 0; },
    before: function (e, g, dt) {
      e.off = (e.off + dt * 0.35) % 1;
      var hy = e.H * 0.62;
      // Sun with stripes
      var r = Math.min(e.W, e.H) * 0.16, cx = e.W * 0.5, cy = hy - r * 0.35;
      var sun = g.createLinearGradient(0, cy - r, 0, cy + r);
      sun.addColorStop(0, rgba(e.colors[1] || e.colors[0], 0.85)); sun.addColorStop(1, rgba(e.colors[0], 0.85));
      g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.clip();
      g.globalAlpha = 0.55; g.fillStyle = sun; g.fillRect(cx - r, cy - r, r * 2, r * 2);
      g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1;
      for (var k = 0; k < 6; k++) { var yy = cy + r * (0.1 + k * 0.16), hh = 2 + k * 1.6; g.fillRect(cx - r, yy, r * 2, hh); }
      g.restore();
      // Grid
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.strokeStyle = rgba(e.colors[0], 0.45); g.lineWidth = 1;
      for (var i = 0; i < 14; i++) {
        var t = (i + e.off) / 14, y = hy + (e.H - hy) * t * t;
        g.globalAlpha = 0.2 + 0.8 * t; g.beginPath(); g.moveTo(0, y); g.lineTo(e.W, y); g.stroke();
      }
      g.globalAlpha = 0.6;
      for (var j = -12; j <= 12; j++) { g.beginPath(); g.moveTo(e.W / 2 + j * 10, hy); g.lineTo(e.W / 2 + j * e.W * 0.12, e.H); g.stroke(); }
      g.globalAlpha = 0.5; g.strokeStyle = rgba(e.colors[1] || e.colors[0], 0.8); g.beginPath(); g.moveTo(0, hy); g.lineTo(e.W, hy); g.stroke();
    },
    make: function (e) { var p = twinkleStar(e); p.y = rand(0, e.H * 0.55); return p; },
    step: FX.stars.step,
    draw: FX.stars.draw,
  };

  FX.aurora = {
    setup: function (e) { e.t = 0; },
    make: function (e, i) { return { c: e.colors[i % e.colors.length], y: 0.2 + i * 0.14, amp: rand(0.05, 0.11), f: rand(1.2, 2.4), sp: rand(0.12, 0.25), ph: rand(0, 6.28), h: rand(0.18, 0.3) }; },
    step: function (e, p, dt) { p.ph += dt * p.sp; },
    draw: function (e, g, p) {
      var steps = 24, top = [], i, x, y;
      for (i = 0; i <= steps; i++) {
        x = (i / steps) * e.W;
        y = (p.y + Math.sin(i / steps * p.f * 6.283 + p.ph) * p.amp + Math.sin(i / steps * 3.1 + p.ph * 1.7) * p.amp * 0.5) * e.H;
        top.push([x, y]);
      }
      var grad = g.createLinearGradient(0, (p.y - p.h) * e.H, 0, (p.y + p.h) * e.H);
      grad.addColorStop(0, rgba(p.c, 0)); grad.addColorStop(0.5, rgba(p.c, 0.32)); grad.addColorStop(1, rgba(p.c, 0));
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1; g.fillStyle = grad;
      g.beginPath(); g.moveTo(0, top[0][1] - p.h * e.H);
      for (i = 0; i <= steps; i++) g.lineTo(top[i][0], top[i][1] - p.h * e.H);
      for (i = steps; i >= 0; i--) g.lineTo(top[i][0], top[i][1] + p.h * e.H);
      g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
    },
  };

  // ---------- The engine ----------
  function start(canvas, cfg) {
    var g = canvas.getContext('2d');
    var e = { W: 0, H: 0, colors: ['#ffffff'], parts: [], fx: null, running: false, raf: 0, last: 0 };
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paused = false;

    function size() {
      var dpr = Math.min(root.devicePixelRatio || 1, 1.5);
      // A canvas that isn't on screen yet (a hidden tab) uses the size it was given, or the window's.
      var w = canvas.clientWidth || cfg.width || root.innerWidth, h = canvas.clientHeight || cfg.height || root.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      e.W = w; e.H = h;
    }
    function build() {
      size();
      e.fx = FX[cfg.effect] || null;
      e.colors = (cfg.colors && cfg.colors.length ? cfg.colors : ['#ffffff']).slice();
      e.speed = Math.max(0.3, Math.min(2.5, cfg.speed || 1));
      e.parts = [];
      if (!e.fx) { g.clearRect(0, 0, e.W, e.H); return; }
      if (e.fx.setup) e.fx.setup(e);
      var area = Math.max(0.25, Math.min(2, (e.W * e.H) / (1280 * 800)));
      var n = cfg.effect === 'aurora' || cfg.effect === 'lava' ? Math.round((BASE[cfg.effect]) * Math.max(0.6, cfg.amount || 1)) : Math.max(3, Math.round((BASE[cfg.effect] || 30) * (cfg.amount == null ? 1 : cfg.amount) * area));
      for (var i = 0; i < n; i++) e.parts.push(e.fx.make(e, i));
    }
    function frame(dt) {
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.clearRect(0, 0, e.W, e.H);
      if (!e.fx) return;
      if (e.fx.before) e.fx.before(e, g, dt);
      for (var i = 0; i < e.parts.length; i++) { var p = e.parts[i]; e.fx.step(e, p, dt); e.fx.draw(e, g, p); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    function tick(t) {
      if (!e.running) return;
      var dt = e.last ? Math.min(0.05, (t - e.last) / 1000) : 0.016;
      e.last = t;
      frame(dt * e.speed);
      e.raf = root.requestAnimationFrame(tick);
    }
    function run() {
      if (e.running || paused || reduce || (root.document && root.document.hidden)) return;
      e.running = true; e.last = 0; e.raf = root.requestAnimationFrame(tick);
    }
    function stop() { e.running = false; if (e.raf) root.cancelAnimationFrame(e.raf); e.raf = 0; }
    function still() { for (var k = 0; k < 90; k++) frame(0.05); } // a settled frame for reduced motion

    var onVis = function () { if (root.document.hidden) stop(); else run(); };
    var resizeTimer = 0;
    var onResize = function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { build(); if (reduce) still(); }, 250); };
    root.document.addEventListener('visibilitychange', onVis);
    root.addEventListener('resize', onResize);
    build();
    if (reduce) still(); else run();

    return {
      setConfig: function (next) { cfg = next || cfg; build(); if (reduce || paused) still(); },
      pause: function () { paused = true; stop(); },
      resume: function () { paused = false; run(); },
      // Draw a few seconds' worth of frames now (for screenshots and tests).
      advance: function (seconds) { var n = Math.round(seconds / 0.033); for (var k = 0; k < n; k++) frame(0.033 * e.speed); },
      destroy: function () { stop(); root.document.removeEventListener('visibilitychange', onVis); root.removeEventListener('resize', onResize); g.clearRect(0, 0, e.W, e.H); },
      get count() { return e.parts.length; },
    };
  }

  var api = { EFFECTS: EFFECTS, start: start };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GelYtFx = api;
})(typeof window !== 'undefined' ? window : globalThis);
