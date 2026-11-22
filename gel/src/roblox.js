// Gel's Roblox side: pick a font, cursor and death sound, preview them in a
// pretend game, and apply them to the Roblox Player. The main process does the
// file work (roblox/ipc.js); this file is the window.
(function () {
  const ui = window.Gel && window.Gel.ui;
  if (!ui) return;
  const { toast, react, escapeHtml } = ui;
  const api = window.robloxApi || mockApi();
  const $ = sel => document.querySelector(sel);

  // ---------- What Gel comes with ----------
  const FONTS = [
    { id: 'builtin:arcade', name: 'Arcade', blurb: 'Wide and futuristic' },
    { id: 'builtin:pixel', name: 'Pixel', blurb: 'Chunky 8-bit letters' },
    { id: 'builtin:poster', name: 'Poster', blurb: 'Loud comic-book capitals' },
    { id: 'builtin:comic', name: 'Comic', blurb: 'Friendly and round' },
    { id: 'builtin:rounded', name: 'Rounded', blurb: 'Smooth retro curves' },
    { id: 'builtin:handwritten', name: 'Handwritten', blurb: 'Like a note in pen' },
  ];
  const CURSORS = [
    { id: 'builtin:neon', name: 'Neon' },
    { id: 'builtin:clean', name: 'Clean' },
    { id: 'builtin:pixel', name: 'Pixel' },
    { id: 'builtin:crosshair', name: 'Crosshair' },
    { id: 'builtin:bubble', name: 'Bubble' },
  ];
  const SOUNDS = [
    { id: 'builtin:blip', name: 'Blip', blurb: 'An 8-bit fall' },
    { id: 'builtin:pop', name: 'Pop', blurb: 'A quick bubble pop' },
    { id: 'builtin:boing', name: 'Boing', blurb: 'A springy wobble' },
    { id: 'builtin:zap', name: 'Zap', blurb: 'A laser zap' },
    { id: 'builtin:bonk', name: 'Bonk', blurb: 'A wooden knock' },
  ];
  // Avatar backgrounds. The real animation is built by roblox/backdrop.js; these describe the preview.
  const BACKDROPS = [
    { id: 'builtin:aurora', key: 'aurora', name: 'Aurora', blurb: 'Glowing orbs and flowing ribbons', colors: ['FF5FA2', '9B6BFF', '3EE0FF'], ribbons: 3,
      parts: [{ tex: 'glow', motion: 'drift', count: 9, size: [40, 90] }, { tex: 'star', motion: 'twinkle', count: 14, size: [10, 18] }, { tex: 'glow', motion: 'rise', count: 8, size: [6, 10], feet: true }] },
    { id: 'builtin:pixels', key: 'pixels', name: 'Pixel rain', blurb: 'Falling 8-bit squares', colors: ['FFC46B', 'FF5FA2', '9B6BFF'], ribbons: 1,
      parts: [{ tex: 'pixel', motion: 'fall', count: 22, size: [6, 10] }, { tex: 'pixel', motion: 'drift', count: 6, size: [14, 22] }, { tex: 'pixel', motion: 'rise', count: 8, size: [4, 6], feet: true }] },
    { id: 'builtin:confetti', key: 'confetti', name: 'Confetti', blurb: 'A party that never stops', colors: ['FF5FA2', 'FFC46B', '3EE0FF', '5CF2B5'], ribbons: 0,
      parts: [{ tex: 'confetti', motion: 'fall', count: 28, size: [8, 12], spin: true }, { tex: 'star', motion: 'twinkle', count: 8, size: [10, 16] }] },
    { id: 'builtin:bubbles', key: 'bubbles', name: 'Bubbles', blurb: 'Bubbles drifting upwards', colors: ['3EE0FF', '9B6BFF', 'FFFFFF'], ribbons: 1,
      parts: [{ tex: 'bubble', motion: 'rise', count: 14, size: [10, 26] }, { tex: 'glow', motion: 'drift', count: 6, size: [60, 110] }, { tex: 'bubble', motion: 'rise', count: 6, size: [4, 8], feet: true }] },
    { id: 'builtin:petals', key: 'petals', name: 'Petals', blurb: 'Blossom blowing past', colors: ['FF8FC6', 'FFD1E6', 'FFFFFF'], ribbons: 1,
      parts: [{ tex: 'petal', motion: 'fall', count: 18, size: [10, 14], spin: true, sideways: true }, { tex: 'glow', motion: 'drift', count: 6, size: [60, 110] }] },
    { id: 'builtin:starfield', key: 'starfield', name: 'Starfield', blurb: 'Twinkling stars and slow light', colors: ['FFFFFF', '5CF2B5', '3EE0FF'], ribbons: 2,
      parts: [{ tex: 'star', motion: 'twinkle', count: 30, size: [8, 16] }, { tex: 'glow', motion: 'twinkle', count: 10, size: [6, 10] }] },
  ];
  const backdropOf = id => BACKDROPS.find(b => b.id === id) || null;
  const backdropImage = id => { const b = backdropOf(id); return b ? `roblox/backdrop/backdrops/${b.key}.png` : null; };

  const PRESETS = [
    { id: 'rbx-arcade', backdrop: 'builtin:aurora', name: 'Arcade night', blurb: 'Sci-fi letters, neon arrow, zap', font: 'builtin:arcade', cursor: 'builtin:neon', sound: 'builtin:zap', accent: '9B6BFF', accent2: '3EE0FF' },
    { id: 'rbx-retro', backdrop: 'builtin:pixels', name: 'Retro pixel', blurb: '8-bit text, pixel arrow, blip', font: 'builtin:pixel', cursor: 'builtin:pixel', sound: 'builtin:blip', accent: 'FFC46B', accent2: 'FF5FA2' },
    { id: 'rbx-comic', backdrop: 'builtin:confetti', name: 'Comic book', blurb: 'Loud capitals, clean arrow, bonk', font: 'builtin:poster', cursor: 'builtin:clean', sound: 'builtin:bonk', accent: 'FF5FA2', accent2: 'FFC46B' },
    { id: 'rbx-cosy', backdrop: 'builtin:bubbles', name: 'Cosy', blurb: 'Round letters, bubble cursor, pop', font: 'builtin:comic', cursor: 'builtin:bubble', sound: 'builtin:pop', accent: '3EE0FF', accent2: '9B6BFF' },
    { id: 'rbx-scribble', backdrop: 'builtin:petals', name: 'Scribble', blurb: 'Handwritten chat, boing', font: 'builtin:handwritten', cursor: 'builtin:clean', sound: 'builtin:boing', accent: '5CF2B5', accent2: '3EE0FF' },
    { id: 'rbx-aim', backdrop: 'builtin:starfield', name: 'Sharp aim', blurb: "Roblox's font with a crosshair", font: null, cursor: 'builtin:crosshair', sound: null, accent: '5CF2B5', accent2: '9B6BFF' },
  ];
  const DEFAULT_ACCENTS = ['9B6BFF', 'FF5FA2'];
  const KIND_FIELD = { font: 'font', cursor: 'cursor', sound: 'sound', backdrop: 'backdrop' };

  // ---------- State ----------
  const loadJSON = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (_) { return fallback; }
  };
  const fromPreset = p => ({ name: p.name, font: p.font, cursor: p.cursor, sound: p.sound, backdrop: p.backdrop || null, presetId: p.id, savedId: null });
  const state = {
    theme: loadJSON('gel.rbx.current', null) || fromPreset(PRESETS[0]),
    saved: loadJSON('gel.rbx.saved', []),
    mine: { font: [], cursor: [], sound: [] },
    urls: {},
    status: null,
    applying: false,
    cursorFit: loadJSON('gel.rbx.cursorFit', 'arrow') === 'centre' ? 'centre' : 'arrow',
  };

  let persistTimer = null;
  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try { localStorage.setItem('gel.rbx.current', JSON.stringify(state.theme)); } catch (_) { /* not important */ }
    }, 200);
  }
  function persistSaved() {
    try { localStorage.setItem('gel.rbx.saved', JSON.stringify(state.saved)); } catch (_) { toast('Gel ran out of room to save more themes.', true); }
  }

  // ---------- Fonts, cursors and sounds in the window ----------
  const builtinUrl = (kind, id) => `roblox/${kind === 'font' ? 'fonts' : kind === 'cursor' ? 'cursors' : 'sounds'}/${id.slice(8)}.${kind === 'font' ? 'ttf' : kind === 'cursor' ? 'png' : 'ogg'}`;
  const familyOf = id => 'rbx-' + String(id).replace(/[^a-z0-9]+/gi, '-');
  const loadedFonts = new Set();
  const pendingData = {};

  function mineData(id) {
    if (!pendingData[id]) {
      pendingData[id] = api.assetData(id).then(res => (res && res.ok ? res : null)).catch(() => null);
    }
    return pendingData[id];
  }

  function ensureFont(id) {
    if (!id || loadedFonts.has(id)) return;
    loadedFonts.add(id);
    const family = familyOf(id);
    const source = id.startsWith('builtin:')
      ? Promise.resolve(`url("${builtinUrl('font', id)}")`)
      : mineData(id).then(d => (d ? d.bytes : null));
    source.then(src => {
      if (!src) return;
      const face = new FontFace(family, src);
      return face.load().then(f => document.fonts.add(f));
    }).catch(() => { /* the sample falls back to Gel's font */ });
  }

  const fontCss = id => {
    if (!id) return "'Gel Sans', 'Segoe UI', system-ui, sans-serif";
    ensureFont(id);
    return `'${familyOf(id)}', 'Gel Sans', 'Segoe UI', sans-serif`;
  };

  // Cursor and sound files as URLs. Your own files load from Gel's folder, then repaint.
  function urlFor(kind, id) {
    if (!id) return null;
    if (id.startsWith('builtin:')) return builtinUrl(kind, id);
    if (state.urls[id]) return state.urls[id];
    mineData(id).then(d => {
      if (!d || state.urls[id]) return;
      state.urls[id] = URL.createObjectURL(new Blob([d.bytes], { type: d.mime }));
      renderAll();
    });
    return null;
  }

  const nameOf = (kind, id) => {
    if (!id) return "Roblox's own";
    if (kind === 'backdrop') { const b = backdropOf(id); return b ? b.name : "Roblox's own"; }
    const list = kind === 'font' ? FONTS : kind === 'cursor' ? CURSORS : SOUNDS;
    const hit = list.concat(state.mine[kind]).find(x => x.id === id);
    return hit ? hit.name : 'Your file';
  };

  let audio = null;
  function playSound(id) {
    const url = urlFor('sound', id);
    if (!url) return;
    try { if (audio) audio.pause(); } catch (_) { /* ignore */ }
    audio = new Audio(url);
    audio.play().catch(() => toast("Gel couldn't play that sound.", true));
  }

  // ---------- Cards and lists ----------
  const accentsOf = t => {
    const p = PRESETS.find(x => x.id === t.presetId || x.id === t.id);
    return p ? [p.accent, p.accent2] : DEFAULT_ACCENTS;
  };

  function themeCard(t, attr, small, pressed) {
    const [a, b] = accentsOf(t);
    const cursorUrl = urlFor('cursor', t.cursor);
    const pointer = cursorUrl
      ? `<img class="rbx-field-cursor" src="${escapeHtml(cursorUrl)}" alt="">`
      : '<svg class="rbx-field-cursor os"><use href="#i-pointer"/></svg>';
    return `<button class="chip rbx-chip" ${attr} aria-pressed="${pressed}" title="${escapeHtml(small)}" style="--c-accent:#${a}">
        <span class="rbx-field" style="--acc:#${a};--acc2:#${b}${t.backdrop ? `;--bd:url('${backdropImage(t.backdrop)}')` : ''}">
          <span class="rbx-aa" style="font-family:${escapeHtml(fontCss(t.font))}">Aa</span>
          <span class="rbx-field-sound"><svg><use href="#i-volume"/></svg>${escapeHtml(nameOf('sound', t.sound))}</span>
          ${pointer}
        </span>
        <span class="chip-label"><span class="chip-name">${escapeHtml(t.name)}</span><small>${escapeHtml(small)}</small></span>
      </button>`;
  }

  function renderGallery() {
    const sel = state.theme.savedId || state.theme.presetId;
    $('#rbxPresets').innerHTML = PRESETS.map(p => themeCard(p, `data-rbx-preset="${p.id}"`, p.blurb, sel === p.id)).join('');
    $('#rbxSaved').innerHTML = state.saved.map(s => `
      <div class="chip-wrap">
        ${themeCard(s, `data-rbx-saved="${s.id}"`, [nameOf('font', s.font), nameOf('cursor', s.cursor), nameOf('sound', s.sound), nameOf('backdrop', s.backdrop)].join(', '), sel === s.id)}
        <button class="chip-delete" data-rbx-delete-theme="${s.id}" aria-label="Delete ${escapeHtml(s.name)}"><svg><use href="#i-x"/></svg></button>
      </div>`).join('');
    $('#rbxSavedEmpty').hidden = state.saved.length > 0;
  }

  const deleteBtn = (id, name) => `<button class="chip-delete" data-rbx-delete-asset="${id}" aria-label="Remove ${escapeHtml(name)}"><svg><use href="#i-x"/></svg></button>`;

  function renderFonts() {
    const own = { id: null, name: "Roblox's own", blurb: 'Builder Sans, the usual look' };
    const items = [own].concat(FONTS, state.mine.font.map(m => Object.assign({ blurb: 'Your font', mine: true }, m)));
    $('#rbxFonts').innerHTML = items.map(f => `
      <div class="rbx-opt-wrap">
        <button class="rbx-opt rbx-font" role="radio" aria-checked="${state.theme.font === f.id}" data-rbx-font="${f.id || ''}">
          <span class="rbx-sample" style="font-family:${escapeHtml(fontCss(f.id))}">Welcome to Obby Island!</span>
          <span class="rbx-opt-meta"><b>${escapeHtml(f.name)}</b><small>${escapeHtml(f.blurb)}</small></span>
        </button>
        ${f.mine ? deleteBtn(f.id, f.name) : ''}
      </div>`).join('');
  }

  function renderCursors() {
    const items = [{ id: null, name: "Roblox's own" }].concat(CURSORS, state.mine.cursor.map(m => Object.assign({ mine: true }, m)));
    $('#rbxCursors').innerHTML = items.map(c => {
      const url = urlFor('cursor', c.id);
      const img = url ? `<img src="${escapeHtml(url)}" alt="">` : '<svg class="os"><use href="#i-pointer"/></svg>';
      return `<div class="rbx-opt-wrap">
          <button class="rbx-opt rbx-tile" role="radio" aria-checked="${state.theme.cursor === c.id}" data-rbx-cursor="${c.id || ''}">
            <span class="rbx-tile-img">${img}</span><small>${escapeHtml(c.name)}</small>
          </button>
          ${c.mine ? deleteBtn(c.id, c.name) : ''}
        </div>`;
    }).join('');
    document.querySelectorAll('[data-cursor-fit]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.cursorFit === state.cursorFit)));
  }

  function renderSounds() {
    const items = [{ id: null, name: "Roblox's own", blurb: "Roblox's usual sound" }].concat(SOUNDS, state.mine.sound.map(m => Object.assign({ blurb: 'Your sound', mine: true }, m)));
    $('#rbxSounds').innerHTML = items.map(s => `
      <div class="rbx-opt-wrap rbx-sound-wrap">
        <button class="rbx-opt rbx-sound" role="radio" aria-checked="${state.theme.sound === s.id}" data-rbx-sound="${s.id || ''}">
          <span class="rbx-opt-meta"><b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.blurb)}</small></span>
        </button>
        ${s.id ? `<button class="rbx-play-btn" data-rbx-play="${s.id}" aria-label="Play ${escapeHtml(s.name)}"><svg><use href="#i-play"/></svg></button>` : ''}
        ${s.mine ? deleteBtn(s.id, s.name) : ''}
      </div>`).join('');
  }

  function renderBackdrops() {
    const own = { id: null, name: "Roblox's own", blurb: "Roblox's usual background" };
    $('#rbxBackdrops').innerHTML = [own].concat(BACKDROPS).map(b => {
      const pic = b.id ? `background-image:url('${backdropImage(b.id)}')` : '';
      const dots = b.id ? b.parts.slice(0, 2).map(p => `<i style="--m:url('roblox/backdrop/${p.tex}.png');--c:#${b.colors[0]}"></i><i style="--m:url('roblox/backdrop/${p.tex}.png');--c:#${b.colors[1] || b.colors[0]}"></i>`).join('') : '';
      return `<button class="chip rbx-chip rbx-bd" role="radio" aria-pressed="${state.theme.backdrop === b.id}" aria-checked="${state.theme.backdrop === b.id}" data-rbx-backdrop="${b.id || ''}" style="--c-accent:#${b.id ? b.colors[1] || b.colors[0] : '9B6BFF'}">
          <span class="rbx-field rbx-bd-field" style="${pic}"><span class="rbx-bd-dots">${dots}</span></span>
          <span class="chip-label"><span class="chip-name">${escapeHtml(b.name)}</span><small>${escapeHtml(b.blurb)}</small></span>
        </button>`;
    }).join('');
  }

  // A rough, in-window version of the animation, so you can choose before applying.
  let avatarKey = '';
  function renderAvatar() {
    const b = backdropOf(state.theme.backdrop);
    const key = b ? b.id : 'none';
    $('#rbxAvatarLabel').textContent = b ? `${b.name}, preview` : "Roblox's own background";
    const stage = $('#rbxAvatarStage');
    stage.style.backgroundImage = b ? `url('${backdropImage(b.id)}')` : '';
    stage.classList.toggle('plain', !b);
    if (key === avatarKey) return;
    avatarKey = key;
    const rand = (() => { let s = 7; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
    const between = ([lo, hi]) => lo + (hi - lo) * rand();
    const spans = [];
    if (b) {
      b.parts.forEach(p => {
        for (let i = 0; i < p.count; i++) {
          const c = b.colors[i % b.colors.length];
          const x = p.feet ? 42 + rand() * 16 : rand() * 100;
          const y = p.motion === 'fall' ? -8 : p.motion === 'rise' ? (p.feet ? 82 : 90 + rand() * 10) : 8 + rand() * 70;
          const dur = p.motion === 'twinkle' ? 2 + rand() * 3 : p.motion === 'drift' ? 9 + rand() * 6 : p.feet ? 3 + rand() * 2 : 7 + rand() * 5;
          spans.push(`<i class="r-p m-${p.motion}${p.spin ? ' spin' : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--s:${between(p.size).toFixed(0)}px;--c:#${c};--m:url('roblox/backdrop/${p.tex}.png');--d:${dur.toFixed(1)}s;--delay:-${(rand() * dur).toFixed(1)}s;--dx:${((p.sideways ? 60 : 0) + (rand() - 0.5) * 60).toFixed(0)}px;--rot:${p.spin ? (rand() * 720 - 360).toFixed(0) : 0}deg"></i>`);
        }
      });
    }
    $('#rbxAvatarStage .r-av-particles').innerHTML = spans.join('');
    $('#rbxAvatarStage .r-av-ribbons').innerHTML = b ? Array.from({ length: b.ribbons }, (_, i) => {
      const cs = b.colors.slice(i % b.colors.length).concat(b.colors.slice(0, i % b.colors.length)).map(c => `#${c}`);
      return `<span class="r-ribbon" style="--y:${18 + i * 16}%;--h:${26 - i * 5}px;--g:linear-gradient(90deg, transparent, ${cs.join(', ')}, transparent);--d:${10 + i * 4}s"></span>`;
    }).join('') : '';
  }

  function syncPreviewMode() {
    const tab = document.querySelector('.tab[aria-selected="true"]');
    $('#rbxPreview').classList.toggle('show-avatar', !!tab && tab.dataset.tab === 'rbx-avatar');
  }

  // ---------- The pretend game ----------
  function renderPreview() {
    const t = state.theme;
    const el = $('#rbxPreview');
    el.style.setProperty('--rbx-font', fontCss(t.font));
    const cursorUrl = urlFor('cursor', t.cursor);
    el.style.cursor = cursorUrl ? `url("${cursorUrl}") 32 32, auto` : '';
    const ghost = $('#rbxCursorGhost');
    ghost.hidden = !cursorUrl;
    if (cursorUrl) ghost.src = cursorUrl;
    if (document.activeElement !== $('#rbxName')) $('#rbxName').value = t.name;
    const play = $('#rbxPlay');
    play.disabled = !t.sound;
    play.title = t.sound ? `Play ${nameOf('sound', t.sound)}` : "This theme keeps Roblox's usual death sound";
    if (ui.getApp() === 'roblox') {
      const [a, b] = accentsOf(t);
      document.documentElement.style.setProperty('--amb-a', `#${a}`);
      document.documentElement.style.setProperty('--amb-b', `#${b}`);
    }
  }

  function renderAll() {
    renderGallery();
    renderFonts();
    renderCursors();
    renderSounds();
    renderBackdrops();
    renderPreview();
    renderAvatar();
  }

  // ---------- Changing the theme ----------
  function setPart(kind, id) {
    state.theme[KIND_FIELD[kind]] = id || null;
    state.theme.presetId = null;
    persist();
    renderAll();
  }

  function loadTheme(t) {
    state.theme = { name: t.name, font: t.font, cursor: t.cursor, sound: t.sound, backdrop: t.backdrop || null, presetId: t.presetId || null, savedId: t.savedId || null };
    persist();
    renderAll();
  }

  $('#rbxPresets').addEventListener('click', e => {
    const b = e.target.closest('[data-rbx-preset]');
    if (!b) return;
    loadTheme(fromPreset(PRESETS.find(p => p.id === b.dataset.rbxPreset)));
  });

  $('#rbxSaved').addEventListener('click', e => {
    const del = e.target.closest('[data-rbx-delete-theme]');
    if (del) {
      const s = state.saved.find(x => x.id === del.dataset.rbxDeleteTheme);
      if (!s || !window.confirm(`Delete "${s.name}" from My Roblox themes?`)) return;
      state.saved = state.saved.filter(x => x.id !== s.id);
      if (state.theme.savedId === s.id) state.theme.savedId = null;
      persistSaved(); persist(); renderGallery();
      toast(`Deleted "${s.name}"`);
      return;
    }
    const b = e.target.closest('[data-rbx-saved]');
    if (!b) return;
    const s = state.saved.find(x => x.id === b.dataset.rbxSaved);
    if (s) loadTheme(Object.assign({}, s, { savedId: s.id, presetId: null }));
  });

  async function deleteAsset(id) {
    const kind = ['font', 'cursor', 'sound'].find(k => state.mine[k].some(m => m.id === id));
    if (!kind) return;
    const name = nameOf(kind, id);
    if (!window.confirm(`Remove "${name}" from Gel? Saved themes that use it go back to Roblox's own ${kind}.`)) return;
    const res = await api.deleteAsset(id);
    if (!res.ok) { toast(res.message, true); return; }
    if (state.theme[kind] === id) state.theme[kind] = null;
    state.saved.forEach(s => { if (s[kind] === id) s[kind] = null; });
    persistSaved(); persist();
    await refreshAssets();
    toast(`Removed "${name}"`);
  }

  function onListClick(attr, kind) {
    return e => {
      const del = e.target.closest('[data-rbx-delete-asset]');
      if (del) { deleteAsset(del.dataset.rbxDeleteAsset); return; }
      const play = e.target.closest('[data-rbx-play]');
      if (play) { playSound(play.dataset.rbxPlay); return; }
      const b = e.target.closest(`[${attr}]`);
      if (!b) return;
      setPart(kind, b.getAttribute(attr) || null);
      if (kind === 'sound' && b.getAttribute(attr)) playSound(b.getAttribute(attr));
    };
  }
  $('#rbxFonts').addEventListener('click', onListClick('data-rbx-font', 'font'));
  $('#rbxCursors').addEventListener('click', onListClick('data-rbx-cursor', 'cursor'));
  $('#rbxSounds').addEventListener('click', onListClick('data-rbx-sound', 'sound'));
  $('#rbxBackdrops').addEventListener('click', e => {
    const b = e.target.closest('[data-rbx-backdrop]');
    if (b) setPart('backdrop', b.dataset.rbxBackdrop || null);
  });
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', syncPreviewMode));

  $('#rbxName').addEventListener('input', e => {
    state.theme.name = e.target.value.trim() || 'My Roblox theme';
    persist();
    renderGallery();
  });

  $('#rbxPlay').addEventListener('click', () => {
    if (!state.theme.sound) return;
    playSound(state.theme.sound);
    const died = $('#rbxDied');
    died.hidden = false;
    died.style.animation = 'none'; void died.offsetWidth; died.style.animation = '';
    clearTimeout(died.__t);
    died.__t = setTimeout(() => { died.hidden = true; }, 1600);
  });

  // ---------- Your own files ----------
  async function refreshAssets() {
    try { state.mine = await api.assets(); } catch (_) { /* keep what we had */ }
    renderAll();
  }

  async function addAsset(kind, file, bytes) {
    const res = await api.saveAsset({ kind, name: file.name, bytes });
    if (!res.ok) { toast(res.message, true); react('sad'); return; }
    await refreshAssets();
    setPart(kind, res.id);
    toast(`Added "${res.name}"`);
    react('happy');
  }

  $('#rbxFontAdd').addEventListener('click', () => $('#rbxFontInput').click());
  $('#rbxFontInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { toast('That font is too big. Pick one under 30 MB.', true); return; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    try { await new FontFace('rbx-check', bytes).load(); } catch (_) {
      toast("That font file didn't open. Try another .ttf or .otf file.", true);
      return;
    }
    addAsset('font', file, bytes);
  });

  // Roblox clicks where the middle of the cursor picture is, so line pictures up for that.
  function fitCursor(img, fit) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const box = fit === 'arrow' ? 32 : 64;
    const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight, fit === 'arrow' ? 1 : 64 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    if (fit === 'arrow') ctx.drawImage(img, 32, 32, w, h);
    else ctx.drawImage(img, Math.round((64 - w) / 2), Math.round((64 - h) / 2), w, h);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  document.querySelectorAll('[data-cursor-fit]').forEach(b => b.addEventListener('click', () => {
    state.cursorFit = b.dataset.cursorFit;
    try { localStorage.setItem('gel.rbx.cursorFit', JSON.stringify(state.cursorFit)); } catch (_) { /* not important */ }
    renderCursors();
  }));
  $('#rbxCursorAdd').addEventListener('click', () => $('#rbxCursorInput').click());
  $('#rbxCursorInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast('That picture is too big. Pick one under 20 MB.', true); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const blob = await fitCursor(img, state.cursorFit);
      addAsset('cursor', { name: file.name.replace(/\.[a-z0-9]+$/i, '') + '.png' }, new Uint8Array(await blob.arrayBuffer()));
    } catch (_) {
      toast("That picture didn't open. Try a PNG or JPEG.", true);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  $('#rbxSoundAdd').addEventListener('click', () => $('#rbxSoundInput').click());
  $('#rbxSoundInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('That sound is too big. Pick one under 10 MB.', true); return; }
    addAsset('sound', file, new Uint8Array(await file.arrayBuffer()));
  });

  // ---------- Save, apply, restore ----------
  $('#rbxSave').addEventListener('click', () => {
    const t = state.theme;
    const existing = t.savedId && state.saved.find(s => s.id === t.savedId);
    if (existing) {
      Object.assign(existing, { name: t.name, font: t.font, cursor: t.cursor, sound: t.sound, backdrop: t.backdrop || null });
      toast(`Updated "${t.name}" in My themes`);
    } else {
      const id = 'rs-' + Date.now().toString(36);
      state.saved.push({ id, name: t.name, font: t.font, cursor: t.cursor, sound: t.sound, backdrop: t.backdrop || null });
      t.savedId = id;
      t.presetId = null;
      toast(`Saved "${t.name}" to My themes`);
    }
    persistSaved(); persist(); renderGallery();
    react('happy');
  });

  function setWorking(btn, on, label) {
    btn.classList.toggle('working', on);
    btn.disabled = on;
    if (label) btn.querySelector('.btn-label').textContent = label;
  }

  $('#rbxApply').addEventListener('click', async () => {
    if (state.applying) return;
    state.applying = true;
    const btn = $('#rbxApply');
    setWorking(btn, true, 'Applying…');
    try {
      const t = state.theme;
      const res = await api.apply({ name: t.name, font: t.font, cursor: t.cursor, sound: t.sound, backdrop: t.backdrop || null });
      toast(res.message, !res.ok);
      react(res.ok ? 'happy' : 'sad');
    } catch (err) {
      toast(`Something went wrong: ${err.message}`, true);
      react('sad');
    } finally {
      state.applying = false;
      setWorking(btn, false, 'Apply to Roblox');
      refreshStatus();
    }
  });

  $('#rbxRestore').addEventListener('click', async () => {
    if (!window.confirm('Remove the theme and put Roblox back to how it normally looks? Your saved Gel themes stay here.')) return;
    const btn = $('#rbxRestore');
    btn.disabled = true;
    try {
      const res = await api.restore();
      toast(res.message, !res.ok);
    } finally { btn.disabled = false; refreshStatus(); }
  });

  // ---------- Setup ----------
  async function refreshStatus() {
    try { state.status = await api.status(); } catch (_) { state.status = null; }
    renderStatus();
  }

  function renderStatus() {
    renderSteps();
    if (ui.getApp() !== 'roblox') return;
    const s = state.status;
    const pill = $('#statusPill');
    const text = $('#statusText');
    if (!s) { pill.dataset.state = 'missing'; text.textContent = "Couldn't check Roblox"; return; }
    if (!s.installed) { pill.dataset.state = 'missing'; text.textContent = 'Roblox not found'; }
    else { pill.dataset.state = 'ready'; text.textContent = s.theme ? 'Roblox theme is on' : 'Ready to apply'; }
  }

  function renderSteps() {
    const s = state.status;
    if (!s) return;
    const steps = [];
    const launchers = (s.targets || []).filter(t => t.kind === 'mods');
    const hasRoblox = (s.targets || []).some(t => t.kind === 'install');

    if (hasRoblox) {
      steps.push(`<li class="step done"><h4>Roblox is installed</h4><p>${s.version ? `Version folder <code>${escapeHtml(s.version)}</code>` : 'Gel found the Roblox Player.'}</p></li>`);
    } else if (!launchers.length) {
      steps.push(`<li class="step todo"><h4>Install Roblox</h4><p>Gel couldn't find the Roblox Player on this computer. Install it, open it once, then press Check again.</p>
        <div class="row-actions"><button class="btn small" data-rbx-act="download">Get Roblox</button></div></li>`);
    }

    for (const l of launchers) {
      steps.push(`<li class="step done"><h4>${escapeHtml(l.name)} found</h4><p>Gel also puts your theme in ${escapeHtml(l.name)}'s mods folder, so it shows however you open Roblox. Any mods you already had there are kept and come back when you remove the theme.</p></li>`);
    }

    if (s.robloxRunning) {
      steps.push(`<li class="step todo"><h4>Roblox is open</h4><p>Roblox loads these files when it starts. After you apply, close Roblox and open it again to see your theme.</p></li>`);
    }

    if (s.theme) {
      const keep = launchers.length
        ? `Through ${escapeHtml(launchers.map(l => l.name).join(' and '))} it stays on by itself.`
        : 'While Gel is open it puts the theme back within a minute. Otherwise that happens the next time you open Gel.';
      steps.push(`<li class="step done"><h4>"${escapeHtml(s.theme)}" is on Roblox</h4><p>Roblox updates about once a week, which wipes themes from its own folder. ${keep}</p></li>`);
    } else if (s.installed) {
      steps.push('<li class="step"><h4>Apply your theme</h4><p>Press Apply to Roblox at the bottom, then open Roblox.</p></li>');
    }
    $('#rbxSteps').innerHTML = steps.join('');
  }

  $('#rbxSteps').addEventListener('click', e => {
    const b = e.target.closest('[data-rbx-act]');
    if (b && b.dataset.rbxAct === 'download') ui.openLink('roblox-download');
  });
  $('#rbxRecheck').addEventListener('click', async () => { await refreshStatus(); toast('Checked Roblox'); });
  $('#rbxOpenFolder').addEventListener('click', () => api.openFolder());

  api.onEvent(msg => {
    if (!msg) return;
    if (msg.type === 'reapplied') { toast('Roblox updated, so Gel put your theme back.'); react('happy'); refreshStatus(); }
    else if (msg.type === 'reapply-failed') toast(`Roblox updated, but Gel couldn't put your theme back: ${msg.message}`, true);
  });

  window.addEventListener('gel:app', e => {
    if (e.detail !== 'roblox') return;
    syncPreviewMode();
    renderPreview();
    renderStatus();
    refreshStatus();
  });

  // ---------- Start ----------
  renderAll();
  syncPreviewMode();
  refreshAssets();
  refreshStatus();

  // ---------- Browser stand-in (only used outside the desktop app) ----------
  function mockApi() {
    const files = {};
    const index = { font: [], cursor: [], sound: [] };
    let applied = null;
    return {
      status: async () => ({ installed: true, version: 'version-preview', targets: [{ id: 'roblox', name: 'Roblox', kind: 'install' }, { id: 'launcher-ExploitStrap', name: 'ExploitStrap', kind: 'mods' }], theme: applied, robloxRunning: false }),
      apply: async p => { applied = p.name; return { ok: true, message: 'Preview mode: open Gel as a desktop app to change Roblox.' }; },
      restore: async () => { applied = null; return { ok: true, message: 'Preview mode: nothing changed.' }; },
      assets: async () => JSON.parse(JSON.stringify(index)),
      saveAsset: async ({ kind, name, bytes }) => {
        const id = `mine:${Math.random().toString(16).slice(2, 10)}${kind === 'font' ? '.ttf' : kind === 'cursor' ? '.png' : '.ogg'}`;
        files[id] = { bytes, mime: kind === 'font' ? 'font/ttf' : kind === 'cursor' ? 'image/png' : 'audio/ogg' };
        const clean = name.replace(/\.[a-z0-9]+$/i, '');
        index[kind].push({ id, name: clean });
        return { ok: true, id, name: clean, kind };
      },
      assetData: async id => (files[id] ? Object.assign({ ok: true }, files[id]) : { ok: false }),
      deleteAsset: async id => { for (const k of Object.keys(index)) index[k] = index[k].filter(x => x.id !== id); return { ok: true }; },
      openFolder: async () => ({ ok: true }),
      onEvent: () => () => {},
    };
  }
})();
