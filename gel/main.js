const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { autoUpdater } = require('electron-updater');

const THEME_FOLDER = 'Gel';
// Spicetify's own add-ons that Gel can switch on and off
const KNOWN_EXTENSIONS = ['fullAppDisplay.js', 'popupLyrics.js', 'trashbin.js', 'shuffle+.js', 'loopyLoop.js', 'keyboardShortcut.js', 'bookmark.js'];
const KNOWN_APPS = ['lyrics-plus', 'new-releases'];
const splitList = v => String(v || '').split('|').map(x => x.trim()).filter(Boolean);
const SCHEME = 'Gel';
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

let win = null;
let busy = false;

// ---------- Paths ----------

function spicetifyUserdata() {
  if (process.env.SPICETIFY_CONFIG) return process.env.SPICETIFY_CONFIG;
  if (IS_WIN) return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'spicetify');
  const xdg = process.env.XDG_CONFIG_HOME;
  if (!IS_MAC && xdg) return path.join(xdg, 'spicetify');
  return path.join(os.homedir(), '.config', 'spicetify');
}

function themeDir() { return path.join(spicetifyUserdata(), 'Themes', THEME_FOLDER); }

function spicetifyCandidates() {
  if (IS_WIN) {
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return [
      path.join(local, 'spicetify', 'spicetify.exe'),
      path.join(local, 'Microsoft', 'WinGet', 'Links', 'spicetify.exe'),
      path.join(os.homedir(), 'scoop', 'shims', 'spicetify.exe'),
      'C:\\ProgramData\\chocolatey\\bin\\spicetify.exe',
    ];
  }
  return [
    path.join(os.homedir(), '.spicetify', 'spicetify'),
    '/opt/homebrew/bin/spicetify',
    '/usr/local/bin/spicetify',
    '/usr/bin/spicetify',
  ];
}

function whichSpicetify() {
  return new Promise(resolve => {
    execFile(IS_WIN ? 'where' : 'which', ['spicetify'], { windowsHide: true, timeout: 8000 }, (err, stdout) => {
      if (err) return resolve(null);
      const first = String(stdout).split(/\r?\n/).map(s => s.trim()).find(Boolean);
      resolve(first && fs.existsSync(first) ? first : null);
    });
  });
}

async function findSpicetify() {
  for (const p of spicetifyCandidates()) {
    try { if (fs.existsSync(p)) return p; } catch (_) { /* keep looking */ }
  }
  return whichSpicetify();
}

function readIni(file) {
  const out = {};
  let section = '';
  try {
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith(';') || line.startsWith('#')) continue;
      const sec = line.match(/^\[(.+)\]$/);
      if (sec) { section = sec[1]; continue; }
      const kv = line.match(/^([^=]+?)\s*=\s*(.*)$/);
      if (kv) out[`${section}.${kv[1].trim()}`] = kv[2].trim();
    }
  } catch (_) { /* missing file is fine */ }
  return out;
}

function detectSpotify(cfg) {
  const result = { desktop: false, store: false, usingStore: false, path: null };
  const configured = cfg['Setting.spotify_path'] || '';
  if (IS_WIN) {
    const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const desktopExe = path.join(roaming, 'Spotify', 'Spotify.exe');
    if (fs.existsSync(desktopExe)) { result.desktop = true; result.path = path.dirname(desktopExe); }
    try {
      result.store = fs.readdirSync(path.join(local, 'Packages')).some(n => n.startsWith('SpotifyAB.SpotifyMusic'));
    } catch (_) { /* no Packages folder */ }
    result.usingStore = /SpotifyAB\.SpotifyMusic|WindowsApps/i.test(configured) || (result.store && !result.desktop);
  } else if (IS_MAC) {
    for (const p of ['/Applications/Spotify.app', path.join(os.homedir(), 'Applications', 'Spotify.app')]) {
      if (fs.existsSync(p)) { result.desktop = true; result.path = p; break; }
    }
  } else {
    for (const p of ['/opt/spotify', '/usr/share/spotify', '/usr/lib/spotify', '/var/lib/flatpak/app/com.spotify.Client', path.join(os.homedir(), '.local/share/flatpak/app/com.spotify.Client'), '/snap/spotify']) {
      if (fs.existsSync(p)) { result.desktop = true; result.path = p; break; }
    }
  }
  return result;
}

// ---------- Running Spicetify ----------

