const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerYoutube } = require('../youtube/ipc');

const APP_DIR = path.join(__dirname, '..');
let root, handlers, userData, documents, opened, extDir, yt;
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a3c50000000049454e44ae426082', 'hex');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40)]);
const call = (ch, ...args) => handlers[ch]({ sender: {} }, ...args);
const readTheme = () => JSON.parse(fs.readFileSync(path.join(extDir, 'theme.json'), 'utf8'));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gel-ytipc-'));
  userData = path.join(root, 'userData');
  documents = path.join(root, 'Documents');
  extDir = path.join(documents, 'Gel', 'YouTube extension');
  handlers = {};
  opened = [];
  yt = registerYoutube({
    ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
    app: { getPath: (k) => (k === 'documents' ? documents : userData) },
    shell: { openPath: async (p) => { opened.push(p); return ''; }, openExternal: async (u) => { opened.push(u); } },
    appDir: APP_DIR,
    appData: path.join(root, 'AppData', 'Roaming'),
    localAppData: path.join(root, 'AppData', 'Local'),
  });
});

test('status before anything is set up', async () => {
  const s = await call('youtube:status');
  assert.equal(s.installed, false);
  assert.equal(s.dir, extDir);
  assert.equal(s.themes, 19);
});

test('apply writes the extension and the theme into Documents\\Gel', async () => {
  const res = await call('youtube:apply', { presetId: 'sakura', custom: {} });
  assert.equal(res.ok, true, res.message);
  assert.equal(readTheme().name, 'Sakura Dream');
  assert.equal(res.status.installed, true);
  assert.equal(res.status.enabled, true);
  assert.ok(fs.existsSync(path.join(extDir, 'manifest.json')));
});

test('apply takes your colours, fonts, effect, layout and logo words', async () => {
  const custom = {
    name: 'Mine', seeds: { bg: '101010', text: 'FAFAFA', accent: '00FF88' }, font: 'pixel', headingFont: 'poster',
    effect: { id: 'snow', amount: 0.5, speed: 1.5 }, glass: 0.4, radius: 6,
    layout: { hideShorts: true, perRow: 5 }, logo: { mode: 'text', text: 'Moon' },
  };
  const res = await call('youtube:apply', { presetId: 'gel-glass', custom });
  assert.equal(res.ok, true, res.message);
  const t = readTheme();
  assert.equal(t.name, 'Mine');
  assert.equal(t.palette.accent, '#00FF88');
  assert.equal(t.fonts.body.file, 'pixel.ttf');
  assert.equal(t.effect.id, 'snow');
  assert.equal(t.effect.amount, 0.5);
  assert.equal(t.layout.hideShorts, true);
  assert.equal(t.layout.perRow, 5);
  assert.deepEqual([t.logo.mode, t.logo.text], ['text', 'Moon']);
});

test('apply refuses a theme it does not know', async () => {
  const res = await call('youtube:apply', { presetId: 'nope', custom: {} });
  assert.equal(res.ok, false);
});

test('your pictures are kept and used for the logo and background', async () => {
  assert.equal((await call('youtube:save-picture', { kind: 'logo', bytes: new Uint8Array(PNG) })).ok, true);
  assert.equal((await call('youtube:save-picture', { kind: 'background', bytes: new Uint8Array(JPG) })).ok, true);
  const res = await call('youtube:apply', { presetId: 'galaxy', custom: { logo: { mode: 'picture' }, picture: true } });
  assert.equal(res.ok, true, res.message);
  const t = readTheme();
  assert.match(t.logo.image, /\.png$/);
  assert.match(t.background.picture, /\.jpg$/);
  const back = await call('youtube:picture-data', 'background');
  assert.equal(back.ok, true);
  assert.deepEqual(Buffer.from(back.bytes), JPG);
});

test('the background picture is only used when switched on', async () => {
  await call('youtube:save-picture', { kind: 'background', bytes: new Uint8Array(JPG) });
  await call('youtube:apply', { presetId: 'galaxy', custom: { picture: false } });
  assert.equal(readTheme().background.picture, null);
});

test('a file that is not a picture is turned away', async () => {
  const res = await call('youtube:save-picture', { kind: 'logo', bytes: new Uint8Array(Buffer.from('not a picture at all')) });
  assert.equal(res.ok, false);
  assert.match(res.message, /picture/i);
});

test('removing a picture forgets it', async () => {
  await call('youtube:save-picture', { kind: 'logo', bytes: new Uint8Array(PNG) });
  await call('youtube:clear-picture', 'logo');
  assert.equal((await call('youtube:picture-data', 'logo')).ok, false);
});

test('off tells the extension to stop', async () => {
  await call('youtube:apply', { presetId: 'sakura', custom: {} });
  const res = await call('youtube:off');
  assert.equal(res.ok, true);
  assert.equal(readTheme().enabled, false);
  assert.equal(res.status.enabled, false);
});

test('open folder makes the extension first if it is not there yet', async () => {
  const res = await call('youtube:open-folder');
  assert.equal(res.ok, true);
  assert.ok(fs.existsSync(path.join(extDir, 'manifest.json')));
  assert.deepEqual(opened, [extDir]);
  assert.equal(readTheme().enabled, false); // made, but not switched on
});

test('refreshing at start-up updates old extension code and keeps the theme', async () => {
  await call('youtube:apply', { presetId: 'volcano', custom: {} });
  fs.writeFileSync(path.join(extDir, 'gel-yt.js'), '// old');
  yt.refresh();
  assert.notEqual(fs.readFileSync(path.join(extDir, 'gel-yt.js'), 'utf8'), '// old');
  assert.equal(readTheme().name, 'Volcano');
  const s = await call('youtube:status');
  assert.equal(s.needsReload, true);
  await call('youtube:ack-reload');
  assert.equal((await call('youtube:status')).needsReload, false);
});

test('refreshing does nothing when the extension was never made', () => {
  yt.refresh();
  assert.equal(fs.existsSync(extDir), false);
});

test('status says which browsers have the extension added', async () => {
  let s = await call('youtube:status');
  assert.deepEqual(s.browsers, []);
  const prefs = path.join(root, 'AppData', 'Roaming', 'Opera Software', 'Opera Stable', 'Default', 'Secure Preferences');
  fs.mkdirSync(path.dirname(prefs), { recursive: true });
  fs.writeFileSync(prefs, JSON.stringify({ extensions: { settings: { abc: { path: extDir.toUpperCase(), location: 4 } } } }));
  const chrome = path.join(root, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Secure Preferences');
  fs.mkdirSync(path.dirname(chrome), { recursive: true });
  fs.writeFileSync(chrome, JSON.stringify({ extensions: { settings: { other: { path: 'C:\\somewhere\\else' } } } }));
  s = await call('youtube:status');
  assert.deepEqual(s.browsers, ['Opera']);
});
