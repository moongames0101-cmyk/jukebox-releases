const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createEngine } = require('../roblox/engine');

let root, localAppData, dataDir, themesDir;

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function read(file) {
  return fs.readFileSync(file, 'utf8');
}

// Fake Roblox install that looks like the real one on Windows.
function makeVersion(name, { player = true, mtime } = {}) {
  const dir = path.join(localAppData, 'Roblox', 'Versions', name);
  if (player) write(path.join(dir, 'RobloxPlayerBeta.exe'), 'exe');
  else write(path.join(dir, 'RobloxStudioBeta.exe'), 'exe');
  write(path.join(dir, 'content', 'sounds', 'ouch.ogg'), 'original-ouch');
  write(path.join(dir, 'content', 'textures', 'Cursors', 'KeyboardMouse', 'ArrowCursor.png'), 'original-arrow');
  write(path.join(dir, 'content', 'textures', 'Cursors', 'KeyboardMouse', 'ArrowFarCursor.png'), 'original-arrowfar');
  write(
    path.join(dir, 'content', 'fonts', 'families', 'BuilderSans.json'),
    JSON.stringify({ name: 'Builder Sans', faces: [
      { name: 'Regular', weight: 400, style: 'normal', assetId: 'rbxasset://fonts/BuilderSans-Regular.otf' },
      { name: 'Bold', weight: 700, style: 'normal', assetId: 'rbxasset://fonts/BuilderSans-Bold.otf' },
    ] }, null, 2)
  );
  if (mtime) {
    fs.utimesSync(dir, mtime, mtime);
    fs.utimesSync(path.join(dir, player ? 'RobloxPlayerBeta.exe' : 'RobloxStudioBeta.exe'), mtime, mtime);
  }
  return dir;
}

function makeTheme(name, manifest, files = {}) {
  const dir = path.join(themesDir, name);
  write(path.join(dir, 'theme.json'), JSON.stringify({ name, ...manifest }));
  for (const [rel, content] of Object.entries(files)) write(path.join(dir, rel), content);
  return dir;
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'rbx-theme-'));
  localAppData = path.join(root, 'LocalAppData');
  dataDir = path.join(root, 'gel-data');
  themesDir = path.join(root, 'themes');
});

test('finds the newest Roblox Player version folder and ignores Studio folders', () => {
  makeVersion('version-old', { mtime: new Date('2026-01-01') });
  const newest = makeVersion('version-new', { mtime: new Date('2026-06-01') });
  makeVersion('version-studio', { player: false, mtime: new Date('2026-09-01') });
  const engine = createEngine({ localAppData, dataDir });
  assert.equal(engine.findPlayerFolder(), newest);
});

test('returns null when Roblox Player is not installed', () => {
  const engine = createEngine({ localAppData, dataDir });
  assert.equal(engine.findPlayerFolder(), null);
});

test('applying a theme swaps the death sound and both cursor images', () => {
  const v = makeVersion('version-a');
  const theme = makeTheme('Retro', { deathSound: 'oof.ogg', cursor: 'cursor.png' }, {
    'oof.ogg': 'retro-oof', 'cursor.png': 'retro-cursor',
  });
  createEngine({ localAppData, dataDir }).applyTheme(theme);
  assert.equal(read(path.join(v, 'content', 'sounds', 'ouch.ogg')), 'retro-oof');
  assert.equal(read(path.join(v, 'content', 'textures', 'Cursors', 'KeyboardMouse', 'ArrowCursor.png')), 'retro-cursor');
  assert.equal(read(path.join(v, 'content', 'textures', 'Cursors', 'KeyboardMouse', 'ArrowFarCursor.png')), 'retro-cursor');
});

test('applying a theme font points every font family at the custom font', () => {
  const v = makeVersion('version-a');
  const theme = makeTheme('Pixel', { font: 'pixel.ttf' }, { 'pixel.ttf': 'pixel-font' });
  createEngine({ localAppData, dataDir }).applyTheme(theme);
  assert.equal(read(path.join(v, 'content', 'fonts', 'CustomFont.ttf')), 'pixel-font');
  const family = JSON.parse(read(path.join(v, 'content', 'fonts', 'families', 'BuilderSans.json')));
  assert.deepEqual(family.faces.map((f) => f.assetId), [
    'rbxasset://fonts/CustomFont.ttf', 'rbxasset://fonts/CustomFont.ttf',
  ]);
  assert.equal(family.faces[1].weight, 700);
});

