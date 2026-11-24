// Gel's YouTube side: pick one of the animated themes, change its colours, fonts,
// background, layout and logo, preview it in a pretend YouTube page, and apply it
// through the Gel for YouTube browser extension (main process: youtube/ipc.js).
(function () {
  const ui = window.Gel && window.Gel.ui;
  const T = window.GelYtThemes;
  const FX = window.GelYtFx;
  const G = window.Gel && window.Gel.glyphs;
  if (!ui || !T || !FX) return;
  const { toast, react, escapeHtml } = ui;
  const api = window.youtubeApi || mockApi();
  const $ = sel => document.querySelector(sel);

  const fontUrl = f => (f.file === 'outfit.woff2' || f.file === 'unbounded.woff2' ? 'fonts/' : 'roblox/fonts/') + f.file;
  const fxName = id => (FX.EFFECTS.find(e => e.id === id) || { name: 'None' }).name;
  const hex6 = c => String(c || '').replace('#', '').toUpperCase();

  // ---------- State ----------
  const loadJSON = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (_) { return fallback; }
  };
  const fromPreset = p => ({ presetId: p.id, savedId: null, custom: {} });
  const presetOf = id => T.THEMES.find(t => t.id === id) || T.THEMES[0];
  const state = {
    theme: loadJSON('gel.yt.current', null) || fromPreset(T.THEMES[0]),
    saved: loadJSON('gel.yt.saved', []),
    status: null,
    applying: false,
    pics: { logo: null, background: null },
  };
  if (!T.THEMES.some(t => t.id === state.theme.presetId)) state.theme = fromPreset(T.THEMES[0]);
  state.theme.custom = state.theme.custom || {};

  const built = () => T.buildTheme(presetOf(state.theme.presetId), state.theme.custom);
  let persistTimer = null;
  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { try { localStorage.setItem('gel.yt.current', JSON.stringify(state.theme)); } catch (_) { /* not important */ } }, 200);
  }
  function persistSaved() {
    try { localStorage.setItem('gel.yt.saved', JSON.stringify(state.saved)); } catch (_) { toast('Gel ran out of room to save more themes.', true); }
  }
  function change(patch) {
    state.theme.custom = Object.assign({}, state.theme.custom, patch);
    persist();
    renderAll();
  }
  function changeIn(key, patch) {
    change({ [key]: Object.assign({}, state.theme.custom[key] || {}, patch) });
  }

  // ---------- Fonts ----------
  const loadedFonts = new Set();
  function ensureFont(f) {
    if (!f || !f.family || !f.file) return;
    const key = f.family + '|' + (f.scale || 1);
    if (loadedFonts.has(key)) return;
    loadedFonts.add(key);
    const face = new FontFace(f.family, `url("${fontUrl(f)}")`, { sizeAdjust: Math.round((f.scale || 1) * 100) + '%' });
    face.load().then(ff => document.fonts.add(ff)).catch(() => { /* falls back to Roboto */ });
  }
  const fontStack = f => (f && f.css ? f.css : 'Roboto, Arial, sans-serif');

  // ---------- Theme colours on an element ----------
  function paint(el, th) {
    const p = th.palette;
    const set = (k, v) => el.style.setProperty(k, v);
    set('--y-bg', p.bg); set('--y-text', p.text); set('--y-text2', p.text2);
    set('--y-acc', p.accent); set('--y-acc2', p.accent2); set('--y-link', p.link); set('--y-on-acc', p.onAccent);
    ensureFont(th.fonts.body); ensureFont(th.fonts.heading);
    set('--y-font', fontStack(th.fonts.body));
    set('--y-head', fontStack(th.fonts.heading || th.fonts.body));
  }

  // A still frame of an effect on a small canvas; it moves while you hover.
  const stills = new Map();
  function pruneStills() {
    for (const [canvas, eng] of stills) if (!canvas.isConnected) { eng.destroy(); stills.delete(canvas); }
  }
  function still(canvas, effect, colors, animate, size) {
    const old = stills.get(canvas);
    if (old) old.destroy();
    if (!effect) { stills.delete(canvas); return; }
    const eng = FX.start(canvas, Object.assign({ effect, colors, amount: 0.8, speed: 1 }, size || { width: 240, height: 150 }));
    eng.pause(); eng.advance(2.5);
    stills.set(canvas, eng);
    if (animate) {
      const host = canvas.closest('button');
      if (host && !host.dataset.hoverBound) {
        host.dataset.hoverBound = '1';
        host.addEventListener('pointerenter', () => { const e = stills.get(canvas); if (e) e.resume(); });
        host.addEventListener('pointerleave', () => { const e = stills.get(canvas); if (e) e.pause(); });
      }
    }
  }

  // ---------- Theme cards ----------
  function cardHtml(th, attr, pressed, small) {
    return `<button class="chip" ${attr} aria-pressed="${pressed}" title="${escapeHtml(small)}" style="--c-accent:${th.palette.accent}">
        <span class="yt-card" data-card>
          <canvas></canvas><span class="yc-glow"></span>
          <span class="yc-top"><span class="yc-logo"></span><span class="yc-search"></span></span>
          <span class="yc-name">${escapeHtml(th.name)}</span>
          <span class="yc-vids"><span><i></i><b></b><b></b></span><span><i></i><b></b><b></b></span><span><i></i><b></b><b></b></span></span>
        </span>
        <span class="chip-label"><span class="chip-name">${escapeHtml(th.name)}</span><small>${escapeHtml(small)}</small></span>
      </button>`;
  }
  function wireCards(root, list) {
    root.querySelectorAll('[data-card]').forEach((card, i) => {
      const th = list[i];
      paint(card, th);
      still(card.querySelector('canvas'), th.effect && th.effect.id, th.effect && th.effect.colors, true);
    });
  }

  function renderGallery() {
    pruneStills();
    const sel = state.theme.savedId || state.theme.presetId;
    const presets = T.THEMES.map(p => T.buildTheme(p));
    $('#ytPresets').innerHTML = T.THEMES.map((p, i) => cardHtml(presets[i], `data-yt-preset="${p.id}"`, !state.theme.savedId && sel === p.id, p.blurb)).join('');
    wireCards($('#ytPresets'), presets);
    const saved = state.saved.map(s => T.buildTheme(presetOf(s.presetId), s.custom));
    $('#ytSaved').innerHTML = state.saved.map((s, i) => `<div class="chip-wrap">
        ${cardHtml(saved[i], `data-yt-saved="${s.id}"`, state.theme.savedId === s.id, 'Based on ' + presetOf(s.presetId).name)}
        <button class="chip-delete" data-yt-delete="${s.id}" aria-label="Delete ${escapeHtml(saved[i].name)}"><svg><use href="#i-x"/></svg></button>
      </div>`).join('');
    wireCards($('#ytSaved'), saved);
    $('#ytSavedEmpty').hidden = state.saved.length > 0;
  }

  $('#ytPresets').addEventListener('click', e => {
    const b = e.target.closest('[data-yt-preset]');
    if (!b) return;
    state.theme = fromPreset(presetOf(b.dataset.ytPreset));
    persist(); renderAll(); renderGallery(); react('happy');
  });
  $('#ytSaved').addEventListener('click', e => {
    const del = e.target.closest('[data-yt-delete]');
    if (del) {
      const s = state.saved.find(x => x.id === del.dataset.ytDelete);
      if (!s || !window.confirm(`Delete "${s.custom.name || presetOf(s.presetId).name}" from My themes?`)) return;
      state.saved = state.saved.filter(x => x !== s);
      if (state.theme.savedId === s.id) state.theme.savedId = null;
      persistSaved(); renderGallery();
      return;
    }
    const b = e.target.closest('[data-yt-saved]');
    if (!b) return;
    const s = state.saved.find(x => x.id === b.dataset.ytSaved);
    if (!s) return;
    state.theme = { presetId: s.presetId, savedId: s.id, custom: JSON.parse(JSON.stringify(s.custom)) };
    persist(); renderAll(); renderGallery();
  });

  // ---------- Colours ----------
  const SEEDS = ['bg', 'text', 'accent', 'accent2', 'link'];
  function renderColours(th) {
    const seeds = Object.assign({}, presetOf(state.theme.presetId).seeds, state.theme.custom.seeds || {});
    document.querySelectorAll('[data-yt-seed]').forEach(inp => {
      const k = inp.dataset.ytSeed;
      const v = '#' + hex6(seeds[k] || (k === 'accent2' || k === 'link' ? seeds.accent : '000000')).toLowerCase();
      if (inp.value !== v) inp.value = v;
      inp.closest('.seed-swatch').style.background = v;
    });
    const ratio = T.contrast(th.palette.text, th.palette.bg);
    const note = $('#ytContrast');
    note.hidden = ratio >= 4.5;
    note.textContent = `Text and background are close (${ratio.toFixed(1)} to 1). Pick a lighter or darker text colour so titles stay easy to read.`;
    $('#ytSeedReset').hidden = !state.theme.custom.seeds;
    $('#ytGlass').value = th.glass; $('#ytGlassOut').textContent = Math.round(th.glass * 100) + '%';
    $('#ytRadius').value = th.radius; $('#ytRadiusOut').textContent = th.radius + 'px';
  }
  document.querySelectorAll('[data-yt-seed]').forEach(inp => inp.addEventListener('input', () => {
    changeIn('seeds', { [inp.dataset.ytSeed]: hex6(inp.value) });
  }));
  $('#ytSeedReset').addEventListener('click', () => { const c = Object.assign({}, state.theme.custom); delete c.seeds; state.theme.custom = c; persist(); renderAll(); });
  $('#ytGlass').addEventListener('input', e => change({ glass: Number(e.target.value) }));
  $('#ytRadius').addEventListener('input', e => change({ radius: Number(e.target.value) }));

  // Spotify's colours and moving effect, carried over.
  const SPOTIFY_FX = { petals: 'petals', leaves: 'leaves', snow: 'snow', rain: 'storm', bubbles: 'bubbles', hearts: 'hearts', sparkles: 'sparkles', stars: 'stars', embers: 'embers', fireflies: 'fireflies', confetti: 'confetti' };
  $('#ytMatchSpotify').addEventListener('click', () => {
    const sp = ui.getSpotifyTheme && ui.getSpotifyTheme();
    if (!sp || !sp.colors) { toast("Gel couldn't find your Spotify theme.", true); return; }
    const c = sp.colors;
    const seeds = { bg: c.main, text: c.text, accent: c['button-active'] || c.button, accent2: c.button || c['button-active'], link: c.button || c['button-active'] };
    const patch = { seeds, name: (sp.name || 'Spotify') + ' for YouTube' };
    const sfx = sp.style && sp.style.fx;
    if (sfx && SPOTIFY_FX[sfx.effect]) patch.effect = Object.assign({}, state.theme.custom.effect, { id: SPOTIFY_FX[sfx.effect] });
    change(patch);
    toast('Colours copied from your Spotify theme.');
  });

  // ---------- Style ----------
  const fontOptions = () => Object.entries(T.FONTS).map(([id, f]) => `<option value="${id}">${escapeHtml(f.name)}</option>`).join('');
  $('#ytFont').innerHTML = fontOptions();
  $('#ytHeadingFont').innerHTML = fontOptions();
  $('#ytFont').addEventListener('change', e => change({ font: e.target.value }));
  $('#ytHeadingFont').addEventListener('change', e => change({ headingFont: e.target.value }));

  const FX_LIST = [{ id: 'none', name: 'None' }].concat(FX.EFFECTS);
  $('#ytFxGrid').innerHTML = FX_LIST.map(f => `<button class="yt-fx${f.id === 'none' ? ' none' : ''}" role="radio" aria-checked="false" data-yt-fx="${f.id}"><canvas></canvas><span>${escapeHtml(f.name)}</span></button>`).join('');
  let fxStillKey = '';
  let fxStillTimer = 0;
  function renderStyle(th) {
    const preset = presetOf(state.theme.presetId);
    $('#ytFont').value = state.theme.custom.font || preset.font;
    $('#ytHeadingFont').value = state.theme.custom.headingFont || preset.headingFont;
    const fxId = th.effect ? th.effect.id : 'none';
    document.querySelectorAll('[data-yt-fx]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ytFx === fxId)));
    $('#ytFxGrid').style.setProperty('--y-bg', th.palette.bg);
    const colors = th.effect ? th.effect.colors : preset.effectColors;
    const key = colors.join();
    if (key !== fxStillKey) {
      fxStillKey = key;
      // Redrawing twenty little animations is slow, so wait until colour dragging settles.
      clearTimeout(fxStillTimer);
      fxStillTimer = setTimeout(() => {
        document.querySelectorAll('[data-yt-fx]').forEach(b => { if (b.dataset.ytFx !== 'none') still(b.querySelector('canvas'), b.dataset.ytFx, colors, true, { width: 160, height: 90 }); });
      }, fxStillKey ? 250 : 0);
    }
    $('#ytFxControls').hidden = !th.effect;
    if (th.effect) {
      $('#ytFxAmount').value = th.effect.amount; $('#ytFxAmountOut').textContent = Math.round(th.effect.amount * 100) + '%';
      $('#ytFxSpeed').value = th.effect.speed; $('#ytFxSpeedOut').textContent = th.effect.speed.toFixed(1) + '×';
      $('#ytFxMine').checked = !!(state.theme.custom.effect && state.theme.custom.effect.colors);
    }
    const picOn = !!state.theme.custom.picture;
    $('#ytPicOn').checked = picOn;
    $('#ytPicWrap').hidden = !picOn;
    $('#ytDimWrap').hidden = !picOn;
    $('#ytPicThumb').style.backgroundImage = state.pics.background ? `url("${state.pics.background}")` : '';
    $('#ytDim').value = th.background.dim; $('#ytDimOut').textContent = Math.round(th.background.dim * 100) + '%';
  }
  $('#ytFxGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-yt-fx]');
    if (b) changeIn('effect', { id: b.dataset.ytFx });
  });
  $('#ytFxAmount').addEventListener('input', e => changeIn('effect', { amount: Number(e.target.value) }));
  $('#ytFxSpeed').addEventListener('input', e => changeIn('effect', { speed: Number(e.target.value) }));
  $('#ytFxMine').addEventListener('change', e => {
    const p = built().palette;
    const eff = Object.assign({}, state.theme.custom.effect);
    if (e.target.checked) eff.colors = [p.accent, p.accent2, p.link]; else delete eff.colors;
    change({ effect: eff });
  });
  $('#ytPicOn').addEventListener('change', e => {
    if (e.target.checked && !state.pics.background) { e.target.checked = false; $('#ytPicInput').click(); return; }
    change({ picture: e.target.checked });
  });
  $('#ytPicChoose').addEventListener('click', () => $('#ytPicInput').click());
  $('#ytPicInput').addEventListener('change', e => pickPicture('background', e.target, () => change({ picture: true })));
  $('#ytDim').addEventListener('input', e => change({ dim: Number(e.target.value) }));

  // Your own pictures are kept by the main process; the window shows a copy.
  async function pickPicture(kind, input, done) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const res = await api.savePicture({ kind, bytes });
    if (!res.ok) { toast(res.message, true); return; }
    if (state.pics[kind]) URL.revokeObjectURL(state.pics[kind]);
    state.pics[kind] = URL.createObjectURL(new Blob([bytes], { type: file.type || 'image/png' }));
    done();
  }
  async function loadPictures() {
    for (const kind of ['logo', 'background']) {
      try {
        const res = await api.pictureData(kind);
        if (res && res.ok) state.pics[kind] = URL.createObjectURL(new Blob([res.bytes], { type: res.mime }));
      } catch (_) { /* none yet */ }
    }
    renderAll();
  }

  // ---------- Layout ----------
  function renderLayout(th) {
    const L = th.layout;
    document.querySelectorAll('[data-yt-row]').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.ytRow) === (L.perRow || 0))));
    $('#ytHideShorts').checked = !!L.hideShorts;
    $('#ytHideAmbient').checked = !!L.hideAmbient;
    $('#ytAnimatePlaying').checked = !!L.animateWhilePlaying;
    $('#ytCinema').checked = !!L.cinema;
  }
  document.querySelectorAll('[data-yt-row]').forEach(b => b.addEventListener('click', () => changeIn('layout', { perRow: Number(b.dataset.ytRow) })));
  $('#ytHideShorts').addEventListener('change', e => changeIn('layout', { hideShorts: e.target.checked }));
  $('#ytHideAmbient').addEventListener('change', e => changeIn('layout', { hideAmbient: e.target.checked }));
  $('#ytAnimatePlaying').addEventListener('change', e => changeIn('layout', { animateWhilePlaying: e.target.checked }));
  $('#ytCinema').addEventListener('change', e => changeIn('layout', { cinema: e.target.checked }));

  // Ad blocking and the volume booster are switches for all of YouTube, separate from the
  // theme, and take effect at once.
  const SWITCHES = [
    { id: '#ytAdblock', key: 'adblock', set: on => api.setAdblock(on),
      on: 'Ads are blocked on YouTube now.', onNoExt: 'Ad blocking is on. Add the extension to Opera to use it (Setup tab).', off: 'Ads are back to normal on YouTube.' },
    { id: '#ytBoost', key: 'boost', set: on => api.setBoost(on),
      on: "The boost button is in YouTube's player now, next to the settings cog.", onNoExt: 'The volume booster is on. Add the extension to Opera to use it (Setup tab).', off: "The boost button is gone and YouTube's sound is back to normal." },
  ];
  SWITCHES.forEach(sw => $(sw.id).addEventListener('change', async e => {
    const on = e.target.checked;
    e.target.disabled = true;
    try {
      const res = await sw.set(on);
      if (res.status) state.status = res.status;
      if (!res.ok) { e.target.checked = !on; toast(res.message, true); return; }
      const added = state.status && state.status.browsers && state.status.browsers.length;
      toast(on ? (added ? sw.on : sw.onNoExt) : sw.off);
    } finally { e.target.disabled = false; renderStatus(); }
  }));

  // ---------- Logo ----------
  if (G) {
    $('#ytGlyphs').innerHTML = Object.entries(G.GLYPHS).map(([id, g]) =>
      `<button class="glyph" role="radio" data-yt-glyph="${id}" aria-checked="false" title="${escapeHtml(g.name)}" aria-label="${escapeHtml(g.name)}"><span style="--g:url('${G.glyphDataUrl(id, '000000')}')"></span></button>`).join('');
  }
  function renderLogoPane(th) {
    const L = th.logo;
    const mode = L.mode === 'picture' && !state.pics.logo ? 'keep' : L.mode;
    document.querySelectorAll('[data-yt-logo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ytLogo === mode)));
    document.querySelectorAll('[data-yt-glyph]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ytGlyph === L.glyph)));
    $('#ytGlyphs').hidden = mode !== 'emblem';
    $('#ytLogoPicWrap').hidden = mode !== 'picture';
    $('#ytLogoThumb').style.backgroundImage = state.pics.logo ? `url("${state.pics.logo}")` : '';
    const words = mode === 'emblem' || mode === 'picture' || mode === 'text';
    $('#ytLogoTextWrap').hidden = !words;
    $('#ytLogoTextLabel').textContent = mode === 'text' ? 'Words' : 'Words next to it (optional)';
    if (document.activeElement !== $('#ytLogoText')) $('#ytLogoText').value = L.text || '';
  }
  document.querySelectorAll('[data-yt-logo]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.ytLogo === 'picture' && !state.pics.logo) { $('#ytLogoInput').click(); return; }
    changeIn('logo', { mode: b.dataset.ytLogo });
  }));
  $('#ytGlyphs').addEventListener('click', e => {
    const b = e.target.closest('[data-yt-glyph]');
    if (b) changeIn('logo', { mode: 'emblem', glyph: b.dataset.ytGlyph });
  });
  $('#ytLogoText').addEventListener('input', e => changeIn('logo', { text: e.target.value.slice(0, 24) }));
  $('#ytLogoChoose').addEventListener('click', () => $('#ytLogoInput').click());
  $('#ytLogoInput').addEventListener('change', e => pickPicture('logo', e.target, () => changeIn('logo', { mode: 'picture' })));

  // ---------- Preview ----------
  const VIDEOS = [
    ['I built a tiny city for my cat', 'Mochi Builds', '1.2M views · 2 days ago', '12:04', 'linear-gradient(135deg,#ff9a76,#ff5fa2 55%,#7b2ff7)', '#ff9a76', '62%'],
    ['Lofi beats to study and relax to (3 hours)', 'Night Owl Radio', '845K views · 1 week ago', '3:02:11', 'linear-gradient(160deg,#2b5876,#4e4376)', '#4e4376', '0'],
    ['Speedrunning every level blindfolded', 'PixelPete', '3.4M views · 5 days ago', '24:51', 'linear-gradient(135deg,#f7b733,#fc4a1a)', '#fc4a1a', '0'],
    ['The ocean is way deeper than you think', 'Deep Facts', '9.1M views · 1 year ago', '9:38', 'linear-gradient(180deg,#0f2027,#2c5364 60%,#3ee0ff)', '#3ee0ff', '30%'],
    ['Making ramen from scratch in 30 minutes', 'Kitchen Kai', '512K views · 3 days ago', '18:20', 'linear-gradient(135deg,#f6d365,#fda085)', '#fda085', '0'],
    ['Top 10 synthwave tracks of the year', 'Neon Nights', '2.2M views · 4 weeks ago', '41:07', 'linear-gradient(160deg,#12061f,#ff3ea5 70%,#ffb03e)', '#ff3ea5', '0'],
    ['Painting the northern lights in one take', 'Studio Fjord', '730K views · 2 months ago', '15:42', 'linear-gradient(180deg,#03121a,#5cf2b5 70%,#3ee0ff)', '#5cf2b5', '0'],
    ['We tried every sweet in the shop', 'Snack Squad', '4.8M views · 6 days ago', '21:13', 'linear-gradient(135deg,#a1ffce,#faffd1)', '#a1ffce', '85%'],
    ['Building a castle in one night', 'Blocky Bea', '1.9M views · 3 weeks ago', '27:30', 'linear-gradient(160deg,#614385,#516395)', '#9b6bff', '0'],
    ['Rain sounds for sleeping (10 hours)', 'Calm Corner', '12M views · 2 years ago', '10:00:00', 'linear-gradient(180deg,#232526,#414345 60%,#7fb2ff)', '#7fb2ff', '0'],
  ];
  let previewFx = null;
  let previewFxKey = '';
  function renderPreview(th) {
    const el = $('#ytPreview');
    const frame = el.querySelector('.y-frame');
    paint(el, th);
    const p = th.palette;
    el.style.setProperty('--y-radius', th.radius + 'px');
    el.style.setProperty('--y-veil', rgba(p.bg, (1 - th.glass) * 0.9));
    el.style.setProperty('--y-mast', rgba(p.bg, 0.55 + (1 - th.glass) * 0.35));
    el.style.setProperty('--y-side', rgba(p.bg, 0.25 + (1 - th.glass) * 0.4));
    el.style.setProperty('--y-dim', rgba(p.bg, th.background.dim));
    frame.classList.toggle('has-pic', !!(state.theme.custom.picture && state.pics.background));
    $('#ytPrevPic').style.backgroundImage = state.pics.background ? `url("${state.pics.background}")` : '';
    frame.classList.toggle('no-shorts', !!th.layout.hideShorts);
    const cols = th.layout.perRow ? Math.min(th.layout.perRow, 5) : 3;
    el.style.setProperty('--y-cols', cols);
    $('#ytPrevGrid').innerHTML = VIDEOS.slice(0, cols * 2).map(v => `<div class="y-vid"><div class="th" style="--th:${v[4]}"><em>${v[3]}</em><u style="--w:${v[6]}"></u></div>
        <div class="meta"><span class="av" style="--av:${v[5]}"></span><div><b>${escapeHtml(v[0])}</b><small>${escapeHtml(v[1])}</small><small>${escapeHtml(v[2])}</small></div></div></div>`).join('');
    renderPreviewLogo(th);
    // The moving background
    const canvas = $('#ytFx');
    const cfg = th.effect ? { effect: th.effect.id, colors: th.effect.colors, amount: th.effect.amount, speed: th.effect.speed } : null;
    const key = JSON.stringify(cfg);
    if (!cfg) { if (previewFx) { previewFx.destroy(); previewFx = null; previewFxKey = ''; } }
    else if (!previewFx) { previewFx = FX.start(canvas, cfg); previewFxKey = key; if (ui.getApp() !== 'youtube') previewFx.pause(); }
    else if (key !== previewFxKey) { previewFx.setConfig(cfg); previewFxKey = key; }
    $('#ytBadge').innerHTML = th.effect ? `<b>${escapeHtml(fxName(th.effect.id))}</b>&nbsp;background` : 'No moving background';
    // Gel's own glow follows the theme
    if (ui.getApp() === 'youtube') {
      document.documentElement.style.setProperty('--amb-a', p.accent);
      document.documentElement.style.setProperty('--amb-b', p.accent2);
    }
  }
  function rgba(hex, a) {
    const h = hex6(hex);
    return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${Math.max(0, Math.min(1, a))})`;
  }
  const YT_LOGO = '<span class="yl-yt"><svg viewBox="0 0 28 20"><rect width="28" height="20" rx="5.5" fill="#FF0033"/><path d="M11 6v8l7-4z" fill="#fff"/></svg>YouTube</span>';
  function renderPreviewLogo(th) {
    const L = th.logo;
    const box = $('#ytPrevLogo');
    const mode = L.mode === 'picture' && !state.pics.logo ? 'keep' : L.mode;
    const text = String(L.text || '').trim();
    let html = '';
    if (mode === 'keep') html = YT_LOGO;
    else if (mode === 'emblem' && G) html = `<span class="yl-emblem" style="--g:url('${G.glyphDataUrl(L.glyph || 'gel', '000000')}')"></span>`;
    else if (mode === 'picture') html = `<img src="${escapeHtml(state.pics.logo)}" alt="">`;
    if (mode === 'text') html += `<span class="yl-text">${escapeHtml(text || 'YouTube')}</span>`;
    else if ((mode === 'emblem' || mode === 'picture') && text) html += `<span class="yl-text">${escapeHtml(text)}</span>`;
    box.innerHTML = html;
  }

  // ---------- Everything ----------
  function renderAll() {
    const th = built();
    if (document.activeElement !== $('#ytName')) $('#ytName').value = th.name;
    renderColours(th);
    renderStyle(th);
    renderLayout(th);
    renderLogoPane(th);
    renderPreview(th);
  }
  $('#ytName').addEventListener('input', e => change({ name: e.target.value.slice(0, 40) }));

  $('#ytSave').addEventListener('click', () => {
    const th = built();
    const name = th.name;
    const existing = state.theme.savedId && state.saved.find(s => s.id === state.theme.savedId);
    if (existing) {
      existing.custom = JSON.parse(JSON.stringify(state.theme.custom));
      existing.presetId = state.theme.presetId;
    } else {
      const id = 'yt-' + Date.now().toString(36);
      state.saved.unshift({ id, presetId: state.theme.presetId, custom: JSON.parse(JSON.stringify(state.theme.custom)) });
      state.theme.savedId = id;
    }
    persistSaved(); persist(); renderGallery();
    toast(`Saved "${name}" to My themes`);
    react('happy');
  });

  function setWorking(btn, on, label) {
    btn.classList.toggle('working', on);
    btn.disabled = on;
    if (label) btn.querySelector('.btn-label').textContent = label;
  }
  $('#ytApply').addEventListener('click', async () => {
    if (state.applying) return;
    state.applying = true;
    const btn = $('#ytApply');
    setWorking(btn, true, 'Applying…');
    try {
      const custom = Object.assign({}, state.theme.custom);
      if (custom.logo && custom.logo.mode === 'picture' && !state.pics.logo) custom.logo = Object.assign({}, custom.logo, { mode: 'keep' });
      if (custom.picture && !state.pics.background) custom.picture = false;
      const res = await api.apply({ presetId: state.theme.presetId, custom });
      state.status = res.status || state.status;
      const added = state.status && state.status.browsers && state.status.browsers.length;
      toast(res.ok && !added ? 'Theme ready. Add the extension to Opera once to see it.' : res.message, !res.ok);
      react(res.ok ? 'happy' : 'sad');
      if (res.ok && !added) ui.showTab('yt-setup');
    } catch (err) {
      toast(`Something went wrong: ${err.message}`, true);
      react('sad');
    } finally {
      state.applying = false;
      setWorking(btn, false, 'Apply to YouTube');
      renderStatus();
    }
  });
  $('#ytOff').addEventListener('click', async () => {
    const btn = $('#ytOff');
    btn.disabled = true;
    try {
      const res = await api.off();
      state.status = res.status || state.status;
      toast(res.message, !res.ok);
    } finally { btn.disabled = false; renderStatus(); }
  });

  // ---------- Setup ----------
  async function refreshStatus() {
    try { state.status = await api.status(); } catch (_) { state.status = null; }
    renderStatus();
  }
  function renderStatus() {
    renderSteps();
    SWITCHES.forEach(sw => {
      if (state.status && typeof state.status[sw.key] === 'boolean' && document.activeElement !== $(sw.id)) $(sw.id).checked = state.status[sw.key];
    });
    if (ui.getApp() !== 'youtube') return;
    const s = state.status;
    const pill = $('#statusPill');
    const text = $('#statusText');
    if (!s) { pill.dataset.state = 'missing'; text.textContent = "Couldn't check"; return; }
    const added = s.browsers && s.browsers.length;
    if (!s.installed || !added) { pill.dataset.state = 'missing'; text.textContent = 'Add the extension'; }
    else if (s.needsReload) { pill.dataset.state = 'missing'; text.textContent = 'Reload the extension'; }
    else { pill.dataset.state = 'ready'; text.textContent = s.enabled ? 'YouTube theme is on' : 'Ready to apply'; }
  }
  function renderSteps() {
    const s = state.status;
    if (!s) return;
    const steps = [];
    const added = s.browsers || [];
    const folder = `<code>${escapeHtml(s.dir)}</code>`;
    if (s.installed) steps.push(`<li class="step done"><h4>Gel made the extension</h4><p>It lives in ${folder}. Leave it there: your browser reads it from that folder.</p></li>`);
    else steps.push(`<li class="step todo"><h4>Make the extension</h4><p>Press Apply to YouTube, or Open extension folder below, and Gel puts it in ${folder}.</p></li>`);
    if (added.length) {
      steps.push(`<li class="step done"><h4>Added to ${escapeHtml(added.join(' and '))}</h4><p>Gel for YouTube is switched on there. New themes show up on YouTube by themselves within a couple of seconds.</p></li>`);
    } else {
      steps.push(`<li class="step todo"><h4>Add it to Opera (once)</h4><p>1. In Opera, go to <code>opera://extensions</code><br>2. Turn on <b>Developer mode</b> at the top right<br>3. Click <b>Load unpacked</b> and pick the <b>YouTube extension</b> folder in Documents\\Gel</p>
        <div class="row-actions"><button class="btn small" data-yt-act="copy-url">Copy opera://extensions</button><button class="btn small ghost" data-yt-act="copy-path">Copy folder path</button></div></li>`);
    }
    if (s.needsReload) {
      steps.push(`<li class="step todo"><h4>Reload the extension</h4><p>Gel updated the extension's code. In <code>opera://extensions</code>, press the round reload arrow on <b>Gel for YouTube</b>, then refresh YouTube.</p>
        <div class="row-actions"><button class="btn small" data-yt-act="reloaded">Done</button></div></li>`);
    }
    if (s.enabled && s.name && added.length) steps.push(`<li class="step done"><h4>"${escapeHtml(s.name)}" is on YouTube</h4><p>Open YouTube in ${escapeHtml(added[0])} to see it. Already open? It changes by itself, no refresh needed.</p></li>`);
    else if (s.enabled && s.name) steps.push(`<li class="step"><h4>"${escapeHtml(s.name)}" is ready</h4><p>It shows up on YouTube as soon as the extension is added.</p></li>`);
    else steps.push('<li class="step"><h4>Apply a theme</h4><p>Pick one, make it yours, then press Apply to YouTube at the bottom.</p></li>');
    $('#ytSteps').innerHTML = steps.join('');
  }
  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); toast(done); } catch (_) { toast("Gel couldn't copy that. Type it in by hand.", true); }
  }
  $('#ytSteps').addEventListener('click', async e => {
    const b = e.target.closest('[data-yt-act]');
    if (!b) return;
    const act = b.dataset.ytAct;
    if (act === 'copy-url') copy('opera://extensions', 'Copied. Paste it into Opera\'s address bar.');
    else if (act === 'copy-path') copy(state.status ? state.status.dir : '', 'Folder path copied');
    else if (act === 'reloaded') { const r = await api.ackReload(); state.status = r.status || state.status; renderStatus(); }
  });
  $('#ytRecheck').addEventListener('click', async () => { await refreshStatus(); toast('Checked'); });
  $('#ytOpenFolder').addEventListener('click', async () => {
    const r = await api.openFolder();
    if (r && !r.ok) toast(r.message, true);
    refreshStatus();
  });
  $('#ytOpenYoutube').addEventListener('click', () => api.openYoutube());

  window.addEventListener('gel:app', e => {
    if (e.detail === 'youtube') {
      renderAll();
      if (previewFx) previewFx.resume();
      refreshStatus();
    } else if (previewFx) previewFx.pause();
  });
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { if (t.dataset.tab === 'yt-setup') refreshStatus(); }));

  // ---------- Start ----------
  renderGallery();
  renderAll();
  loadPictures();
  refreshStatus();
  if (ui.getApp() !== 'youtube' && previewFx) previewFx.pause();

  // ---------- Browser stand-in (only used outside the desktop app) ----------
  function mockApi() {
    const pics = {};
    let theme = null;
    let adblock = true, boost = true;
    const status = () => ({ adblock, boost, installed: !!theme, enabled: !!(theme && theme.on), name: theme && theme.on ? theme.name : null, version: '1.0.0', needsReload: false, dir: 'C:\\Users\\you\\Documents\\Gel\\YouTube extension', themes: T.THEMES.length, browsers: theme ? ['Opera'] : [] });
    return {
      status: async () => status(),
      apply: async p => { theme = { on: true, name: T.buildTheme(presetOf(p.presetId), p.custom).name }; return { ok: true, message: 'Preview mode: open Gel as a desktop app to change YouTube.', status: status() }; },
      off: async () => { if (theme) theme.on = false; return { ok: true, message: 'Preview mode: nothing changed.', status: status() }; },
      openFolder: async () => ({ ok: true }),
      openYoutube: async () => ({ ok: true }),
      savePicture: async ({ kind, bytes }) => { pics[kind] = bytes; return { ok: true }; },
      pictureData: async kind => (pics[kind] ? { ok: true, bytes: pics[kind], mime: 'image/png' } : { ok: false }),
      clearPicture: async kind => { delete pics[kind]; return { ok: true }; },
      ackReload: async () => ({ ok: true, status: status() }),
      setAdblock: async on => { adblock = !!on; return { ok: true, status: status() }; },
      setBoost: async on => { boost = !!on; return { ok: true, status: status() }; },
    };
  }
})();
