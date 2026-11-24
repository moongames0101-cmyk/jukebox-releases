/* Gel for YouTube: the parts that turn a Gel theme into CSS for YouTube.
   No page access here, so the same file runs in the extension and in Gel's tests. */
(function (root) {
  'use strict';

  // ---------- Colours ----------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round3(v) { return Math.round(v * 1000) / 1000; }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
    if (s === 0) { var v = Math.round(l * 255); return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
  }

  // "#fff", "#0f0f0f80", "rgba(1,2,3,.5)", "rgb(1 2 3 / 50%)", "hsla(0,0%,100%,.1)" -> [r, g, b, a]
  function parseColor(str) {
    if (typeof str !== 'string') return null;
    var s = str.trim().toLowerCase();
    var m = /^#([0-9a-f]{3,8})$/.exec(s);
    if (m) {
      var h = m[1];
      if (h.length === 3 || h.length === 4) h = h.replace(/./g, '$&$&');
      if (h.length !== 6 && h.length !== 8) return null;
      var a = h.length === 8 ? round3(parseInt(h.slice(6, 8), 16) / 255) : 1;
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a];
    }
    m = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(s);
    if (!m) return null;
    var parts = m[2].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    function num(p, scale) { return /%$/.test(p) ? parseFloat(p) / 100 * scale : parseFloat(p); }
    var alpha = parts.length > 3 ? num(parts[3], 1) : 1;
    if (isNaN(alpha)) return null;
    var rgb;
    if (m[1][0] === 'r') rgb = [num(parts[0], 255), num(parts[1], 255), num(parts[2], 255)].map(Math.round);
    else rgb = hslToRgb(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
    if (rgb.some(isNaN)) return null;
    return [clamp(rgb[0], 0, 255), clamp(rgb[1], 0, 255), clamp(rgb[2], 0, 255), round3(clamp(alpha, 0, 1))];
  }

  function hexOf(c) { return '#' + c.slice(0, 3).map(function (v) { return v.toString(16).padStart(2, '0'); }).join('').toUpperCase(); }
  function rgbaOf(hex, a) { var c = parseColor(hex); return 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + round3(a) + ')'; }
  function mix(a, b, t) { var x = parseColor(a), y = parseColor(b); return hexOf([0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); })); }
  function same(a, b) { return a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && Math.abs(a[3] - b[3]) < 0.002; }

  // YouTube's dark colours and the Gel colour that replaces each one.
  var SOLID = {
    '0f0f0f': function (p) { return p.bg; },
    '181818': function (p) { return p.surface; },
    '1f1f1f': function (p) { return p.surface; },
    '212121': function (p) { return p.raised; },
    '222222': function (p) { return p.raised; },
    '272727': function (p) { return p.chip; },
    '282828': function (p) { return p.menu; },
    '303030': function (p) { return p.line; },
    '383838': function (p) { return p.line; },
    '3f3f3f': function (p) { return mix(p.chip, p.text, 0.08); },
    'f1f1f1': function (p) { return p.text; },
    'ffffff': function (p) { return p.text; },
    'e6e6e6': function (p) { return mix(p.text, p.bg, 0.1); },
    'd9d9d9': function (p) { return mix(p.text, p.bg, 0.15); },
    'cccccc': function (p) { return mix(p.text, p.bg, 0.2); },
    'aaaaaa': function (p) { return p.text2; },
    '909090': function (p) { return p.text3; },
    '717171': function (p) { return p.text3; },
    '3ea6ff': function (p) { return p.link; },
    '65b8ff': function (p) { return mix(p.link, p.text, 0.25); },
    '065fd4': function (p) { return mix(p.link, p.bg, 0.45); },
    '263850': function (p) { return mix(p.bg, p.accent, 0.22); },
  };

  // What a YouTube colour should become. null means "leave it alone".
  // Colours that are the same in YouTube's light and dark looks sit on top of videos
  // (overlays, badges, brand red), so they stay as they are.
  function roleColor(dark, light, pal) {
    var d = parseColor(dark);
    if (!d) return null;
    var l = parseColor(light);
    if (same(d, l)) return null;
    if (d[3] >= 0.999) {
      var fn = SOLID[hexOf(d).slice(1).toLowerCase()];
      return fn ? fn(pal) : null;
    }
    if (d[0] === 255 && d[1] === 255 && d[2] === 255) return rgbaOf(pal.text, d[3]);
    if ((d[0] === 15 && d[1] === 15 && d[2] === 15) || (d[0] === 33 && d[1] === 33 && d[2] === 33)) return rgbaOf(pal.bg, d[3]);
    return null;
  }

  // ---------- Reading YouTube's colour variables ----------
  // rules: [{ selector, decls: [[name, value]] }] in page order.
  // matchesHtml(part) says whether a selector (without [dark]) matches the page's <html>.
  function collectVars(rules, matchesHtml) {
    var light = {}, dark = {}, lightRank = {}, darkRank = {};
    rules.forEach(function (rule, order) {
      var parts = String(rule.selector).split(',');
      var hit = null, isDark = false;
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        var hasDark = /\[dark\]/.test(part) && !/:not\(\[dark\]\)/.test(part);
        var bare = part.replace(/:not\(\[dark\]\)/g, '').replace(/\[dark\]/g, '').trim();
        if (part === '[light]' || bare === '' || safeMatch(matchesHtml, bare)) { hit = part; isDark = hasDark; if (isDark) break; }
      }
      if (hit === null) return;
      var rank = (/color-version/.test(rule.selector) ? 2 : 1) * 100000 + order;
      var store = isDark ? dark : light, ranks = isDark ? darkRank : lightRank;
      rule.decls.forEach(function (d) {
        if (d[0].slice(0, 2) !== '--') return;
        if (ranks[d[0]] != null && ranks[d[0]] > rank) return;
        ranks[d[0]] = rank; store[d[0]] = String(d[1]).trim();
      });
    });
    var out = {};
    Object.keys(light).concat(Object.keys(dark)).forEach(function (n) {
      if (out[n]) return;
      out[n] = { light: light[n] != null ? light[n] : null, dark: dark[n] != null ? dark[n] : light[n] };
    });
    return out;
  }
  function safeMatch(fn, sel) { try { return !!fn(sel); } catch (e) { return false; } }

  function varCss(vars, pal) {
    var lines = [];
    Object.keys(vars).forEach(function (n) {
      var v = vars[n];
      var c = roleColor(v.dark, v.light, pal);
      if (c) lines.push('  ' + n + ': ' + c + ' !important;');
    });
    return 'html, [dark], [light] {\n' + lines.join('\n') + '\n}\n';
  }

  // ---------- Page CSS ----------
  var BODY_TEXT = 'ytd-app, ytd-app *:not(.html5-video-player, .html5-video-player *, yt-icon, yt-icon *)';
  var HEADINGS = [
    'h1.ytd-watch-metadata', 'h1.ytd-watch-metadata *', '#title.ytd-rich-shelf-renderer', '#title.ytd-shelf-renderer',
    'ytd-reel-shelf-renderer #title', '#guide-section-title', 'yt-page-header-view-model h1', 'yt-page-header-view-model h1 *',
    'yt-dynamic-text-view-model h1', 'yt-dynamic-text-view-model h1 *', 'ytd-c4-tabbed-header-renderer #channel-name #text',
    'yt-section-header-view-model h2', 'yt-shelf-header-layout h2', 'yt-shelf-header-layout h2 *', '.gel-yt-logo .gel-yt-logo-text',
  ].join(', ');
  var SHORTS = [
    'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])', 'ytd-reel-shelf-renderer',
    'ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2)',
    'grid-shelf-view-model:has(ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2)',
    'ytd-guide-entry-renderer:has(a[title="Shorts"])', 'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
    'ytd-mini-guide-entry-renderer[aria-label="Shorts"]', 'ytd-video-renderer:has(a[href^="/shorts/"])',
    'ytd-rich-item-renderer:has(a[href^="/shorts/"])', 'yt-tab-shape[tab-title="Shorts"]',
  ].join(',\n');
  var SEE_THROUGH = [
    'body', 'ytd-app', 'ytd-page-manager', 'ytd-browse', 'ytd-search', 'ytd-watch-flexy', 'ytd-shorts', 'ytd-playlist-video-list-renderer',
    'ytd-two-column-browse-results-renderer', 'ytd-two-column-search-results-renderer', 'ytd-rich-grid-renderer', '#guide-content.ytd-app',
    '#header.ytd-rich-grid-renderer', 'ytd-section-list-renderer', 'ytd-item-section-renderer', 'ytd-tabbed-page-header',
    '#tabs-container.ytd-tabbed-page-header', 'ytd-feed-filter-chip-bar-renderer', '#chips-wrapper.ytd-feed-filter-chip-bar-renderer',
    'tp-yt-app-header', 'ytd-c4-tabbed-header-renderer', '#contentContainer.tp-yt-app-header',
  ].join(', ');

  function fontCss(f) { return f ? f.css : null; }

  function pageCss(theme, opts) {
    opts = opts || {};
    var p = theme.palette, glass = theme.glass == null ? 0.6 : theme.glass;
    var radius = theme.radius == null ? 14 : theme.radius;
    var body = fontCss(theme.fonts && theme.fonts.body), heading = fontCss(theme.fonts && theme.fonts.heading) || body;
    var lay = theme.layout || {};
    var out = [];
    var top = opts.frame !== 'chat';

    out.push(':root { --gel-accent: ' + p.accent + '; --gel-accent2: ' + p.accent2 + '; --gel-on-accent: ' + p.onAccent + '; --gel-menu: ' + p.menu + '; --gel-radius: ' + radius + 'px; color-scheme: ' + (p.light ? 'light' : 'dark') + '; }');
    out.push('html { background: ' + p.bg + ' !important; }');
    out.push('::selection { background: ' + rgbaOf(p.accent, 0.35) + '; }');
    out.push('html { scrollbar-color: ' + rgbaOf(p.accent, 0.55) + ' transparent; }');

    if (top) {
      // The page shows Gel's background through it.
      out.push(SEE_THROUGH + ' { background: transparent !important; background-color: transparent !important; }');
      out.push('#background.ytd-masthead, #frosted-glass { background: ' + rgbaOf(p.bg, 0.55 + (1 - glass) * 0.35) + ' !important; backdrop-filter: blur(22px) saturate(1.4) !important; }');
      out.push('#frosted-glass.with-chipbar ~ #masthead-container #background.ytd-masthead { background: transparent !important; backdrop-filter: none !important; }');
      out.push('tp-yt-app-drawer#guide #contentContainer { background: ' + rgbaOf(p.bg, 0.5 + (1 - glass) * 0.4) + ' !important; backdrop-filter: blur(24px) saturate(1.3) !important; }');
      out.push('ytd-mini-guide-renderer { background: ' + rgbaOf(p.bg, 0.25 + (1 - glass) * 0.4) + ' !important; }');
      out.push('ytd-menu-popup-renderer, ytd-multi-page-menu-renderer, tp-yt-paper-listbox.ytd-menu-popup-renderer, yt-sheet-view-model, ytd-unified-share-panel-renderer { background: ' + rgbaOf(p.menu, 0.86) + ' !important; backdrop-filter: blur(24px) saturate(1.3) !important; border: 1px solid ' + rgbaOf(p.text, 0.08) + ' !important; }');
      out.push('ytd-engagement-panel-section-list-renderer, #description.ytd-watch-metadata, ytd-playlist-panel-renderer #container { background: ' + rgbaOf(p.bg, 0.45) + ' !important; backdrop-filter: blur(18px) !important; }');
      out.push('#gel-yt-bg { position: fixed; inset: 0; z-index: -1; pointer-events: none; background: ' + p.bg + '; overflow: hidden; }');
      out.push('#gel-yt-bg > * { position: absolute; inset: 0; width: 100%; height: 100%; }');
      out.push('#gel-yt-bg .gel-yt-glow { background: radial-gradient(60% 55% at 12% 0%, ' + rgbaOf(p.accent, 0.2) + ', transparent 70%), radial-gradient(55% 60% at 92% 100%, ' + rgbaOf(p.accent2, 0.18) + ', transparent 70%); }');
      out.push('#gel-yt-bg .gel-yt-picture { background-position: center; background-size: cover; }');
      out.push('#gel-yt-bg .gel-yt-veil { background: ' + rgbaOf(p.bg, round3(1 - glass) * 0.9) + '; }');
      out.push('#gel-yt-bg .gel-yt-dim { background: ' + rgbaOf(p.bg, (theme.background && theme.background.dim != null ? theme.background.dim : 0.55)) + '; }');
    }

    // Accent: progress bars, the Subscribe button, the selected chip.
    out.push('.ytp-play-progress, .ytp-swatch-background-color, .ytp-chapter-hover-container .ytp-play-progress { background: linear-gradient(90deg, ' + p.accent + ', ' + p.accent2 + ') !important; }');
    out.push('.ytp-scrubber-button, .ytp-swatch-background-color-secondary { background: ' + p.accent + ' !important; }');
    out.push('.ytp-settings-button.ytp-hd-quality-badge::after, .ytp-settings-button.ytp-4k-quality-badge::after { background-color: ' + p.accent + ' !important; }');
    out.push('ytd-thumbnail-overlay-resume-playback-renderer #progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, .ytProgressBarLineProgressBarPlayed, #progress.ytd-thumbnail-overlay-resume-playback-renderer { background: linear-gradient(90deg, ' + p.accent + ', ' + p.accent2 + ') !important; }');
    var grad = 'linear-gradient(135deg, ' + p.accent + ', ' + p.accent2 + ')';
    out.push('ytd-subscribe-button-renderer button.yt-spec-button-shape-next--filled, ytd-subscribe-button-renderer button.ytSpecButtonShapeNextFilled, yt-subscribe-button-view-model button.yt-spec-button-shape-next--filled, yt-subscribe-button-view-model button.ytSpecButtonShapeNextFilled { background: ' + grad + ' !important; color: ' + p.onAccent + ' !important; box-shadow: 0 4px 18px ' + rgbaOf(p.accent, 0.45) + ' !important; }');
    out.push('yt-chip-cloud-chip-renderer[selected] #chip-container, .ytChipShapeActive, chip-shape .ytChipShapeActive { background: ' + grad + ' !important; color: ' + p.onAccent + ' !important; border-color: transparent !important; box-shadow: 0 4px 16px ' + rgbaOf(p.accent, 0.45) + ' !important; }');
    out.push('.yt-core-attributed-string__link--call-to-action-color { color: ' + p.link + ' !important; }');
    out.push('#voice-search-button button, .ytSearchboxComponentInputBox { background: ' + rgbaOf(p.text, 0.06) + ' !important; }');
    out.push('.ytSearchboxComponentInputBox, .ytSearchboxComponentSearchButton { border-color: ' + rgbaOf(p.text, 0.16) + ' !important; }');
    // The search box has its own fixed dark colours, so it gets the theme's text colour by hand.
    out.push('.ytSearchboxComponentInput, input.ytSearchboxComponentInput { color: ' + p.text + ' !important; caret-color: ' + p.accent + '; }');
    out.push('.ytSearchboxComponentInput::placeholder { color: ' + p.text2 + ' !important; }');
    out.push('.ytSearchboxComponentSearchButton, .ytSearchboxComponentClearButton, .ytSearchboxComponentSearchButton yt-icon, .ytSearchboxComponentClearButton yt-icon { color: ' + p.text + ' !important; fill: ' + p.text + ' !important; }');
    out.push('.ytSearchboxComponentInputBoxDark, .ytSearchboxComponentSearchButtonDark { background-color: ' + rgbaOf(p.text, 0.06) + ' !important; }');
    out.push('.ytSearchboxComponentInputBox { transition: border-color .2s, box-shadow .2s, background-color .2s !important; box-shadow: inset 0 1px 0 ' + rgbaOf(p.text, 0.06) + ', 0 4px 18px rgba(0, 0, 0, 0.22) !important; }');
    out.push('.ytSearchboxComponentInputBox.ytSearchboxComponentInputBoxHasFocus, .ytSearchboxComponentInputBoxDark.ytSearchboxComponentInputBoxHasFocus { border-color: ' + p.accent + ' !important; box-shadow: 0 0 0 1px ' + p.accent + ', 0 0 24px ' + rgbaOf(p.accent, 0.45) + ' !important; }');
    out.push('.ytSearchboxComponentSearchButton, .ytSearchboxComponentSearchButtonDark { background: ' + grad + ' !important; border-color: transparent !important; transition: filter .2s, box-shadow .2s !important; }');
    out.push('.ytSearchboxComponentSearchButton:hover { filter: brightness(1.12); box-shadow: 0 0 18px ' + rgbaOf(p.accent, 0.5) + ' !important; }');
    out.push('.ytSearchboxComponentSearchButton, .ytSearchboxComponentSearchButton yt-icon, .ytSearchboxComponentSearchButton svg { color: ' + p.onAccent + ' !important; fill: ' + p.onAccent + ' !important; }');
    out.push('.ytSearchboxComponentSuggestionsContainer { background: ' + rgbaOf(p.menu, 0.9) + ' !important; backdrop-filter: blur(24px) saturate(1.4) !important; border: 1px solid ' + rgbaOf(p.text, 0.1) + ' !important; border-radius: 18px !important; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45) !important; overflow: hidden; }');
    out.push('.ytSearchboxComponentSuggestionsContainer [role="option"]:hover, .ytSearchboxComponentSuggestionsContainer [aria-selected="true"] { background: ' + rgbaOf(p.accent, 0.16) + ' !important; }');

    // Rounded corners.
    out.push('yt-thumbnail-view-model, .yt-thumbnail-view-model, ytd-thumbnail a#thumbnail, ytd-thumbnail #thumbnail.ytd-thumbnail, .ytThumbnailViewModelImage, ytd-playlist-thumbnail, .yt-spec-touch-feedback-shape--overlay-touch-response { border-radius: var(--gel-radius) !important; }');
    out.push('ytd-menu-popup-renderer, ytd-multi-page-menu-renderer, tp-yt-paper-dialog, #description.ytd-watch-metadata, ytd-engagement-panel-section-list-renderer { border-radius: calc(var(--gel-radius) + 2px) !important; }');

    // Video player: accent controls, theme-glass menus. Icons over the picture stay white.
    var VP = '.html5-video-player ';
    out.push(VP + '.ytp-volume-slider-handle, ' + VP + '.ytp-volume-slider-handle::before { background: ' + p.accent + ' !important; }');
    out.push(VP + '.ytp-volume-slider-handle { box-shadow: 0 0 10px ' + rgbaOf(p.accent, 0.7) + ' !important; }');
    out.push(VP + '.ytp-large-play-button .ytp-large-play-button-bg, ' + VP + '.ytp-large-play-button svg path:first-child { fill: ' + p.accent + ' !important; fill-opacity: 0.92 !important; }');
    out.push(VP + '.ytp-autonav-toggle-button[aria-checked="true"], ' + VP + '.ytp-menuitem[aria-checked="true"] .ytp-menuitem-toggle-checkbox { background: ' + grad + ' !important; }');
    out.push(VP + '.ytp-popup, ' + VP + '.ytp-settings-menu, ' + VP + '.ytp-contextmenu, .ytp-popup.ytp-contextmenu { background: ' + rgbaOf(p.menu, 0.74) + ' !important; backdrop-filter: blur(22px) saturate(1.4) !important; border: 1px solid ' + rgbaOf(p.text, 0.12) + ' !important; border-radius: calc(var(--gel-radius) + 2px) !important; box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5) !important; }');
    out.push(VP + '.ytp-popup, ' + VP + '.ytp-popup .ytp-menuitem, ' + VP + '.ytp-popup .ytp-menuitem-label, ' + VP + '.ytp-popup .ytp-menuitem-content, ' + VP + '.ytp-popup .ytp-panel-title, .ytp-contextmenu .ytp-menuitem { color: ' + p.text + ' !important; fill: ' + p.text + ' !important; }');
    out.push(VP + '.ytp-menuitem:hover, ' + VP + '.ytp-menuitem:focus, .ytp-contextmenu .ytp-menuitem:hover { background: ' + rgbaOf(p.accent, 0.18) + ' !important; }');
    out.push(VP + '.ytp-tooltip-text, ' + VP + '.ytp-tooltip-title { background: ' + rgbaOf(p.menu, 0.82) + ' !important; color: ' + p.text + ' !important; border-radius: 8px !important; }');
    out.push(VP + '.ytp-delhi-modern .ytp-time-wrapper, ' + VP + '.ytp-delhi-modern .ytp-right-controls, ' + VP + '.ytp-delhi-modern .ytp-play-button, ' + VP + '.ytp-delhi-modern .ytp-volume-area { background-color: ' + rgbaOf(p.bg, 0.5) + ' !important; box-shadow: inset 0 0 0 1px ' + rgbaOf(p.accent, 0.28) + ' !important; }');
    if (body) out.push(VP + '.ytp-popup, ' + VP + '.ytp-popup *, ' + VP + '.ytp-time-display, ' + VP + '.ytp-time-display *, ' + VP + '.ytp-chapter-title-content, ' + VP + '.ytp-tooltip-text, .ytp-contextmenu *, .gel-boost-pop, .gel-boost-pop * { font-family: ' + body + ' !important; }');

    // Polish: glass pills, lifting thumbnails, a lit-up side menu.
    if (top) {
      out.push('#masthead-container::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; pointer-events: none; background: linear-gradient(90deg, transparent, ' + rgbaOf(p.accent, 0.55) + ', ' + rgbaOf(p.accent2, 0.55) + ', transparent); }');
      out.push('chip-shape [class*="ytChipShapeChip"]:not(.ytChipShapeActive), yt-chip-cloud-chip-renderer:not([selected]) #chip-container { background: ' + rgbaOf(p.text, 0.07) + ' !important; border: 1px solid ' + rgbaOf(p.text, 0.1) + ' !important; transition: transform .15s, background .15s !important; }');
      out.push('chip-shape:hover [class*="ytChipShapeChip"]:not(.ytChipShapeActive), yt-chip-cloud-chip-renderer:not([selected]):hover #chip-container { background: ' + rgbaOf(p.text, 0.13) + ' !important; transform: translateY(-1px); }');
      out.push('ytd-watch-metadata button.ytSpecButtonShapeNextTonal, ytd-watch-metadata button.yt-spec-button-shape-next--tonal { background: ' + rgbaOf(p.text, 0.08) + ' !important; border: 1px solid ' + rgbaOf(p.text, 0.1) + ' !important; transition: background .15s, box-shadow .15s !important; }');
      out.push('ytd-watch-metadata button.ytSpecButtonShapeNextTonal:hover, ytd-watch-metadata button.yt-spec-button-shape-next--tonal:hover { background: ' + rgbaOf(p.accent, 0.2) + ' !important; box-shadow: 0 0 14px ' + rgbaOf(p.accent, 0.3) + ' !important; }');
      out.push('ytd-rich-item-renderer yt-thumbnail-view-model, ytd-video-renderer yt-thumbnail-view-model, yt-lockup-view-model yt-thumbnail-view-model, ytd-video-renderer ytd-thumbnail, ytd-compact-video-renderer ytd-thumbnail { transition: transform .2s ease, box-shadow .2s ease !important; }');
      out.push('ytd-rich-item-renderer:hover yt-thumbnail-view-model, ytd-video-renderer:hover yt-thumbnail-view-model, yt-lockup-view-model:hover yt-thumbnail-view-model, ytd-video-renderer:hover ytd-thumbnail, ytd-compact-video-renderer:hover ytd-thumbnail { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45), 0 0 0 1px ' + rgbaOf(p.accent, 0.35) + ', 0 0 24px ' + rgbaOf(p.accent, 0.25) + ' !important; }');
      out.push('ytd-guide-entry-renderer[active] tp-yt-paper-item, ytd-guide-entry-renderer[active] a#endpoint { background: linear-gradient(90deg, ' + rgbaOf(p.accent, 0.28) + ', ' + rgbaOf(p.accent2, 0.1) + ') !important; box-shadow: inset 3px 0 0 ' + p.accent + ' !important; border-radius: 10px !important; }');
      out.push('ytd-guide-entry-renderer:not([active]) tp-yt-paper-item:hover, ytd-guide-entry-renderer:not([active]) a#endpoint:hover { background: ' + rgbaOf(p.accent, 0.12) + ' !important; }');
      out.push('ytd-mini-guide-entry-renderer[aria-selected="true"] yt-icon, ytd-mini-guide-entry-renderer[aria-selected="true"] .title { color: ' + p.accent + ' !important; }');
      out.push('ytd-app :focus-visible { outline: 2px solid ' + p.accent + ' !important; outline-offset: 2px; }');
    }

    // Cinema mode: while a video plays, everything but the player steps back.
    if (top && lay.cinema) {
      var DIM = ['#masthead-container', '#frosted-glass', 'tp-yt-app-drawer#guide', 'ytd-mini-guide-renderer', 'ytd-watch-flexy #secondary', 'ytd-watch-flexy #below', '#gel-yt-bg'];
      out.push(DIM.join(', ') + ' { transition: opacity .6s ease !important; }');
      out.push(DIM.map(function (d) { return 'html.gel-cinema ' + d; }).join(', ') + ' { opacity: 0.15 !important; }');
      out.push(DIM.slice(0, 6).map(function (d) { return 'html.gel-cinema ' + d + ':hover'; }).join(', ') + ' { opacity: 1 !important; }');
      out.push('ytd-watch-flexy #movie_player { transition: box-shadow .6s ease !important; }');
      out.push('html.gel-cinema ytd-watch-flexy #movie_player { box-shadow: 0 0 0 1px ' + rgbaOf(p.accent, 0.35) + ', 0 0 60px 6px ' + rgbaOf(p.accent, 0.35) + ', 0 0 140px 30px ' + rgbaOf(p.accent2, 0.2) + ' !important; }');
    }

    // Fonts.
    if (body) {
      out.push('html { font-family: ' + body + ' !important; }');
      out.push(BODY_TEXT + ' { font-family: ' + body + ' !important; }');
    }
    if (heading && heading !== body) out.push(HEADINGS + ' { font-family: ' + heading + ' !important; letter-spacing: 0 !important; }');

    // Layout options.
    if (lay.hideShorts) out.push(SHORTS + ' { display: none !important; }');
    if (lay.perRow && lay.perRow >= 2 && lay.perRow <= 8) {
      out.push('ytd-rich-grid-renderer { --ytd-rich-grid-items-per-row: ' + Math.round(lay.perRow) + ' !important; --ytd-rich-grid-posts-per-row: ' + Math.round(lay.perRow) + ' !important; }');
    }
    if (lay.hideAmbient) out.push('#cinematics, #cinematics-container, #cinematic-container { display: none !important; }');

    // Logo.
    var logo = logoModel(theme.logo);
    if (top && logo) {
      out.push('ytd-topbar-logo-renderer #logo-icon, ytd-topbar-logo-renderer ytd-yoodle-renderer, ytd-topbar-logo-renderer #country-code, ytd-topbar-logo-renderer yt-icon { display: none !important; }');
      out.push('.gel-yt-logo { display: inline-flex; align-items: center; gap: 7px; height: 32px; max-width: 170px; vertical-align: middle; }');
      out.push('.gel-yt-logo img { height: 30px; width: auto; max-width: 64px; object-fit: contain; border-radius: 7px; }');
      out.push('.gel-yt-logo .gel-yt-logo-text { font-size: 19px; font-weight: 800; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: linear-gradient(90deg, ' + p.accent + ', ' + p.accent2 + '); -webkit-background-clip: text; background-clip: text; color: transparent; padding: 2px 0; }');
    }
    return out.join('\n') + '\n';
  }

  // { mode: keep | emblem | picture | text | hidden, image, text } -> what to draw, or null for YouTube's own.
  function logoModel(logo) {
    if (!logo || !logo.mode || logo.mode === 'keep') return null;
    if (logo.mode === 'hidden') return { image: null, text: '' };
    var text = String(logo.text || '').slice(0, 24);
    if (logo.mode === 'text') return { image: null, text: text.trim() ? text.trim() : 'YouTube' };
    return { image: logo.image || null, text: text.trim() };
  }

  var api = { parseColor: parseColor, roleColor: roleColor, collectVars: collectVars, varCss: varCss, pageCss: pageCss, logoModel: logoModel, rgbaOf: rgbaOf, mix: mix };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GelYtCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
