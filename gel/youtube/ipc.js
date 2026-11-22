// Gel's YouTube side, main process: keeps your pictures, builds the theme and writes
// the "Gel for YouTube" extension into Documents\Gel\YouTube extension.

const fs = require('fs');
const path = require('path');
const { writeExtension, turnOff, setAdblock, readStatus, clearReloadFlag, pictureType } = require('./writer');

const MB = 1024 * 1024;
const KINDS = ['logo', 'background'];

// Where browsers built on Chrome keep their list of extensions, per profile.
const BROWSERS = [
  { name: 'Opera', base: 'appData', dirs: ['Opera Software/Opera Stable'] },
  { name: 'Opera GX', base: 'appData', dirs: ['Opera Software/Opera GX Stable'] },
  { name: 'Chrome', base: 'localAppData', dirs: ['Google/Chrome/User Data'] },
  { name: 'Edge', base: 'localAppData', dirs: ['Microsoft/Edge/User Data'] },
  { name: 'Brave', base: 'localAppData', dirs: ['BraveSoftware/Brave-Browser/User Data'] },
];

// Which browsers have loaded the extension from Gel's folder (found by its path in their settings).
function browsersWith(extDir, roots) {
  const needle = JSON.stringify(extDir).slice(1, -1).toLowerCase();
  const found = [];
  for (const b of BROWSERS) {
    const base = roots[b.base];
    if (!base) continue;
    let hit = false;
    for (const d of b.dirs) {
      const top = path.join(base, d);
      let profiles = ['', 'Default'];
      try { profiles = profiles.concat(fs.readdirSync(top).filter((f) => /^Profile \d+$/.test(f))); } catch (e) { continue; }
      for (const prof of profiles) {
        for (const file of ['Secure Preferences', 'Preferences']) {
          try {
            if (fs.readFileSync(path.join(top, prof, file), 'utf8').toLowerCase().includes(needle)) hit = true;
          } catch (e) { /* not there */ }
          if (hit) break;
        }
        if (hit) break;
      }
      if (hit) break;
    }
    if (hit) found.push(b.name);
  }
  return found;
}

