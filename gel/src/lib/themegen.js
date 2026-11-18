/* Turns a Gel theme into the two files Spicetify reads: color.ini and user.css. */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./color.js') : root.Gel.color;
  const FX = isNode ? require('./fx.js') : root.Gel.fx;

  const THEME_FOLDER = 'Gel';
  const SCHEME = 'Gel';

  // Every colour Spicetify understands, in its own order, with plain-language descriptions.
  const COLOR_KEYS = [
    { key: 'main', group: 'Backgrounds', label: 'Main panels', hint: 'Your Library and the main page' },
    { key: 'sidebar', group: 'Backgrounds', label: 'Window frame', hint: 'Top bar and the gaps between panels' },
    { key: 'player', group: 'Backgrounds', label: 'Player bar and cards', hint: 'The bottom player, and album tiles at rest' },
    { key: 'card', group: 'Backgrounds', label: 'Cards on hover', hint: 'Album and playlist tiles under your cursor' },
    { key: 'main-elevated', group: 'Backgrounds', label: 'Raised panels', hint: 'Menus, pop-ups and the search box' },
    { key: 'highlight', group: 'Backgrounds', label: 'Hover', hint: 'Rows and items under your cursor' },
    { key: 'highlight-elevated', group: 'Backgrounds', label: 'Hover in menus', hint: 'Menu items under your cursor' },
    { key: 'tab-active', group: 'Backgrounds', label: 'Chips', hint: 'Filter chips like Playlists and Artists' },
    { key: 'shadow', group: 'Backgrounds', label: 'Shadows', hint: 'Under cards, menus and the picture dimmer' },
    { key: 'text', group: 'Text', label: 'Main text', hint: 'Titles, headings and song names' },
    { key: 'subtext', group: 'Text', label: 'Secondary text', hint: 'Artist names, details and labels' },
    { key: 'selected-row', group: 'Text', label: 'Selected and scrollbars', hint: 'Selected songs, scrollbars, small icons' },
    { key: 'misc', group: 'Text', label: 'Odds and ends', hint: 'Dividers and other small details' },
    { key: 'button', group: 'Accent', label: 'Accent', hint: 'Liked heart, the song playing now, links' },
    { key: 'button-active', group: 'Accent', label: 'Play button', hint: 'The big play button and hover states' },
    { key: 'button-disabled', group: 'Accent', label: 'Sliders', hint: 'Seek bar and volume track' },
    { key: 'notification', group: 'Alerts', label: 'Notifications', hint: 'Pop-ups like "Added to Liked Songs"' },
    { key: 'notification-error', group: 'Alerts', label: 'Errors', hint: 'Pop-ups when something fails' },
  ];

  // Spicetify's built-in defaults (Spotify's normal look)
  const ORIGINAL = {
    text: 'FFFFFF', subtext: 'B3B3B3', main: '121212', 'main-elevated': '242424', highlight: '1A1A1A',
    'highlight-elevated': '2A2A2A', sidebar: '000000', player: '181818', card: '282828', shadow: '000000',
    'selected-row': 'FFFFFF', button: '1DB954', 'button-active': '1ED760', 'button-disabled': '535353',
    'tab-active': '333333', notification: '4687D6', 'notification-error': 'E22134', misc: '7F7F7F',
  };

  // Fonts loaded from Google Fonts inside Spotify. "default" keeps Spotify's own font.
  const FONTS = [
    { id: 'default', name: 'Spotify default' },
    { id: 'Inter', name: 'Inter', weights: '400;500;700;800' },
    { id: 'DM Sans', name: 'DM Sans', weights: '400;500;700' },
    { id: 'Outfit', name: 'Outfit', weights: '400;500;700;800' },
    { id: 'Space Grotesk', name: 'Space Grotesk', weights: '400;500;700' },
    { id: 'Poppins', name: 'Poppins', weights: '400;500;700;800' },
    { id: 'Nunito', name: 'Nunito', weights: '400;600;800' },
    { id: 'Lexend', name: 'Lexend', weights: '400;500;700' },
    { id: 'Montserrat', name: 'Montserrat', weights: '400;500;700;800' },
    { id: 'Quicksand', name: 'Quicksand', weights: '400;500;700' },
    { id: 'Rubik', name: 'Rubik', weights: '400;500;700;800' },
    { id: 'Comfortaa', name: 'Comfortaa', weights: '400;500;700' },
    { id: 'JetBrains Mono', name: 'JetBrains Mono', weights: '400;500;700;800' },
    { id: 'custom', name: 'A font on my PC…' },
  ];

  function defaultStyle() {
    return { font: 'default', customFont: '', radius: 8, glow: false, bgImage: null, bgDim: 0.55, bgBlur: 0, panelOpacity: 0.72, customCSS: '', fx: FX.defaultFx() };
  }

  /**
   * Build all 18 colours from a few choices.
   * seed: { mode: 'dark'|'light', bg, text, accent, sidebar?, player? }
   */
  function generatePalette(seed) {
    const bg = C.normHex(seed.bg) || '121212';
    const text = C.normHex(seed.text) || (C.isDark(bg) ? 'FFFFFF' : '111111');
    const accent = C.normHex(seed.accent) || '1DB954';
    const dark = seed.mode ? seed.mode === 'dark' : C.isDark(bg);
    const m = C.mix;
    // Readable accent for text and small icons; the raw accent stays on the big play button
    const readable = (fg, min) => {
      const toward = dark ? 'FFFFFF' : '000000';
      let out = fg;
      for (let i = 1; i <= 20 && C.contrast(out, bg) < min; i++) out = m(fg, toward, i * 0.05);
      return out;
    };
    if (dark) {
      return {
        main: bg,
        sidebar: C.normHex(seed.sidebar) || m(bg, '000000', 0.35),
        player: C.normHex(seed.player) || m(bg, '000000', 0.2),
        card: m(bg, text, 0.09),
        'main-elevated': m(bg, text, 0.07),
        highlight: m(bg, text, 0.05),
        'highlight-elevated': m(bg, text, 0.11),
        'tab-active': m(bg, text, 0.14),
        shadow: m(bg, '000000', 0.7),
        text,
        subtext: m(text, bg, 0.32),
        'selected-row': text,
        misc: m(text, bg, 0.5),
        button: readable(accent, 4.5),
        'button-active': accent,
        'button-disabled': m(text, bg, 0.68),
        notification: m(accent, bg, 0.55),
        'notification-error': m('E5484D', bg, 0.1),
      };
    }
    return {
      main: bg,
      sidebar: C.normHex(seed.sidebar) || m(bg, text, 0.05),
      player: C.normHex(seed.player) || m(bg, text, 0.035),
      card: m(bg, text, 0.07),
      'main-elevated': m(bg, text, 0.04),
      highlight: m(bg, text, 0.06),
      'highlight-elevated': m(bg, text, 0.1),
      'tab-active': m(bg, text, 0.12),
      shadow: m(text, '000000', 0.5),
      text,
      subtext: m(text, bg, 0.3),
      'selected-row': text,
      misc: m(text, bg, 0.5),
      button: readable(accent, 4.5),
      'button-active': accent,
      'button-disabled': m(text, bg, 0.62),
      notification: m(accent, bg, 0.72),
      'notification-error': 'D93848',
    };
  }

  function sanitizeColors(colors) {
    const out = {};
    for (const { key } of COLOR_KEYS) out[key] = C.normHex(colors && colors[key]) || ORIGINAL[key];
    return out;
  }

  function sanitizeStyle(style) {
    const d = defaultStyle();
    const s = Object.assign({}, d, style || {});
    s.radius = C.clamp(Number(s.radius) || 0, 0, 28);
    s.bgDim = C.clamp(Number(s.bgDim), 0, 0.95);
    s.bgBlur = C.clamp(Number(s.bgBlur) || 0, 0, 40);
    s.panelOpacity = C.clamp(Number(s.panelOpacity), 0.2, 1);
    s.glow = !!s.glow;
    if (!FONTS.some(f => f.id === s.font)) s.font = 'default';
    s.customFont = String(s.customFont || '').replace(/[^\w \-]/g, '').slice(0, 60);
    if (s.bgImage && !/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s.bgImage)) s.bgImage = null;
    s.customCSS = String(s.customCSS || '');
    s.fx = FX.sanitizeFx(s.fx);
    return s;
  }

  function fontFamilyFor(style) {
    if (style.font === 'custom') return style.customFont ? style.customFont : null;
    if (style.font === 'default') return null;
    return style.font;
  }

  function googleFontsUrl(fontId) {
    const f = FONTS.find(x => x.id === fontId);
    if (!f || !f.weights) return null;
    return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.id).replace(/%20/g, '+')}:wght@${f.weights}&display=swap`;
  }

  function buildColorIni(theme) {
    const colors = sanitizeColors(theme.colors);
    const name = String(theme.name || 'My theme').replace(/[\r\n]/g, ' ');
    const width = Math.max(...COLOR_KEYS.map(k => k.key.length));
    const lines = [
      `; Made with Gel: ${name}`,
      '; Gel rewrites this file every time you apply a theme.',
      '',
      `[${SCHEME}]`,
    ];
    for (const { key } of COLOR_KEYS) lines.push(`${key.padEnd(width)} = ${colors[key]}`);
    return lines.join('\r\n') + '\r\n';
  }

  function buildUserCss(theme) {
    const s = sanitizeStyle(theme.style);
    const colors = sanitizeColors(theme.colors);
    const out = [];
    const fontUrl = s.font !== 'custom' ? googleFontsUrl(s.font) : null;
    if (fontUrl) out.push(`@import url("${fontUrl}");`, '');
    out.push(`/* Made with Gel: ${String(theme.name || 'My theme').replace(/\*\//g, '')} */`, '');

    const family = fontFamilyFor(s);
    if (family) {
      out.push('/* Font */',
        `body, button, input, textarea, select, h1, h2, h3, h4, h5, h6, p, span, a,`,
        `[class*="encore-text"], [class*="main-type"] {`,
        `  font-family: "${family}", CircularSp, CircularSp-Arab, CircularSp-Hebr, CircularSp-Cyrl, CircularSp-Grek, CircularSp-Deva, sans-serif !important;`,
        `}`, '');
    }

    if (s.radius !== 8) {
      const r = s.radius;
      out.push('/* Roundness */',
        `.Root__nav-bar, .Root__main-view, .Root__right-sidebar, .Root__now-playing-bar {`,
        `  border-radius: ${r}px !important;`,
        `  overflow: hidden;`,
        `}`,
        `.main-card-card { border-radius: ${r}px !important; }`,
        `.main-cardImage-imageWrapper, .main-cardImage-image, .main-image-image { border-radius: ${Math.round(r * 0.75)}px !important; }`,
        `.main-contextMenu-menu { border-radius: ${Math.max(4, Math.round(r * 0.75))}px !important; }`,
        '');
    }

    if (s.glow) {
      out.push('/* Glow on play buttons */',
        `.main-playButton-PlayButton button, [data-testid="play-button"], [data-testid="control-button-playpause"] {`,
        `  box-shadow: 0 0 22px rgba(var(--spice-rgb-button), 0.55), 0 0 4px rgba(var(--spice-rgb-button), 0.8) !important;`,
        `  border-radius: 50% !important;`,
        `}`,
        `.main-playPauseButton-button, [data-testid="control-button-playpause"] { transition: box-shadow 0.2s ease; }`,
        '');
    }

    const fx = s.fx;
    const behind = fx.effect !== 'none' && fx.layer === 'behind';
    const rgb = k => C.rgbString(colors[k]);

    if (fx.effect !== 'none') {
      out.push('/* Animated background (drawn by theme.js) */',
        `#gel-fx { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: ${behind ? -1 : 9999}; }`,
        `@media (prefers-reduced-motion: reduce) { #gel-fx { display: none; } }`,
        '');
    }

    if (s.bgImage || behind) {
      const a = s.panelOpacity.toFixed(2);
      out.push('/* See-through panels */',
        `:root {`,
        `  --spice-main: rgba(${rgb('main')}, ${a}) !important;`,
        `  --spice-sidebar: rgba(${rgb('sidebar')}, ${a}) !important;`,
        `  --spice-player: rgba(${rgb('player')}, ${a}) !important;`,
        `}`,
        `.Root__nav-bar, .Root__main-view, .Root__right-sidebar, .Root__now-playing-bar {`,
        `  background-color: rgba(${rgb('main')}, ${a}) !important;`,
        s.bgBlur > 0 ? `  backdrop-filter: blur(${s.bgBlur}px);` : `  backdrop-filter: none;`,
        `}`,
        `.main-topBar-background, .main-entityHeader-backgroundColor, .main-actionBarBackground-background { background-color: transparent !important; }`,
        '');

      // With the animation behind the panels, the picture or frame colour moves to the page itself
      const target = behind ? 'html' : '.Root__top-container';
      if (behind) {
        out.push(`body, #main, .Root, .Root__top-container { background-color: transparent !important; background-image: none !important; }`);
      }
      if (s.bgImage) {
        const dim = rgb('shadow');
        out.push('/* Background picture */',
          `${target} {`,
          `  background-color: #${colors.sidebar} !important;`,
          `  background-image: linear-gradient(rgba(${dim}, ${s.bgDim.toFixed(2)}), rgba(${dim}, ${s.bgDim.toFixed(2)})), url("${s.bgImage}") !important;`,
          `  background-size: cover !important;`,
          `  background-position: center !important;`,
          `}`,
          '');
      } else {
        out.push(`html { background-color: #${colors.sidebar} !important; }`, '');
      }
    }

    if (s.customCSS.trim()) out.push('/* Your own CSS */', s.customCSS.trim(), '');
    if (out.length <= 3) out.push('/* Colours only: everything comes from color.ini */', '');
    return out.join('\n');
  }

  const api = {
    THEME_FOLDER, SCHEME, COLOR_KEYS, ORIGINAL, FONTS,
    defaultStyle, generatePalette, sanitizeColors, sanitizeStyle, fontFamilyFor, googleFontsUrl,
    buildColorIni, buildUserCss,
    buildThemeJs: theme => FX.buildThemeJs(sanitizeColors(theme.colors), sanitizeStyle(theme.style).fx),
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.Gel = root.Gel || {}).themegen = api;
})(typeof window !== 'undefined' ? window : globalThis);
