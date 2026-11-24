/* Gel for YouTube: volume booster. Turns YouTube's sound up past 100% (up to 600%) through
   the browser's audio engine, with a limiter after it so loud parts don't crackle. It adds
   a button to the player (scroll over it, or click it for a slider), and remembers the
   level on this browser. Nothing is rerouted until you go past 100%. */
(function (root) {
  'use strict';

  var MIN = 100, MAX = 600, STEP = 10, KEY = 'gel-yt-boost';
  var PRESETS = [100, 150, 200, 300, 400, 600];

  function clamp(pct) {
    var n = Math.round(Number(pct) / STEP) * STEP;
    if (!isFinite(n)) return MIN;
    return Math.max(MIN, Math.min(MAX, n));
  }

  // What the gain and the limiter do at a level. At 100% both step aside.
  function chain(pct) {
    pct = clamp(pct);
    if (pct <= MIN) return { gain: 1, threshold: 0, knee: 0, ratio: 1, attack: 0.003, release: 0.25 };
    return { gain: pct / 100, threshold: -8, knee: 6, ratio: 12, attack: 0.002, release: 0.2 };
  }

  function times(pct) { return String(Math.round(clamp(pct) / 10) / 10) + '×'; }
  function badge(pct) { return clamp(pct) <= MIN ? '' : times(pct); }
  function nudge(pct, deltaY) { return clamp(clamp(pct) + (deltaY < 0 ? STEP : deltaY > 0 ? -STEP : 0)); }

  // The browser's audio engine can only hear video from YouTube itself; anything else
  // would come out silent once rerouted, so it's left alone.
  function safe(video, origin) {
    var src = String((video && (video.currentSrc || video.src)) || '');
    if (!src) return false;
    if (src.indexOf('blob:') === 0) return src.slice(5).indexOf(origin + '/') === 0;
    try { return new URL(src).origin === origin; } catch (e) { return false; }
  }

  // The part that does the sound, kept apart from the page so it can be tested.
  function makeEngine(opts) {
    var AC = opts.AudioContext, storage = opts.storage, origin = opts.origin;
    var ctx = null, chains = [], failed = [], last = null, bypassed = false;
    var level = MIN;
    try { var saved = storage && storage.getItem(KEY); if (saved != null) level = clamp(saved); } catch (e) { /* storage blocked */ }

    function audio() {
      if (!ctx && AC) { try { ctx = new AC(); } catch (e) { ctx = null; } }
      return ctx;
    }
    function setParam(param, v, smooth) {
      try {
        if (smooth && param.setTargetAtTime) {
          var t = ctx.currentTime || 0;
          if (param.cancelScheduledValues) param.cancelScheduledValues(t);
          param.setTargetAtTime(v, t, 0.015);
          return;
        }
      } catch (e) { /* fall back to setting it outright */ }
      param.value = v;
    }
    function tune(c) {
      var p = chain(bypassed ? MIN : level);
      setParam(c.gain.gain, p.gain, true);
      setParam(c.lim.threshold, p.threshold);
      setParam(c.lim.knee, p.knee);
      setParam(c.lim.ratio, p.ratio);
      setParam(c.lim.attack, p.attack);
      setParam(c.lim.release, p.release);
    }
    function boosting() { return !bypassed && level > MIN; }

    function attach(video) {
      for (var i = 0; i < chains.length; i++) if (chains[i].video === video) return (last = 'on');
      if (failed.indexOf(video) !== -1) return (last = 'failed');
      if (!boosting()) return 'idle';
      if (!safe(video, origin)) return 'later';
      var c = audio();
      if (!c) return (last = 'failed');
      // Before the first click the engine is asleep: rerouting now would mute the video.
      if (c.state !== 'running') return (last = 'waiting');
      var src;
      try { src = c.createMediaElementSource(video); } catch (e) { failed.push(video); return (last = 'failed'); }
      var gain = c.createGain(), lim = c.createDynamicsCompressor();
      src.connect(gain);
      gain.connect(lim);
      lim.connect(c.destination);
      var ch = { video: video, gain: gain, lim: lim };
      chains.push(ch);
      tune(ch);
      return (last = 'on');
    }

    return {
      level: function () { return level; },
      set: function (pct) {
        level = clamp(pct);
        try { if (storage) storage.setItem(KEY, String(level)); } catch (e) { /* storage blocked */ }
        chains.forEach(tune);
        return level;
      },
      attach: attach,
      resume: function () {
        if (!ctx) return Promise.resolve(false);
        if (ctx.state === 'running') return Promise.resolve(true);
        try {
          return Promise.resolve(ctx.resume()).then(function () { return ctx.state === 'running'; }, function () { return false; });
        } catch (e) { return Promise.resolve(false); }
      },
      bypass: function (on) { bypassed = !!on; chains.forEach(tune); },
      status: function () {
        if (!boosting()) return 'off';
        if (last === 'failed' || last === 'waiting') return last;
        return chains.length ? 'on' : 'ready';
      },
    };
  }

  // ---------- The button and its panel ----------
  var NOTES = {
    off: 'Slide past 100% to turn quiet videos up.',
    ready: 'Boost is set. It starts when a video plays.',
    on: 'Boosted. Gel keeps loud parts from crackling.',
    waiting: 'Click anywhere on the page to start the boost (your browser wants a click first).',
    failed: "This video's sound can't be boosted. Another extension may be using it.",
  };

  function boostCss() {
    var A = 'var(--gel-accent, #FF5FA2)', A2 = 'var(--gel-accent2, #9B6BFF)', ON = 'var(--gel-on-accent, #0B0A12)';
    var grad = 'linear-gradient(135deg, ' + A + ', ' + A2 + ')';
    return [
      '.gel-boost-btn { position: relative; display: inline-flex !important; align-items: center; justify-content: center; color: #fff; }',
      '.gel-boost-btn svg { width: 24px; height: 24px; pointer-events: none; transition: filter .2s; }',
      '.gel-boost-btn[data-state="on"] svg { filter: drop-shadow(0 0 5px ' + A + '); }',
      '.gel-boost-badge { display: none; position: absolute; right: -3px; bottom: 0; padding: 1px 4px; border-radius: 8px; pointer-events: none;' +
        ' font: 800 9.5px/1.25 "YouTube Sans", Roboto, Arial, sans-serif; color: ' + ON + '; background: ' + grad + ';' +
        ' box-shadow: 0 0 8px color-mix(in srgb, ' + A + ' 65%, transparent); }',
      '.gel-boost-btn:not([data-state="off"]) .gel-boost-badge { display: block; }',
      '.gel-boost-btn[data-state="waiting"] .gel-boost-badge { animation: gel-boost-pulse 1.4s ease-in-out infinite; }',
      '.gel-boost-btn[data-state="failed"] .gel-boost-badge { background: #5a5a66; color: #fff; box-shadow: none; }',
      '@keyframes gel-boost-pulse { 50% { opacity: .45; } }',
      '.gel-boost-pop { position: absolute; z-index: 75; width: 264px; box-sizing: border-box; padding: 14px 16px 13px; border-radius: 16px;' +
        ' color: #fff; text-align: left; cursor: default;' +
        ' background: color-mix(in srgb, var(--gel-menu, #1C1A28) 80%, transparent);' +
        ' backdrop-filter: blur(22px) saturate(1.4); -webkit-backdrop-filter: blur(22px) saturate(1.4);' +
        ' border: 1px solid rgba(255, 255, 255, .12);' +
        ' box-shadow: 0 18px 48px rgba(0, 0, 0, .5), 0 0 0 1px color-mix(in srgb, ' + A + ' 22%, transparent), 0 0 34px color-mix(in srgb, ' + A + ' 18%, transparent);' +
        ' animation: gel-boost-in .16s ease-out; }',
      '.gel-boost-pop[hidden], #movie_player.ytp-autohide .gel-boost-pop { display: none !important; }',
      '@keyframes gel-boost-in { from { opacity: 0; transform: translateY(6px) scale(.98); } }',
      '.gel-boost-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }',
      '.gel-boost-title { font-size: 13px; font-weight: 600; opacity: .88; }',
      '.gel-boost-val { font-size: 27px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums;' +
        ' background: linear-gradient(90deg, ' + A + ', ' + A2 + '); -webkit-background-clip: text; background-clip: text; color: transparent; }',
      '.gel-boost-range { -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 6px; margin: 14px 0 12px; border-radius: 999px; outline: none; cursor: pointer;' +
        ' background: linear-gradient(90deg, ' + A + ', ' + A2 + ') 0 0 / var(--fill, 0%) 100% no-repeat, rgba(255, 255, 255, .16); }',
      '.gel-boost-range::-webkit-slider-thumb { -webkit-appearance: none; width: 17px; height: 17px; border-radius: 50%; background: #fff; cursor: grab;' +
        ' box-shadow: 0 0 0 3px color-mix(in srgb, ' + A + ' 50%, transparent), 0 0 14px ' + A + '; transition: transform .12s; }',
      '.gel-boost-range:active::-webkit-slider-thumb { transform: scale(1.15); cursor: grabbing; }',
      '.gel-boost-range:focus-visible { box-shadow: 0 0 0 2px ' + A + '; }',
      '.gel-boost-presets { display: flex; gap: 5px; }',
      '.gel-boost-presets button { flex: 1; min-width: 0; padding: 5px 0; border-radius: 999px; border: 1px solid rgba(255, 255, 255, .14); cursor: pointer;' +
        ' background: rgba(255, 255, 255, .07); color: inherit; font-family: inherit; font-size: 11.5px; font-weight: 700; line-height: 1.2;' +
        ' transition: background .15s, transform .15s, box-shadow .15s; }',
      '.gel-boost-presets button:hover { background: rgba(255, 255, 255, .15); transform: translateY(-1px); }',
      '.gel-boost-presets button[aria-pressed="true"] { background: ' + grad + '; color: ' + ON + '; border-color: transparent;' +
        ' box-shadow: 0 4px 14px color-mix(in srgb, ' + A + ' 45%, transparent); }',
      '.gel-boost-presets button:focus-visible { outline: 2px solid ' + A + '; outline-offset: 1px; }',
      '.gel-boost-note { margin: 11px 0 0; font-size: 11.5px; line-height: 1.4; opacity: .72; }',
      '.gel-boost-pop[data-state="waiting"] .gel-boost-note, .gel-boost-pop[data-state="failed"] .gel-boost-note { opacity: 1; color: ' + A + '; }',
    ].join('\n') + '\n';
  }

  var SVG = 'http://www.w3.org/2000/svg';
  function icon(doc) {
    var svg = doc.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    [
      // A speaker…
      'M3.5 9.25h3.4l4.7-3.95c.5-.42 1.15-.06 1.15.58v12.24c0 .64-.65 1-1.15.58l-4.7-3.95H3.5a1 1 0 0 1-1-1v-3.5a1 1 0 0 1 1-1z',
      // …with a plus: louder.
      'M17.25 8.25h1.5v3h3v1.5h-3v3h-1.5v-3h-3v-1.5h3z',
    ].forEach(function (d) {
      var p = doc.createElementNS(SVG, 'path');
      p.setAttribute('fill', 'currentColor');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }
  function make(doc, tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var shared = null; // one engine per page: a video can only be rerouted once

  // Puts the button in YouTube's player and keeps it there. Returns { stop(), tick() }.
  function start(doc, opts) {
    opts = opts || {};
    doc = doc || root.document;
    var W = doc.defaultView || root;
    var storage = null;
    try { storage = W.localStorage; } catch (e) { /* blocked */ }
    if (!shared) shared = makeEngine({ AudioContext: opts.AudioContext || W.AudioContext || W.webkitAudioContext, storage: storage, origin: W.location.origin });
    var engine = shared;
    engine.bypass(false);

    var style = make(doc, 'style');
    style.id = 'gel-yt-boost';
    style.textContent = boostCss();
    (doc.head || doc.documentElement).appendChild(style);

    var btn = make(doc, 'button', 'ytp-button gel-boost-btn');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.appendChild(icon(doc));
    var badgeEl = make(doc, 'span', 'gel-boost-badge');
    btn.appendChild(badgeEl);

    var pop = make(doc, 'div', 'gel-boost-pop');
    pop.hidden = true;
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Volume boost');
    var head = make(doc, 'div', 'gel-boost-head');
    head.appendChild(make(doc, 'span', 'gel-boost-title', 'Volume boost'));
    var val = make(doc, 'b', 'gel-boost-val', '100%');
    head.appendChild(val);
    pop.appendChild(head);
    var range = make(doc, 'input', 'gel-boost-range');
    range.type = 'range';
    range.min = String(MIN); range.max = String(MAX); range.step = String(STEP);
    range.setAttribute('aria-label', 'Volume boost');
    pop.appendChild(range);
    var row = make(doc, 'div', 'gel-boost-presets');
    var presets = PRESETS.map(function (v) {
      var b = make(doc, 'button', null, times(v));
      b.type = 'button';
      b.setAttribute('data-v', String(v));
      b.setAttribute('aria-label', v + '%');
      row.appendChild(b);
      return b;
    });
    pop.appendChild(row);
    var note = make(doc, 'p', 'gel-boost-note');
    pop.appendChild(note);

    var open = false, player = null, stopped = false;

    function attachAll() {
      var vids = doc.querySelectorAll('video.html5-main-video');
      var main = player && player.querySelector('video');
      for (var i = 0; i < vids.length; i++) if (vids[i] !== main) engine.attach(vids[i]);
      if (main) engine.attach(main); // last, so the button shows how the main video is doing
    }
    function render() {
      var lv = engine.level(), st = engine.status();
      btn.setAttribute('data-state', st);
      pop.setAttribute('data-state', st);
      btn.setAttribute('aria-label', 'Volume boost: ' + lv + '%');
      if (badgeEl.textContent !== badge(lv)) badgeEl.textContent = badge(lv);
      val.textContent = lv + '%';
      if (Number(range.value) !== lv) range.value = String(lv);
      range.style.setProperty('--fill', ((lv - MIN) / (MAX - MIN) * 100) + '%');
      range.setAttribute('aria-valuetext', lv + '%');
      presets.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-v')) === lv)); });
      if (note.textContent !== NOTES[st]) note.textContent = NOTES[st];
    }
    function place() {
      if (!player || !btn.isConnected) return;
      var pr = player.getBoundingClientRect(), br = btn.getBoundingClientRect();
      var w = pop.offsetWidth || 264;
      var left = br.left + br.width / 2 - pr.left - w / 2;
      left = Math.max(8, Math.min(pr.width - w - 8, left));
      pop.style.left = Math.round(left) + 'px';
      pop.style.bottom = Math.round(pr.bottom - br.top + 10) + 'px';
    }
    function setOpen(on) {
      open = !!on && !!player;
      if (open && pop.parentNode !== player) player.appendChild(pop);
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) { render(); place(); }
    }
    function setLevel(pct) {
      engine.set(pct);
      attachAll();
      render();
    }

    function tick() {
      if (stopped) return;
      if (!style.isConnected) (doc.head || doc.documentElement).appendChild(style);
      player = doc.getElementById('movie_player');
      if (player) {
        var host = player.querySelector('.ytp-right-controls-left') || player.querySelector('.ytp-right-controls');
        if (host && btn.parentNode !== host) {
          var before = host.querySelector(':scope > .ytp-settings-button');
          host.insertBefore(btn, before || host.firstChild);
        }
        if (open && player.classList.contains('ytp-autohide')) setOpen(false);
      } else if (open) setOpen(false);
      attachAll();
      render();
      if (open) place();
    }

    // Clicks and keys inside the panel are Gel's: YouTube mustn't pause, seek or go full screen.
    var mine = ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'keydown', 'keyup', 'keypress', 'wheel', 'contextmenu'];
    mine.forEach(function (ev) { pop.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    range.addEventListener('input', function () { setLevel(range.value); });
    presets.forEach(function (b) { b.addEventListener('click', function () { setLevel(b.getAttribute('data-v')); }); });
    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!open); });
    btn.addEventListener('wheel', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setLevel(nudge(engine.level(), e.deltaY));
    }, { passive: false });

    // The browser only lets the audio engine start after a click or a key press.
    function wake() {
      if (engine.status() === 'waiting') engine.resume().then(function () { attachAll(); render(); });
    }
    function onPointer(e) {
      if (open && !pop.contains(e.target) && !btn.contains(e.target)) setOpen(false);
      wake();
    }
    function onKey(e) {
      if (open && e.key === 'Escape') { setOpen(false); try { btn.focus(); } catch (err) { /* gone */ } }
      wake();
    }
    function onPlay() { setTimeout(tick, 0); }
    doc.addEventListener('pointerdown', onPointer, true);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('play', onPlay, true);
    W.addEventListener('yt-navigate-finish', onPlay);
    W.addEventListener('resize', onPlay);

    var timer = W.setInterval(tick, 1000);
    tick();

    return {
      tick: tick,
      set: setLevel,
      engine: engine,
      stop: function () {
        stopped = true;
        W.clearInterval(timer);
        doc.removeEventListener('pointerdown', onPointer, true);
        doc.removeEventListener('keydown', onKey, true);
        doc.removeEventListener('play', onPlay, true);
        W.removeEventListener('yt-navigate-finish', onPlay);
        W.removeEventListener('resize', onPlay);
        btn.remove();
        pop.remove();
        style.remove();
        engine.bypass(true); // a rerouted video can't be un-rerouted, but it can sound normal again
      },
    };
  }

  var api = { MIN: MIN, MAX: MAX, STEP: STEP, KEY: KEY, PRESETS: PRESETS, clamp: clamp, chain: chain, badge: badge, nudge: nudge, safe: safe, makeEngine: makeEngine, boostCss: boostCss, start: start };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GelYtBoost = api;
})(typeof window !== 'undefined' ? window : globalThis);