function cleanOutput(text) {
  return String(text)
    .replace(/\x1B\[[0-9;?]*[ -\/]*[@-~]/g, '')
    .replace(/\x1B[()][A-Z0-9]/g, '')
    .replace(/\r(?!\n)/g, '\n');
}

function sendLog(line, kind = 'out') {
  if (win && !win.isDestroyed()) win.webContents.send('gel:log', { line, kind });
}

function run(exe, args, { timeoutMs = 5 * 60 * 1000 } = {}) {
  return new Promise(resolve => {
    sendLog(`> spicetify ${args.join(' ')}`, 'cmd');
    let output = '';
    let settled = false;
    const child = spawn(exe, args, {
      windowsHide: true,
      cwd: os.homedir(),
      env: Object.assign({}, process.env, { NO_COLOR: '1', TERM: 'dumb' }),
    });
    const onData = buf => {
      const text = cleanOutput(buf);
      output += text;
      for (const l of text.split('\n')) if (l.trim()) sendLog(l.replace(/\s+$/, ''));
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    // Spicetify asks "Continue backing up anyway?" for the Microsoft Store version of Spotify.
    // Answer yes so the app can finish on its own.
    try { child.stdin.write('y\ny\ny\ny\ny\n'); child.stdin.end(); } catch (_) { /* ignore */ }
    const finish = code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, output });
    };
    const timer = setTimeout(() => {
      sendLog('Spicetify took too long, so Gel stopped it.', 'err');
      try { child.kill(); } catch (_) { /* ignore */ }
      finish(-1);
    }, timeoutMs);
    child.on('error', err => { sendLog(err.message, 'err'); finish(-1); });
    child.on('close', code => finish(code));
    child.on('exit', code => setTimeout(() => finish(code), 2000));
  });
}

async function withSpicetify(fn) {
  if (busy) return { ok: false, message: 'Gel is still finishing the last step. Try again in a moment.' };
  const exe = await findSpicetify();
  if (!exe) return { ok: false, needsSpicetify: true, message: 'Spicetify is not installed yet. Open Setup and choose Install Spicetify.' };
  busy = true;
  try { return await fn(exe); } finally { busy = false; }
}

// ---------- IPC ----------

ipcMain.handle('gel:status', async () => {
  const exe = await findSpicetify();
  let version = null;
  if (exe) {
    version = await new Promise(resolve => {
      execFile(exe, ['-v'], { windowsHide: true, timeout: 15000 }, (err, stdout) => {
        const v = cleanOutput(stdout || '').trim().split('\n').pop();
        resolve(err && !v ? null : (v || null));
      });
    });
  }
  const userdata = spicetifyUserdata();
  const cfg = readIni(path.join(userdata, 'config-xpui.ini'));
  return {
    platform: process.platform,
    spicetify: exe ? { path: exe, version } : null,
    userdata,
    themeDir: themeDir(),
    currentTheme: cfg['Setting.current_theme'] || '',
    colorScheme: cfg['Setting.color_scheme'] || '',
    gelActive: (cfg['Setting.current_theme'] || '') === THEME_FOLDER,
    extensions: splitList(cfg['AdditionalOptions.extensions']),
    customApps: splitList(cfg['AdditionalOptions.custom_apps']),
    spotify: detectSpotify(cfg),
    busy,
  };
});

