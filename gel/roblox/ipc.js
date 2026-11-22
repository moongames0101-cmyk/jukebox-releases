// Gel's Roblox side, main process: built-in and your own fonts, cursors and
// death sounds, applying them with the engine, and putting the theme back
// after Roblox updates itself.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { createEngine } = require('./engine');
const { buildBackdrop, BACKDROPS } = require('./backdrop');

const MB = 1024 * 1024;
const KINDS = {
  font: {
    dir: 'fonts', builtinExt: '.ttf', max: 30 * MB, label: 'font',
    check(b) {
      const sig = b.subarray(0, 4).toString('latin1');
      if (sig === '\x00\x01\x00\x00' || sig === 'true') return { ext: '.ttf', mime: 'font/ttf' };
      if (sig === 'OTTO') return { ext: '.otf', mime: 'font/otf' };
      throw new Error("That file isn't a font Roblox can use. Pick a .ttf or .otf file.");
    },
  },
  cursor: {
    dir: 'cursors', builtinExt: '.png', max: 2 * MB, label: 'cursor',
    check(b) {
      if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: '.png', mime: 'image/png' };
      throw new Error("That file isn't a PNG picture.");
    },
  },
  sound: {
    dir: 'sounds', builtinExt: '.ogg', max: 10 * MB, label: 'sound',
    check(b) {
      if (b.subarray(0, 4).toString('latin1') !== 'OggS') {
        throw new Error("That file isn't an .ogg sound. Roblox needs Ogg Vorbis (.ogg) files.");
      }
      if (!b.subarray(0, 200).toString('latin1').includes('vorbis')) {
        throw new Error("That .ogg isn't Ogg Vorbis, the only kind Roblox plays. Save it as Ogg Vorbis and try again.");
      }
      return { ext: '.ogg', mime: 'audio/ogg' };
    },
  },
};
const MIME = { '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.ogg': 'audio/ogg' };

function defaultIsRobloxRunning() {
  if (process.platform !== 'win32') return Promise.resolve(false);
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq RobloxPlayerBeta.exe', '/NH'], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      resolve(!err && /RobloxPlayerBeta\.exe/i.test(String(stdout)));
    });
  });
}

