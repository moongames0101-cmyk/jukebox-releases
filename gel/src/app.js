(function () {
  const { color: C, themegen: T, presets: { PRESETS, GROUPS }, picture, fx: FX } = window.Gel;
  const api = window.gelApi || mockApi();

  const LS_CURRENT = 'gel.v1.current';
  const LS_SAVED = 'gel.v1.saved';
  const $ = sel => document.querySelector(sel);
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- State ----------
  function themeFrom(src, extra) {
    return Object.assign({
      name: src.name,
      colors: T.sanitizeColors(src.colors),
      style: T.sanitizeStyle(src.style),
      sourceId: src.id || null,
      savedId: null,
    }, extra || {});
  }

  function loadJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (_) { return fallback; }
  }

  const state = {
    theme: null,
    saved: loadJSON(LS_SAVED, []),
    selected: null,
    mode: 'dark',
    filter: loadJSON('gel.v1.filter', 'all'),
    status: null,
    applying: false,
  };
  const stored = loadJSON(LS_CURRENT, null);
  if (stored && stored.colors) {
    state.theme = themeFrom(stored, { sourceId: stored.sourceId || null, savedId: stored.savedId || null });
    state.selected = stored.savedId || stored.sourceId || null;
  } else {
    state.theme = themeFrom(PRESETS.find(p => p.id === 'night-drive'));
    state.selected = 'night-drive';
  }
  state.mode = C.isDark(state.theme.colors.main) ? 'dark' : 'light';

  let persistTimer = null;
  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try { localStorage.setItem(LS_CURRENT, JSON.stringify(state.theme)); }
      catch (_) { toast('Gel ran out of room to remember this picture. Try a smaller one.', true); }
    }, 250);
  }
  function persistSaved() {
    try { localStorage.setItem(LS_SAVED, JSON.stringify(state.saved)); return true; }
    catch (_) { toast('Gel ran out of room to save more pictures. Remove the picture from an older theme, then save again.', true); return false; }
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg, bad) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('bad', !!bad);
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, bad ? 7000 : 4200);
  }

  // ---------- Tabs ----------
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    document.querySelectorAll('.pane').forEach(p => { p.hidden = p.dataset.pane !== name; });
    $('.panel').scrollTop = 0;
    if (name === 'setup') refreshStatus();
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  $('#statusPill').addEventListener('click', () => showTab('setup'));

  // ---------- Preview ----------
  const loadedFonts = new Set();
  function ensureFont(id) {
    if (!id || id === 'default' || id === 'custom' || loadedFonts.has(id)) return;
    const url = T.googleFontsUrl(id);
    if (!url) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    loadedFonts.add(id);
  }

  function renderPreview() {
    const el = $('#preview');
    const { colors, style } = state.theme;
    for (const { key } of T.COLOR_KEYS) {
      el.style.setProperty(`--spice-${key}`, `#${colors[key]}`);
      el.style.setProperty(`--spice-rgb-${key}`, C.rgbString(colors[key]));
    }
    ensureFont(style.font);
    const family = T.fontFamilyFor(style);
    el.style.setProperty('--p-font', family ? `"${family}", 'Segoe UI', system-ui, sans-serif` : `'Segoe UI', system-ui, sans-serif`);
    const heading = T.headingFamilyFor(style);
    ensureFont(style.headingFont);
    el.style.setProperty('--p-heading-font', heading ? `"${heading}", var(--p-font)` : 'var(--p-font)');
    el.style.setProperty('--p-radius', `${style.radius}px`);
    el.classList.toggle('glow', style.glow);
    const frame = el.querySelector('.p-frame');
    const behind = style.fx.effect !== 'none' && style.fx.layer === 'behind';
    if (style.bgImage) {
      const d = C.rgbString(colors.shadow);
      frame.style.backgroundImage = `linear-gradient(rgba(${d}, ${style.bgDim}), rgba(${d}, ${style.bgDim})), url("${style.bgImage}")`;
      el.classList.add('has-bg');
    } else {
      frame.style.backgroundImage = '';
      el.classList.remove('has-bg');
    }
    const seeThrough = !!style.bgImage || behind;
    el.style.setProperty('--p-alpha', seeThrough ? String(style.panelOpacity) : '1');
    el.style.setProperty('--p-blur', seeThrough ? `${style.bgBlur}px` : '0px');
    el.classList.toggle('fx-behind', behind);
    renderPreviewFx();
    renderContrast();
  }

  let fxEngine = null;
  let fxKey = '';
  function renderPreviewFx() {
    const cfg = FX.engineConfig(state.theme.colors, state.theme.style.fx);
    const key = JSON.stringify(cfg);
    if (key === fxKey) return;
    fxKey = key;
    if (fxEngine) fxEngine.destroy();
    fxEngine = FX.gelFxEngine($('#previewFx'), cfg);
  }

  function renderContrast() {
    const { colors } = state.theme;
    const ratio = C.contrast(colors.text, colors.main);
    const sub = C.contrast(colors.subtext, colors.main);
    const badge = $('#contrastBadge');
    const low = ratio < 4.5 || sub < 3;
    badge.className = 'contrast-badge' + (low ? ' low' : '');
    badge.innerHTML = `Text contrast <b>${ratio.toFixed(1)} to 1</b>${low ? ', may be hard to read' : ''}`;
    const note = $('#contrastNote');
    if (low) {
      note.hidden = false;
      note.textContent = ratio < 4.5
        ? 'Main text is hard to read on this background. Make one of them lighter or darker.'
        : 'Secondary text is faint on this background. Try making it closer to the main text colour.';
    } else note.hidden = true;
  }

  // ---------- Gallery ----------
  function chipHtml(t) {
    const c = T.sanitizeColors(t.colors);
    const style = [
      `--c-main:#${c.main}`, `--c-frame:#${c.sidebar}`, `--c-text:#${c.text}`,
      `--c-subtext:#${c.subtext}`, `--c-accent:#${c['button-active']}`, `--c-player:#${c.player}`,
    ].join(';');
    const fx = t.style && t.style.fx ? FX.sanitizeFx(t.style.fx) : null;
    let deco = '';
    if (fx && fx.effect !== 'none') {
      const fc = '#' + (fx.color || FX.autoColor(fx.effect, c));
      deco = `<span class="chip-fx fx-${fx.effect}" style="--c-fx:${fc}"><i></i><i></i><i></i><i></i></span>`;
    }
    return `<span class="chip-field" style="${style}"><span class="chip-frame"></span><span class="chip-lines"><i></i><i></i><i></i></span>${deco}<span class="chip-dot"></span><span class="chip-player"></span></span>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function chipFont(t) {
    const st = t.style || {};
    if (st.headingFont && st.headingFont !== 'same' && T.isWebFont(st.headingFont)) return st.headingFont;
    if (st.font === 'custom' && st.customFont) return st.customFont;
    if (T.isWebFont(st.font)) return st.font;
    return null;
  }

  function chipButton(t, attr, small) {
    const font = chipFont(t);
    if (font && T.isWebFont(font)) ensureFont(font);
    const fontStyle = font ? ` style="--chip-font:'${escapeHtml(font)}', var(--display)"` : '';
    return `<button class="chip" ${attr} aria-pressed="${state.selected === t.id}" title="${escapeHtml(t.blurb || t.name)}">
        ${chipHtml(t)}
        <span class="chip-label"><span class="chip-name"${fontStyle}>${escapeHtml(t.name)}</span><small>${escapeHtml(small)}</small></span>
      </button>`;
  }

  function renderGallery() {
    const counts = Object.fromEntries(GROUPS.map(g => [g.id, PRESETS.filter(p => p.group === g.id).length]));
    if (state.filter !== 'all' && !counts[state.filter]) state.filter = 'all';
    $('#groupFilters').innerHTML = [{ id: 'all', short: 'All' }].concat(GROUPS).map(g =>
      `<button class="filter" role="radio" data-filter="${g.id}" aria-checked="${state.filter === g.id}">${escapeHtml(g.short)}<small>${g.id === 'all' ? PRESETS.length : counts[g.id]}</small></button>`).join('');
    $('#presetGroups').innerHTML = GROUPS.filter(g => state.filter === 'all' || state.filter === g.id).map(g => `
      <h3 class="group-title">${escapeHtml(g.name)} <small>${counts[g.id]} themes</small></h3>
      <div class="swatchbook">${PRESETS.filter(p => p.group === g.id).map(p => chipButton(p, `data-preset="${p.id}"`, p.blurb)).join('')}</div>`).join('');
    $('#savedGrid').innerHTML = state.saved.map(s => `
      <div class="chip-wrap">
        ${chipButton(s, `data-saved="${s.id}"`, s.style && s.style.bgImage ? 'With picture' : 'Saved theme')}
        <button class="chip-delete" data-delete="${s.id}" aria-label="Delete ${escapeHtml(s.name)}"><svg><use href="#i-x"/></svg></button>
      </div>`).join('');
    $('#savedEmpty').hidden = state.saved.length > 0;
  }

  $('#groupFilters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (!b || b.dataset.filter === state.filter) return;
    state.filter = b.dataset.filter;
    try { localStorage.setItem('gel.v1.filter', JSON.stringify(state.filter)); } catch (_) { /* not important */ }
    renderGallery();
  });

  $('#presetGroups').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    const p = PRESETS.find(x => x.id === b.dataset.preset);
    loadTheme(themeFrom(p), p.id);
  });
  $('#savedGrid').addEventListener('click', e => {
    const del = e.target.closest('[data-delete]');
    if (del) {
      const s = state.saved.find(x => x.id === del.dataset.delete);
      if (!s || !window.confirm(`Delete "${s.name}" from My themes?`)) return;
      state.saved = state.saved.filter(x => x.id !== s.id);
      if (state.theme.savedId === s.id) state.theme.savedId = null;
      persistSaved(); renderGallery(); toast(`Deleted "${s.name}"`);
      return;
    }
    const b = e.target.closest('[data-saved]');
    if (!b) return;
    const s = state.saved.find(x => x.id === b.dataset.saved);
    if (s) loadTheme(themeFrom(s, { sourceId: s.sourceId || null, savedId: s.id }), s.id);
  });

  function loadTheme(theme, selectedId) {
    state.theme = theme;
    state.selected = selectedId || null;
    state.mode = C.isDark(theme.colors.main) ? 'dark' : 'light';
    renderAll();
    persist();
  }

  // ---------- Colours ----------
  function renderColourList() {
    const groups = {};
    for (const k of T.COLOR_KEYS) (groups[k.group] = groups[k.group] || []).push(k);
    $('#colorList').innerHTML = Object.entries(groups).map(([g, keys]) => `
      <h4>${g}</h4>
      ${keys.map(k => `
        <div class="cl-row">
          <label class="cl-swatch" data-swatch="${k.key}" title="Pick a colour for ${escapeHtml(k.label)}"><input type="color" data-color="${k.key}" aria-label="${escapeHtml(k.label)}"></label>
          <span class="cl-text"><b>${escapeHtml(k.label)}</b><small>${escapeHtml(k.hint)}</small></span>
          <input class="cl-hex" data-hex="${k.key}" maxlength="7" spellcheck="false" aria-label="${escapeHtml(k.label)} hex code">
        </div>`).join('')}`).join('');
  }

  function syncColourInputs() {
    const { colors } = state.theme;
    for (const { key } of T.COLOR_KEYS) {
      const sw = document.querySelector(`[data-swatch="${key}"]`);
      const ci = document.querySelector(`[data-color="${key}"]`);
      const hx = document.querySelector(`[data-hex="${key}"]`);
      sw.style.background = `#${colors[key]}`;
      ci.value = `#${colors[key].toLowerCase()}`;
      if (document.activeElement !== hx) { hx.value = `#${colors[key]}`; hx.classList.remove('invalid'); }
    }
    $('#seedBg').value = `#${colors.main.toLowerCase()}`;
    $('#seedText').value = `#${colors.text.toLowerCase()}`;
    $('#seedAccent').value = `#${colors['button-active'].toLowerCase()}`;
    paintSeeds();
    document.querySelectorAll('.segmented [data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === state.mode)));
  }

  function paintSeeds() {
    for (const id of ['seedBg', 'seedText', 'seedAccent']) {
      const input = document.getElementById(id);
      input.parentElement.style.background = input.value;
    }
  }

  function setColour(key, hex) {
    const h = C.normHex(hex);
    if (!h) return false;
    state.theme.colors[key] = h;
    const sw = document.querySelector(`[data-swatch="${key}"]`);
    if (sw) sw.style.background = `#${h}`;
    renderPreview();
    persist();
    return true;
  }

  $('#colorList').addEventListener('input', e => {
    const key = e.target.dataset.color || e.target.dataset.hex;
    if (!key) return;
    if (e.target.dataset.color) {
      setColour(key, e.target.value);
      document.querySelector(`[data-hex="${key}"]`).value = `#${C.normHex(e.target.value)}`;
    } else {
      const ok = setColour(key, e.target.value);
      e.target.classList.toggle('invalid', !ok && e.target.value.replace('#', '').length >= 3);
      if (ok) document.querySelector(`[data-color="${key}"]`).value = `#${C.normHex(e.target.value).toLowerCase()}`;
    }
  });
  $('#colorList').addEventListener('focusout', e => {
    if (e.target.dataset.hex) { e.target.value = `#${state.theme.colors[e.target.dataset.hex]}`; e.target.classList.remove('invalid'); }
  });
  $('#colorList').addEventListener('change', e => {
    if (e.target.dataset.color) renderGallery();
  });

  document.querySelectorAll('.segmented [data-mode]').forEach(b => b.addEventListener('click', () => {
    if (state.mode === b.dataset.mode) return;
    state.mode = b.dataset.mode;
    // Flip to a sensible starting pair for the new brightness
    const accent = C.normHex($('#seedAccent').value);
    if (state.mode === 'light') { $('#seedBg').value = '#f4f6f8'; $('#seedText').value = '#18202a'; }
    else { $('#seedBg').value = '#14161b'; $('#seedText').value = '#eef0f4'; }
    $('#seedAccent').value = `#${accent.toLowerCase()}`;
    document.querySelectorAll('.segmented [data-mode]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    buildFromSeeds();
  }));
  ['seedBg', 'seedText', 'seedAccent'].forEach(id => document.getElementById(id).addEventListener('input', paintSeeds));

  function buildFromSeeds() {
    state.theme.colors = T.generatePalette({
      mode: state.mode,
      bg: $('#seedBg').value, text: $('#seedText').value, accent: $('#seedAccent').value,
    });
    state.selected = state.theme.savedId || null;
    syncColourInputs(); renderPreview(); renderGallery(); persist();
  }
  $('#buildPalette').addEventListener('click', () => { buildFromSeeds(); toast('Built a full palette from your three colours'); });

  $('#alsoBgWrap').hidden = false;
  $('#fromPicture').addEventListener('click', () => $('#pictureInput').click());
  $('#pictureInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { seed, dataUrl } = await picture.analyse(file, state.mode);
      state.theme.colors = T.generatePalette(seed);
      if ($('#alsoBg').checked) {
        state.theme.style.bgImage = dataUrl;
        if (state.theme.style.panelOpacity > 0.85) state.theme.style.panelOpacity = 0.72;
      }
      state.selected = state.theme.savedId || null;
      renderAll(); persist();
      toast($('#alsoBg').checked ? 'Made a theme from your picture and set it as the background' : 'Made a palette from your picture');
    } catch (err) {
      toast(err.message || "Gel couldn't read that picture.", true);
    }
  });

  // ---------- Style ----------
  function fontOptions(forHeadings) {
    const groups = [];
    for (const f of T.FONTS) {
      if (forHeadings && (f.id === 'default' || f.id === 'custom')) continue;
      let g = groups.find(x => x.name === f.group);
      if (!g) groups.push(g = { name: f.group, fonts: [] });
      g.fonts.push(f);
    }
    const head = forHeadings ? '<option value="same">Same as main font</option>' : '';
    return head + groups.map(g => `<optgroup label="${escapeHtml(g.name)}">${g.fonts.map(f =>
      `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}${!forHeadings && f.display ? ' (best for headings)' : ''}</option>`).join('')}</optgroup>`).join('');
  }
  $('#fontSelect').innerHTML = fontOptions(false);
  $('#headingFontSelect').innerHTML = fontOptions(true);

  function syncStyleInputs() {
    const s = state.theme.style;
    $('#fontSelect').value = s.font;
    $('#headingFontSelect').value = s.headingFont;
    $('#customFont').hidden = s.font !== 'custom';
    $('#customFont').value = s.customFont;
    $('#fontHelp').textContent = s.font === 'custom'
      ? 'Type the name of a font installed on this PC.'
      : s.font === 'default' ? "Keeps Spotify's own font." : 'Fonts download from Google Fonts the first time Spotify opens.';
    $('#radius').value = s.radius; $('#radiusOut').textContent = `${s.radius} px`;
    $('#glow').checked = s.glow;
    const thumb = $('#bgThumb');
    thumb.style.backgroundImage = s.bgImage ? `url("${s.bgImage}")` : '';
    thumb.classList.toggle('has', !!s.bgImage);
    $('#bgRemove').hidden = !s.bgImage;
    $('#bgChoose').textContent = s.bgImage ? 'Change picture…' : 'Choose picture…';
    $('#bgDimWrap').hidden = !s.bgImage;
    $('#seeThroughWrap').hidden = !(s.bgImage || (s.fx.effect !== 'none' && s.fx.layer === 'behind'));
    $('#bgDim').value = s.bgDim; $('#bgDimOut').textContent = `${Math.round(s.bgDim * 100)}%`;
    $('#panelOpacity').value = s.panelOpacity; $('#panelOpacityOut').textContent = `${Math.round((1 - s.panelOpacity) * 100)}%`;
    $('#bgBlur').value = s.bgBlur; $('#bgBlurOut').textContent = s.bgBlur ? `${s.bgBlur} px` : 'Off';
    if (document.activeElement !== $('#customCSS')) $('#customCSS').value = s.customCSS;

    const fx = s.fx;
    $('#fxEffect').value = fx.effect;
    $('#fxControls').hidden = fx.effect === 'none';
    $('#fxAmount').value = fx.amount; $('#fxAmountOut').textContent = `${Math.round(fx.amount * 100)}%`;
    $('#fxSpeed').value = fx.speed; $('#fxSpeedOut').textContent = `${fx.speed.toFixed(1)}×`;
    const fxHex = fx.color || FX.autoColor(fx.effect === 'none' ? 'petals' : fx.effect, state.theme.colors);
    $('#fxColor').value = `#${fxHex.toLowerCase()}`;
    $('#fxSwatch').style.background = `#${fxHex}`;
    $('#fxColorNote').textContent = fx.color ? 'Your pick' : 'Follows your accent';
    $('#fxColorReset').hidden = !fx.color;
    document.querySelectorAll('[data-layer]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.layer === fx.layer)));
    $('#fxHelp').textContent = fx.layer === 'behind' && fx.effect !== 'none'
      ? "Behind the panels, the animation shows in the gaps and through see-through panels. If you can't see it in Spotify, switch to In front."
      : 'Falling petals, snow or fireflies drift across Spotify. They stop if animation effects are turned off in Windows.';
  }

  function styleChanged() { syncStyleInputs(); renderPreview(); persist(); }

  $('#fontSelect').addEventListener('change', e => { state.theme.style.font = e.target.value; styleChanged(); });
  $('#headingFontSelect').addEventListener('change', e => { state.theme.style.headingFont = e.target.value; styleChanged(); });
  $('#customFont').addEventListener('input', e => { state.theme.style.customFont = e.target.value.replace(/[^\w \-]/g, ''); renderPreview(); persist(); });
  $('#radius').addEventListener('input', e => { state.theme.style.radius = Number(e.target.value); styleChanged(); });
  $('#glow').addEventListener('change', e => { state.theme.style.glow = e.target.checked; styleChanged(); });
  $('#bgDim').addEventListener('input', e => { state.theme.style.bgDim = Number(e.target.value); styleChanged(); });
  $('#panelOpacity').addEventListener('input', e => { state.theme.style.panelOpacity = Number(e.target.value); styleChanged(); });
  $('#bgBlur').addEventListener('input', e => { state.theme.style.bgBlur = Number(e.target.value); styleChanged(); });
  $('#customCSS').addEventListener('input', e => { state.theme.style.customCSS = e.target.value; persist(); });
  $('#bgChoose').addEventListener('click', () => $('#bgInput').click());
  $('#bgRemove').addEventListener('click', () => { state.theme.style.bgImage = null; styleChanged(); });
  $('#bgInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      state.theme.style.bgImage = await picture.shrink(file);
      if (state.theme.style.panelOpacity > 0.85) state.theme.style.panelOpacity = 0.72;
      styleChanged();
    } catch (err) { toast(err.message, true); }
  });

  $('#fxEffect').innerHTML = FX.EFFECTS.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  function fxChanged(patch) {
    state.theme.style.fx = FX.sanitizeFx(Object.assign({}, state.theme.style.fx, patch));
    styleChanged();
    renderGallery();
  }
  $('#fxEffect').addEventListener('change', e => fxChanged({ effect: e.target.value }));
  $('#fxAmount').addEventListener('input', e => fxChanged({ amount: Number(e.target.value) }));
  $('#fxSpeed').addEventListener('input', e => fxChanged({ speed: Number(e.target.value) }));
  $('#fxColor').addEventListener('input', e => fxChanged({ color: e.target.value }));
  $('#fxColorReset').addEventListener('click', () => fxChanged({ color: null }));
  document.querySelectorAll('[data-layer]').forEach(b => b.addEventListener('click', () => fxChanged({ layer: b.dataset.layer })));

  // ---------- Name ----------
  $('#themeName').addEventListener('input', e => { state.theme.name = e.target.value; persist(); });
  $('#themeName').addEventListener('blur', e => {
    if (!e.target.value.trim()) { state.theme.name = 'My theme'; e.target.value = state.theme.name; persist(); }
  });

  // ---------- Save / export / import ----------
  $('#saveTheme').addEventListener('click', () => {
    const t = state.theme;
    let name = (t.name || 'My theme').trim();
    const existing = t.savedId && state.saved.find(s => s.id === t.savedId);
    if (!existing && PRESETS.some(p => p.name === name)) name = `My ${name}`;
    const record = { id: existing ? existing.id : `my-${Date.now().toString(36)}`, name, colors: clone(t.colors), style: clone(t.style), sourceId: t.sourceId || null };
    const before = clone(state.saved);
    if (existing) state.saved = state.saved.map(s => s.id === existing.id ? record : s);
    else state.saved.unshift(record);
    if (!persistSaved()) { state.saved = before; return; }
    t.name = name; t.savedId = record.id; state.selected = record.id;
    $('#themeName').value = name;
    persist(); renderGallery();
    toast(existing ? `Updated "${name}" in My themes` : `Saved "${name}" to My themes`);
  });

  $('#exportTheme').addEventListener('click', async () => {
    const t = state.theme;
    const res = await api.exportTheme({ name: t.name, colors: t.colors, style: t.style });
    if (res && res.ok) toast(res.message || 'Exported');
    else if (res && !res.canceled) toast(res.message || 'Export failed', true);
  });

  $('#importTheme').addEventListener('click', async () => {
    const res = await api.importTheme();
    if (!res || res.canceled) return;
    if (!res.ok) { toast(res.message, true); return; }
    loadTheme(themeFrom({ name: res.theme.name || 'Imported theme', colors: res.theme.colors, style: res.theme.style }), null);
    toast(`Imported "${state.theme.name}". Save it to keep it in My themes.`);
  });

  // ---------- Apply / restore ----------
  function setWorking(btn, on, label) {
    btn.classList.toggle('working', on);
    btn.disabled = on;
    if (label) btn.querySelector('.btn-label').textContent = label;
  }

  $('#applyTheme').addEventListener('click', async () => {
    if (state.applying) return;
    state.applying = true;
    const btn = $('#applyTheme');
    setWorking(btn, true, 'Applying…');
    openLog();
    try {
      const t = state.theme;
      const res = await api.apply({ name: t.name, colorIni: T.buildColorIni(t), userCss: T.buildUserCss(t), themeJs: T.buildThemeJs(t) });
      toast(res.message, !res.ok);
      if (res.needsSpicetify) showTab('setup');
    } catch (err) {
      toast(`Something went wrong: ${err.message}`, true);
    } finally {
      state.applying = false;
      setWorking(btn, false, 'Apply to Spotify');
      refreshStatus();
    }
  });

  $('#restoreSpotify').addEventListener('click', async () => {
    if (!window.confirm('Remove the theme and put Spotify back to how it normally looks? Your saved Gel themes stay here.')) return;
    const btn = $('#restoreSpotify');
    btn.disabled = true;
    openLog();
    try {
      const res = await api.restore();
      toast(res.message, !res.ok);
    } finally { btn.disabled = false; refreshStatus(); }
  });

  // ---------- Log ----------
  const logBody = $('#logBody');
  function openLog() { $('#log').hidden = false; $('#logToggle').textContent = 'Hide log'; }
  function closeLog() { $('#log').hidden = true; $('#logToggle').textContent = 'Show log'; }
  $('#logToggle').addEventListener('click', () => ($('#log').hidden ? openLog() : closeLog()));
  $('#logClose').addEventListener('click', closeLog);
  api.onLog(({ line, kind }) => {
    const span = document.createElement('span');
    span.className = kind === 'cmd' ? 'l-cmd' : kind === 'ok' ? 'l-ok' : kind === 'err' ? 'l-err' : '';
    span.textContent = line + '\n';
    logBody.appendChild(span);
    while (logBody.childNodes.length > 500) logBody.removeChild(logBody.firstChild);
    logBody.scrollTop = logBody.scrollHeight;
  });

  // ---------- Setup ----------
  async function refreshStatus() {
    try { state.status = await api.status(); } catch (_) { state.status = null; }
    renderStatus();
  }

  function renderStatus() {
    const s = state.status;
    const pill = $('#statusPill');
    const text = $('#statusText');
    if (!s) { pill.dataset.state = 'missing'; text.textContent = "Couldn't check setup"; return; }
    const sp = s.spotify || {};
    if (!s.spicetify) { pill.dataset.state = 'missing'; text.textContent = 'Spicetify needed'; }
    else if (!sp.desktop && !sp.store) { pill.dataset.state = 'missing'; text.textContent = 'Spotify not found'; }
    else if (sp.usingStore) { pill.dataset.state = 'attention'; text.textContent = 'Store version of Spotify'; }
    else { pill.dataset.state = 'ready'; text.textContent = s.gelActive ? 'Gel theme is on' : 'Ready to apply'; }
    renderSetupSteps();
  }

  function renderSetupSteps() {
    const s = state.status;
    if (!s) return;
    const sp = s.spotify || {};
    const win = s.platform === 'win32';
    const steps = [];

    if (s.spicetify) {
      steps.push(`<li class="step done"><h4>Spicetify is installed</h4><p>Version ${escapeHtml(s.spicetify.version || 'unknown')}</p>
        <div class="row-actions"><button class="btn ghost small" data-act="upgrade">Update Spicetify</button></div></li>`);
    } else {
      steps.push(`<li class="step todo"><h4>Install Spicetify</h4>
        <p>Gel uses Spicetify to put themes into Spotify. It's free and open source.${win ? ' The installer runs in a PowerShell window. If it asks about the Marketplace, either answer is fine.' : ''}</p>
        <div class="row-actions"><button class="btn small" data-act="install">Install Spicetify</button><button class="btn ghost small" data-act="docs">About Spicetify</button></div></li>`);
    }

    if (win && sp.usingStore) {
      steps.push(`<li class="step todo"><h4>You have the Microsoft Store version of Spotify</h4>
        <p>Spicetify only partly supports it: your themed Spotify opens from a special shortcut instead of your usual Spotify icon. Pick one way to go.</p>
        <div class="choice"><h5>Switch to Spotify's own installer (recommended)</h5>
          <ol>
            <li>Uninstall Spotify in Windows Settings. <button class="link" data-act="apps">Open Apps settings</button></li>
            <li>Download and run Spotify's installer, then sign in. <button class="link" data-act="installer">Download installer</button></li>
            <li>Come back here, press Check again, then Apply to Spotify.</li>
          </ol>
        </div>
        <div class="choice"><h5>Keep the Store version</h5>
          <p>Apply your theme, then always open Spotify with the Gel shortcut.</p>
          <div class="row-actions"><button class="btn small" data-act="shortcut">Add desktop shortcut</button><button class="btn ghost small" data-act="launch">Open themed Spotify</button></div>
        </div></li>`);
    } else if (sp.desktop) {
      const both = win && sp.store;
      steps.push(`<li class="step done"><h4>Spotify desktop app found</h4>
        <p>${both ? 'You also have the Microsoft Store version. Uninstall it so you always open the themed one.' : 'This is the version Spicetify works best with.'}</p>
        ${both ? '<div class="row-actions"><button class="btn ghost small" data-act="apps">Open Apps settings</button></div>' : ''}</li>`);
    } else {
      steps.push(`<li class="step todo"><h4>Install Spotify</h4><p>Gel couldn't find the Spotify desktop app on this computer.</p>
        <div class="row-actions"><button class="btn small" data-act="${win ? 'installer' : 'spotify'}">${win ? 'Download installer' : 'Get Spotify'}</button></div></li>`);
    }

    if (s.gelActive) {
      steps.push(`<li class="step done"><h4>Your Gel theme is set in Spotify</h4><p>When Spotify updates itself, the theme can disappear. Press Apply to Spotify again to bring it back.</p></li>`);
    } else if (s.currentTheme) {
      steps.push(`<li class="step"><h4>Spotify is using another theme</h4><p>Right now Spicetify is set to <code>${escapeHtml(s.currentTheme)}</code>. Press Apply to Spotify to switch to your Gel theme.</p></li>`);
    } else {
      steps.push(`<li class="step"><h4>Apply your theme</h4><p>Press Apply to Spotify at the bottom. Spotify closes and reopens with the new look.</p></li>`);
    }
    $('#setupSteps').innerHTML = steps.join('');
  }

  $('#setupSteps').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const links = { apps: 'apps-settings', installer: 'spotify-installer', spotify: 'spotify-download', docs: 'spicetify-docs' };
    if (links[act]) { await api.open(links[act]); return; }
    b.disabled = true;
    try {
      let res;
      if (act === 'install') res = await api.installSpicetify();
      else if (act === 'upgrade') { openLog(); res = await api.upgradeSpicetify(); }
      else if (act === 'shortcut') res = await api.shortcut();
      else if (act === 'launch') { openLog(); res = await api.launch(); }
      if (res) {
        if (res.manual) { openLog(); logBody.append(`${res.manual}\n`); }
        toast(res.message, !res.ok);
      }
    } finally { b.disabled = false; refreshStatus(); }
  });
  $('#recheck').addEventListener('click', async () => { await refreshStatus(); toast('Checked your setup'); });
  $('#openFolder').addEventListener('click', () => api.open('themes-folder'));

  // ---------- Updates ----------
  let update = { state: 'idle' };
  function renderUpdate(u) {
    update = u || update;
    const chip = $('#updateChip');
    const text = $('#updateText');
    $('#aboutVersion').textContent = update.current ? `Gel ${update.current}` : 'Gel';
    $('#updateInstall').hidden = update.state !== 'ready';
    $('#updateCheck').disabled = update.state === 'checking' || update.state === 'downloading' || update.state === 'unsupported';
    chip.classList.toggle('ready', update.state === 'ready');
    chip.hidden = !(update.state === 'downloading' || update.state === 'ready');
    switch (update.state) {
      case 'checking': text.textContent = 'Checking for updates…'; break;
      case 'downloading':
        text.textContent = `Downloading Gel ${update.version || ''}… ${update.percent || 0}%`;
        chip.textContent = `Updating ${update.percent || 0}%`;
        chip.title = 'Gel is downloading an update in the background';
        break;
      case 'ready':
        text.textContent = `Gel ${update.version} is ready. Restart Gel to finish, or it installs the next time you close Gel.`;
        chip.textContent = 'Restart to update';
        chip.title = `Install Gel ${update.version} now`;
        break;
      case 'current': text.textContent = "You're on the latest version. Gel checks again every few hours."; break;
      case 'error': text.textContent = "Couldn't check for updates. Make sure you're online, then try again."; break;
      case 'unsupported': text.textContent = "This copy of Gel can't update itself. Install it with Gel-Setup.exe to get automatic updates."; break;
      default: text.textContent = 'Gel updates itself. New versions download in the background.';
    }
  }
  async function installUpdate() {
    if (update.state !== 'ready') return;
    const res = await api.installUpdate();
    if (!res.ok) toast(res.message, true);
  }
  $('#updateChip').addEventListener('click', installUpdate);
  $('#updateInstall').addEventListener('click', installUpdate);
  $('#updateCheck').addEventListener('click', async () => {
    const u = await api.checkUpdates();
    renderUpdate(u);
  });
  api.onUpdate(u => {
    const wasReady = update.state === 'ready';
    renderUpdate(u);
    if (u.state === 'ready' && !wasReady) toast(`Gel ${u.version} is ready. Click Restart to update at the top.`);
  });
  api.updateState().then(renderUpdate).catch(() => {});

  // ---------- Render everything ----------
  function renderAll() {
    $('#themeName').value = state.theme.name;
    renderGallery();
    syncColourInputs();
    syncStyleInputs();
    renderPreview();
  }

  renderColourList();
  renderAll();
  refreshStatus();

  // ---------- Browser stand-in (only used outside the desktop app) ----------
  function mockApi() {
    const listeners = [];
    const emit = (line, kind) => listeners.forEach(cb => cb({ line, kind }));
    const wait = ms => new Promise(r => setTimeout(r, ms));
    return {
      status: async () => ({ platform: 'win32', spicetify: { path: 'C:\\spicetify.exe', version: '2.43.2' }, currentTheme: '', gelActive: false, spotify: { desktop: false, store: true, usingStore: true } }),
      apply: async () => { emit('> spicetify apply', 'cmd'); await wait(400); emit('Applied (preview only)', 'ok'); return { ok: true, message: 'Preview mode: open Gel as a desktop app to change Spotify.' }; },
      restore: async () => ({ ok: true, message: 'Preview mode: nothing changed.' }),
      launch: async () => ({ ok: true, message: 'Preview mode: nothing opened.' }),
      shortcut: async () => ({ ok: true, message: 'Preview mode: no shortcut made.' }),
      installSpicetify: async () => ({ ok: true, message: 'Preview mode.' }),
      upgradeSpicetify: async () => ({ ok: true, message: 'Preview mode.' }),
      open: async () => ({ ok: true }),
      exportTheme: async () => ({ ok: false, canceled: true }),
      importTheme: async () => ({ ok: false, canceled: true }),
      onLog: cb => { listeners.push(cb); return () => {}; },
      updateState: async () => ({ current: '1.0.0', state: 'unsupported' }),
      checkUpdates: async () => ({ current: '1.0.0', state: 'unsupported' }),
      installUpdate: async () => ({ ok: false, message: 'Preview mode.' }),
      onUpdate: () => () => {},
    };
  }
})();
