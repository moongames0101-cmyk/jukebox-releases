const { test } = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

// Other Electron apps (the Claude app, code editors) open any .asar file they come across and
// keep it open, which stops Gel's updater from moving the old version out of the way
// ("Failed to uninstall old application files"). Shipping plain files avoids that.
test('Gel installs as plain files, not an app.asar archive', () => {
  assert.equal(pkg.build.asar, false);
});

test('the installer includes every part of Gel', () => {
  for (const f of ['main.js', 'preload.js', 'src/**/*', 'roblox/**/*', 'youtube/**/*']) assert.ok(pkg.build.files.includes(f), f);
});
