/* Animated backgrounds: falling petals, snow and fireflies.
   The same engine runs in Gel's preview and, as theme.js, inside Spotify. */
(function (root) {
  const C = (typeof module !== 'undefined' && module.exports) ? require('./color.js') : root.Gel.color;

  const EFFECTS = [
    { id: 'none', name: 'None' },
    { id: 'petals', name: 'Falling petals' },
    { id: 'snow', name: 'Snow' },
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
    if (effect === 'snow') return dark ? 'FFFFFF' : C.mix(colors['button-active'], colors.text, 0.35);
    return colors['button-active'];
  }

  // Everything the engine needs, as plain data
  function engineConfig(colors, fxIn) {
    const fx = sanitizeFx(fxIn);
    const base = fx.color || autoColor(fx.effect, colors);
    let palette;
    if (fx.effect === 'petals') palette = [C.mix(base, 'FFFFFF', 0.25), C.mix(base, 'FFFFFF', 0.5), C.mix(base, 'FFFFFF', 0.72)];
    else if (fx.effect === 'snow') palette = [base, C.mix(base, colors.main, 0.25)];
    else palette = [base, C.mix(base, 'FFFFFF', 0.4)];
    return { effect: fx.effect, amount: fx.amount, speed: fx.speed, colors: palette.map(h => '#' + h) };
  }

  /* eslint-disable no-var */
  // Kept in plain old JavaScript so it can be copied into Spotify as-is.
  function gelFxEngine(layer, cfg) {
    var anims = [];
    var timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function rand(a, b) { return a + Math.random() * (b - a); }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
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
    function build() {
      clear();
      if (!cfg || cfg.effect === 'none' || reduce) return;
      var W = layer.clientWidth || window.innerWidth;
      var H = layer.clientHeight || window.innerHeight;
      var area = Math.max(0.3, Math.min(1.8, (W * H) / (1280 * 800)));
      var base = cfg.effect === 'snow' ? 70 : cfg.effect === 'fireflies' ? 30 : 40;
      var n = Math.max(3, Math.round(base * cfg.amount * area));
      var speed = cfg.speed || 1;
      for (var i = 0; i < n; i++) {
        var col = pick(cfg.colors);
        if (cfg.effect === 'petals') {
          var s = rand(10, 20);
          var fall = el(layer, 'position:absolute;top:-30px;left:' + rand(-10, 100) + '%;width:' + s + 'px;height:' + s + 'px;will-change:transform;');
          var petal = el(fall, 'width:' + s + 'px;height:' + (s * 0.72) + 'px;border-radius:100% 0 100% 0 / 100% 0 100% 0;opacity:' + rand(0.55, 0.95) +
            ';background:linear-gradient(135deg,' + col + ',' + pick(cfg.colors) + ');box-shadow:0 1px 2px rgba(0,0,0,.12);will-change:transform;');
          var dur = rand(9000, 17000) / speed;
          anims.push(fall.animate(
            [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + rand(80, 260) + 'px,' + (H + 60) + 'px,0)' }],
            { duration: dur, delay: -rand(0, dur), iterations: Infinity, easing: 'linear' }));
          var r0 = rand(0, 360), sway = rand(14, 40), sdur = rand(1800, 3800) / speed;
          anims.push(petal.animate(
            [{ transform: 'translateX(' + (-sway) + 'px) rotate(' + r0 + 'deg) rotateY(0deg)' },
             { transform: 'translateX(' + sway + 'px) rotate(' + (r0 + rand(60, 160)) + 'deg) rotateY(160deg)' }],
            { duration: sdur, delay: -rand(0, sdur), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));
        } else if (cfg.effect === 'snow') {
          var z = rand(0, 1);
          var size = 2 + z * 5;
          var flake = el(layer, 'position:absolute;top:-12px;left:' + rand(-5, 100) + '%;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + col +
            ';opacity:' + (0.35 + z * 0.6) + ';' + (z < 0.35 ? 'filter:blur(1px);' : '') + 'will-change:transform;');
          var fdur = (16000 - z * 7000) / speed;
          var drift = rand(-40, 60);
          anims.push(flake.animate(
            [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + (drift / 2 + rand(-20, 20)) + 'px,' + (H / 2) + 'px,0)' }, { transform: 'translate3d(' + drift + 'px,' + (H + 24) + 'px,0)' }],
            { duration: fdur, delay: -rand(0, fdur), iterations: Infinity, easing: 'linear' }));
        } else if (cfg.effect === 'fireflies') {
          var fs = rand(3, 6);
          var fly = el(layer, 'position:absolute;left:' + rand(0, 100) + '%;top:' + rand(5, 95) + '%;width:' + fs + 'px;height:' + fs + 'px;will-change:transform;');
          var glow = el(fly, 'width:100%;height:100%;border-radius:50%;background:' + col + ';box-shadow:0 0 ' + (fs * 2) + 'px ' + (fs / 2) + 'px ' + col + ';will-change:opacity;');
          var pts = [];
          for (var k = 0; k < 4; k++) pts.push({ transform: 'translate3d(' + rand(-90, 90) + 'px,' + rand(-70, 70) + 'px,0)' });
          pts.push(pts[0]);
          var wdur = rand(14000, 26000) / speed;
          anims.push(fly.animate(pts, { duration: wdur, delay: -rand(0, wdur), iterations: Infinity, easing: 'ease-in-out' }));
          var pdur = rand(1600, 4200) / speed;
          anims.push(glow.animate([{ opacity: 0.08 }, { opacity: 1 }, { opacity: 0.25 }],
            { duration: pdur, delay: -rand(0, pdur), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));
        }
      }
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