ipcMain.handle('gel:apply', async (_e, payload) => {
  const colorIni = String(payload && payload.colorIni || '');
  const userCss = String(payload && payload.userCss || '');
  const themeJs = String(payload && payload.themeJs || '');
  if (!colorIni.includes(`[${SCHEME}]`)) return { ok: false, message: 'The theme colours are missing. Pick a theme and try again.' };
  if (userCss.length > 25 * 1024 * 1024) return { ok: false, message: 'The background image is too large. Choose a smaller picture.' };

  return withSpicetify(async exe => {
    const dir = themeDir();
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'color.ini'), colorIni, 'utf8');
      fs.writeFileSync(path.join(dir, 'user.css'), userCss, 'utf8');
      const jsPath = path.join(dir, 'theme.js');
      if (themeJs.trim()) fs.writeFileSync(jsPath, themeJs, 'utf8');
      else if (fs.existsSync(jsPath)) fs.unlinkSync(jsPath);
      sendLog(`Saved theme files to ${dir}`, 'ok');
    } catch (err) {
      return { ok: false, message: `Gel couldn't write the theme files: ${err.message}` };
    }

    const configArgs = ['config', 'current_theme', THEME_FOLDER, 'color_scheme', SCHEME, 'inject_css', '1', 'replace_colors', '1', 'inject_theme_js', '1'];
    // Add-ons: only touch the ones Gel knows about, and only when they need changing
    const addons = payload && payload.addons;
    if (addons && typeof addons === 'object') {
      const cfg = readIni(path.join(spicetifyUserdata(), 'config-xpui.ini'));
      const curExt = splitList(cfg['AdditionalOptions.extensions']);
      const curApps = splitList(cfg['AdditionalOptions.custom_apps']);
      for (const [name, on] of Object.entries(addons.extensions || {})) {
        if (!KNOWN_EXTENSIONS.includes(name)) continue;
        if (on && !curExt.includes(name)) configArgs.push('extensions', name);
        else if (!on && curExt.includes(name)) configArgs.push('extensions', `${name}-`);
      }
      for (const [name, on] of Object.entries(addons.apps || {})) {
        if (!KNOWN_APPS.includes(name)) continue;
        if (on && !curApps.includes(name)) configArgs.push('custom_apps', name);
        else if (!on && curApps.includes(name)) configArgs.push('custom_apps', `${name}-`);
      }
    }
    let r = await run(exe, configArgs);
    if (r.code !== 0) return { ok: false, message: 'Spicetify could not save its settings. Details are in the log.' };

    r = await run(exe, ['apply']);
    if (r.code !== 0 && /backup/i.test(r.output)) {
      sendLog('Spotify needs a fresh backup first. Making one now…', 'ok');
      r = await run(exe, ['backup', 'apply']);
    }
    if (r.code !== 0) {
      let message = 'Spicetify could not apply the theme. Details are in the log.';
      if (/Cannot detect Spotify location|not a valid path/i.test(r.output)) message = "Spicetify can't find Spotify. Open Setup to fix this.";
      else if (/administrator|root privileges/i.test(r.output)) message = "Spicetify won't run as administrator. Close Gel and open it normally (not with Run as administrator).";
      else if (/re-install Spotify/i.test(r.output)) message = 'Spotify is in a half-modified state. Reinstall Spotify, then apply again.';
      return { ok: false, message };
    }
    return { ok: true, message: 'Theme applied. Spotify is restarting with your new look.' };
  });
});

ipcMain.handle('gel:restore', async () => withSpicetify(async exe => {
  const r = await run(exe, ['restore']);
  return r.code === 0
    ? { ok: true, message: 'Spotify is back to normal. Your Gel themes are still saved here.' }
    : { ok: false, message: 'Spicetify could not restore Spotify. Details are in the log.' };
}));

ipcMain.handle('gel:launch', async () => withSpicetify(async exe => {
  const r = await run(exe, ['auto']);
  return r.code === 0
    ? { ok: true, message: 'Opening Spotify with your theme.' }
    : { ok: false, message: 'Spicetify could not open Spotify. Details are in the log.' };
}));

ipcMain.handle('gel:upgrade-spicetify', async () => withSpicetify(async exe => {
  const r = await run(exe, ['upgrade']);
  return r.code === 0
    ? { ok: true, message: 'Spicetify is up to date.' }
    : { ok: false, message: 'Spicetify could not update itself. Details are in the log.' };
}));

