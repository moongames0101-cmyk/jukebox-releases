const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerRoblox } = require('../roblox/ipc');

const APP_DIR = path.join(__dirname, '..');
let root, handlers, sent, localAppData, userData, player;

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
const TTF = Buffer.concat([Buffer.from([0x00, 0x01, 0x00, 0x00]), Buffer.alloc(40)]);
const OGG = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(24), Buffer.from('\x01vorbis'), Buffer.alloc(20)]);
const OPUS = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(24), Buffer.from('OpusHead'), Buffer.alloc(20)]);

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
const call = (ch, ...args) => handlers[ch]({ sender: {} }, ...args);

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gel-ipc-'));
  localAppData = path.join(root, 'LocalAppData');
  userData = path.join(root, 'userData');
  player = path.join(localAppData, 'Roblox', 'Versions', 'version-a');
  write(path.join(player, 'RobloxPlayerBeta.exe'), 'exe');
  write(path.join(player, 'content', 'sounds', 'ouch.ogg'), 'original-ouch');
  write(path.join(player, 'content', 'fonts', 'families', 'BuilderSans.json'),
    JSON.stringify({ name: 'Builder Sans', faces: [{ name: 'Regular', weight: 400, style: 'normal', assetId: 'rbxasset://fonts/BuilderSans-Regular.otf' }] }));
  handlers = {};
  sent = [];
  registerRoblox({
    ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
    app: { getPath: () => userData },
    shell: { openPath: async () => '' },
    getWin: () => ({ isDestroyed: () => false, webContents: { send: (ch, msg) => sent.push([ch, msg]) } }),
    appDir: APP_DIR,
    localAppData,
    isRobloxRunning: async () => false,
  });
});

test('applying built-in picks puts them into Roblox', async () => {
  const res = await call('roblox:apply', { name: 'Arcade', font: 'builtin:arcade', cursor: 'builtin:neon', sound: 'builtin:zap' });
  assert.equal(res.ok, true, res.message);
  const same = (rel, builtin) => assert.deepEqual(fs.readFileSync(path.join(player, rel)), fs.readFileSync(path.join(APP_DIR, 'src', 'roblox', builtin)));
  same('content/sounds/ouch.ogg', 'sounds/zap.ogg');
  same('content/textures/Cursors/KeyboardMouse/ArrowCursor.png', 'cursors/neon.png');
  same('content/fonts/CustomFont.ttf', 'fonts/arcade.ttf');
  assert.equal(res.status.theme, 'Arcade');
});

test('leaving a part as Roblox\'s own does not touch it', async () => {
  const res = await call('roblox:apply', { name: 'Just a cursor', font: null, cursor: 'builtin:pixel', sound: null });
  assert.equal(res.ok, true, res.message);
  assert.equal(fs.readFileSync(path.join(player, 'content/sounds/ouch.ogg'), 'utf8'), 'original-ouch');
  assert.equal(fs.existsSync(path.join(player, 'content/fonts/CustomFont.ttf')), false);
});

test('a theme with nothing picked is refused', async () => {
  const res = await call('roblox:apply', { name: 'Empty', font: null, cursor: null, sound: null });
  assert.equal(res.ok, false);
  assert.match(res.message, /Pick a font, cursor, sound or avatar background/);
});

test('unknown or sneaky ids are refused', async () => {
  for (const id of ['builtin:../../main', 'builtin:nope', 'mine:../x.ttf', 'http://x']) {
    const res = await call('roblox:apply', { name: 'Bad', font: id, cursor: null, sound: null });
    assert.equal(res.ok, false, id);
  }
});

test('your own files are checked, saved and then usable in a theme', async () => {
  const font = await call('roblox:save-asset', { kind: 'font', name: 'My Font.ttf', bytes: TTF });
  const cursor = await call('roblox:save-asset', { kind: 'cursor', name: 'arrow.png', bytes: PNG });
  const sound = await call('roblox:save-asset', { kind: 'sound', name: 'oof.ogg', bytes: OGG });
  for (const r of [font, cursor, sound]) assert.equal(r.ok, true, r.message);
  assert.match(font.id, /^mine:/);
  assert.equal(font.name, 'My Font');

  const list = await call('roblox:assets');
  assert.deepEqual(list.font.map((a) => a.id), [font.id]);

  const res = await call('roblox:apply', { name: 'Mine', font: font.id, cursor: cursor.id, sound: sound.id });
  assert.equal(res.ok, true, res.message);
  assert.deepEqual(fs.readFileSync(path.join(player, 'content/sounds/ouch.ogg')), OGG);
});

test('files that are not what they claim are refused with a plain reason', async () => {
  const notFont = await call('roblox:save-asset', { kind: 'font', name: 'x.ttf', bytes: PNG });
  assert.equal(notFont.ok, false);
  assert.match(notFont.message, /isn't a font/);
  const opus = await call('roblox:save-asset', { kind: 'sound', name: 'x.ogg', bytes: OPUS });
  assert.equal(opus.ok, false);
  assert.match(opus.message, /Ogg Vorbis/);
  const huge = await call('roblox:save-asset', { kind: 'cursor', name: 'x.png', bytes: Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]) });
  assert.equal(huge.ok, false);
});

test('restore puts Roblox back and status says no theme', async () => {
  await call('roblox:apply', { name: 'Arcade', font: null, cursor: null, sound: 'builtin:zap' });
  const res = await call('roblox:restore');
  assert.equal(res.ok, true);
  assert.equal(fs.readFileSync(path.join(player, 'content/sounds/ouch.ogg'), 'utf8'), 'original-ouch');
  assert.equal((await call('roblox:status')).theme, null);
});

test('status lists where the theme goes', async () => {
  fs.mkdirSync(path.join(localAppData, 'ExploitStrap', 'Modifications'), { recursive: true });
  fs.mkdirSync(path.join(localAppData, 'ExploitStrap', 'Versions'), { recursive: true });
  const st = await call('roblox:status');
  assert.equal(st.installed, true);
  assert.deepEqual(st.targets.map((t) => t.name).sort(), ['ExploitStrap', 'Roblox']);
  assert.equal(st.robloxRunning, false);
});

test('asset data comes back so the preview can show your own files', async () => {
  const saved = await call('roblox:save-asset', { kind: 'cursor', name: 'arrow.png', bytes: PNG });
  const data = await call('roblox:asset-data', saved.id);
  assert.equal(data.ok, true);
  assert.equal(data.mime, 'image/png');
  assert.deepEqual(Buffer.from(data.bytes), PNG);
});

test('deleting your own file removes it from the list', async () => {
  const saved = await call('roblox:save-asset', { kind: 'sound', name: 'oof.ogg', bytes: OGG });
  assert.equal((await call('roblox:delete-asset', saved.id)).ok, true);
  assert.equal((await call('roblox:assets')).sound.length, 0);
});

// Avatar background tests that need Roblox's own avatar scene file run only on a
// developer's computer, because that file belongs to Roblox and isn't kept here.
test('unknown avatar backgrounds are refused', async () => {
  const res = await call('roblox:apply', { name: 'Bad', font: null, cursor: null, sound: null, backdrop: 'builtin:lava' });
  assert.equal(res.ok, false);
});
