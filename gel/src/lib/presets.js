/* Built-in themes. Each one starts from a few seed colours; Gel fills in the rest.
   All names, colours and art direction here are Gel's own. */
(function (root) {
  const T = (typeof module !== 'undefined' && module.exports) ? require('./themegen.js') : root.Gel.themegen;

  const GROUPS = [
    { id: 'glass', name: 'Glass and glow', short: 'Glass' },
    { id: 'anime', name: 'Anime', short: 'Anime' },
    { id: 'type', name: 'Font lovers', short: 'Fonts' },
    { id: 'mood', name: 'Moods and weather', short: 'Moods' },
    { id: 'classic', name: 'Classics', short: 'Classics' },
    { id: 'light', name: 'Light and bright', short: 'Light' },
  ];

  const fx = (effect, amount, extra) => Object.assign({ effect, amount: amount == null ? 0.5 : amount, speed: 1, layer: 'over', color: null }, extra || {});

  const glass = (colors, extra) => Object.assign({
    aurora: { on: true, colors, intensity: 0.7 }, glassEdges: true, panelOpacity: 0.55, bgBlur: 26, radius: 18, glow: true,
  }, extra);

  const seeds = [
    // ---------- Glass and glow: Gel's own look, in Spotify ----------
    { id: 'gel-glass', group: 'glass', name: 'Gel Glass', blurb: 'Frosted glass, neon glow', seed: { mode: 'dark', bg: '100C22', text: 'F5F2FF', accent: 'FF5FA2', sidebar: '0C0A1A' }, style: glass(['FF5FA2', '9B6BFF', '3EE0FF'], { font: 'Outfit', headingFont: 'Unbounded', fx: fx('sparkles', 0.2, { color: '3EE0FF' }) }) },
    { id: 'glass-sakura', group: 'glass', name: 'Glass Sakura', blurb: 'Blush glow, falling petals', seed: { mode: 'dark', bg: '1C0F1E', text: 'FDEFF5', accent: 'FF8FB8', sidebar: '140A16' }, style: glass(['FF8FB8', 'FFB38A', 'C69BFF'], { font: 'M PLUS Rounded 1c', headingFont: 'Mochiy Pop One', fx: fx('petals', 0.5) }) },
    { id: 'glass-ocean', group: 'glass', name: 'Glass Ocean', blurb: 'Deep teal light, bubbles', seed: { mode: 'dark', bg: '061A26', text: 'E6FAFF', accent: '2FE0D0', sidebar: '04121B' }, style: glass(['2FE0D0', '3E8BFF', '7A5CFF'], { font: 'Plus Jakarta Sans', headingFont: 'Sora', fx: fx('bubbles', 0.35) }) },
    { id: 'glass-sunset', group: 'glass', name: 'Glass Sunset', blurb: 'Orange, pink and violet haze', seed: { mode: 'dark', bg: '1A0E1C', text: 'FFF1E8', accent: 'FF8A3D', sidebar: '120914' }, style: glass(['FF8A3D', 'FF4F8B', '8B5CFF'], { font: 'Figtree', headingFont: 'Syne', fx: fx('embers', 0.3) }) },
    { id: 'glass-daylight', group: 'glass', name: 'Glass Daylight', blurb: 'Pastel glow, light glass', seed: { mode: 'light', bg: 'F4F1FF', text: '1E1838', accent: '7C4DFF' }, style: glass(['FF9EC7', 'A98BFF', '7FE3FF'], { font: 'Outfit', headingFont: 'Unbounded', panelOpacity: 0.62, glow: false, fx: fx('sparkles', 0.25) }) },

    // ---------- Anime ----------
    { id: 'neo-tokyo', group: 'anime', name: 'Neo Tokyo', blurb: 'Neon rain on a night city', seed: { mode: 'dark', bg: '0B0F1E', text: 'E6F1FF', accent: 'FF2E88', sidebar: '05070F' }, style: { font: 'Exo 2', headingFont: 'Orbitron', glow: true, radius: 6, fx: fx('rain', 0.55, { speed: 1.1, color: '00E5FF' }) } },
    { id: 'magical-girl', group: 'anime', name: 'Magical Girl', blurb: 'Pastel pink and sparkles', seed: { mode: 'light', bg: 'FFF0F7', text: '4A1D3F', accent: 'FF4FA3' }, style: { font: 'M PLUS Rounded 1c', headingFont: 'Mochiy Pop One', radius: 18, fx: fx('sparkles', 0.5) } },
    { id: 'sakura', group: 'anime', name: 'Sakura', blurb: 'Falling blossom petals', seed: { mode: 'light', bg: 'FFF1F4', text: '3B1F2B', accent: 'E0567A' }, style: { font: 'Quicksand', headingFont: 'Zen Maru Gothic', radius: 14, fx: fx('petals', 0.7) } },
    { id: 'sakura-night', group: 'anime', name: 'Sakura Night', blurb: 'Dark plum, drifting petals', seed: { mode: 'dark', bg: '1E1020', text: 'F9E8F0', accent: 'FF8FB8' }, style: { font: 'Zen Maru Gothic', headingFont: 'Shippori Mincho', radius: 12, fx: fx('petals', 0.6) } },
    { id: 'moonlit-shrine', group: 'anime', name: 'Moonlit Shrine', blurb: 'Indigo night, vermilion gates', seed: { mode: 'dark', bg: '141634', text: 'F4EEDF', accent: 'E8452C', sidebar: '0C0D22' }, style: { font: 'Zen Maru Gothic', headingFont: 'Shippori Mincho', radius: 8, fx: fx('fireflies', 0.45, { color: 'FFD27A' }) } },
    { id: 'shonen-spirit', group: 'anime', name: 'Shonen Spirit', blurb: 'Black and blazing orange', seed: { mode: 'dark', bg: '120D0B', text: 'FFF4EA', accent: 'FF6A00' }, style: { font: 'Kanit', headingFont: 'Dela Gothic One', radius: 4, glow: true, fx: fx('embers', 0.5) } },
    { id: 'ramune', group: 'anime', name: 'Ramune Soda', blurb: 'Summer sky, fizzy bubbles', seed: { mode: 'light', bg: 'EAF7FF', text: '0F2E4A', accent: '1E9BFF' }, style: { font: 'Zen Kaku Gothic New', headingFont: 'RocknRoll One', radius: 16, fx: fx('bubbles', 0.5) } },
    { id: 'kawaii-pop', group: 'anime', name: 'Kawaii Pop', blurb: 'Candy pink with hearts', seed: { mode: 'light', bg: 'FFF4F8', text: '4B2340', accent: 'FF5C93' }, style: { font: 'Kosugi Maru', headingFont: 'Hachi Maru Pop', radius: 22, fx: fx('hearts', 0.45) } },
    { id: 'idol-stage', group: 'anime', name: 'Idol Stage', blurb: 'Spotlights, magenta, cyan', seed: { mode: 'dark', bg: '160A26', text: 'FFF0FB', accent: 'FF3EC8', sidebar: '0E0619' }, style: { font: 'M PLUS Rounded 1c', headingFont: 'Mochiy Pop One', glow: true, radius: 16, fx: fx('sparkles', 0.55, { color: '7DF9FF' }) } },
    { id: 'spirit-forest', group: 'anime', name: 'Spirit Forest', blurb: 'Mossy dark, glowing lights', seed: { mode: 'dark', bg: '0F1F1A', text: 'E3F4EA', accent: '7FE3B0' }, style: { font: 'Zen Maru Gothic', headingFont: 'Kaisei Decol', radius: 12, fx: fx('fireflies', 0.5, { color: 'DFFFE9' }) } },
    { id: 'mecha-pilot', group: 'anime', name: 'Mecha Pilot', blurb: 'Gunmetal, hazard yellow', seed: { mode: 'dark', bg: '1A1E24', text: 'E6E9ED', accent: 'FFC21A', sidebar: '101317' }, style: { font: 'Chakra Petch', headingFont: 'Orbitron', radius: 0 } },
    { id: 'ninja-night', group: 'anime', name: 'Ninja Night', blurb: 'Charcoal, crimson leaves', seed: { mode: 'dark', bg: '15141C', text: 'EDE7E3', accent: 'E0344B' }, style: { font: 'Rajdhani', headingFont: 'Reggae One', radius: 4, fx: fx('leaves', 0.4, { color: 'C21F35' }) } },
    { id: 'lofi-study', group: 'anime', name: 'Lo-fi Study', blurb: 'Rainy window, warm lamp', seed: { mode: 'dark', bg: '2A2238', text: 'F2E8FF', accent: 'FFB38A', sidebar: '211A2D' }, style: { font: 'Nunito', headingFont: 'Fredoka', radius: 14, fx: fx('rain', 0.3, { speed: 0.6, color: 'B9A7E0' }) } },
    { id: 'pixel-quest', group: 'anime', name: 'Pixel Quest', blurb: 'Retro RPG menus', seed: { mode: 'dark', bg: '101A3F', text: 'F2F2FF', accent: 'FFD23F', sidebar: '0A1130' }, style: { font: 'DotGothic16', headingFont: 'Press Start 2P', radius: 0, fx: fx('stars', 0.5) } },
    { id: 'moon-viewing', group: 'anime', name: 'Moon Viewing', blurb: 'Navy sky, pale moonlight', seed: { mode: 'dark', bg: '0E1530', text: 'EDEFFA', accent: 'F3E3A2' }, style: { font: 'Zen Kaku Gothic New', headingFont: 'Kaisei Decol', radius: 10, fx: fx('stars', 0.6) } },
    { id: 'brush-ink', group: 'anime', name: 'Brush and Ink', blurb: 'Rice paper, red seal', seed: { mode: 'light', bg: 'F4F0E6', text: '1C1A17', accent: 'B3261E' }, style: { font: 'Zen Kaku Gothic New', headingFont: 'Potta One', radius: 2 } },

    // ---------- Font lovers ----------
    { id: 'editorial', group: 'type', name: 'Editorial', blurb: 'Magazine serif, red ink', seed: { mode: 'light', bg: 'FAF8F5', text: '141414', accent: 'D0021B' }, style: { font: 'Lora', headingFont: 'Playfair Display', radius: 0 } },
    { id: 'terminal', group: 'type', name: 'Terminal', blurb: 'Green screen, falling code', seed: { mode: 'dark', bg: '050A05', text: 'A6FFA6', accent: '33FF66', sidebar: '000000' }, style: { font: 'JetBrains Mono', headingFont: 'VT323', radius: 0, glow: true, fx: fx('rain', 0.35, { color: '33FF66' }) } },
    { id: 'arcade', group: 'type', name: 'Arcade', blurb: 'Coin-op neon and stars', seed: { mode: 'dark', bg: '140F2E', text: 'FFF8E7', accent: 'FFE600' }, style: { font: 'Rubik', headingFont: 'Bungee', radius: 6, glow: true, fx: fx('stars', 0.35) } },
    { id: 'neon-sign', group: 'type', name: 'Neon Sign', blurb: 'Late-night diner glow', seed: { mode: 'dark', bg: '1A0F14', text: 'FFEAF2', accent: 'FF3D7F' }, style: { font: 'Outfit', headingFont: 'Monoton', radius: 10, glow: true } },
    { id: 'bubblegum', group: 'type', name: 'Bubblegum', blurb: 'Round, soft and squishy', seed: { mode: 'light', bg: 'FFF2FA', text: '3D1F45', accent: 'B04CFF' }, style: { font: 'Fredoka', headingFont: 'Baloo 2', radius: 24, fx: fx('bubbles', 0.4, { color: 'D58BFF' }) } },
    { id: 'brutalist', group: 'type', name: 'Brutalist', blurb: 'Concrete grey, loud type', seed: { mode: 'light', bg: 'F2F2EE', text: '0A0A0A', accent: 'FF4D00' }, style: { font: 'Space Mono', headingFont: 'Unbounded', radius: 0 } },
    { id: 'gallery', group: 'type', name: 'Gallery', blurb: 'White walls, bold type', seed: { mode: 'light', bg: 'FFFFFF', text: '101010', accent: '3D5AFE' }, style: { font: 'Manrope', headingFont: 'Syne', radius: 4 } },
    { id: 'midnight-jazz', group: 'type', name: 'Midnight Jazz', blurb: 'Smoky blue and brass', seed: { mode: 'dark', bg: '0F1626', text: 'EDE6D6', accent: 'C9A44C' }, style: { font: 'DM Sans', headingFont: 'Playfair Display', radius: 6, fx: fx('stars', 0.25) } },
    { id: 'retro-tv', group: 'type', name: 'Retro TV', blurb: 'Tall headlines, warm static', seed: { mode: 'dark', bg: '1B1B1F', text: 'F5F1E8', accent: 'FF5E3A' }, style: { font: 'Space Grotesk', headingFont: 'Bebas Neue', radius: 4 } },
    { id: 'cosy-cabin', group: 'type', name: 'Cosy Cabin', blurb: 'Wood, wool and snowfall', seed: { mode: 'dark', bg: '2B1D16', text: 'F6EADF', accent: 'E8A35C' }, style: { font: 'Nunito', headingFont: 'Pacifico', radius: 14, fx: fx('snow', 0.45) } },
    { id: 'future', group: 'type', name: 'Future', blurb: 'Wide, clean and spacey', seed: { mode: 'dark', bg: '0C0C14', text: 'EEF0FF', accent: '7C5CFF' }, style: { font: 'Sora', headingFont: 'Unbounded', radius: 14, fx: fx('stars', 0.3) } },

    // ---------- Moods and weather ----------
    { id: 'autumn-walk', group: 'mood', name: 'Autumn Walk', blurb: 'Rust, amber, falling leaves', seed: { mode: 'dark', bg: '22140D', text: 'F8EBDD', accent: 'E8762D' }, style: { font: 'Figtree', headingFont: 'Lora', radius: 10, fx: fx('leaves', 0.5) } },
    { id: 'aurora', group: 'mood', name: 'Aurora', blurb: 'Northern lights over snow', seed: { mode: 'dark', bg: '071A24', text: 'E2FBF6', accent: '3CF0B0' }, style: { font: 'Lexend', radius: 12, glow: true, fx: fx('snow', 0.3) } },
    { id: 'ocean-floor', group: 'mood', name: 'Ocean Floor', blurb: 'Deep blue, rising bubbles', seed: { mode: 'dark', bg: '041A33', text: 'DDF0FF', accent: '2FC4FF' }, style: { font: 'Plus Jakarta Sans', radius: 12, fx: fx('bubbles', 0.5) } },
    { id: 'thunderstorm', group: 'mood', name: 'Thunderstorm', blurb: 'Slate skies, steady rain', seed: { mode: 'dark', bg: '161B22', text: 'E4E9F0', accent: '6EA8FF' }, style: { font: 'Inter', radius: 8, fx: fx('rain', 0.6) } },
    { id: 'campfire', group: 'mood', name: 'Campfire', blurb: 'Dark woods, rising sparks', seed: { mode: 'dark', bg: '140E0A', text: 'FBEBDD', accent: 'FF8A2B' }, style: { font: 'DM Sans', radius: 10, fx: fx('embers', 0.55) } },
    { id: 'galaxy', group: 'mood', name: 'Galaxy', blurb: 'Deep space, shooting stars', seed: { mode: 'dark', bg: '0A0716', text: 'EEE9FF', accent: 'A77BFF' }, style: { font: 'Space Grotesk', radius: 12, glow: true, fx: fx('stars', 0.7) } },
    { id: 'vaporwave', group: 'mood', name: 'Vaporwave', blurb: 'Pink and cyan dusk', seed: { mode: 'dark', bg: '1F1035', text: 'FBE9FF', accent: 'FF71CE' }, style: { font: 'Montserrat', headingFont: 'Monoton', radius: 8, glow: true, fx: fx('sparkles', 0.35, { color: '01CDFE' }) } },
    { id: 'coffee-house', group: 'mood', name: 'Coffee House', blurb: 'Espresso, crema, steam', seed: { mode: 'dark', bg: '1E1512', text: 'F3E7DC', accent: 'D9A066' }, style: { font: 'Lora', headingFont: 'Playfair Display', radius: 8 } },
    { id: 'moss', group: 'mood', name: 'Moss', blurb: 'Forest greens, fireflies', seed: { mode: 'dark', bg: '161C14', text: 'E7EDDC', accent: '9BC53D' }, style: { font: 'DM Sans', fx: fx('fireflies', 0.4, { color: 'E8F59A' }) } },
    { id: 'deep-sea', group: 'mood', name: 'Deep Sea', blurb: 'Dark teal and seafoam', seed: { mode: 'dark', bg: '06222A', text: 'DDF6F3', accent: '2EC4B6' }, style: {} },
    { id: 'ember', group: 'mood', name: 'Ember', blurb: 'Charcoal and firelight', seed: { mode: 'dark', bg: '1C100C', text: 'FBE9DE', accent: 'FF7A3D' }, style: { radius: 6 } },

    // ---------- Classics ----------
    { id: 'original', group: 'classic', name: 'Original', blurb: 'Spotify as it ships', colors: Object.assign({}, T.ORIGINAL), style: {} },
    { id: 'night-drive', group: 'classic', name: 'Night Drive', blurb: 'Navy, cyan, a little glow', seed: { mode: 'dark', bg: '0E1424', text: 'E8EEFF', accent: '4CC9F0' }, style: { font: 'Space Grotesk', glow: true } },
    { id: 'synthwave', group: 'classic', name: 'Synthwave', blurb: 'Purple dusk, hot pink', seed: { mode: 'dark', bg: '1A0B2E', text: 'F8E9FF', accent: 'FF6EC7', sidebar: '12061F' }, style: { font: 'Outfit', glow: true, radius: 12 } },
    { id: 'lavender', group: 'classic', name: 'Lavender', blurb: 'Soft violet, rounded', seed: { mode: 'dark', bg: '1E1B2E', text: 'ECE8FF', accent: 'B69CFF' }, style: { font: 'Nunito', radius: 16 } },
    { id: 'gold-room', group: 'classic', name: 'Gold Room', blurb: 'Black lacquer and brass', seed: { mode: 'dark', bg: '12100B', text: 'F3E9D2', accent: 'E2B04A' }, style: { font: 'Montserrat', radius: 4 } },
    { id: 'ink', group: 'classic', name: 'Ink', blurb: 'Black, white, monospace', seed: { mode: 'dark', bg: '141414', text: 'F2F2F2', accent: 'FFFFFF', sidebar: '0A0A0A' }, style: { font: 'JetBrains Mono', radius: 2 } },

    // ---------- Light and bright ----------
    { id: 'mint', group: 'light', name: 'Mint', blurb: 'Fresh and bright', seed: { mode: 'light', bg: 'EEFAF5', text: '173A2E', accent: '12A06B' }, style: { font: 'Lexend', radius: 12 } },
    { id: 'arctic', group: 'light', name: 'Arctic', blurb: 'Ice white, gentle snow', seed: { mode: 'light', bg: 'F1F6FB', text: '1B2B3C', accent: '2D7FF9' }, style: { font: 'Inter', fx: fx('snow', 0.35, { speed: 0.8 }) } },
    { id: 'paper', group: 'light', name: 'Paper', blurb: 'Warm paper, ink green', seed: { mode: 'light', bg: 'F6F1E7', text: '2B2722', accent: '2F6F4F' }, style: { font: 'DM Sans', radius: 4 } },
    { id: 'matcha', group: 'light', name: 'Matcha Latte', blurb: 'Soft green and cream', seed: { mode: 'light', bg: 'F3F5EA', text: '233021', accent: '5E8C3A' }, style: { font: 'Zen Maru Gothic', radius: 14 } },
    { id: 'rose-gold', group: 'light', name: 'Rose Gold', blurb: 'Blush and warm metal', seed: { mode: 'light', bg: 'FBF1EE', text: '3A2422', accent: 'C77966' }, style: { font: 'Poppins', radius: 12, fx: fx('sparkles', 0.3, { color: 'D9A08C' }) } },
  ];

  // Each theme's logo emblem and layout. Anything not listed keeps Spotify's normal layout.
  const LOOKS = {
    'gel-glass': { glyph: 'jelly', player: 'floating', art: 'rounded', scrollbars: true, bouncy: true },
    'glass-sakura': { glyph: 'sakura', player: 'floating', art: 'rounded', scrollbars: true, bouncy: true },
    'glass-ocean': { glyph: 'wave', player: 'floating', art: 'rounded', scrollbars: true, bouncy: true },
    'glass-sunset': { glyph: 'sun', player: 'floating', art: 'circle', scrollbars: true, bouncy: true },
    'glass-daylight': { glyph: 'jelly', player: 'floating', art: 'rounded', scrollbars: true, bouncy: true },
    'neo-tokyo': { glyph: 'bolt', scrollbars: true },
    'magical-girl': { glyph: 'sparkle', art: 'rounded', player: 'floating', bouncy: true },
    'sakura': { glyph: 'sakura', art: 'rounded', player: 'floating' },
    'sakura-night': { glyph: 'sakura', art: 'rounded' },
    'moonlit-shrine': { glyph: 'gate' },
    'shonen-spirit': { glyph: 'flame' },
    'ramune': { glyph: 'bubble', art: 'rounded', player: 'floating', bouncy: true },
    'kawaii-pop': { glyph: 'cat', art: 'circle', player: 'floating', bouncy: true },
    'idol-stage': { glyph: 'star', art: 'circle', player: 'floating', scrollbars: true },
    'spirit-forest': { glyph: 'leaf' },
    'mecha-pilot': { glyph: 'gear' },
    'ninja-night': { glyph: 'shuriken' },
    'lofi-study': { glyph: 'cassette', art: 'vinyl', player: 'floating' },
    'pixel-quest': { glyph: 'pixel' },
    'moon-viewing': { glyph: 'moon', art: 'circle' },
    'brush-ink': { glyph: 'enso' },
    'editorial': { glyph: 'note' },
    'terminal': { glyph: 'prompt', scrollbars: true },
    'arcade': { glyph: 'pixel', scrollbars: true, bouncy: true },
    'neon-sign': { glyph: 'heart' },
    'bubblegum': { glyph: 'bubble', art: 'circle', player: 'floating', bouncy: true },
    'brutalist': { glyph: 'note' },
    'gallery': { glyph: 'vinyl' },
    'midnight-jazz': { glyph: 'note', art: 'vinyl' },
    'retro-tv': { glyph: 'cassette', art: 'rounded' },
    'cosy-cabin': { glyph: 'snowflake', art: 'rounded' },
    'future': { glyph: 'planet', art: 'rounded', player: 'floating' },
    'autumn-walk': { glyph: 'leaf' },
    'aurora': { glyph: 'snowflake' },
    'ocean-floor': { glyph: 'wave' },
    'thunderstorm': { glyph: 'bolt' },
    'campfire': { glyph: 'flame' },
    'galaxy': { glyph: 'planet', art: 'circle' },
    'vaporwave': { glyph: 'sun', scrollbars: true },
    'coffee-house': { glyph: 'cup', art: 'vinyl' },
    'moss': { glyph: 'leaf' },
    'deep-sea': { glyph: 'wave' },
    'ember': { glyph: 'flame' },
    'night-drive': { glyph: 'moon' },
    'synthwave': { glyph: 'sun', scrollbars: true },
    'lavender': { glyph: 'sparkle', player: 'floating' },
    'gold-room': { glyph: 'crown' },
    'ink': { glyph: 'note' },
    'mint': { glyph: 'leaf' },
    'arctic': { glyph: 'snowflake' },
    'paper': { glyph: 'note' },
    'matcha': { glyph: 'cup' },
    'rose-gold': { glyph: 'heart', player: 'floating' },
  };
  for (const p of seeds) {
    const look = LOOKS[p.id];
    p.style = Object.assign({}, p.style, { layout: look ? Object.assign({ logo: 'glyph' }, look) : { logo: 'keep' } });
  }

  const PRESETS = seeds.map(p => ({
    id: p.id,
    group: p.group,
    name: p.name,
    blurb: p.blurb,
    seed: p.seed || null,
    colors: p.colors || T.generatePalette(p.seed),
    style: T.sanitizeStyle(Object.assign(T.defaultStyle(), p.style)),
  }));

  const api = { PRESETS, GROUPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.Gel = root.Gel || {}).presets = api;
})(typeof window !== 'undefined' ? window : globalThis);
