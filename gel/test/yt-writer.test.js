const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeExtension, turnOff, readStatus, EXT_FILES } = require('../youtube/writer');
const { THEMES, buildTheme } = require('../src/youtube/themes.js');

const srcDir = path.join(__dirname, '..', 'src');
let out;
beforeEach(() => { out = fs.mkdtempSync(path.join(os.tmpdir(), 'gelyt-')); });

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a3c50000000049454e44ae426082', 'hex');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40)]);

test('writes a complete extension Opera can load', () => {
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0]) });
  for (const f of EXT_FILES) assert.ok(fs.existsSync(path.join(out, f)), f);
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  for (const js of manifest.content_scripts[0].js) assert.ok(fs.existsSync(path.join(out, js)), js);
  for (const ic of Object.values(manifest.icons)) assert.ok(fs.existsSync(path.join(out, ic)), ic);
  assert.ok(fs.existsSync(path.join(out, 'fonts', 'outfit.woff2')));
  assert.ok(fs.existsSync(path.join(out, 'fonts', 'pixel.ttf')));
  const theme = JSON.parse(fs.readFileSync(path.join(out, 'theme.json'), 'utf8'));
  assert.equal(theme.enabled, true);
  assert.equal(theme.name, 'Gel Glass');
});

test('every font a theme names is in the extension', () => {
  for (const t of THEMES) {
    writeExtension({ srcDir, outDir: out, theme: buildTheme(t) });
    const th = JSON.parse(fs.readFileSync(path.join(out, 'theme.json'), 'utf8'));
    for (const f of [th.fonts.body, th.fonts.heading]) {
      if (f && f.file) assert.ok(fs.existsSync(path.join(out, 'fonts', f.file)), t.id + ' ' + f.file);
    }
  }
});

test('an emblem logo is saved as a picture the extension can show', () => {
  const theme = buildTheme(THEMES[0], { logo: { mode: 'emblem', glyph: 'moon', text: 'Moon' } });
  writeExtension({ srcDir, outDir: out, theme });
  const th = JSON.parse(fs.readFileSync(path.join(out, 'theme.json'), 'utf8'));
  assert.match(th.logo.image, /^media\/logo-[0-9a-f]{8}\.svg$/);
  const svg = fs.readFileSync(path.join(out, th.logo.image), 'utf8');
  assert.match(svg, /^<svg/);
  assert.ok(svg.includes(theme.palette.accent));
});

test('your own logo picture and background picture are copied in', () => {
  const theme = buildTheme(THEMES[0], { logo: { mode: 'picture' } });
  writeExtension({ srcDir, outDir: out, theme, logoPicture: PNG, backgroundPicture: JPG });
  const th = JSON.parse(fs.readFileSync(path.join(out, 'theme.json'), 'utf8'));
  assert.match(th.logo.image, /^media\/logo-[0-9a-f]{8}\.png$/);
  assert.match(th.background.picture, /^media\/picture-[0-9a-f]{8}\.jpg$/);
  assert.deepEqual(fs.readFileSync(path.join(out, th.background.picture)), JPG);
});

test('a picture logo with no picture falls back to YouTube\'s logo', () => {
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0], { logo: { mode: 'picture' } }) });
  const th = JSON.parse(fs.readFileSync(path.join(out, 'theme.json'), 'utf8'));
  assert.equal(th.logo.mode, 'keep');
});

test('rejects pictures that are not pictures', () => {
  assert.throws(() => writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0]), backgroundPicture: Buffer.from('hello') }), /picture/i);
});

test('old pictures are cleared out when they change', () => {
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0]), backgroundPicture: JPG });
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0]), backgroundPicture: PNG });
  const media = fs.readdirSync(path.join(out, 'media'));
  assert.equal(media.length, 1);
  assert.match(media[0], /\.png$/);
});

test('turning off keeps the extension but tells it to stop', () => {
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0]) });
  turnOff(out);
  const th = JSON.parse(fs.readFileSync(path.join(out, 'theme.json'), 'utf8'));
  assert.equal(th.enabled, false);
  assert.ok(fs.existsSync(path.join(out, 'gel-yt.js')));
});

test('readStatus reports what is in the folder', () => {
  assert.deepEqual(readStatus(out), { installed: false, enabled: false, name: null, version: null, needsReload: false });
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[1]) });
  const s = readStatus(out);
  assert.equal(s.installed, true);
  assert.equal(s.enabled, true);
  assert.equal(s.name, 'Sakura Dream');
  assert.equal(s.version, '1.0.0');
});

test('readStatus notices when the extension code changed and Opera needs to reload it', () => {
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0]) });
  assert.equal(readStatus(out).needsReload, false);
  fs.writeFileSync(path.join(out, 'gel-yt.js'), '// older copy');
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0]) });
  assert.equal(readStatus(out).needsReload, true);
});

test('theme.json is replaced in one go, never half-written', () => {
  writeExtension({ srcDir, outDir: out, theme: buildTheme(THEMES[0]) });
  const leftovers = fs.readdirSync(out).filter((f) => f.endsWith('.tmp'));
  assert.deepEqual(leftovers, []);
});