test('files in the theme overlay folder are copied to the same place in Roblox', () => {
  const v = makeVersion('version-a');
  const theme = makeTheme('Icons', {}, { 'files/content/textures/ui/TopBar/burger.png': 'new-burger' });
  createEngine({ localAppData, dataDir }).applyTheme(theme);
  assert.equal(read(path.join(v, 'content', 'textures', 'ui', 'TopBar', 'burger.png')), 'new-burger');
});

test('restoring puts back every original file and removes files the theme added', () => {
  const v = makeVersion('version-a');
  const originalFamily = read(path.join(v, 'content', 'fonts', 'families', 'BuilderSans.json'));
  const theme = makeTheme('All', { font: 'f.ttf', deathSound: 'o.ogg', cursor: 'c.png' }, {
    'f.ttf': 'font', 'o.ogg': 'oof', 'c.png': 'cur', 'files/content/textures/new.png': 'added',
  });
  const engine = createEngine({ localAppData, dataDir });
  engine.applyTheme(theme);
  engine.restore();
  assert.equal(read(path.join(v, 'content', 'sounds', 'ouch.ogg')), 'original-ouch');
  assert.equal(read(path.join(v, 'content', 'textures', 'Cursors', 'KeyboardMouse', 'ArrowCursor.png')), 'original-arrow');
  assert.equal(read(path.join(v, 'content', 'fonts', 'families', 'BuilderSans.json')), originalFamily);
  assert.equal(fs.existsSync(path.join(v, 'content', 'fonts', 'CustomFont.ttf')), false);
  assert.equal(fs.existsSync(path.join(v, 'content', 'textures', 'new.png')), false);
  assert.equal(engine.getStatus().theme, null);
});

test('switching themes undoes parts of the old theme the new one does not set', () => {
  const v = makeVersion('version-a');
  const a = makeTheme('A', { deathSound: 'o.ogg', cursor: 'c.png' }, { 'o.ogg': 'a-oof', 'c.png': 'a-cur' });
  const b = makeTheme('B', { deathSound: 'o.ogg' }, { 'o.ogg': 'b-oof' });
  const engine = createEngine({ localAppData, dataDir });
  engine.applyTheme(a);
  engine.applyTheme(b);
  assert.equal(read(path.join(v, 'content', 'sounds', 'ouch.ogg')), 'b-oof');
  assert.equal(read(path.join(v, 'content', 'textures', 'Cursors', 'KeyboardMouse', 'ArrowCursor.png')), 'original-arrow');
  engine.restore();
  assert.equal(read(path.join(v, 'content', 'sounds', 'ouch.ogg')), 'original-ouch');
});

test('after a Roblox update the current theme is reapplied to the new version', () => {
  makeVersion('version-a', { mtime: new Date('2026-01-01') });
  const theme = makeTheme('Retro', { deathSound: 'o.ogg' }, { 'o.ogg': 'retro-oof' });
  const engine = createEngine({ localAppData, dataDir });
  engine.applyTheme(theme);
  assert.equal(engine.reapplyIfUpdated(), false);

  const updated = makeVersion('version-b', { mtime: new Date('2026-02-01') });
  assert.equal(engine.reapplyIfUpdated(), true);
  assert.equal(read(path.join(updated, 'content', 'sounds', 'ouch.ogg')), 'retro-oof');
  assert.equal(engine.getStatus().version, 'version-b');
});

test('a theme that points at a missing file is rejected before anything changes', () => {
  const v = makeVersion('version-a');
  const theme = makeTheme('Broken', { deathSound: 'o.ogg', cursor: 'missing.png' }, { 'o.ogg': 'oof' });
  const engine = createEngine({ localAppData, dataDir });
  assert.throws(() => engine.applyTheme(theme), /missing\.png/);
  assert.equal(read(path.join(v, 'content', 'sounds', 'ouch.ogg')), 'original-ouch');
});

