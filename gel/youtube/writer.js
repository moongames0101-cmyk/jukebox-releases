// Gel's YouTube side, main process: puts the "Gel for YouTube" browser extension
// together in a folder and writes the chosen theme into it. The extension checks
// theme.json every couple of seconds, so a new theme shows up in Opera by itself.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Extension file -> where it comes from inside Gel's src folder.
const CODE = {
  'manifest.json': 'youtube/extension/manifest.json',
  'fx-engine.js': 'youtube/fx-engine.js',
  'yt-core.js': 'youtube/extension/yt-core.js',
  'gel-ads.js': 'youtube/extension/gel-ads.js',
  'gel-ads-main.js': 'youtube/extension/gel-ads-main.js',
  'gel-boost.js': 'youtube/extension/gel-boost.js',
  'gel-yt.js': 'youtube/extension/gel-yt.js',
};
const STATIC = {
  'icons/16.png': 'youtube/extension/icons/16.png',
  'icons/48.png': 'youtube/extension/icons/48.png',
  'icons/128.png': 'youtube/extension/icons/128.png',
  'fonts/outfit.woff2': 'fonts/outfit.woff2',
  'fonts/unbounded.woff2': 'fonts/unbounded.woff2',
  'fonts/LICENSE-outfit.txt': 'fonts/LICENSE-outfit.txt',
  'fonts/LICENSE-unbounded.txt': 'fonts/LICENSE-unbounded.txt',
  'fonts/rounded.ttf': 'roblox/fonts/rounded.ttf',
  'fonts/arcade.ttf': 'roblox/fonts/arcade.ttf',
  'fonts/pixel.ttf': 'roblox/fonts/pixel.ttf',
  'fonts/comic.ttf': 'roblox/fonts/comic.ttf',
  'fonts/poster.ttf': 'roblox/fonts/poster.ttf',
  'fonts/handwritten.ttf': 'roblox/fonts/handwritten.ttf',
  'fonts/LICENSES.txt': 'roblox/fonts/LICENSES.txt',
};
const EXT_FILES = Object.keys(CODE).concat(Object.keys(STATIC), ['theme.json', 'README.txt']);
const RELOAD_FLAG = '.gel-needs-reload';

const README = [
  'Gel for YouTube',
  '',
  'Gel made this folder. It is a browser extension that puts your Gel theme on youtube.com.',
  '',
  'To add it to Opera (once):',
  '  1. Open opera://extensions',
  '  2. Turn on "Developer mode" (top right)',
  '  3. Click "Load unpacked" and pick this folder',
  '',
  'After that, themes you pick in Gel show up on YouTube within a couple of seconds.',
  'Leave this folder where it is: Opera reads it from here.',
  '',
].join('\r\n');

function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, data);
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    // Windows can refuse while something has the file open; a plain write still works.
    fs.writeFileSync(file, data);
    try { fs.unlinkSync(tmp); } catch (e) { /* already gone */ }
  }
}

function copyIfChanged(from, to) {
  const data = fs.readFileSync(from);
  let old = null;
  try { old = fs.readFileSync(to); } catch (e) { /* new file */ }
  if (old && old.equals(data)) return { changed: false, existed: true };
  writeAtomic(to, data);
  return { changed: true, existed: !!old };
}

function pictureType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return '.gif';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return '.webp';
  return null;
}

function emblemSvg(glyph, color) {
  const { glyphSvg } = require('../src/lib/glyphs.js');
  return glyphSvg(glyph, color);
}

