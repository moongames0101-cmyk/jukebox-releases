/* Turns a Gel theme into the two files Spicetify reads: color.ini and user.css. */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./color.js') : root.Gel.color;
  const FX = isNode ? require('./fx.js') : root.Gel.fx;
  const GLYPHS = isNode ? require('./glyphs.js') : root.Gel.glyphs;
  const LIVE = isNode ? require('./live.js') : root.Gel.live;

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

  const LOGO_MODES = ['keep', 'glyph', 'image', 'hide'];
  const PLAYER_STYLES = ['normal', 'floating'];
  const ART_STYLES = ['square', 'rounded', 'circle', 'vinyl'];
  const DYNAMIC_MODES = ['off', 'accent', 'full'];
  const DJ_MODES = ['keep', 'theme', 'image', 'hide'];
  // Spotify's DJ lives at this playlist address
  const DJ_ID = '37i9dQZF1EYkqdzj48dyYq';

  function defaultLayout() {
    return { logo: 'keep', glyph: 'gel', logoImage: null, player: 'normal', art: 'square', declutter: false, scrollbars: false, bouncy: false, dj: 'keep', djImage: null };
  }

  function sanitizeLayout(layout) {
    const l = Object.assign(defaultLayout(), layout || {});
    if (!LOGO_MODES.includes(l.logo)) l.logo = 'keep';
    if (!GLYPHS.GLYPHS[l.glyph]) l.glyph = 'gel';
    if (l.logoImage && !/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(l.logoImage)) l.logoImage = null;
    if (l.logo === 'image' && !l.logoImage) l.logo = 'glyph';
    if (!PLAYER_STYLES.includes(l.player)) l.player = 'normal';
    if (!ART_STYLES.includes(l.art)) l.art = 'square';
    l.declutter = !!l.declutter; l.scrollbars = !!l.scrollbars; l.bouncy = !!l.bouncy;
    if (!DJ_MODES.includes(l.dj)) l.dj = 'keep';
    if (l.djImage && !/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(l.djImage)) l.djImage = null;
    if (l.dj === 'image' && !l.djImage) l.dj = 'theme';
    return l;
  }

  function defaultStyle() {
    return { font: 'default', customFont: '', headingFont: 'same', radius: 8, glow: false, bgImage: null, bgDim: 0.55, bgBlur: 0, panelOpacity: 0.72, customCSS: '', fx: FX.defaultFx(), layout: defaultLayout(), dynamic: 'off',
      aurora: { on: false, colors: null, intensity: 0.6 }, glassEdges: false };
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
    s.layout = sanitizeLayout(s.layout);
    if (!DYNAMIC_MODES.includes(s.dynamic)) s.dynamic = 'off';
    const a = Object.assign({ on: false, colors: null, intensity: 0.6 }, s.aurora || {});
    a.on = !!a.on;
    a.colors = Array.isArray(a.colors) && a.colors.length === 3 && a.colors.every(c => C.normHex(c)) ? a.colors.map(C.normHex) : null;
    a.intensity = C.clamp(Number(a.intensity) || 0.6, 0.2, 1);
    s.aurora = a;
    s.glassEdges = !!s.glassEdges;
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

  // Three glow colours: the theme's accent and two neighbours on the colour wheel
  function auroraColors(colors, aurora) {
    if (aurora && aurora.colors) return aurora.colors;
    const base = C.rgbToHsl(C.hexToRgb(colors['button-active']));
    const shift = deg => C.rgbToHex(C.hslToRgb({ h: base.h + deg, s: Math.max(base.s, 0.55), l: C.clamp(base.l, 0.5, 0.65) }));
    return [colors['button-active'], shift(50), shift(-60)];
  }

  // Is the frame see-through? (picture, animation behind the panels, or the glowing background)
  function isSeeThrough(s) {
    return !!s.bgImage || (s.fx.effect !== 'none' && s.fx.layer === 'behind') || s.aurora.on;
  }

  const LOGO_SEL = '.main-globalNav-link-icon, .main-appShell-logo, .main-navBar-logo';
  const LOGO_KIDS = '.main-globalNav-link-icon *, .main-appShell-logo *, .main-navBar-logo *';
  const ART_SEL = [
    '.main-cardImage-image', '.main-cardImage-imageWrapper', '.main-entityHeader-image',
    '.main-nowPlayingWidget-coverArt img', '.main-nowPlayingWidget-coverArt .cover-art', '[data-testid="cover-art-image"]',
  ].join(', ');
  const NOW_ART = '.main-nowPlayingWidget-coverArt img, .main-nowPlayingWidget-coverArt .cover-art, .main-nowPlayingWidget-coverArtContainer [data-testid="cover-art-image"]';

  function djArtOptions(colors, s) {
    const L = s.layout;
    const au = s.aurora && s.aurora.on ? auroraColors(colors, s.aurora) : null;
    const accent = colors['button-active'];
    const second = au ? au[1] : C.rgbToHex(C.hslToRgb(Object.assign(C.rgbToHsl(C.hexToRgb(accent)), {})));
    const shifted = (() => { const h = C.rgbToHsl(C.hexToRgb(accent)); return C.rgbToHex(C.hslToRgb({ h: h.h + 40, s: Math.max(h.s, 0.5), l: C.clamp(h.l, 0.45, 0.62) })); })();
    return {
      accent,
      second: au ? au[1] : shifted,
      deep: C.mix(colors.main, '000000', C.isDark(colors.main) ? 0.2 : 0.75),
      ink: 'FFFFFF',
      glyph: L.logo === 'glyph' ? L.glyph : 'gel',
    };
  }

  function djArtUrl(colors, s) {
    if (s.layout.dj === 'image' && s.layout.djImage) return s.layout.djImage;
    return GLYPHS.djArtDataUrl(djArtOptions(colors, s));
  }

  function djCss(colors, s) {
    const mode = s.layout.dj;
    if (mode === 'keep') return [];
    const where = [
      `a[href*="${DJ_ID}"]`, `[aria-labelledby*="${DJ_ID}"]`, `[data-uri*="${DJ_ID}"]`,
      `.main-card-card:has(a[href*="${DJ_ID}"])`, `[role="row"]:has([aria-labelledby*="${DJ_ID}"])`,
    ];
    if (mode === 'hide') {
      return ['/* DJ: hidden */',
        `.main-card-card:has(a[href*="${DJ_ID}"]), [role="row"]:has([aria-labelledby*="${DJ_ID}"]),`,
        `[data-testid="grid-container"] > div:has(a[href*="${DJ_ID}"]), button[aria-label="DJ"], [data-testid="dj-button"] { display: none !important; }`, ''];
    }
    const url = djArtUrl(colors, s);
    return ['/* DJ: new artwork everywhere DJ shows up, and a glow while DJ is playing */',
      `${where.map(w => `${w} img`).join(',\n')} {`,
      `  content: url("${url}") !important;`,
      `  object-fit: cover !important;`,
      `}`,
      `.main-card-card:has(a[href*="${DJ_ID}"]) {`,
      `  box-shadow: 0 0 0 1px rgba(var(--spice-rgb-button-active), 0.5), 0 10px 30px -10px rgba(var(--spice-rgb-button-active), 0.7) !important;`,
      `}`,
      `body.gel-dj .main-nowPlayingWidget-coverArt { position: relative; overflow: visible !important; }`,
      `body.gel-dj .main-nowPlayingWidget-coverArt img, body.gel-dj .main-nowPlayingWidget-coverArt .cover-art {`,
      `  box-shadow: 0 0 0 2px var(--spice-button-active), 0 0 18px 2px rgba(var(--spice-rgb-button-active), 0.75) !important;`,
      `  animation: gel-dj-pulse 2.4s ease-in-out infinite;`,
      `}`,
      `body.gel-dj .main-nowPlayingWidget-coverArt::after {`,
      `  content: 'DJ'; position: absolute; right: -6px; bottom: -6px; z-index: 2;`,
      `  padding: 1px 6px; border-radius: 999px; font-size: 10px; font-weight: 900; letter-spacing: .02em;`,
      `  color: var(--spice-main); background: var(--spice-button-active);`,
      `  box-shadow: 0 0 10px rgba(var(--spice-rgb-button-active), 0.9);`,
      `}`,
      `@keyframes gel-dj-pulse { 50% { box-shadow: 0 0 0 2px var(--spice-button-active), 0 0 28px 6px rgba(var(--spice-rgb-button-active), 0.55); } }`,
      `@media (prefers-reduced-motion: reduce) { body.gel-dj .main-nowPlayingWidget-coverArt img { animation: none; } }`,
      ''];
  }

  function layoutCss(s, colors) {
    const L = s.layout;
    const out = djCss(colors, s);
    if (L.logo === 'hide') {
      out.push('/* Logo: hidden */', `${LOGO_SEL} { visibility: hidden !important; }`, '');
    } else if (L.logo === 'glyph') {
      const url = GLYPHS.glyphDataUrl(L.glyph, '000000');
      out.push('/* Logo: theme emblem in the accent colour (follows the song when that is on) */',
        `${LOGO_SEL} {`,
        `  background-color: var(--spice-button-active) !important;`,
        `  -webkit-mask: url("${url}") center / contain no-repeat !important;`,
        `  mask: url("${url}") center / contain no-repeat !important;`,
        `}`,
        `${LOGO_KIDS} { opacity: 0 !important; }`, '');
    } else if (L.logo === 'image' && L.logoImage) {
      out.push('/* Logo: your picture */',
        `${LOGO_SEL} { background: url("${L.logoImage}") center / contain no-repeat !important; border-radius: 6px; }`,
        `${LOGO_KIDS} { opacity: 0 !important; }`, '');
    }

    if (L.player === 'floating') {
      const r = Math.max(10, Math.round(s.radius * 1.5));
      out.push('/* Floating player */',
        `.Root__now-playing-bar {`,
        `  margin: 0 10px 10px !important;`,
        `  border-radius: ${r}px !important;`,
        `  overflow: hidden !important;`,
        `  background-color: var(--spice-player) !important;`,
        `  box-shadow: 0 12px 32px rgba(var(--spice-rgb-shadow), 0.55) !important;`,
        `}`,
        `.main-nowPlayingBar-nowPlayingBar { background: transparent !important; }`, '');
    }

    if (L.art !== 'square') {
      const radius = L.art === 'rounded' ? '14px' : '50%';
      out.push(`/* Album covers: ${L.art} */`, `${ART_SEL} { border-radius: ${radius} !important; }`, '');
    }
    if (L.art === 'vinyl') {
      out.push('/* The playing cover spins like a record */',
        `@keyframes gel-spin { to { transform: rotate(360deg); } }`,
        `${NOW_ART} {`,
        `  border-radius: 50% !important;`,
        `  -webkit-mask: radial-gradient(circle, transparent 0 9%, #000 10%) !important;`,
        `  animation: gel-spin 6s linear infinite;`,
        `  animation-play-state: paused;`,
        `}`,
        `body.gel-playing ${NOW_ART.split(', ').join(`, body.gel-playing `)} { animation-play-state: running; }`,
        `@media (prefers-reduced-motion: reduce) { ${NOW_ART} { animation: none; } }`, '');
    }

    if (L.declutter) {
      out.push('/* Hide clutter */',
        `.main-topBar-UpgradeButton, .main-navBar-premiumNavItem, .main-navBar-downloadItem, .main-topBar-whatsNewFeed,`,
        `.main-globalNav-buddyFeed, button[aria-label="What's New"], button[aria-label="Friend Activity"] { display: none !important; }`, '');
    }

    if (L.scrollbars) {
      out.push('/* Accent scrollbars */',
        `.os-scrollbar-handle { background: rgba(var(--spice-rgb-button), 0.55) !important; border-radius: 999px !important; }`,
        `.os-scrollbar-handle:hover, .os-scrollbar-handle.active { background: rgba(var(--spice-rgb-button), 0.85) !important; }`,
        `::-webkit-scrollbar-thumb { background: rgba(var(--spice-rgb-button), 0.55) !important; border-radius: 999px; }`, '');
    }

    if (L.bouncy) {
      out.push('/* Cards lift on hover */',
        `.main-card-card { transition: transform 0.2s ease, background-color 0.3s ease !important; }`,
        `.main-card-card:hover { transform: translateY(-4px) scale(1.02); }`,
        `@media (prefers-reduced-motion: reduce) { .main-card-card:hover { transform: none; } }`, '');
    }
    return out;
  }

  /* theme.js: animations, colours that follow the song, and the spinning record */
  function buildThemeJs(theme) {
    const colors = sanitizeColors(theme.colors);
    const s = sanitizeStyle(theme.style);
    const fxCfg = FX.engineConfig(colors, s.fx);
    const hasFx = fxCfg.effect !== 'none';
    const behind = hasFx && s.fx.layer === 'behind';
    const live = s.dynamic !== 'off'
      ? { mode: s.dynamic, dark: C.isDark(colors.main), text: '#' + colors.text, main: '#' + colors.main, alpha: isSeeThrough(s) ? Number(s.panelOpacity.toFixed(2)) : 1 }
      : null;
    const vinyl = s.layout.art === 'vinyl';
    const djGlow = s.layout.dj === 'theme' || s.layout.dj === 'image';
    if (!hasFx && !live && !vinyl && !djGlow) return '';

    const L = ['// Made with Gel: Gel rewrites this file every time you apply a theme.', '(function () {'];
    if (hasFx) {
      L.push(
        '  // ---- Animated background ----',
        '  var fxCfg = ' + JSON.stringify(fxCfg) + ';',
        '  var engine = ' + FX.gelFxEngine.toString() + ';',
        '  function startFx() {',
        '    if (!document.body) return setTimeout(startFx, 200);',
        "    var old = document.getElementById('gel-fx');",
        '    if (old && old.__gel) old.__gel.destroy();',
        '    if (old) old.remove();',
        "    var layer = document.createElement('div');",
        "    layer.id = 'gel-fx';",
        "    layer.setAttribute('aria-hidden', 'true');",
        '    document.body.appendChild(layer);',
        '    layer.__gel = engine(layer, fxCfg);',
        '  }',
        "  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startFx); else startFx();");
    }
    if (live || vinyl || djGlow) {
      L.push(
        '  // ---- Player hooks ----',
        '  var live = ' + JSON.stringify(live) + ';',
        '  var vinyl = ' + JSON.stringify(vinyl) + ';',
        '  var djGlow = ' + JSON.stringify(djGlow) + ';',
        "  var DJ_ID = '" + DJ_ID + "';",
        '  var liveColors = ' + LIVE.gelLiveColors.toString() + ';',
        '  function whenReady(cb) {',
        '    if (window.Spicetify && Spicetify.Player && Spicetify.Player.addEventListener && document.body) cb();',
        '    else setTimeout(function () { whenReady(cb); }, 300);',
        '  }',
        '  whenReady(function () {',
        '    var P = Spicetify.Player;',
        '    if (vinyl) {',
        "      var sync = function () { document.body.classList.toggle('gel-playing', !!P.isPlaying()); };",
        "      P.addEventListener('onplaypause', sync);",
        "      P.addEventListener('songchange', sync);",
        '      sync();',
        '    }',
        '    if (djGlow) {',
        '      var djSync = function () {',
        '        var d = P.data || {};',
        "        var ctx = (d.context && d.context.uri) || d.context_uri || '';",
        "        document.body.classList.toggle('gel-dj', String(ctx).indexOf(DJ_ID) !== -1);",
        '      };',
        "      P.addEventListener('songchange', djSync);",
        "      P.addEventListener('onplaypause', djSync);",
        '      djSync();',
        '    }',
        '    if (live) {',
        '      var root = document.documentElement;',
        '      var names = [];',
        '      var clearLive = function () {',
        "        names.forEach(function (n) { root.style.removeProperty('--spice-' + n); root.style.removeProperty('--spice-rgb-' + n); });",
        '        names = [];',
        '      };',
        '      var paint = function () {',
        '        var d = P.data || {};',
        '        var item = d.item || d.track || {};',
        '        if (!item.uri || !Spicetify.colorExtractor) { clearLive(); return; }',
        '        Spicetify.colorExtractor(item.uri).then(function (pal) {',
        '          var out = liveColors(live, pal || {});',
        '          clearLive();',
        '          if (!out) return;',
        '          Object.keys(out).forEach(function (n) {',
        '            var c = out[n];',
        "            var a = live.alpha < 1 && (n === 'main' || n === 'sidebar' || n === 'player') ? live.alpha : 1;",
        "            root.style.setProperty('--spice-' + n, a < 1 ? 'rgba(' + c.join(',') + ',' + a + ')' : 'rgb(' + c.join(',') + ')', 'important');",
        "            root.style.setProperty('--spice-rgb-' + n, c.join(','), 'important');",
        '            names.push(n);',
        '          });',
        '        }).catch(clearLive);',
        '      };',
        "      P.addEventListener('songchange', paint);",
        '      paint();',
        '    }',
        '  });');
    }
    L.push('})();', '');
    return L.join('\n');
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

    if (s.bgImage || behind || s.aurora.on) {
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
      } else if (behind) {
        out.push(`html { background-color: #${colors.sidebar} !important; }`, '');
      }
    }

    if (s.aurora.on) {
      const [c1, c2, c3] = auroraColors(colors, s.aurora).map(C.rgbString);
      const k = s.aurora.intensity;
      const al = v => (v * k).toFixed(2);
      out.push('/* Glowing background: soft colour drifting behind the see-through panels */',
        `.Root__top-container { isolation: isolate; }`,
        `.Root__top-container::before {`,
        `  content: ''; position: fixed; inset: -25%; z-index: -1; pointer-events: none;`,
        `  background:`,
        `    radial-gradient(32% 32% at 22% 24%, rgba(${c1}, ${al(0.75)}), transparent 72%),`,
        `    radial-gradient(28% 30% at 80% 30%, rgba(${c2}, ${al(0.6)}), transparent 72%),`,
        `    radial-gradient(34% 30% at 52% 84%, rgba(${c3}, ${al(0.55)}), transparent 72%);`,
        `  animation: gel-aurora 28s ease-in-out infinite alternate;`,
        `}`,
        `@keyframes gel-aurora { 50% { transform: translate(4%, 3%) scale(1.08); } 100% { transform: translate(-3%, 5%) scale(0.95); } }`,
        `@media (prefers-reduced-motion: reduce) { .Root__top-container::before { animation: none; } }`,
        '');
    }

    if (s.glassEdges) {
      const dark = C.isDark(colors.main);
      const edge = dark ? '255,255,255' : '0,0,0';
      out.push('/* Glass edges */',
        `.Root__nav-bar, .Root__main-view, .Root__right-sidebar, .Root__now-playing-bar, .main-contextMenu-menu {`,
        `  box-shadow: inset 0 0 0 1px rgba(${edge}, ${dark ? 0.09 : 0.07}), inset 0 1px 0 rgba(${edge}, ${dark ? 0.12 : 0.05}), 0 20px 50px -25px rgba(0,0,0,${dark ? 0.6 : 0.25}) !important;`,
        `}`, '');
    }

    out.push(...layoutCss(s, colors));

    if (s.dynamic !== 'off') {
      out.push('/* Colours follow the song: fade between covers */',
        `.Root__top-container, .Root__nav-bar, .Root__main-view, .Root__right-sidebar, .Root__now-playing-bar, .main-card-card {`,
        `  transition: background-color 0.8s ease, color 0.8s ease;`,
        `}`, '');
    }

    if (s.customCSS.trim()) out.push('/* Your own CSS */', s.customCSS.trim(), '');
    if (out.length <= 3) out.push('/* Colours only: everything comes from color.ini */', '');
    return out.join('\n');
  }

  const api = {
    THEME_FOLDER, SCHEME, COLOR_KEYS, ORIGINAL, FONTS,
    defaultStyle, generatePalette, sanitizeColors, sanitizeStyle, fontFamilyFor, headingFamilyFor, googleFontsUrl, isWebFont,
    buildColorIni, buildUserCss,
    buildThemeJs, auroraColors, isSeeThrough, djArtUrl, DJ_ID, DJ_MODES, defaultLayout, sanitizeLayout, LOGO_MODES, PLAYER_STYLES, ART_STYLES, DYNAMIC_MODES,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.Gel = root.Gel || {}).themegen = api;
})(typeof window !== 'undefined' ? window : globalThis);