test('applying with no Roblox install gives a clear error', () => {
  const theme = makeTheme('Retro', { deathSound: 'o.ogg' }, { 'o.ogg': 'oof' });
  const engine = createEngine({ localAppData, dataDir });
  assert.throws(() => engine.applyTheme(theme), /Roblox Player isn't installed/);
});

test('listThemes reads every theme folder with a theme.json', () => {
  makeTheme('Retro', { description: 'Chunky', deathSound: 'o.ogg' }, { 'o.ogg': 'x' });
  makeTheme('Cozy', { font: 'f.ttf' }, { 'f.ttf': 'x' });
  fs.mkdirSync(path.join(themesDir, 'not-a-theme'), { recursive: true });
  const themes = createEngine({ localAppData, dataDir }).listThemes(themesDir);
  assert.deepEqual(themes.map((t) => t.name).sort(), ['Cozy', 'Retro']);
  assert.equal(themes.find((t) => t.name === 'Retro').description, 'Chunky');
});

test('a theme cannot reach files outside its own folder', () => {
  makeVersion('version-a');
  write(path.join(root, 'secret.txt'), 'secret');
  const theme = makeTheme('Sneaky', { deathSound: '../../secret.txt' });
  assert.throws(() => createEngine({ localAppData, dataDir }).applyTheme(theme), /outside its folder/);
});

test('applying a theme folder with no theme.json says so plainly', () => {
  makeVersion('version-a');
  fs.mkdirSync(path.join(themesDir, 'empty'), { recursive: true });
  assert.throws(
    () => createEngine({ localAppData, dataDir }).applyTheme(path.join(themesDir, 'empty')),
    (err) => /No theme\.json in "empty"/.test(err.message) && !/ENOENT/.test(err.message)
  );
});

// ---------- Launchers with their own mods folder (Bloxstrap, ExploitStrap and friends) ----------

function makeLauncher(name, { withVersion = true } = {}) {
  const base = path.join(localAppData, name);
  fs.mkdirSync(path.join(base, 'Modifications'), { recursive: true });
  fs.mkdirSync(path.join(base, 'Versions'), { recursive: true });
  if (withVersion) {
    const v = path.join(base, 'Versions', 'version-launcher');
    write(path.join(v, 'RobloxPlayerBeta.exe'), 'exe');
    write(path.join(v, 'content', 'fonts', 'families', 'Arial.json'),
      JSON.stringify({ name: 'Arial', faces: [{ name: 'Regular', weight: 400, style: 'normal', assetId: 'rbxasset://fonts/arial.ttf' }] }));
  }
  return path.join(base, 'Modifications');
}

test('lists normal Roblox and any launcher with a mods folder as places to theme', () => {
  makeVersion('version-a');
  makeLauncher('ExploitStrap');
  fs.mkdirSync(path.join(localAppData, 'SomethingElse', 'Versions'), { recursive: true });
  const targets = createEngine({ localAppData, dataDir }).getStatus().targets;
  assert.deepEqual(targets.map((t) => [t.name, t.kind]).sort(), [['ExploitStrap', 'mods'], ['Roblox', 'install']]);
});

test('applying also puts the theme into a launcher mods folder', () => {
  makeVersion('version-a');
  const mods = makeLauncher('ExploitStrap');
  const theme = makeTheme('Retro', { deathSound: 'o.ogg', cursor: 'c.png', font: 'f.ttf' }, {
    'o.ogg': 'retro-oof', 'c.png': 'retro-cursor', 'f.ttf': 'retro-font',
  });
  createEngine({ localAppData, dataDir }).applyTheme(theme);
  assert.equal(read(path.join(mods, 'content', 'sounds', 'ouch.ogg')), 'retro-oof');
  assert.equal(read(path.join(mods, 'content', 'textures', 'Cursors', 'KeyboardMouse', 'ArrowFarCursor.png')), 'retro-cursor');
  assert.equal(read(path.join(mods, 'content', 'fonts', 'CustomFont.ttf')), 'retro-font');
  const family = JSON.parse(read(path.join(mods, 'content', 'fonts', 'families', 'Arial.json')));
  assert.equal(family.faces[0].assetId, 'rbxasset://fonts/CustomFont.ttf');
});

test('restoring takes the theme out of the mods folder and keeps your own mods', () => {
  const mods = makeLauncher('ExploitStrap');
  write(path.join(mods, 'content', 'sounds', 'ouch.ogg'), 'my-own-mod');
  write(path.join(mods, 'content', 'sounds', 'other.ogg'), 'untouched');
  const theme = makeTheme('Retro', { deathSound: 'o.ogg', cursor: 'c.png' }, { 'o.ogg': 'retro-oof', 'c.png': 'cur' });
  const engine = createEngine({ localAppData, dataDir });
  engine.applyTheme(theme);
  assert.equal(read(path.join(mods, 'content', 'sounds', 'ouch.ogg')), 'retro-oof');
  engine.restore();
  assert.equal(read(path.join(mods, 'content', 'sounds', 'ouch.ogg')), 'my-own-mod');
  assert.equal(read(path.join(mods, 'content', 'sounds', 'other.ogg')), 'untouched');
  assert.equal(fs.existsSync(path.join(mods, 'content', 'textures', 'Cursors', 'KeyboardMouse', 'ArrowCursor.png')), false);
});

test('a launcher on its own is enough to apply a theme', () => {
  const mods = makeLauncher('Bloxstrap');
  const theme = makeTheme('Retro', { deathSound: 'o.ogg' }, { 'o.ogg': 'retro-oof' });
  const engine = createEngine({ localAppData, dataDir });
  engine.applyTheme(theme);
  assert.equal(read(path.join(mods, 'content', 'sounds', 'ouch.ogg')), 'retro-oof');
  assert.equal(engine.getStatus().installed, true);
  assert.equal(engine.getStatus().theme, 'Retro');
});

// ---------- Picking the right install, and generated files ----------

test('picks the install Roblox itself was installed last, not the folder touched last', () => {
  const older = makeVersion('version-old');
  const newer = makeVersion('version-new');
  // The old folder was touched recently (a launcher wrote into it), but its Roblox is older.
  fs.utimesSync(path.join(older, 'RobloxPlayerBeta.exe'), new Date('2026-01-01'), new Date('2026-01-01'));
  fs.utimesSync(path.join(newer, 'RobloxPlayerBeta.exe'), new Date('2026-11-01'), new Date('2026-11-01'));
  fs.utimesSync(older, new Date('2026-11-20'), new Date('2026-11-20'));
  fs.utimesSync(newer, new Date('2026-11-02'), new Date('2026-11-02'));
  assert.equal(createEngine({ localAppData, dataDir }).findPlayerFolder(), newer);
});

function placeFile(dir, content) {
  write(path.join(dir, 'ExtraContent', 'places', 'Mobile.rbxl'), content);
}

test('a generated file is built from each install\'s original and written into Roblox and launcher mods', () => {
  const v = makeVersion('version-a');
  placeFile(v, 'roblox-original-scene');
  const mods = makeLauncher('ExploitStrap');
  placeFile(path.join(localAppData, 'ExploitStrap', 'Versions', 'version-launcher'), 'launcher-original-scene');
  const seen = [];
  const generators = {
    backdrop: ({ spec, sourceDir }) => {
      const original = fs.readFileSync(path.join(sourceDir, 'ExtraContent/places/Mobile.rbxl'), 'utf8');
      seen.push(original);
      return [{ rel: 'ExtraContent/places/Mobile.rbxl', data: `${original}+${spec.id}` }];
    },
  };
  const theme = makeTheme('Glow', { backdrop: 'backdrop.json' }, { 'backdrop.json': JSON.stringify({ id: 'aurora' }) });
  const engine = createEngine({ localAppData, dataDir, generators });
  const status = engine.applyTheme(theme);
  assert.equal(read(path.join(v, 'ExtraContent/places/Mobile.rbxl')), 'roblox-original-scene+aurora');
  assert.equal(read(path.join(mods, 'ExtraContent/places/Mobile.rbxl')), 'launcher-original-scene+aurora');
  assert.deepEqual(status.warnings, []);

  // Applying again builds from the original again, not from the already-changed file.
  engine.applyTheme(theme);
  assert.equal(read(path.join(v, 'ExtraContent/places/Mobile.rbxl')), 'roblox-original-scene+aurora');
  engine.restore();
  assert.equal(read(path.join(v, 'ExtraContent/places/Mobile.rbxl')), 'roblox-original-scene');
  assert.equal(fs.existsSync(path.join(mods, 'ExtraContent/places/Mobile.rbxl')), false);
});

test('if a generated part fails, the rest of the theme still applies and a warning says why', () => {
  const v = makeVersion('version-a');
  placeFile(v, 'scene');
  const generators = { backdrop: () => { throw new Error('Roblox changed the avatar scene'); } };
  const theme = makeTheme('Glow', { backdrop: 'backdrop.json', deathSound: 'o.ogg' }, { 'backdrop.json': '{"id":"aurora"}', 'o.ogg': 'oof' });
  const status = createEngine({ localAppData, dataDir, generators }).applyTheme(theme);
  assert.equal(read(path.join(v, 'content/sounds/ouch.ogg')), 'oof');
  assert.equal(read(path.join(v, 'ExtraContent/places/Mobile.rbxl')), 'scene');
  assert.match(status.warnings.join(' '), /avatar background.*Roblox changed the avatar scene/i);
});
