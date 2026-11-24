/* Gel for YouTube: puts the theme you pick in Gel onto youtube.com.
   Gel writes theme.json (and any pictures) into this extension's folder; this script
   checks it every couple of seconds, so changes show up without reloading anything. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;
  if (W.__gelYtLoaded) return;
  W.__gelYtLoaded = true;

  var Core = W.GelYtCore, Fx = W.GelYtFx, Ads = W.GelYtAds, Boost = W.GelYtBoost;
  var isTop = W.top === W;
  var frame = /^\/live_chat/.test(location.pathname) ? 'chat' : 'top';
  if (!isTop && frame !== 'chat') return; // embeds and other frames stay as they are

  // Where theme files come from. Gel's tests swap this out.
  var source = W.__gelYtSource || {
    url: function (name) { return chrome.runtime.getURL(name); },
    text: function (name) {
      return fetch(this.url(name), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : null; });
    },
    buffer: function (name) {
      return fetch(this.url(name), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(name + ' ' + r.status); return r.arrayBuffer(); });
    },
  };

  var CACHE_KEY = 'gel-yt-cache-v1';
  var S = {
    raw: null, theme: null, vars: {}, varCss: '', sheetsKey: '', addedDark: false,
    fx: null, fxKey: '', fxHeld: null, playing: false, fonts: {}, blobs: {}, darkFixes: 0, ads: null, boost: null,
  };

  // ---------- Small helpers ----------
  function styleEl(id) {
    var s = D.getElementById(id);
    if (!s) {
      s = D.createElement('style');
      s.id = id;
      (D.head || H).appendChild(s);
    } else if (s.parentNode !== D.head && D.head) {
      D.head.appendChild(s); // keep ours after YouTube's
    }
    return s;
  }
  function removeEl(id) { var e = D.getElementById(id); if (e) e.remove(); }
  function blobUrl(name) {
    if (!name) return Promise.resolve(null);
    if (S.blobs[name]) return S.blobs[name];
    var mime = /\.png/i.test(name) ? 'image/png' : /\.gif/i.test(name) ? 'image/gif' : /\.webp/i.test(name) ? 'image/webp' : /\.svg/i.test(name) ? 'image/svg+xml' : 'image/jpeg';
    S.blobs[name] = source.buffer(name.replace(/\?.*$/, '')).then(function (buf) {
      return URL.createObjectURL(new Blob([buf], { type: mime }));
    }).catch(function () { delete S.blobs[name]; return null; });
    return S.blobs[name];
  }

  // ---------- YouTube's colour variables ----------
  var ROOTISH = /^\s*(:root|html|\[dark\]|\[light\]|\[color-version)/;
  function sheetsKey() {
    var k = D.styleSheets.length + ':';
    for (var i = 0; i < D.styleSheets.length; i++) {
      var s = D.styleSheets[i];
      if (s.ownerNode && s.ownerNode.id && s.ownerNode.id.indexOf('gel-yt') === 0) continue;
      try { k += s.cssRules.length + ','; } catch (e) { k += 'x,'; }
    }
    return k;
  }
  function readRules() {
    var rules = [];
    function walk(list) {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
        var sel = r.selectorText;
        if (!sel || sel.length > 240 || !ROOTISH.test(sel) || !r.style) continue;
        var decls = [];
        for (var k = 0; k < r.style.length; k++) {
          var p = r.style[k];
          if (p.charCodeAt(0) === 45 && p.charCodeAt(1) === 45) decls.push([p, r.style.getPropertyValue(p)]);
        }
        if (decls.length) rules.push({ selector: sel, decls: decls });
      }
    }
    for (var i = 0; i < D.styleSheets.length; i++) {
      var s = D.styleSheets[i];
      if (s.ownerNode && s.ownerNode.id && s.ownerNode.id.indexOf('gel-yt') === 0) continue;
      try { walk(s.cssRules); } catch (e) { /* another site's sheet */ }
    }
    return rules;
  }
  function scanVars(force) {
    var key = sheetsKey();
    if (!force && key === S.sheetsKey) return false;
    S.sheetsKey = key;
    S.vars = Core.collectVars(readRules(), function (sel) { return H.matches(sel); });
    return true;
  }
  function writeVars() {
    if (!S.theme) return;
    var css = Core.varCss(S.vars, S.theme.palette);
    if (Object.keys(S.vars).length === 0 && S.varCss) css = S.varCss; // nothing loaded yet: keep the cached copy
    if (css !== S.varCss || !D.getElementById('gel-yt-vars')) {
      S.varCss = css;
      styleEl('gel-yt-vars').textContent = css;
      saveCache();
    }
  }

  // YouTube's dark look is the starting point for every Gel theme, light ones too.
  function ensureDark() {
    if (!H.hasAttribute('dark')) { H.setAttribute('dark', ''); S.addedDark = true; }
  }
  new MutationObserver(function () {
    if (S.theme && !H.hasAttribute('dark') && S.darkFixes < 50) { S.darkFixes++; ensureDark(); }
  }).observe(H, { attributes: true, attributeFilter: ['dark'] });

  // ---------- Fonts ----------
  function loadFont(f) {
    if (!f || !f.family || !f.file || !W.FontFace) return;
    var key = f.family + '|' + (f.scale || 1);
    if (S.fonts[key]) return;
    S.fonts[key] = 'loading';
    source.buffer('fonts/' + f.file).then(function (buf) {
      var face = new FontFace(f.family, buf, { sizeAdjust: Math.round((f.scale || 1) * 100) + '%', display: 'swap' });
      return face.load();
    }).then(function (face) {
      D.fonts.add(face);
      S.fonts[key] = face;
    }).catch(function () { delete S.fonts[key]; });
  }

  // ---------- Background and effect ----------
  function bgEl() {
    if (!isTop || !D.body) return null;
    var bg = D.getElementById('gel-yt-bg');
    if (!bg) {
      bg = D.createElement('div');
      bg.id = 'gel-yt-bg';
      bg.setAttribute('aria-hidden', 'true');
      ['picture', 'dim', 'glow'].forEach(function (k) { var d = D.createElement('div'); d.className = 'gel-yt-' + k; bg.appendChild(d); });
      var c = D.createElement('canvas'); c.className = 'gel-yt-fx'; bg.appendChild(c);
      var v = D.createElement('div'); v.className = 'gel-yt-veil'; bg.appendChild(v);
    }
    if (bg.parentNode !== D.body || D.body.firstChild !== bg) D.body.insertBefore(bg, D.body.firstChild);
    return bg;
  }
  function updateBackground() {
    var bg = bgEl();
    if (!bg) return;
    var t = S.theme, pic = t.background && t.background.picture;
    var picEl = bg.querySelector('.gel-yt-picture'), dimEl = bg.querySelector('.gel-yt-dim');
    dimEl.style.display = pic ? '' : 'none';
    if (!pic) { picEl.style.backgroundImage = ''; picEl.style.display = 'none'; }
    else {
      blobUrl(pic).then(function (u) {
        if (S.theme !== t) return;
        picEl.style.display = u ? '' : 'none';
        picEl.style.backgroundImage = u ? 'url("' + u + '")' : '';
      });
    }
    updateFx();
  }
  function updateFx() {
    var t = S.theme, bg = isTop && D.getElementById('gel-yt-bg');
    var want = t && t.effect && bg;
    if (!want) { if (S.fx) { S.fx.destroy(); S.fx = null; S.fxKey = ''; } return; }
    var cfg = { effect: t.effect.id, colors: t.effect.colors, amount: t.effect.amount, speed: t.effect.speed };
    var key = JSON.stringify(cfg);
    if (!S.fx) { S.fx = Fx.start(bg.querySelector('canvas'), cfg); S.fxKey = key; S.fxHeld = null; }
    else if (key !== S.fxKey) { S.fx.setConfig(cfg); S.fxKey = key; }
    var hold = S.playing && !(t.layout && t.layout.animateWhilePlaying);
    if (hold !== S.fxHeld) { S.fxHeld = hold; if (hold) S.fx.pause(); else S.fx.resume(); }
  }
  function mainVideoPlaying() {
    var vids = D.querySelectorAll('#movie_player video, #shorts-player video');
    for (var i = 0; i < vids.length; i++) if (!vids[i].paused && !vids[i].ended) return true;
    return false;
  }
  ['play', 'playing', 'pause', 'ended', 'emptied'].forEach(function (ev) {
    D.addEventListener(ev, function () {
      var now = mainVideoPlaying();
      if (now !== S.playing) { S.playing = now; if (S.theme) updateFx(); }
      updateCinema();
    }, true);
  });

  // Cinema mode: the page steps back while the video you're watching plays (not in full screen).
  function updateCinema() {
    var on = !!(isTop && S.theme && S.theme.layout && S.theme.layout.cinema && S.playing &&
      location.pathname === '/watch' && !D.fullscreenElement);
    if (on !== H.classList.contains('gel-cinema')) H.classList.toggle('gel-cinema', on);
  }
  D.addEventListener('fullscreenchange', updateCinema);

  // ---------- Logo ----------
  function updateLogo() {
    if (!isTop) return;
    var model = S.theme ? Core.logoModel(S.theme.logo) : null;
    var links = D.querySelectorAll('ytd-topbar-logo-renderer a#logo, ytd-topbar-logo-renderer #logo.ytd-topbar-logo-renderer');
    var key = model ? JSON.stringify(model) : '';
    for (var i = 0; i < links.length; i++) {
      var a = links[i], mine = a.querySelector(':scope > .gel-yt-logo');
      if (!model) { if (mine) mine.remove(); continue; }
      if (mine && mine.getAttribute('data-key') === key) continue;
      if (mine) mine.remove();
      mine = D.createElement('span');
      mine.className = 'gel-yt-logo';
      mine.setAttribute('data-key', key);
      if (model.image) {
        var img = D.createElement('img');
        img.alt = '';
        mine.appendChild(img);
        (function (img) { blobUrl(model.image).then(function (u) { if (u) img.src = u; else img.remove(); }); })(img);
      }
      if (model.text) {
        var tx = D.createElement('span');
        tx.className = 'gel-yt-logo-text';
        tx.textContent = model.text;
        mine.appendChild(tx);
      }
      a.appendChild(mine);
    }
  }

  // ---------- Turning a theme on and off ----------
  function apply(theme) {
    S.theme = theme;
    ensureDark();
    scanVars(true);
    writeVars();
    styleEl('gel-yt-page').textContent = Core.pageCss(theme, { frame: frame });
    if (theme.fonts) { loadFont(theme.fonts.body); loadFont(theme.fonts.heading); }
    if (isTop) { updateBackground(); updateLogo(); }
    H.setAttribute('gel-yt', theme.presetId || 'custom');
    updateCinema();
  }
  function off() {
    S.theme = null;
    removeEl('gel-yt-vars'); removeEl('gel-yt-page');
    if (S.fx) { S.fx.destroy(); S.fx = null; S.fxKey = ''; }
    removeEl('gel-yt-bg');
    updateLogo();
    if (S.addedDark) { H.removeAttribute('dark'); S.addedDark = false; }
    H.removeAttribute('gel-yt');
    S.varCss = '';
    updateCinema();
  }

  // Ad skipping is its own switch: it stays on when the theme is off.
  function setAds(on) {
    if (!isTop || !Ads) return;
    if (on && !S.ads) S.ads = Ads.start(D);
    else if (!on && S.ads) { S.ads.stop(); S.ads = null; }
  }
  // So is the volume booster.
  function setBoost(on) {
    if (!isTop || !Boost) return;
    if (on && !S.boost) S.boost = Boost.start(D);
    else if (!on && S.boost) { S.boost.stop(); S.boost = null; }
  }
  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ raw: S.raw, vars: S.varCss })); } catch (e) { /* storage blocked */ }
  }
  function handle(raw) {
    if (raw === S.raw) return;
    S.raw = raw;
    var theme = null;
    try { theme = raw ? JSON.parse(raw) : null; } catch (e) { return; } // half-written file: try again next time
    setAds(!!(theme && theme.adblock));
    setBoost(!!(theme && theme.boost));
    if (theme && theme.enabled) apply(theme); else if (S.theme || D.getElementById('gel-yt-page')) off();
    if (theme && (theme.enabled || theme.adblock || theme.boost)) saveCache();
    else { try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* storage blocked */ } }
  }

  // ---------- Keeping up with YouTube and with Gel ----------
  var polling = false;
  function poll() {
    if (polling || D.hidden) return;
    polling = true;
    var p;
    try { p = source.text('theme.json'); } catch (e) { polling = false; return; } // extension was reloaded
    p.then(handle, function () { /* keep the current theme */ }).then(function () { polling = false; });
  }
  function tidy() {
    if (!S.theme) return;
    if (scanVars(false)) writeVars();
    if (!D.getElementById('gel-yt-page')) styleEl('gel-yt-page').textContent = Core.pageCss(S.theme, { frame: frame });
    if (isTop) {
      if (!D.getElementById('gel-yt-bg') || D.body.firstChild !== D.getElementById('gel-yt-bg')) updateBackground();
      updateLogo();
    }
  }

  // Show the last theme straight away while the newest one loads.
  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached.raw) {
      S.varCss = cached.vars || '';
      if (S.varCss) styleEl('gel-yt-vars').textContent = S.varCss;
      handle(cached.raw);
    }
  } catch (e) { /* storage blocked */ }

  poll();
  setInterval(poll, 2000);
  setInterval(tidy, 1500);
  D.addEventListener('visibilitychange', function () { if (!D.hidden) poll(); });
  D.addEventListener('DOMContentLoaded', tidy);
  W.addEventListener('load', tidy);
  ['yt-navigate-finish', 'yt-page-data-updated'].forEach(function (ev) { W.addEventListener(ev, function () { S.playing = mainVideoPlaying(); updateCinema(); setTimeout(tidy, 50); }); });

  W.__gelYt = { state: S, apply: apply, off: off, handle: handle, tidy: tidy };
})();
