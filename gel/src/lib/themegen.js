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
  // display: true marks fonts that look best on headings rather than every bit of text.
  const FONTS = [
    { id: 'default', name: 'Spotify default', group: 'Basics' },
    { id: 'custom', name: 'A font on my PC…', group: 'Basics' },
    { id: 'Inter', name: 'Inter', group: 'Clean' },
    { id: 'DM Sans', name: 'DM Sans', group: 'Clean' },
    { id: 'Outfit', name: 'Outfit', group: 'Clean' },
    { id: 'Manrope', name: 'Manrope', group: 'Clean' },
    { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', group: 'Clean' },
    { id: 'Figtree', name: 'Figtree', group: 'Clean' },
    { id: 'Sora', name: 'Sora', group: 'Clean' },
    { id: 'Lexend', name: 'Lexend', group: 'Clean' },
    { id: 'Montserrat', name: 'Montserrat', group: 'Clean' },
    { id: 'Poppins', name: 'Poppins', group: 'Clean' },
    { id: 'Space Grotesk', name: 'Space Grotesk', group: 'Clean' },
    { id: 'Rubik', name: 'Rubik', group: 'Clean' },
    { id: 'Nunito', name: 'Nunito', group: 'Rounded and friendly' },
    { id: 'Quicksand', name: 'Quicksand', group: 'Rounded and friendly' },
    { id: 'Comfortaa', name: 'Comfortaa', group: 'Rounded and friendly' },
    { id: 'Fredoka', name: 'Fredoka', group: 'Rounded and friendly' },
    { id: 'Baloo 2', name: 'Baloo 2', group: 'Rounded and friendly' },
    { id: 'Varela Round', name: 'Varela Round', group: 'Rounded and friendly' },
    { id: 'M PLUS Rounded 1c', name: 'M PLUS Rounded', group: 'Japanese style' },
    { id: 'Zen Maru Gothic', name: 'Zen Maru Gothic', group: 'Japanese style' },
    { id: 'Zen Kaku Gothic New', name: 'Zen Kaku Gothic', group: 'Japanese style' },
    { id: 'Kosugi Maru', name: 'Kosugi Maru', group: 'Japanese style' },
    { id: 'Noto Sans JP', name: 'Noto Sans JP', group: 'Japanese style' },
    { id: 'DotGothic16', name: 'DotGothic16 (pixel)', group: 'Japanese style' },
    { id: 'Mochiy Pop One', name: 'Mochiy Pop One', group: 'Japanese style', display: true },
    { id: 'Hachi Maru Pop', name: 'Hachi Maru Pop', group: 'Japanese style', display: true },
    { id: 'Dela Gothic One', name: 'Dela Gothic One', group: 'Japanese style', display: true },
    { id: 'Yusei Magic', name: 'Yusei Magic (marker)', group: 'Japanese style', display: true },
    { id: 'RocknRoll One', name: 'RocknRoll One', group: 'Japanese style', display: true },
    { id: 'Reggae One', name: 'Reggae One', group: 'Japanese style', display: true },
    { id: 'Potta One', name: 'Potta One (brush)', group: 'Japanese style', display: true },
    { id: 'Shippori Mincho', name: 'Shippori Mincho (serif)', group: 'Japanese style', display: true },
    { id: 'Kaisei Decol', name: 'Kaisei Decol', group: 'Japanese style', display: true },
    { id: 'Exo 2', name: 'Exo 2', group: 'Techy' },
    { id: 'Rajdhani', name: 'Rajdhani', group: 'Techy' },
    { id: 'Chakra Petch', name: 'Chakra Petch', group: 'Techy' },
    { id: 'Kanit', name: 'Kanit', group: 'Techy' },
    { id: 'JetBrains Mono', name: 'JetBrains Mono', group: 'Techy' },
    { id: 'Space Mono', name: 'Space Mono', group: 'Techy' },
    { id: 'Orbitron', name: 'Orbitron', group: 'Techy', display: true },
    { id: 'Audiowide', name: 'Audiowide', group: 'Techy', display: true },
    { id: 'Lora', name: 'Lora', group: 'Classic serif' },
    { id: 'Merriweather', name: 'Merriweather', group: 'Classic serif' },
    { id: 'Playfair Display', name: 'Playfair Display', group: 'Classic serif', display: true },
    { id: 'Press Start 2P', name: 'Press Start 2P (pixel)', group: 'Retro and display', display: true },
    { id: 'VT323', name: 'VT323 (terminal)', group: 'Retro and display', display: true },
    { id: 'Silkscreen', name: 'Silkscreen (pixel)', group: 'Retro and display', display: true },
    { id: 'Bungee', name: 'Bungee', group: 'Retro and display', display: true },
    { id: 'Monoton', name: 'Monoton (neon)', group: 'Retro and display', display: true },
    { id: 'Righteous', name: 'Righteous', group: 'Retro and display', display: true },
    { id: 'Bebas Neue', name: 'Bebas Neue', group: 'Retro and display', display: true },
    { id: 'Pacifico', name: 'Pacifico (script)', group: 'Retro and display', display: true },
    { id: 'Unbounded', name: 'Unbounded', group: 'Retro and display', display: true },
    { id: 'Syne', name: 'Syne', group: 'Retro and display', display: true },
  ];
  const isWebFont = id => FONTS.some(f => f.id === id) && id !== 'default' && id !== 'custom';

  function defaultStyle() {
    return { font: 'default', customFont: '', headingFont: 'same', radius: 8, glow: false, bgImage: null, bgDim: 0.55, bgBlur: 0, panelOpacity: 0.72, customCSS: '', fx: FX.defaultFx() };
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
    if (s.headingFont !== 'same' && !isWebFont(s.headingFont)) s.headingFont = 'same';
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

  function headingFamilyFor(style) {
    return style.headingFont && style.headingFont !== 'same' && isWebFont(style.headingFont) ? style.headingFont : null;
  }

  // Google's older font address skips weights a font doesn't have instead of failing
  function googleFontsUrl(fontId) {
    if (!isWebFont(fontId)) return null;
    return `https://fonts.googleapis.com/css?family=${encodeURIComponent(fontId).replace(/%20/g, '+')}:400,500,700,800,900&display=swap`;
  }

  const FALLBACK = 'CircularSp, CircularSp-Arab, CircularSp-Hebr, CircularSp-Cyrl, CircularSp-Grek, CircularSp-Deva, sans-serif';

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
    const family = fontFamilyFor(s);
    const heading = headingFamilyFor(s);
    const imports = [...new Set([s.font, s.headingFont].map(googleFontsUrl).filter(Boolean))];
    for (const url of imports) out.push(`@import url("${url}");`);
    if (imports.length) out.push('');
    out.push(`/* Made with Gel: ${String(theme.name || 'My theme').replace(/\*\//g, '')} */`, '');

    if (family) {
      out.push('/* Font */',
        `body, button, input, textarea, select, h1, h2, h3, h4, h5, h6, p, span, a,`,
        `[class*="encore-text"], [class*="main-type"] {`,
        `  font-family: "${family}", ${FALLBACK} !important;`,
        `}`, '');
    }
    if (heading) {
      out.push('/* Heading font */',
        `h1, h2, h1 *, h2 *, [class*="encore-text-headline"], [class*="encore-text-headline"] *,`,
        `[class*="encore-text-title"], [class*="encore-text-title"] *, .main-entityHeader-title, .main-entityHeader-title * {`,
        `  font-family: "${heading}", ${family ? `"${family}", ` : ''}${FALLBACK} !important;`,
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
    defaultStyle, generatePalette, sanitizeColors, sanitizeStyle, fontFamilyFor, headingFamilyFor, googleFontsUrl, isWebFont,
    buildColorIni, buildUserCss,
    buildThemeJs: theme => FX.buildThemeJs(sanitizeColors(theme.colors), sanitizeStyle(theme.style).fx),
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.Gel = root.Gel || {}).themegen = api;
})(typeof window !== 'undefined' ? window : globalThis);
