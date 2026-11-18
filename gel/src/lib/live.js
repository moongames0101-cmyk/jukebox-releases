/* "Colours follow the song": works out new colours from an album cover's palette.
   The same function runs in Gel's preview and, inside theme.js, in Spotify. */
(function (root) {
  /* eslint-disable no-var */
  // Kept in plain old JavaScript so it can be copied into Spotify as-is.
  // cfg: { mode: 'accent'|'full', dark: bool, text: '#rrggbb', alpha: number }
  // pal: Spicetify.colorExtractor result ({ VIBRANT, DARK_VIBRANT, LIGHT_VIBRANT, DESATURATED, PROMINENT, ... })
  // Returns { name: [r,g,b] } for the --spice-* colours to change.
  function gelLiveColors(cfg, pal) {
    function rgb(h) {
      h = String(h || '').replace('#', '');
      if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
      if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function mix(a, b, t) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }); }
    function lum(c) {
      var v = c.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    }
    function contrast(a, b) { var A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); }
    function push(c, toward, against, min) {
      var out = c;
      for (var i = 1; i <= 20 && contrast(out, against) < min; i++) out = mix(c, toward, i * 0.05);
      return out;
    }
    var BLACK = [0, 0, 0], WHITE = [255, 255, 255];
    var text = rgb(cfg.text) || (cfg.dark ? WHITE : BLACK);
    var vibrant = rgb(pal.VIBRANT) || rgb(pal.PROMINENT) || rgb(pal.LIGHT_VIBRANT);
    if (!vibrant) return null;
    var out = {};

    if (cfg.mode === 'full') {
      var base = cfg.dark ? (rgb(pal.DARK_VIBRANT) || rgb(pal.DESATURATED) || vibrant) : (rgb(pal.LIGHT_VIBRANT) || vibrant);
      var main = cfg.dark ? mix(base, BLACK, 0.55) : mix(base, WHITE, 0.82);
      // keep the theme's text readable
      main = push(main, cfg.dark ? BLACK : WHITE, text, 7);
      var deep = cfg.dark ? BLACK : text;
      out.main = main;
      out.sidebar = cfg.dark ? mix(main, BLACK, 0.35) : mix(main, text, 0.05);
      out.player = cfg.dark ? mix(main, BLACK, 0.2) : mix(main, text, 0.035);
      out.card = mix(main, text, cfg.dark ? 0.09 : 0.07);
      out['main-elevated'] = mix(main, text, cfg.dark ? 0.07 : 0.04);
      out.highlight = mix(main, text, cfg.dark ? 0.05 : 0.06);
      out['highlight-elevated'] = mix(main, text, cfg.dark ? 0.11 : 0.1);
      out['tab-active'] = mix(main, text, cfg.dark ? 0.14 : 0.12);
      out.shadow = mix(main, deep, 0.7);
      out.subtext = mix(text, main, cfg.dark ? 0.32 : 0.3);
    }
    var bg = out.main || rgb(cfg.main) || (cfg.dark ? BLACK : WHITE);
    var accent = cfg.dark ? push(vibrant, WHITE, bg, 3) : push(vibrant, BLACK, bg, 3);
    out['button-active'] = accent;
    out.button = cfg.dark ? push(accent, WHITE, bg, 4.5) : push(accent, BLACK, bg, 4.5);
    out.notification = mix(accent, bg, cfg.dark ? 0.55 : 0.72);
    return out;
  }
  /* eslint-enable no-var */

  // A stand-in album palette for the preview (matches the preview's "Late Night Drive" cover)
  const SAMPLE_PALETTE = { VIBRANT: '#D53369', DARK_VIBRANT: '#2B1055', LIGHT_VIBRANT: '#FFB347', DESATURATED: '#7A4B6A', PROMINENT: '#D53369' };

  const api = { gelLiveColors, SAMPLE_PALETTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.Gel = root.Gel || {}).live = api;
})(typeof window !== 'undefined' ? window : globalThis);