function registerRoblox({ ipcMain, app, shell, getWin, appDir, localAppData = process.env.LOCALAPPDATA, isRobloxRunning = defaultIsRobloxRunning }) {
  const dataDir = path.join(app.getPath('userData'), 'roblox');
  const libraryDir = path.join(dataDir, 'library');
  const indexPath = path.join(libraryDir, 'index.json');
  const currentDir = path.join(dataDir, 'current');
  const builtinDir = path.join(appDir, 'src', 'roblox');
  // The avatar background is built from each Roblox install's own avatar scene file.
  const generators = {
    backdrop: ({ spec, sourceDir }) => {
      const scene = path.join(sourceDir || '', 'ExtraContent', 'places', 'Mobile.rbxl');
      if (!sourceDir || !fs.existsSync(scene)) throw new Error("this copy of Roblox has no avatar scene file.");
      return [{ rel: 'ExtraContent/places/Mobile.rbxl', data: buildBackdrop(fs.readFileSync(scene), spec) }];
    },
  };
  const engine = createEngine({ localAppData, dataDir, generators });
  let busy = false;

  const send = (msg) => {
    const win = getWin();
    if (win && !win.isDestroyed()) win.webContents.send('roblox:event', msg);
  };

  // ---------- Your own files ----------

  function readIndex() {
    try {
      return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (_) {
      return {};
    }
  }
  function writeIndex(index) {
    fs.mkdirSync(libraryDir, { recursive: true });
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  // Turn an id from the window into a real file, refusing anything unexpected.
  function resolve(kind, id) {
    if (id == null) return null;
    const k = KINDS[kind];
    const s = String(id);
    let m = s.match(/^builtin:([a-z0-9-]{1,40})$/);
    if (m) {
      const file = path.join(builtinDir, k.dir, m[1] + k.builtinExt);
      if (!fs.existsSync(file)) throw new Error(`That ${k.label} isn't in Gel any more. Pick another one.`);
      return file;
    }
    m = s.match(/^mine:([a-f0-9]{8,40}\.(ttf|otf|png|ogg))$/);
    if (m) {
      const file = path.join(libraryDir, k.dir, m[1]);
      if (!fs.existsSync(file)) throw new Error(`Your ${k.label} file is missing. Pick it again.`);
      return file;
    }
    throw new Error(`Gel didn't recognise that ${k.label}. Pick it again.`);
  }

  function findMine(id) {
    const m = String(id || '').match(/^mine:([a-f0-9]{8,40}\.(ttf|otf|png|ogg))$/);
    if (!m) return null;
    const entry = readIndex()[id];
    if (!entry || !KINDS[entry.kind]) return null;
    return { entry, file: path.join(libraryDir, KINDS[entry.kind].dir, m[1]), ext: '.' + m[2] };
  }

  ipcMain.handle('roblox:save-asset', async (_e, payload) => {
    try {
      const kind = payload && payload.kind;
      const k = KINDS[kind];
      if (!k) throw new Error('Gel only takes fonts, cursors and sounds here.');
      const bytes = Buffer.from(payload.bytes || []);
      if (!bytes.length) throw new Error('That file is empty.');
      if (bytes.length > k.max) throw new Error(`That file is too big. Pick one under ${k.max / MB} MB.`);
      const { ext } = k.check(bytes);
      const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
      const file = hash + ext;
      fs.mkdirSync(path.join(libraryDir, k.dir), { recursive: true });
      fs.writeFileSync(path.join(libraryDir, k.dir, file), bytes);
      const name = String(payload.name || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[^\w .()'-]+/g, '').trim().slice(0, 40) || `My ${k.label}`;
      const id = `mine:${file}`;
      const index = readIndex();
      index[id] = { kind, name, added: Date.now() };
      writeIndex(index);
      return { ok: true, id, name, kind };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('roblox:assets', async () => {
    const out = { font: [], cursor: [], sound: [] };
    const index = readIndex();
    for (const [id, entry] of Object.entries(index).sort((a, b) => a[1].added - b[1].added)) {
      const mine = findMine(id);
      if (mine && fs.existsSync(mine.file)) out[entry.kind].push({ id, name: entry.name });
    }
    return out;
  });

  ipcMain.handle('roblox:asset-data', async (_e, id) => {
    const mine = findMine(id);
    if (!mine || !fs.existsSync(mine.file)) return { ok: false, message: 'That file is missing.' };
    return { ok: true, mime: MIME[mine.ext], bytes: fs.readFileSync(mine.file) };
  });

  ipcMain.handle('roblox:delete-asset', async (_e, id) => {
    const mine = findMine(id);
    if (!mine) return { ok: false, message: 'That file is already gone.' };
    fs.rmSync(mine.file, { force: true });
    const index = readIndex();
    delete index[id];
    writeIndex(index);
    return { ok: true };
  });

  // ---------- Status, apply, restore ----------

  ipcMain.handle('roblox:status', async () => {
    const st = engine.getStatus();
    return Object.assign(st, { robloxRunning: await isRobloxRunning(), busy });
  });

  ipcMain.handle('roblox:apply', async (_e, payload) => {
    if (busy) return { ok: false, message: 'Gel is still finishing the last step. Try again in a moment.' };
    busy = true;
    try {
      const p = payload || {};
      const font = resolve('font', p.font);
      const cursor = resolve('cursor', p.cursor);
      const sound = resolve('sound', p.sound);
      let backdrop = null;
      if (p.backdrop != null) {
        const m = String(p.backdrop).match(/^builtin:([a-z]{1,20})$/);
        if (!m || !BACKDROPS[m[1]]) throw new Error("Gel didn't recognise that avatar background. Pick another one.");
        backdrop = m[1];
      }
      if (!font && !cursor && !sound && !backdrop) return { ok: false, message: 'Pick a font, cursor, sound or avatar background to change first.' };

      // Gather the picks into one theme folder the engine can apply and reapply.
      fs.rmSync(currentDir, { recursive: true, force: true });
      fs.mkdirSync(currentDir, { recursive: true });
      const manifest = { name: String(p.name || 'My Roblox theme').slice(0, 40) };
      const copy = (src, name) => fs.writeFileSync(path.join(currentDir, name), fs.readFileSync(src));
      if (font) { const n = 'font' + path.extname(font); copy(font, n); manifest.font = n; }
      if (cursor) { copy(cursor, 'cursor.png'); manifest.cursor = 'cursor.png'; }
      if (sound) { copy(sound, 'death.ogg'); manifest.deathSound = 'death.ogg'; }
      if (backdrop) {
        // Pictures the moving parts use, installed as content/textures/gel/...
        const pics = path.join(builtinDir, 'backdrop');
        const into = path.join(currentDir, 'files', 'content', 'textures', 'gel');
        fs.mkdirSync(path.join(into, 'backdrops'), { recursive: true });
        for (const f of fs.readdirSync(pics)) if (f.endsWith('.png')) copy(path.join(pics, f), path.join('files', 'content', 'textures', 'gel', f));
        copy(path.join(pics, 'backdrops', `${backdrop}.png`), path.join('files', 'content', 'textures', 'gel', 'backdrops', `${backdrop}.png`));
        fs.writeFileSync(path.join(currentDir, 'backdrop.json'), JSON.stringify({ id: backdrop }));
        manifest.backdrop = 'backdrop.json';
      }
      fs.writeFileSync(path.join(currentDir, 'theme.json'), JSON.stringify(manifest, null, 2));

      const status = engine.applyTheme(currentDir);
      const running = await isRobloxRunning();
      const done = running ? 'Theme applied. Close Roblox and open it again to see it.' : 'Theme applied. Open Roblox to see it.';
      return {
        ok: true,
        status,
        message: status.warnings && status.warnings.length ? `${done} ${status.warnings.join(' ')}` : done,
      };
    } catch (err) {
      const locked = /EBUSY|EPERM|EACCES/.test(err.code || err.message);
      return { ok: false, message: locked ? "Windows wouldn't let Gel change Roblox's files. Close Roblox and try again." : err.message };
    } finally {
      busy = false;
    }
  });

  ipcMain.handle('roblox:restore', async () => {
    if (busy) return { ok: false, message: 'Gel is still finishing the last step. Try again in a moment.' };
    busy = true;
    try {
      engine.restore();
      fs.rmSync(currentDir, { recursive: true, force: true });
      return { ok: true, message: 'Roblox is back to normal. Your Gel themes are still saved here.' };
    } catch (err) {
      const locked = /EBUSY|EPERM|EACCES/.test(err.code || err.message);
      return { ok: false, message: locked ? "Windows wouldn't let Gel change Roblox's files. Close Roblox and try again." : err.message };
    } finally {
      busy = false;
    }
  });

  ipcMain.handle('roblox:open-folder', async () => {
    fs.mkdirSync(libraryDir, { recursive: true });
    const err = await shell.openPath(libraryDir);
    return { ok: !err, message: err || '' };
  });

  // ---------- Putting the theme back after Roblox updates ----------

  function checkForUpdate() {
    if (busy) return;
    try {
      if (engine.reapplyIfUpdated()) {
        send({ type: 'reapplied', status: engine.getStatus() });
      }
    } catch (err) {
      send({ type: 'reapply-failed', message: err.message });
    }
  }

  function startWatching() {
    setTimeout(checkForUpdate, 3000);
    let timer = null;
    try {
      fs.watch(path.join(localAppData || '', 'Roblox', 'Versions'), () => {
        clearTimeout(timer);
        timer = setTimeout(checkForUpdate, 5000); // let the update finish unpacking
      });
    } catch (_) {
      // Roblox isn't installed yet; the check below still catches the first install.
    }
    setInterval(checkForUpdate, 60 * 1000).unref();
  }

  return { startWatching };
}

module.exports = { registerRoblox };
