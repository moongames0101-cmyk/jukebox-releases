/* Built-in themes. Each one starts from a few seed colours; Gel fills in the rest. */
(function (root) {
  const T = (typeof module !== 'undefined' && module.exports) ? require('./themegen.js') : root.Gel.themegen;

  const seeds = [
    { id: 'original', name: 'Original', blurb: 'Spotify as it ships', colors: Object.assign({}, T.ORIGINAL), style: {} },
    { id: 'night-drive', name: 'Night Drive', blurb: 'Navy, cyan, a little glow', seed: { mode: 'dark', bg: '0E1424', text: 'E8EEFF', accent: '4CC9F0' }, style: { font: 'Space Grotesk', glow: true } },
    { id: 'synthwave', name: 'Synthwave', blurb: 'Purple dusk, hot pink', seed: { mode: 'dark', bg: '1A0B2E', text: 'F8E9FF', accent: 'FF6EC7', sidebar: '12061F' }, style: { font: 'Outfit', glow: true, radius: 12 } },
    { id: 'deep-sea', name: 'Deep Sea', blurb: 'Dark teal and seafoam', seed: { mode: 'dark', bg: '06222A', text: 'DDF6F3', accent: '2EC4B6' }, style: {} },
    { id: 'moss', name: 'Moss', blurb: 'Forest greens, fireflies', seed: { mode: 'dark', bg: '161C14', text: 'E7EDDC', accent: '9BC53D' }, style: { font: 'DM Sans', fx: { effect: 'fireflies', amount: 0.4, speed: 1, layer: 'over', color: 'E8F59A' } } },
    { id: 'ember', name: 'Ember', blurb: 'Charcoal and firelight', seed: { mode: 'dark', bg: '1C100C', text: 'FBE9DE', accent: 'FF7A3D' }, style: { radius: 6 } },
    { id: 'lavender', name: 'Lavender', blurb: 'Soft violet, rounded', seed: { mode: 'dark', bg: '1E1B2E', text: 'ECE8FF', accent: 'B69CFF' }, style: { font: 'Nunito', radius: 16 } },
    { id: 'gold-room', name: 'Gold Room', blurb: 'Black lacquer and brass', seed: { mode: 'dark', bg: '12100B', text: 'F3E9D2', accent: 'E2B04A' }, style: { font: 'Montserrat', radius: 4 } },
    { id: 'ink', name: 'Ink', blurb: 'Black, white, monospace', seed: { mode: 'dark', bg: '141414', text: 'F2F2F2', accent: 'FFFFFF', sidebar: '0A0A0A' }, style: { font: 'JetBrains Mono', radius: 2 } },
    { id: 'sakura', name: 'Sakura', blurb: 'Falling blossom petals', seed: { mode: 'light', bg: 'FFF1F4', text: '3B1F2B', accent: 'E0567A' }, style: { font: 'Quicksand', radius: 14, fx: { effect: 'petals', amount: 0.7, speed: 1, layer: 'over', color: null } } },
    { id: 'mint', name: 'Mint', blurb: 'Fresh and bright', seed: { mode: 'light', bg: 'EEFAF5', text: '173A2E', accent: '12A06B' }, style: { font: 'Lexend', radius: 12 } },
    { id: 'arctic', name: 'Arctic', blurb: 'Ice white, gentle snow', seed: { mode: 'light', bg: 'F1F6FB', text: '1B2B3C', accent: '2D7FF9' }, style: { font: 'Inter', fx: { effect: 'snow', amount: 0.35, speed: 0.8, layer: 'over', color: null } } },
    { id: 'paper', name: 'Paper', blurb: 'Warm paper, ink green', seed: { mode: 'light', bg: 'F6F1E7', text: '2B2722', accent: '2F6F4F' }, style: { font: 'DM Sans', radius: 4 } },
  ];

  const PRESETS = seeds.map(p => ({
    id: p.id,
    name: p.name,
    blurb: p.blurb,
    seed: p.seed || null,
    colors: p.colors || T.generatePalette(p.seed),
    style: T.sanitizeStyle(Object.assign(T.defaultStyle(), p.style)),
  }));

  const api = { PRESETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.Gel = root.Gel || {}).presets = api;
})(typeof window !== 'undefined' ? window : globalThis);