// theme: from GelYtThemes.buildTheme. logoPicture / backgroundPicture: Buffers of your own pictures.
// adblock: whether the extension skips and hides ads. boost: whether the player gets the volume booster.
function writeExtension({ srcDir, outDir, theme, logoPicture = null, backgroundPicture = null, adblock = false, boost = false }) {
  if (!theme || !theme.palette) throw new Error('No theme to write.');
  fs.mkdirSync(outDir, { recursive: true });

  let codeUpdated = false;
  for (const [name, from] of Object.entries(CODE)) {
    const r = copyIfChanged(path.join(srcDir, from), path.join(outDir, name));
    if (r.changed && r.existed) codeUpdated = true;
  }
  for (const [name, from] of Object.entries(STATIC)) copyIfChanged(path.join(srcDir, from), path.join(outDir, name));
  const readme = path.join(outDir, 'README.txt');
  if (!fs.existsSync(readme)) fs.writeFileSync(readme, README);
  if (codeUpdated) fs.writeFileSync(path.join(outDir, RELOAD_FLAG), new Date().toISOString());

  // Pictures go in media/, named by their content so the extension never shows a stale copy.
  const media = [];
  const t = JSON.parse(JSON.stringify(theme));
  function addMedia(kind, buf, ext) {
    const name = `media/${kind}-${sha(buf).slice(0, 8)}${ext}`;
    writeAtomic(path.join(outDir, name), buf);
    media.push(path.basename(name));
    return name;
  }
  if (backgroundPicture) {
    const ext = pictureType(backgroundPicture);
    if (!ext) throw new Error("The background picture isn't a PNG, JPG, GIF or WebP picture.");
    t.background = Object.assign({}, t.background, { picture: addMedia('picture', backgroundPicture, ext) });
  } else {
    t.background = Object.assign({}, t.background, { picture: null });
  }
  const logo = Object.assign({ mode: 'keep' }, t.logo);
  if (logo.mode === 'emblem') {
    logo.image = addMedia('logo', Buffer.from(emblemSvg(logo.glyph || 'gel', t.palette.accent)), '.svg');
  } else if (logo.mode === 'picture') {
    if (logoPicture) {
      const ext = pictureType(logoPicture);
      if (!ext) throw new Error("The logo picture isn't a PNG, JPG, GIF or WebP picture.");
      logo.image = addMedia('logo', logoPicture, ext);
    } else {
      logo.mode = 'keep';
      logo.image = null;
    }
  } else {
    logo.image = null;
  }
  t.logo = logo;
  t.enabled = true;
  t.adblock = !!adblock;
  t.boost = !!boost;
  t.writtenAt = Date.now();

  const mediaDir = path.join(outDir, 'media');
  if (fs.existsSync(mediaDir)) {
    for (const f of fs.readdirSync(mediaDir)) if (!media.includes(f)) fs.rmSync(path.join(mediaDir, f), { force: true });
  }
  writeAtomic(path.join(outDir, 'theme.json'), JSON.stringify(t, null, 1));
  return { dir: outDir, codeUpdated, theme: t };
}

function turnOff(outDir, { adblock = false, boost = false } = {}) {
  if (!fs.existsSync(outDir)) return;
  writeAtomic(path.join(outDir, 'theme.json'), JSON.stringify({ enabled: false, adblock: !!adblock, boost: !!boost, writtenAt: Date.now() }));
}

// The switches that work with or without a theme on.
const SWITCHES = ['adblock', 'boost'];

// Changes one of those switches, keeping whatever theme is on.
function setSwitch(outDir, name, on) {
  if (!SWITCHES.includes(name)) throw new Error('Unknown setting: ' + name);
  let t = null;
  try { t = JSON.parse(fs.readFileSync(path.join(outDir, 'theme.json'), 'utf8')); } catch (e) { /* none yet */ }
  if (!t || typeof t !== 'object') t = { enabled: false };
  t[name] = !!on;
  t.writtenAt = Date.now();
  writeAtomic(path.join(outDir, 'theme.json'), JSON.stringify(t, null, 1));
}
function setAdblock(outDir, adblock) { setSwitch(outDir, 'adblock', adblock); }

function readStatus(outDir) {
  const s = { installed: false, enabled: false, name: null, version: null, needsReload: false };
  try { s.version = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8')).version || null; } catch (e) { return s; }
  // An extension an older Gel made counts too (it may lack newer files): refreshing brings it up to date.
  s.installed = fs.existsSync(path.join(outDir, 'gel-yt.js'));
  s.needsReload = Object.keys(CODE).some((f) => !fs.existsSync(path.join(outDir, f)));
  try {
    const t = JSON.parse(fs.readFileSync(path.join(outDir, 'theme.json'), 'utf8'));
    s.enabled = !!t.enabled;
    s.name = t.enabled ? t.name || null : null;
  } catch (e) { /* no theme yet */ }
  s.needsReload = s.needsReload || fs.existsSync(path.join(outDir, RELOAD_FLAG));
  return s;
}

function clearReloadFlag(outDir) { fs.rmSync(path.join(outDir, RELOAD_FLAG), { force: true }); }

module.exports = { writeExtension, turnOff, setSwitch, setAdblock, SWITCHES, readStatus, clearReloadFlag, pictureType, EXT_FILES };
