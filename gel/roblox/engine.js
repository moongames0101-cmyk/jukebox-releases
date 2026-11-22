// Roblox theme engine for Gel.
//
// Themes work by swapping files the Roblox Player loads from its install folder
// (fonts, cursors, sounds, textures). Nothing is injected into the running game.
//
// Two kinds of places get the theme:
//  - "install": Roblox's own install folder (%LOCALAPPDATA%\Roblox\Versions\version-…).
//    Originals are backed up first. Roblox makes a fresh folder on every update,
//    so call reapplyIfUpdated() on startup and when the Versions folder changes.
//  - "mods": launchers like Bloxstrap or ExploitStrap keep a Modifications folder
//    that they copy over Roblox every launch. The theme goes in there too, so the
//    launcher and Gel never undo each other. Your own mods in there are backed up.

const fs = require('node:fs');
const path = require('node:path');

const PLAYER_EXE = 'RobloxPlayerBeta.exe';
const CURSOR_DIR = 'content/textures/Cursors/KeyboardMouse';
const FONT_FAMILIES_DIR = 'content/fonts/families';
const CUSTOM_FONT_REL = 'content/fonts/CustomFont.ttf';
const CUSTOM_FONT_ASSET = 'rbxasset://fonts/CustomFont.ttf';
const DEATH_SOUND_REL = 'content/sounds/ouch.ogg';
const STATE_FILE = 'roblox-theme-state.json';

// generators: { backdrop({ spec, sourceDir }) => [{ rel, data }] } builds files from each
// install's own originals (used for the avatar background, which lives in a Roblox place file).
const GENERATOR_LABELS = { backdrop: 'avatar background' };