ipcMain.handle('gel:install-spicetify', async () => {
  try {
    if (IS_WIN) {
      const cmd = "Write-Host 'Installing Spicetify for Gel. Answer the questions below, then close this window and press Check again in Gel.' -ForegroundColor Cyan; iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex";
      const child = spawn('powershell.exe', ['-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { detached: true, stdio: 'ignore' });
      child.unref();
      return { ok: true, message: 'A PowerShell window opened to install Spicetify. When it finishes, close it and press Check again.' };
    }
    return { ok: false, manual: 'curl -fsSL https://raw.githubusercontent.com/spicetify/cli/main/install.sh | sh', message: 'Run this command in Terminal, then press Check again.' };
  } catch (err) {
    return { ok: false, message: `Gel couldn't open PowerShell: ${err.message}` };
  }
});

ipcMain.handle('gel:shortcut', async () => {
  if (!IS_WIN) return { ok: false, message: 'Shortcuts are only made on Windows.' };
  const exe = await findSpicetify();
  if (!exe) return { ok: false, needsSpicetify: true, message: 'Install Spicetify first.' };
  try {
    const iconSrc = path.join(__dirname, 'build', 'icon.ico');
    const iconDest = path.join(app.getPath('userData'), 'gel-spotify.ico');
    try { fs.copyFileSync(iconSrc, iconDest); } catch (_) { /* icon is optional */ }
    const psExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const lnk = path.join(app.getPath('desktop'), 'Spotify (Gel).lnk');
    const ok = shell.writeShortcutLink(lnk, 'create', {
      target: psExe,
      args: `-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "& '${exe.replace(/'/g, "''")}' auto"`,
      description: 'Open Spotify with your Gel theme',
      icon: fs.existsSync(iconDest) ? iconDest : psExe,
      iconIndex: 0,
    });
    return ok
      ? { ok: true, message: 'Added "Spotify (Gel)" to your desktop. Use it to open Spotify with your theme.' }
      : { ok: false, message: 'Windows did not let Gel create the shortcut.' };
  } catch (err) {
    return { ok: false, message: `Gel couldn't create the shortcut: ${err.message}` };
  }
});

const LINKS = {
  'spotify-installer': 'https://download.scdn.co/SpotifySetup.exe',
  'spotify-download': 'https://www.spotify.com/download/',
  'apps-settings': 'ms-settings:appsfeatures',
  'spicetify-docs': 'https://spicetify.app/docs/getting-started',
};

ipcMain.handle('gel:open', async (_e, key) => {
  if (key === 'themes-folder') {
    fs.mkdirSync(themeDir(), { recursive: true });
    const err = await shell.openPath(themeDir());
    return { ok: !err, message: err || '' };
  }
  const url = LINKS[key];
  if (!url) return { ok: false, message: 'Unknown link.' };
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('gel:export', async (_e, theme) => {
  const safe = String(theme && theme.name || 'theme').replace(/[^\w\- ]+/g, '').trim() || 'theme';
  const res = await dialog.showSaveDialog(win, {
    title: 'Export theme',
    defaultPath: path.join(app.getPath('documents'), `${safe}.gel.json`),
    filters: [{ name: 'Gel theme', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(res.filePath, JSON.stringify({ gel: 1, theme }, null, 2), 'utf8');
  return { ok: true, message: `Exported to ${res.filePath}` };
});

ipcMain.handle('gel:import', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Import theme',
    properties: ['openFile'],
    filters: [{ name: 'Gel theme', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  try {
    const data = JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'));
    const theme = data && data.theme ? data.theme : data;
    if (!theme || typeof theme !== 'object' || !theme.colors) throw new Error('This file is not a Gel theme.');
    return { ok: true, theme };
  } catch (err) {
    return { ok: false, message: err.message || 'This file is not a Gel theme.' };
  }
});

// ---------- Updates ----------
// Gel checks the "gel" release on GitHub, downloads new versions in the background
// and installs them when you restart (or the next time you close Gel).

const canUpdate = () => app.isPackaged && process.platform === 'win32' && !process.env.PORTABLE_EXECUTABLE_DIR;
let updateState = { state: canUpdate() ? 'idle' : 'unsupported', version: null, percent: 0, message: '' };

function sendUpdate(patch) {
  updateState = Object.assign({}, updateState, patch);
  if (win && !win.isDestroyed()) win.webContents.send('gel:update', Object.assign({ current: app.getVersion() }, updateState));
}

function checkForUpdates() {
  if (!canUpdate()) return Promise.resolve();
  return autoUpdater.checkForUpdates().catch(err => sendUpdate({ state: 'error', message: String(err && err.message || err).split('\n')[0] }));
}

function setupUpdates() {
  if (!canUpdate()) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => { if (updateState.state !== 'downloading' && updateState.state !== 'ready') sendUpdate({ state: 'checking', message: '' }); });
  autoUpdater.on('update-available', info => sendUpdate({ state: 'downloading', version: info.version, percent: 0 }));
  autoUpdater.on('download-progress', p => sendUpdate({ state: 'downloading', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'current' }));
  autoUpdater.on('update-downloaded', info => sendUpdate({ state: 'ready', version: info.version }));
  autoUpdater.on('error', err => { if (updateState.state !== 'ready') sendUpdate({ state: 'error', message: String(err && err.message || err).split('\n')[0] }); });
  setTimeout(checkForUpdates, 4000);
  setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
}

ipcMain.handle('gel:update-state', () => Object.assign({ current: app.getVersion() }, updateState));
ipcMain.handle('gel:update-check', async () => {
  if (updateState.state !== 'ready' && updateState.state !== 'downloading') await checkForUpdates();
  return Object.assign({ current: app.getVersion() }, updateState);
});
ipcMain.handle('gel:update-install', () => {
  if (updateState.state !== 'ready') return { ok: false, message: 'There is no update ready yet.' };
  if (busy) return { ok: false, message: 'Gel is still talking to Spicetify. Try again in a moment.' };
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
  return { ok: true };
});

// ---------- Window ----------

ipcMain.on('gel:win', (e, action) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (action === 'minimize') w.minimize();
  else if (action === 'maximize') { if (w.isMaximized()) w.unmaximize(); else w.maximize(); }
  else if (action === 'close') w.close();
});

function createWindow() {
  win = new BrowserWindow({
    width: 1340,
    height: 860,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: '#0C0A1A',
    title: 'Gel',
    frame: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// Only one Gel at a time: opening it again brings the existing window forward
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  setupUpdates();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (!IS_MAC) app.quit(); });
