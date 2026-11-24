/* Gel's YouTube themes. Each one picks colours, fonts and an animated background; the
   Gel for YouTube extension does the rest. Shared by Gel's window and its tests. */
(function (root) {
  'use strict';

  // Fonts the extension ships (files live in the extension's fonts folder).
  var FONTS = {
    youtube: { name: "YouTube's own", css: null },
    outfit: { name: 'Outfit', family: 'Gel Outfit', file: 'outfit.woff2', css: "'Gel Outfit', Roboto, Arial, sans-serif" },
    unbounded: { name: 'Unbounded', family: 'Gel Unbounded', file: 'unbounded.woff2', css: "'Gel Unbounded', Roboto, Arial, sans-serif", scale: 0.9 },
    rounded: { name: 'Rounded', family: 'Gel Rounded', file: 'rounded.ttf', css: "'Gel Rounded', Roboto, Arial, sans-serif" },
    arcade: { name: 'Arcade', family: 'Gel Arcade', file: 'arcade.ttf', css: "'Gel Arcade', Roboto, Arial, sans-serif", scale: 0.92 },
    pixel: { name: 'Pixel', family: 'Gel Pixel', file: 'pixel.ttf', css: "'Gel Pixel', monospace", scale: 0.62 },
    comic: { name: 'Comic', family: 'Gel Comic', file: 'comic.ttf', css: "'Gel Comic', Roboto, Arial, sans-serif" },
    poster: { name: 'Poster', family: 'Gel Poster', file: 'poster.ttf', css: "'Gel Poster', Impact, sans-serif", scale: 1.12 },
    handwritten: { name: 'Handwritten', family: 'Gel Handwritten', file: 'handwritten.ttf', css: "'Gel Handwritten', Roboto, Arial, sans-serif", scale: 1.1 },
    mono: { name: 'Monospace', family: null, css: "Consolas, 'Cascadia Mono', 'Courier New', monospace", scale: 0.95 },
  };

  function hex(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return h.slice(0, 6).toUpperCase(); }
  function rgb(h) { h = hex(h); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return '#' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0'); }).join('').toUpperCase(); }
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  // Fill in every colour YouTube needs from a few seeds.
  function palette(seed) {
    var bg = '#' + hex(seed.bg), text = '#' + hex(seed.text);
    var light = lum(bg) > 0.4;
    return {
      bg: bg,
      surface: mix(bg, text, light ? 0.04 : 0.06),
      raised: mix(bg, text, light ? 0.06 : 0.1),
      menu: mix(bg, text, light ? 0.03 : 0.14),
      chip: mix(bg, text, light ? 0.08 : 0.14),
      line: mix(bg, text, 0.22),
      text: text,
      text2: mix(text, bg, 0.32),
      text3: mix(text, bg, 0.52),
      accent: '#' + hex(seed.accent),
      accent2: '#' + hex(seed.accent2 || seed.accent),
      link: '#' + hex(seed.link || seed.accent2 || seed.accent),
      onAccent: contrast('#' + hex(seed.accent), '#FFFFFF') >= 3 ? '#FFFFFF' : mix(bg, '#000000', 0.5),
      light: light,
    };
  }

  // id, name, blurb, seeds, fonts, effect and how see-through the page is.
  var THEMES = [
    ['gel-glass', 'Gel Glass', 'Frosted glass over a living glow', { bg: '0C0A1A', text: 'F5F2FF', accent: 'FF5FA2', accent2: '9B6BFF', link: '3EE0FF' }, 'outfit', 'unbounded', 'aurora', ['FF5FA2', '9B6BFF', '3EE0FF'], 0.6],
    ['sakura', 'Sakura Dream', 'Blossom drifting past', { bg: '24121D', text: 'FFE8F1', accent: 'FF8FC6', accent2: 'FFC2DD', link: 'FFB3D4' }, 'outfit', 'rounded', 'petals', ['FF8FC6', 'FFD1E6', 'FFB3D4'], 0.55],
    ['midnight-snow', 'Midnight Snow', 'Quiet snowfall on deep blue', { bg: '0B1020', text: 'E6ECFF', accent: '7FB2FF', accent2: 'BFD3FF', link: '9CC4FF' }, 'outfit', 'outfit', 'snow', ['FFFFFF', 'BFD3FF'], 0.55],
    ['retro-arcade', 'Retro Arcade', '8-bit titles and pixel rain', { bg: '1A0F2E', text: 'FFE9B3', accent: 'FFC46B', accent2: 'FF5FA2', link: 'FFC46B' }, 'outfit', 'pixel', 'pixels', ['FFC46B', 'FF5FA2', '9B6BFF'], 0.5],
    ['neon-storm', 'Neon Storm', 'Neon rain and lightning', { bg: '07080F', text: 'E8FBFF', accent: '3EE0FF', accent2: 'FF3EA5', link: '3EE0FF' }, 'outfit', 'arcade', 'storm', ['3EE0FF', 'FF3EA5'], 0.5],
    ['deep-ocean', 'Deep Ocean', 'Light rays and rising bubbles', { bg: '061A24', text: 'E2FBFF', accent: '3EE0FF', accent2: '5CF2B5', link: '7FE9FF' }, 'outfit', 'rounded', 'ocean', ['3EE0FF', '9BE7FF'], 0.55],
    ['autumn-forest', 'Autumn Forest', 'Leaves tumbling down', { bg: '1C120A', text: 'FFF1DE', accent: 'E8892B', accent2: 'F2C14E', link: 'F2C14E' }, 'outfit', 'rounded', 'leaves', ['E8892B', 'C24D2C', 'F2C14E'], 0.5],
    ['starry-night', 'Starry Night', 'Twinkling stars, the odd shooting star', { bg: '0A0E1F', text: 'EEF2FF', accent: 'F5D76E', accent2: '7FB2FF', link: 'F5D76E' }, 'outfit', 'unbounded', 'stars', ['FFFFFF', 'F5D76E', 'BFD3FF'], 0.6],
    ['firefly-meadow', 'Firefly Meadow', 'Fireflies blinking in the dark', { bg: '0D1A10', text: 'EFFBE6', accent: 'B7F56B', accent2: 'F5E663', link: 'D7F58A' }, 'outfit', 'handwritten', 'fireflies', ['F5E663', 'B7F56B'], 0.55],
    ['volcano', 'Volcano', 'Glowing embers rising', { bg: '170806', text: 'FFEDE3', accent: 'FF6A2B', accent2: 'FFB347', link: 'FFB347' }, 'outfit', 'arcade', 'embers', ['FF6A2B', 'FFB347', 'FF3B2B'], 0.5],
    ['candy-hearts', 'Candy Hearts', 'Sweet hearts floating up', { bg: '241028', text: 'FFEAF6', accent: 'FF5FA2', accent2: 'C79BFF', link: 'FF9AC8' }, 'outfit', 'comic', 'hearts', ['FF5FA2', 'FF9AC8', 'C79BFF'], 0.55],
    ['galaxy', 'Galaxy', 'Drifting nebulas and stars', { bg: '0B0718', text: 'F1ECFF', accent: '9B6BFF', accent2: 'FF5FA2', link: 'B79BFF' }, 'outfit', 'unbounded', 'galaxy', ['9B6BFF', 'FF5FA2', '3E7BFF'], 0.6],
    ['synthwave', 'Synthwave', 'Retro sun over a moving grid', { bg: '12061F', text: 'FFE8F6', accent: 'FF3EA5', accent2: 'FFB03E', link: 'FF7AC6' }, 'outfit', 'arcade', 'synthwave', ['FF3EA5', 'FFB03E'], 0.55],
    ['digital-rain', 'Digital Rain', 'Falling code in neon green', { bg: '020805', text: 'D8FFE8', accent: '39FF88', accent2: '9BFFC6', link: '39FF88' }, 'mono', 'mono', 'code', ['39FF88', '9BFFC6'], 0.5],
    ['golden-hour', 'Golden Hour', 'Soft drifting bokeh lights', { bg: '1A120B', text: 'FFF3E0', accent: 'FFC46B', accent2: 'FF8F5F', link: 'FFC46B' }, 'outfit', 'outfit', 'bokeh', ['FFC46B', 'FF8F5F', 'FFE29B'], 0.55],
    ['lava-lamp', 'Lava Lamp', 'Slow, glowing blobs', { bg: '16060E', text: 'FFE9EF', accent: 'FF5F2E', accent2: 'FF2E88', link: 'FF8F6B' }, 'outfit', 'rounded', 'lava', ['FF5F2E', 'FF2E88', 'FFB02E'], 0.55],
    ['party', 'Party', 'Confetti that never stops', { bg: '151025', text: 'FFF6E6', accent: 'FFC46B', accent2: '5CF2B5', link: '5CF2B5' }, 'outfit', 'poster', 'confetti', ['FF5FA2', 'FFC46B', '3EE0FF', '5CF2B5'], 0.5],
    ['northern-lights', 'Northern Lights', 'Green aurora over the Arctic', { bg: '03121A', text: 'E6FFF7', accent: '5CF2B5', accent2: '3EE0FF', link: '5CF2B5' }, 'outfit', 'unbounded', 'aurora', ['5CF2B5', '3EE0FF', '9B6BFF'], 0.6],
    ['paper-gold', 'Paper and Gold', 'Light paper with gold sparkles', { bg: 'F6F1E7', text: '2A2420', accent: 'C97A1E', accent2: 'E2603A', link: 'B4631A' }, 'outfit', 'rounded', 'sparkles', ['E2B04A', 'F2D58A', 'C97A1E'], 0.3],
  ].map(function (t) {
    return { id: t[0], name: t[1], blurb: t[2], seeds: t[3], font: t[4], headingFont: t[5], effect: t[6], effectColors: t[7].map(function (c) { return '#' + c; }), glass: t[8] };
  });

  function defaultLayout() { return { hideShorts: false, perRow: 0, hideAmbient: true, animateWhilePlaying: false, cinema: true }; }
  function defaultLogo() { return { mode: 'keep', glyph: 'gel', text: '', image: null }; }

  // Everything the extension needs, as plain data. "custom" is what the person changed.
  function buildTheme(preset, custom) {
    custom = custom || {};
    var seeds = Object.assign({}, preset.seeds);
    Object.keys(custom.seeds || {}).forEach(function (k) {
      var v = String(custom.seeds[k] || '').replace('#', '');
      if (/^[0-9a-f]{6}$/i.test(v)) seeds[k] = v; // anything else keeps the theme's own colour
    });
    var pal = palette(seeds);
    var font = FONTS[custom.font || preset.font] || FONTS.youtube;
    var heading = FONTS[custom.headingFont || preset.headingFont] || font;
    var fx = Object.assign({ id: preset.effect, colors: preset.effectColors, amount: 1, speed: 1 }, custom.effect || {});
    return {
      enabled: true,
      name: String(custom.name || preset.name).slice(0, 40),
      presetId: preset.id,
      palette: pal,
      glass: custom.glass == null ? preset.glass : Math.max(0, Math.min(0.85, Number(custom.glass))),
      radius: custom.radius == null ? 14 : Math.max(0, Math.min(28, Number(custom.radius))),
      fonts: {
        body: font.css ? { family: font.family, file: font.file, css: font.css, scale: font.scale || 1 } : null,
        heading: heading.css ? { family: heading.family, file: heading.file, css: heading.css, scale: heading.scale || 1 } : null,
      },
      background: { picture: custom.picture || null, dim: custom.dim == null ? 0.55 : custom.dim },
      effect: fx.id === 'none' ? null : { id: fx.id, colors: fx.colors, amount: fx.amount, speed: fx.speed },
      logo: Object.assign(defaultLogo(), custom.logo || {}),
      layout: Object.assign(defaultLayout(), custom.layout || {}),
    };
  }

  var api = { FONTS: FONTS, THEMES: THEMES, palette: palette, buildTheme: buildTheme, defaultLayout: defaultLayout, defaultLogo: defaultLogo, mix: mix, contrast: contrast };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GelYtThemes = api;
})(typeof window !== 'undefined' ? window : globalThis);