function registerYoutube({ ipcMain, app, shell, appDir, appData = process.env.APPDATA, localAppData = process.env.LOCALAPPDATA }) {
  const srcDir = path.join(appDir, 'src');
  const Themes = require(path.join(srcDir, 'youtube', 'themes.js'));
  const extDir = path.join(app.getPath('documents'), 'Gel', 'YouTube extension');
  const dataDir = path.join(app.getPath('userData'), 'youtube');
  const lastPath = path.join(dataDir, 'last-applied.json');
  const settingsPath = path.join(dataDir, 'settings.json');

  // Settings that belong to Gel for YouTube as a whole, not to one theme. Ads are skipped unless you say no.
  function settings() {
    let s = {};
    try { s = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) || {}; } catch (e) { /* defaults */ }
    return { adblock: s.adblock !== false };
  }
  function saveSettings(patch) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(Object.assign(settings(), patch)));
  }
  // Writes the extension's code with the theme off, for when there's nothing to apply yet.
  function writeIdle() {
    writeExtension({ srcDir, outDir: extDir, theme: Themes.buildTheme(Themes.THEMES[0]) });
    turnOff(extDir, settings());
  }

  function picturePath(kind) {
    if (!KINDS.includes(kind) || !fs.existsSync(dataDir)) return null;
    const hit = fs.readdirSync(dataDir).find((f) => f.startsWith(kind + '.'));
    return hit ? path.join(dataDir, hit) : null;
  }
  function readPicture(kind) {
    const p = picturePath(kind);
    return p ? fs.readFileSync(p) : null;
  }

  function status() {
    return Object.assign(readStatus(extDir), { dir: extDir, themes: Themes.THEMES.length, browsers: browsersWith(extDir, { appData, localAppData }), adblock: settings().adblock });
  }

  // Builds the theme in the main process too, so what lands in the extension is always checked.
  function build({ presetId, custom }) {
    const preset = Themes.THEMES.find((t) => t.id === presetId);
    if (!preset) throw new Error("Gel doesn't know that YouTube theme.");
    custom = custom && typeof custom === 'object' ? custom : {};
    const theme = Themes.buildTheme(preset, custom);
    const logoPicture = theme.logo.mode === 'picture' ? readPicture('logo') : null;
    const backgroundPicture = custom.picture ? readPicture('background') : null;
    return { theme, logoPicture, backgroundPicture };
  }

  function write(payload) {
    const parts = build(payload);
    const res = writeExtension(Object.assign({ srcDir, outDir: extDir, adblock: settings().adblock }, parts));
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(lastPath, JSON.stringify({ presetId: payload.presetId, custom: payload.custom || {} }));
    return res;
  }

  ipcMain.handle('youtube:status', () => status());

  ipcMain.handle('youtube:apply', (_e, payload) => {
    try {
      const res = write(payload || {});
      const s = status();
      const message = s.needsReload
        ? `"${res.theme.name}" is ready. Gel updated the extension too, so reload it once in Opera (see Setup).`
        : `"${res.theme.name}" is on. YouTube in Opera changes within a couple of seconds.`;
      return { ok: true, message, status: s };
    } catch (err) {
      return { ok: false, message: err.message, status: status() };
    }
  });

  ipcMain.handle('youtube:off', () => {
    try {
      turnOff(extDir, settings());
      try { fs.rmSync(lastPath, { force: true }); } catch (e) { /* fine */ }
      return { ok: true, message: 'YouTube is back to normal. Pick a theme and press Apply any time.', status: status() };
    } catch (err) {
      return { ok: false, message: err.message, status: status() };
    }
  });

  ipcMain.handle('youtube:open-folder', async () => {
    try {
      if (!fs.existsSync(path.join(extDir, 'manifest.json'))) writeIdle(); // ready, but no theme until you press Apply
      const err = await shell.openPath(extDir);
      return err ? { ok: false, message: err } : { ok: true };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('youtube:save-picture', (_e, { kind, bytes } = {}) => {
    try {
      if (!KINDS.includes(kind)) throw new Error('Unknown picture.');
      const buf = Buffer.from(bytes || []);
      if (buf.length > 15 * MB) throw new Error('That picture is too big. Pick one under 15 MB.');
      const ext = pictureType(buf);
      if (!ext) throw new Error("That file isn't a picture Gel can use. Pick a PNG, JPG, GIF or WebP.");
      fs.mkdirSync(dataDir, { recursive: true });
      const old = picturePath(kind);
      if (old) fs.rmSync(old, { force: true });
      fs.writeFileSync(path.join(dataDir, kind + ext), buf);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('youtube:picture-data', (_e, kind) => {
    const buf = readPicture(kind);
    if (!buf) return { ok: false };
    const ext = pictureType(buf);
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
    return { ok: true, bytes: new Uint8Array(buf), mime };
  });

  ipcMain.handle('youtube:clear-picture', (_e, kind) => {
    const p = picturePath(kind);
    if (p) fs.rmSync(p, { force: true });
    return { ok: true };
  });

  ipcMain.handle('youtube:set-adblock', (_e, on) => {
    try {
      saveSettings({ adblock: !!on });
      if (fs.existsSync(path.join(extDir, 'manifest.json'))) setAdblock(extDir, !!on);
      else writeIdle();
      return { ok: true, status: status() };
    } catch (err) {
      return { ok: false, message: err.message, status: status() };
    }
  });

  ipcMain.handle('youtube:ack-reload', () => { clearReloadFlag(extDir); return { ok: true, status: status() }; });

  ipcMain.handle('youtube:open-youtube', () => shell.openExternal('https://www.youtube.com/'));

  // When Gel updates, bring the extension's code up to date and keep the theme that was on.
  function refresh() {
    try {
      const s = readStatus(extDir);
      if (!s.installed) return;
      let last = null;
      try { last = JSON.parse(fs.readFileSync(lastPath, 'utf8')); } catch (e) { /* none */ }
      if (s.enabled && last) write(last);
      else writeIdle();
    } catch (err) {
      console.error('Gel for YouTube refresh failed:', err);
    }
  }

  return { refresh, status, extDir };
}

module.exports = { registerYoutube };
