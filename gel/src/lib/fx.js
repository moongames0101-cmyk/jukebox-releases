/* Animated backgrounds: petals, leaves, snow, rain, bubbles, hearts, sparkles, stars, embers, fireflies.
   The same engine runs in Gel's preview and, as theme.js, inside Spotify. */
(function (root) {
  const C = (typeof module !== 'undefined' && module.exports) ? require('./color.js') : root.Gel.color;

  const EFFECTS = [
    { id: 'none', name: 'None' },
    { id: 'petals', name: 'Falling petals' },
    { id: 'leaves', name: 'Autumn leaves' },
    { id: 'snow', name: 'Snow' },
    { id: 'rain', name: 'Rain' },
    { id: 'bubbles', name: 'Bubbles' },
    { id: 'hearts', name: 'Floating hearts' },
    { id: 'sparkles', name: 'Sparkles' },
    { id: 'stars', name: 'Twinkling stars' },
    { id: 'embers', name: 'Rising embers' },
    { id: 'fireflies', name: 'Fireflies' },
  ];

  function defaultFx() { return { effect: 'none', amount: 0.5, speed: 1, layer: 'over', color: null }; }

  function sanitizeFx(fx) {
    const d = defaultFx();
    const f = Object.assign({}, d, fx || {});
    if (!EFFECTS.some(e => e.id === f.effect)) f.effect = 'none';
    f.amount = C.clamp(Number(f.amount) || d.amount, 0.1, 1);
    f.speed = C.clamp(Number(f.speed) || d.speed, 0.4, 2.5);
    f.layer = f.layer === 'behind' ? 'behind' : 'over';
    f.color = C.normHex(f.color);
    return f;
  }

  // The colour the particles start from when the person hasn't picked one
  function autoColor(effect, colors) {
    const dark = C.isDark(colors.main);
    const accent = colors['button-active'];
    if (effect === 'snow') return dark ? 'FFFFFF' : C.mix(accent, colors.text, 0.35);
    if (effect === 'stars') return dark ? 'FFFFFF' : C.mix(accent, colors.text, 0.4);
    if (effect === 'rain') return dark ? C.mix(accent, 'FFFFFF', 0.3) : C.mix(accent, colors.text, 0.3);
    return accent;
  }

  // Everything the engine needs, as plain data
  function engineConfig(colors, fxIn) {
    const fx = sanitizeFx(fxIn);
    const base = fx.color || autoColor(fx.effect, colors);
    const m = C.mix;
    const palettes = {
      petals: [m(base, 'FFFFFF', 0.25), m(base, 'FFFFFF', 0.5), m(base, 'FFFFFF', 0.72)],
      leaves: [base, m(base, 'FFB347', 0.45), m(base, '7A2E12', 0.35)],
      snow: [base, m(base, colors.main, 0.25)],
      rain: [base, m(base, colors.main, 0.3)],
      bubbles: [base, m(base, 'FFFFFF', 0.45)],
      hearts: [base, m(base, 'FFFFFF', 0.35), m(base, 'FFFFFF', 0.6)],
      sparkles: [base, m(base, 'FFFFFF', 0.55)],
      stars: [base, m(base, colors.main, 0.3), m(colors['button-active'], 'FFFFFF', 0.5)],
      embers: [base, m(base, 'FFE08A', 0.5)],
      fireflies: [base, m(base, 'FFFFFF', 0.4)],
    };
    const palette = palettes[fx.effect] || [base];
    return { effect: fx.effect, amount: fx.amount, speed: fx.speed, colors: palette.map(h => '#' + h) };
  }

  /* eslint-disable no-var */
  // Kept in plain old JavaScript so it can be copied into Spotify as-is.
  function gelFxEngine(layer, cfg) {
    var anims = [];
    var timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var BASE = { petals: 40, leaves: 22, snow: 70, rain: 90, bubbles: 26, hearts: 22, sparkles: 30, stars: 90, embers: 40, fireflies: 30 };
    function rand(a, b) { return a + Math.random() * (b - a); }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
    function svg(body, color) {
      return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="' + color + '" d="' + body + '"/></svg>') + '")';
    }
    var HEART = 'M12 21 3.6 12.9a5.3 5.3 0 0 1 0-7.6 5.2 5.2 0 0 1 7.4 0l1 1 1-1a5.2 5.2 0 0 1 7.4 0 5.3 5.3 0 0 1 0 7.6z';
    var SPARK = 'M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0z';
    function clear() {
      for (var i = 0; i < anims.length; i++) anims[i].cancel();
      anims = [];
      while (layer.firstChild) layer.removeChild(layer.firstChild);
    }
    function el(parent, css) {
      var d = document.createElement('div');
      d.style.cssText = css;
      parent.appendChild(d);
      return d;
    }
    function loop(node, frames, dur, opts) {
      var o = { duration: dur, delay: -rand(0, dur), iterations: Infinity, easing: 'linear' };
      for (var k in opts) o[k] = opts[k];
      anims.push(node.animate(frames, o));
    }
    function fall(node, H, dur, driftMin, driftMax) {
      loop(node, [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + rand(driftMin, driftMax) + 'px,' + (H + 80) + 'px,0)' }], dur);
    }
    function rise(node, H, dur, drift) {
      loop(node, [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + drift + 'px,' + (-H - 80) + 'px,0)' }], dur);
    }
    function sway(node, amp, dur, rot) {
      var r0 = rand(0, 360);
      loop(node, [
        { transform: 'translateX(' + (-amp) + 'px) rotate(' + r0 + 'deg)' + (rot ? ' rotateY(0deg)' : '') },
        { transform: 'translateX(' + amp + 'px) rotate(' + (r0 + (rot || 0)) + 'deg)' + (rot ? ' rotateY(160deg)' : '') },
      ], dur, { direction: 'alternate', easing: 'ease-in-out' });
    }
    var make = {
      petals: function (H, sp) {
        var s = rand(10, 20), c = pick(cfg.colors);
        var f = el(layer, 'position:absolute;top:-30px;left:' + rand(-10, 100) + '%;width:' + s + 'px;height:' + s + 'px;');
        var p = el(f, 'width:' + s + 'px;height:' + (s * 0.72) + 'px;border-radius:100% 0 100% 0 / 100% 0 100% 0;opacity:' + rand(0.55, 0.95) + ';background:linear-gradient(135deg,' + c + ',' + pick(cfg.colors) + ');');
        fall(f, H, rand(9000, 17000) / sp, 80, 260);
        sway(p, rand(14, 40), rand(1800, 3800) / sp, rand(60, 160));
      },
      leaves: function (H, sp) {
        var s = rand(14, 26), c = pick(cfg.colors);
        var f = el(layer, 'position:absolute;top:-40px;left:' + rand(-10, 100) + '%;width:' + s + 'px;height:' + s + 'px;');
        var p = el(f, 'width:' + s + 'px;height:' + (s * 0.6) + 'px;border-radius:0 100% 0 100%;opacity:' + rand(0.6, 0.95) + ';background:' + c + ';box-shadow:inset -2px -2px 0 rgba(0,0,0,.12);');
        fall(f, H, rand(11000, 19000) / sp, -60, 200);
        sway(p, rand(25, 60), rand(2200, 4200) / sp, rand(120, 300));
      },
      snow: function (H, sp) {
        var z = rand(0, 1), s = 2 + z * 5;
        var f = el(layer, 'position:absolute;top:-12px;left:' + rand(-5, 100) + '%;width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:' + pick(cfg.colors) + ';opacity:' + (0.35 + z * 0.6) + ';' + (z < 0.35 ? 'filter:blur(1px);' : ''));
        var d = rand(-40, 60), dur = (16000 - z * 7000) / sp;
        loop(f, [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + (d / 2 + rand(-20, 20)) + 'px,' + (H / 2) + 'px,0)' }, { transform: 'translate3d(' + d + 'px,' + (H + 24) + 'px,0)' }], dur);
      },
      rain: function (H, sp) {
        var len = rand(40, 90);
        var f = el(layer, 'position:absolute;top:-' + (len + 10) + 'px;left:' + rand(-5, 105) + '%;width:1.5px;height:' + len + 'px;border-radius:1px;opacity:' + rand(0.25, 0.6) + ';background:linear-gradient(transparent,' + pick(cfg.colors) + ');');
        var dur = rand(650, 1200) / sp;
        loop(f, [{ transform: 'translate3d(0,0,0) rotate(10deg)' }, { transform: 'translate3d(' + (-(H + len) * 0.18) + 'px,' + (H + len + 20) + 'px,0) rotate(10deg)' }], dur);
      },
      bubbles: function (H, sp) {
        var s = rand(6, 26), c = pick(cfg.colors);
        var f = el(layer, 'position:absolute;top:100%;left:' + rand(0, 100) + '%;width:' + s + 'px;height:' + s + 'px;');
        var b = el(f, 'width:100%;height:100%;border-radius:50%;border:1.5px solid ' + c + ';opacity:' + rand(0.35, 0.8) + ';background:radial-gradient(circle at 32% 30%, rgba(255,255,255,.55) 0 14%, transparent 18%);');
        rise(f, H, rand(8000, 16000) / sp, rand(-30, 30));
        sway(b, rand(6, 18), rand(1600, 3000) / sp, 0);
      },
      hearts: function (H, sp) {
        var s = rand(10, 22), c = pick(cfg.colors);
        var f = el(layer, 'position:absolute;top:100%;left:' + rand(0, 100) + '%;width:' + s + 'px;height:' + s + 'px;');
        var h = el(f, 'width:100%;height:100%;opacity:' + rand(0.5, 0.9) + ';background:' + svg(HEART, c) + ' center/contain no-repeat;');
        rise(f, H, rand(10000, 18000) / sp, rand(-60, 60));
        loop(h, [{ transform: 'translateX(-12px) rotate(-14deg)' }, { transform: 'translateX(12px) rotate(14deg)' }], rand(1800, 3200) / sp, { direction: 'alternate', easing: 'ease-in-out' });
      },
      sparkles: function (H, sp) {
        var s = rand(8, 20), c = pick(cfg.colors);
        var f = el(layer, 'position:absolute;left:' + rand(0, 100) + '%;top:' + rand(0, 100) + '%;width:' + s + 'px;height:' + s + 'px;');
        var k = el(f, 'width:100%;height:100%;background:' + svg(SPARK, c) + ' center/contain no-repeat;filter:drop-shadow(0 0 4px ' + c + ');');
        loop(k, [{ transform: 'scale(0) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(45deg)', opacity: 1, offset: 0.5 }, { transform: 'scale(0) rotate(90deg)', opacity: 0 }], rand(1400, 3400) / sp, { easing: 'ease-in-out' });
        loop(f, [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + rand(-30, 30) + 'px,' + rand(-40, 10) + 'px,0)' }], rand(6000, 12000) / sp, { direction: 'alternate', easing: 'ease-in-out' });
      },
      stars: function (H, sp, i) {
        if (i < 2) {
          // two shooting stars that cross now and then
          var t = el(layer, 'position:absolute;left:' + rand(10, 70) + '%;top:' + rand(0, 35) + '%;width:110px;height:1.5px;border-radius:1px;background:linear-gradient(90deg,transparent,' + cfg.colors[0] + ');');
          loop(t, [
            { transform: 'translate3d(0,0,0) rotate(28deg)', opacity: 0 },
            { transform: 'translate3d(0,0,0) rotate(28deg)', opacity: 0, offset: 0.86 },
            { transform: 'translate3d(60px,32px,0) rotate(28deg)', opacity: 1, offset: 0.9 },
            { transform: 'translate3d(300px,160px,0) rotate(28deg)', opacity: 0 },
          ], rand(7000, 13000) / sp);
          return;
        }
        var s = rand(1, 3.2);
        var f = el(layer, 'position:absolute;left:' + rand(0, 100) + '%;top:' + rand(0, 100) + '%;width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:' + pick(cfg.colors) + ';' + (s > 2.4 ? 'box-shadow:0 0 6px 1px ' + cfg.colors[0] + ';' : ''));
        loop(f, [{ opacity: 0.15 }, { opacity: 1 }], rand(1200, 4200) / sp, { direction: 'alternate', easing: 'ease-in-out' });
      },
      embers: function (H, sp) {
        var s = rand(2, 4.5), c = pick(cfg.colors);
        var f = el(layer, 'position:absolute;top:100%;left:' + rand(0, 100) + '%;width:' + s + 'px;height:' + s + 'px;');
        var g = el(f, 'width:100%;height:100%;border-radius:50%;background:' + c + ';box-shadow:0 0 ' + (s * 3) + 'px ' + s + 'px ' + c + ';');
        loop(f, [
          { transform: 'translate3d(0,0,0)', opacity: 0 },
          { transform: 'translate3d(' + rand(-30, 30) + 'px,' + (-H * 0.3) + 'px,0)', opacity: 1, offset: 0.25 },
          { transform: 'translate3d(' + rand(-60, 60) + 'px,' + (-H * 0.75) + 'px,0)', opacity: 0.6, offset: 0.7 },
          { transform: 'translate3d(' + rand(-80, 80) + 'px,' + (-H - 20) + 'px,0)', opacity: 0 },
        ], rand(6000, 12000) / sp);
        loop(g, [{ opacity: 0.4 }, { opacity: 1 }], rand(300, 900) / sp, { direction: 'alternate' });
      },
      fireflies: function (H, sp) {
        var s = rand(3, 6), c = pick(cfg.colors);
        var f = el(layer, 'position:absolute;left:' + rand(0, 100) + '%;top:' + rand(5, 95) + '%;width:' + s + 'px;height:' + s + 'px;');
        var g = el(f, 'width:100%;height:100%;border-radius:50%;background:' + c + ';box-shadow:0 0 ' + (s * 2) + 'px ' + (s / 2) + 'px ' + c + ';');
        var pts = [];
        for (var k = 0; k < 4; k++) pts.push({ transform: 'translate3d(' + rand(-90, 90) + 'px,' + rand(-70, 70) + 'px,0)' });
        pts.push(pts[0]);
        loop(f, pts, rand(14000, 26000) / sp, { easing: 'ease-in-out' });
        loop(g, [{ opacity: 0.08 }, { opacity: 1 }, { opacity: 0.25 }], rand(1600, 4200) / sp, { direction: 'alternate', easing: 'ease-in-out' });
      },
    };
    function build() {
      clear();
      if (!cfg || !make[cfg.effect] || reduce) return;
      var W = layer.clientWidth || window.innerWidth;
      var H = layer.clientHeight || window.innerHeight;
      var area = Math.max(0.3, Math.min(1.8, (W * H) / (1280 * 800)));
      var n = Math.max(3, Math.round((BASE[cfg.effect] || 30) * cfg.amount * area));
      for (var i = 0; i < n; i++) make[cfg.effect](H, cfg.speed || 1, i);
    }
    function onResize() { clearTimeout(timer); timer = setTimeout(build, 300); }
    function onVisibility() {
      for (var i = 0; i < anims.length; i++) { if (document.hidden) anims[i].pause(); else anims[i].play(); }
    }
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    build();
    return {
      rebuild: build,
      destroy: function () {
        clearTimeout(timer);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        clear();
      },
    };
  }
  /* eslint-enable no-var */

  // theme.js for Spotify. Empty string means "no animation".
  function buildThemeJs(colors, fxIn) {
    const cfg = engineConfig(colors, fxIn);
    if (cfg.effect === 'none') return '';
    return [
      '// Made with Gel: animated background. Gel rewrites this file every time you apply a theme.',
      '(function () {',
      '  var cfg = ' + JSON.stringify(cfg) + ';',
      '  var engine = ' + gelFxEngine.toString() + ';',
      '  function start() {',
      '    if (!document.body) return setTimeout(start, 200);',
      "    var old = document.getElementById('gel-fx');",
      '    if (old && old.__gel) old.__gel.destroy();',
      '    if (old) old.remove();',
      "    var layer = document.createElement('div');",
      "    layer.id = 'gel-fx';",
      "    layer.setAttribute('aria-hidden', 'true');",
      '    document.body.appendChild(layer);',
      '    layer.__gel = engine(layer, cfg);',
      '  }',
      "  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();",
      '})();',
      '',
    ].join('\n');
  }

  const api = { EFFECTS, defaultFx, sanitizeFx, autoColor, engineConfig, gelFxEngine, buildThemeJs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.Gel = root.Gel || {}).fx = api;
})(typeof window !== 'undefined' ? window : globalThis);