function createEngine({ localAppData = process.env.LOCALAPPDATA, dataDir, versionsDirs, generators = {} } = {}) {
  if (!dataDir) throw new Error('dataDir is required (use app.getPath("userData") in Gel).');
  const searchDirs = versionsDirs || [path.join(localAppData || '', 'Roblox', 'Versions')];
  const statePath = path.join(dataDir, STATE_FILE);

  const isDir = (p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  };

  function newestPlayerIn(dirs) {
    let best = null;
    for (const dir of dirs) {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const folder = path.join(dir, entry.name);
        // Judge by when Roblox itself was installed: old folders get touched by launchers too.
        let mtime;
        try {
          mtime = fs.statSync(path.join(folder, PLAYER_EXE)).mtimeMs;
        } catch {
          continue;
        }
        if (!best || mtime > best.mtime) best = { folder, mtime };
      }
    }
    return best ? best.folder : null;
  }

  function findPlayerFolder() {
    return newestPlayerIn(searchDirs);
  }

  // Any folder in %LOCALAPPDATA% with both Modifications and Versions is a launcher.
  function findLaunchers() {
    if (!localAppData) return [];
    let entries;
    try {
      entries = fs.readdirSync(localAppData, { withFileTypes: true });
    } catch {
      return [];
    }
    const out = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'Roblox') continue;
      const base = path.join(localAppData, entry.name);
      if (isDir(path.join(base, 'Modifications')) && isDir(path.join(base, 'Versions'))) {
        out.push({ name: entry.name, mods: path.join(base, 'Modifications'), versions: path.join(base, 'Versions') });
      }
    }
    return out;
  }

  function findTargets() {
    const targets = [];
    const player = findPlayerFolder();
    if (player) {
      targets.push({ id: 'roblox', name: 'Roblox', kind: 'install', root: player, familiesFrom: player });
    }
    for (const l of findLaunchers()) {
      targets.push({
        id: `launcher-${l.name}`,
        name: l.name,
        kind: 'mods',
        root: l.mods,
        familiesFrom: newestPlayerIn([l.versions]) || player,
      });
    }
    return targets;
  }

  function readState() {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
      return null;
    }
  }

  function writeState(state) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  function readManifest(themeDir) {
    const file = path.join(themeDir, 'theme.json');
    if (!fs.existsSync(file)) throw new Error(`No theme.json in "${path.basename(themeDir)}".`);
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      throw new Error(`Couldn't read ${file}: ${err.message}`);
    }
  }

  // Resolve a path from a theme, refusing anything that escapes its folder.
  function inside(base, rel, what) {
    const full = path.resolve(base, rel);
    const relToBase = path.relative(path.resolve(base), full);
    if (relToBase.startsWith('..') || path.isAbsolute(relToBase)) {
      throw new Error(`${what} "${rel}" points outside its folder.`);
    }
    return full;
  }

  function themeFile(themeDir, rel, field) {
    const full = inside(themeDir, rel, `Theme field "${field}"`);
    if (!fs.existsSync(full)) throw new Error(`Theme file for "${field}" not found: ${rel}`);
    return full;
  }

  function walk(dir, base = dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, base, out);
      else out.push(path.relative(base, full).split(path.sep).join('/'));
    }
    return out;
  }

  // Every file the theme needs to write, worked out without touching Roblox.
  function planFiles(themeDir, manifest) {
    const files = [];
    if (manifest.deathSound) {
      files.push({ rel: DEATH_SOUND_REL, source: themeFile(themeDir, manifest.deathSound, 'deathSound') });
    }
    if (manifest.cursor) {
      const cursor = typeof manifest.cursor === 'string'
        ? { arrow: manifest.cursor, arrowFar: manifest.cursor }
        : manifest.cursor;
      if (cursor.arrow) files.push({ rel: `${CURSOR_DIR}/ArrowCursor.png`, source: themeFile(themeDir, cursor.arrow, 'cursor') });
      if (cursor.arrowFar) files.push({ rel: `${CURSOR_DIR}/ArrowFarCursor.png`, source: themeFile(themeDir, cursor.arrowFar, 'cursor') });
    }
    if (manifest.font) {
      files.push({ rel: CUSTOM_FONT_REL, source: themeFile(themeDir, manifest.font, 'font'), font: true });
    }
    const overlay = path.join(themeDir, 'files');
    if (fs.existsSync(overlay)) {
      for (const rel of walk(overlay)) files.push({ rel, source: path.join(overlay, rel) });
    }
    return files;
  }

  // Point every font family Roblox ships at the theme's font.
  function fontFamilyFiles(playerDir) {
    if (!playerDir) return [];
    const dir = path.join(playerDir, FONT_FAMILIES_DIR);
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      let family;
      try {
        family = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      } catch {
        continue;
      }
      if (!Array.isArray(family.faces)) continue;
      for (const face of family.faces) face.assetId = CUSTOM_FONT_ASSET;
      out.push({ rel: `${FONT_FAMILIES_DIR}/${name}`, data: JSON.stringify(family, null, 2) });
    }
    return out;
  }

  // After taking out a file Gel added, also take out folders that are now empty, up to root.
  function removeEmptyDirs(dir, root) {
    const stop = path.resolve(root);
    let d = path.resolve(dir);
    while (d.startsWith(stop + path.sep)) {
      try {
        if (fs.readdirSync(d).length) return;
        fs.rmdirSync(d);
      } catch {
        return;
      }
      d = path.dirname(d);
    }
  }

  function restore() {
    const state = readState();
    if (!state) return;
    for (const target of state.targets || []) {
      const backupDir = path.join(dataDir, 'backups', target.id);
      if (fs.existsSync(target.root)) {
        for (const file of target.files) {
          const dest = path.join(target.root, file.rel);
          if (file.hadOriginal) {
            const backup = path.join(backupDir, file.rel);
            if (fs.existsSync(backup)) fs.copyFileSync(backup, dest);
          } else {
            fs.rmSync(dest, { force: true });
            removeEmptyDirs(path.dirname(dest), target.root);
          }
        }
      }
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.rmSync(statePath, { force: true });
  }

  function applyTheme(themeDir) {
    themeDir = path.resolve(themeDir);
    const manifest = readManifest(themeDir);
    const planned = planFiles(themeDir, manifest);

    const targets = findTargets();
    if (!targets.length) {
      throw new Error("Roblox Player isn't installed (no RobloxPlayerBeta.exe found). Install or open Roblox once, then try again.");
    }
    for (const t of targets) for (const f of planned) inside(t.root, f.rel, 'Theme file');

    restore();

    const usesFont = planned.some((f) => f.font);
    const player = targets.find((t) => t.kind === 'install');
    const warnings = [];
    const state = {
      themeDir,
      themeName: manifest.name || path.basename(themeDir),
      version: player ? path.basename(player.root) : null,
      targets: [],
      warnings,
    };

    // Generated parts: read their spec once, then build per install from its own originals.
    const generated = [];
    for (const [key, build] of Object.entries(generators)) {
      if (!manifest[key]) continue;
      const label = GENERATOR_LABELS[key] || key;
      try {
        generated.push({ key, label, build, spec: JSON.parse(fs.readFileSync(themeFile(themeDir, manifest[key], key), 'utf8')) });
      } catch (err) {
        warnings.push(`Gel skipped the ${label}: ${err.message}`);
      }
    }
    const generate = (target) => {
      const out = [];
      for (const g of generated) {
        try {
          const files = g.build({ spec: g.spec, sourceDir: target.familiesFrom }) || [];
          for (const f of files) inside(target.root, f.rel, 'Generated file');
          out.push(...files);
        } catch (err) {
          const msg = `Gel skipped the ${g.label}: ${err.message}`;
          if (!warnings.includes(msg)) warnings.push(msg);
        }
      }
      return out;
    };

    for (const target of targets) {
      const writes = [...planned, ...(usesFont ? fontFamilyFiles(target.familiesFrom) : []), ...generate(target)];
      const backupDir = path.join(dataDir, 'backups', target.id);
      const record = { id: target.id, name: target.name, kind: target.kind, root: target.root, files: [] };
      state.targets.push(record);
      for (const file of writes) {
        const dest = path.join(target.root, file.rel);
        const hadOriginal = fs.existsSync(dest);
        if (hadOriginal) {
          const backup = path.join(backupDir, file.rel);
          fs.mkdirSync(path.dirname(backup), { recursive: true });
          fs.copyFileSync(dest, backup);
        }
        record.files.push({ rel: file.rel, hadOriginal });
        // Save progress after each file so a crash halfway can still be undone.
        writeState(state);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (file.source) fs.copyFileSync(file.source, dest);
        else fs.writeFileSync(dest, file.data);
      }
    }
    writeState(state);
    return Object.assign(getStatus(), { warnings });
  }

  // Roblox's own install moves to a new folder on every update. Launchers' mods
  // folders don't, so only the install decides whether to reapply.
  function reapplyIfUpdated() {
    const state = readState();
    if (!state) return false;
    const player = findPlayerFolder();
    if (!player) return false;
    const recorded = (state.targets || []).find((t) => t.kind === 'install');
    if (recorded && recorded.root === player) return false;
    applyTheme(state.themeDir);
    return true;
  }

  function getStatus() {
    const state = readState();
    const targets = findTargets();
    const player = targets.find((t) => t.kind === 'install');
    return {
      installed: targets.length > 0,
      playerFolder: player ? player.root : null,
      targets: targets.map(({ id, name, kind }) => ({ id, name, kind })),
      theme: state ? state.themeName : null,
      themeDir: state ? state.themeDir : null,
      version: state && state.version ? state.version : player ? path.basename(player.root) : null,
      warnings: state && state.warnings ? state.warnings : [],
    };
  }

  function listThemes(themesDir) {
    let entries;
    try {
      entries = fs.readdirSync(themesDir, { withFileTypes: true });
    } catch {
      return [];
    }
    const themes = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(themesDir, entry.name);
      if (!fs.existsSync(path.join(dir, 'theme.json'))) continue;
      try {
        const m = readManifest(dir);
        themes.push({
          id: entry.name,
          dir,
          name: m.name || entry.name,
          description: m.description || '',
          author: m.author || '',
          preview: m.preview ? path.join(dir, m.preview) : null,
          parts: ['font', 'cursor', 'deathSound'].filter((k) => m[k])
            .concat(fs.existsSync(path.join(dir, 'files')) ? ['files'] : []),
        });
      } catch {
        // Skip themes with a broken theme.json instead of failing the whole list.
      }
    }
    return themes;
  }

  return { findPlayerFolder, findTargets, applyTheme, restore, reapplyIfUpdated, getStatus, listThemes };
}

module.exports = { createEngine };
