const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/youtube/extension/yt-core.js');
const { THEMES, buildTheme } = require('../src/youtube/themes.js');

const theme = buildTheme(THEMES[0]); // Gel Glass
const pal = theme.palette;

test('parseColor reads hex, rgb, rgba and hsla', () => {
  assert.deepEqual(core.parseColor('#0f0f0f'), [15, 15, 15, 1]);
  assert.deepEqual(core.parseColor('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(core.parseColor('rgba(255, 255, 255, 0.2)'), [255, 255, 255, 0.2]);
  assert.deepEqual(core.parseColor('rgb(33 33 33)'), [33, 33, 33, 1]);
  assert.deepEqual(core.parseColor('hsla(0,0%,100%,.08)'), [255, 255, 255, 0.08]);
  assert.equal(core.parseColor('var(--x)'), null);
  assert.equal(core.parseColor('transparent'), null);
});

test('surfaces and text that change between light and dark get theme colours', () => {
  assert.equal(core.roleColor('#0f0f0f', '#fff', pal), pal.bg);
  assert.equal(core.roleColor('#212121', '#fff', pal), pal.raised);
  assert.equal(core.roleColor('#282828', '#fff', pal), pal.menu);
  assert.equal(core.roleColor('#f1f1f1', '#0f0f0f', pal), pal.text);
  assert.equal(core.roleColor('#aaa', '#606060', pal), pal.text2);
  assert.equal(core.roleColor('#3ea6ff', '#065fd4', pal), pal.link);
});

test('see-through whites become see-through text colour', () => {
  const out = core.roleColor('rgba(255,255,255,0.2)', 'rgba(0,0,0,0.1)', pal);
  const [r, g, b] = core.parseColor(pal.text);
  assert.equal(out, `rgba(${r}, ${g}, ${b}, 0.2)`);
});

test('colours that are the same in light and dark (video overlays, brand) are left alone', () => {
  assert.equal(core.roleColor('#0f0f0f', '#0f0f0f', pal), null); // static black
  assert.equal(core.roleColor('#fff', '#fff', pal), null); // text over thumbnails
  assert.equal(core.roleColor('rgba(255,255,255,0.3)', 'rgba(255,255,255,0.3)', pal), null);
});

test('unknown colours and shadows are left alone', () => {
  assert.equal(core.roleColor('#dd98ff', '#7406ac', pal), null);
  assert.equal(core.roleColor('rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', pal), null);
  assert.equal(core.roleColor('var(--a)', '#fff', pal), null);
});

test('collectVars keeps the light and dark value of each variable', () => {
  const rules = [
    { selector: ':root', decls: [['--t1', '#fff'], ['--t2', '#0f0f0f']] },
    { selector: '[dark]', decls: [['--t1', '#0f0f0f']] },
    { selector: 'html[live-chat-color-migration][dark]', decls: [['--t1', '#123456']] },
    { selector: 'ytd-masthead', decls: [['--t9', '#0f0f0f']] },
  ];
  const html = (sel) => sel === ':root' || sel === 'html' || sel === '';
  const vars = core.collectVars(rules, html);
  assert.deepEqual(vars['--t1'], { light: '#fff', dark: '#0f0f0f' });
  assert.deepEqual(vars['--t2'], { light: '#0f0f0f', dark: '#0f0f0f' });
  assert.equal(vars['--t9'], undefined);
});

test('varCss writes overrides only for the colours that should change', () => {
  const css = core.varCss({ '--t1': { light: '#fff', dark: '#0f0f0f' }, '--t2': { light: '#0f0f0f', dark: '#0f0f0f' } }, pal);
  assert.match(css, new RegExp(`--t1: ${pal.bg} !important`));
  assert.doesNotMatch(css, /--t2/);
  assert.match(css, /^html, \[dark\], \[light\] \{/);
});

test('pageCss makes YouTube see-through, colours the progress bar and applies the font', () => {
  const css = core.pageCss(theme, { frame: 'top' });
  assert.match(css, /ytd-app[^{]*\{[^}]*background: transparent !important/);
  assert.match(css, /\.ytp-play-progress/);
  assert.ok(css.includes(pal.accent));
  assert.ok(css.includes("'Gel Outfit'"));
});

test('pageCss hides Shorts and sets videos per row only when asked', () => {
  const plain = core.pageCss(theme, { frame: 'top' });
  assert.doesNotMatch(plain, /grid-shelf-view-model:has/);
  assert.doesNotMatch(plain, /--ytd-rich-grid-items-per-row/);
  const t2 = buildTheme(THEMES[0], { layout: { hideShorts: true, perRow: 5 } });
  const css = core.pageCss(t2, { frame: 'top' });
  assert.match(css, /grid-shelf-view-model:has[^{]*\{ display: none !important/);
  assert.match(css, /--ytd-rich-grid-items-per-row: 5 !important/);
});

test('pageCss hides YouTube logo only when the logo is replaced', () => {
  assert.doesNotMatch(core.pageCss(theme, { frame: 'top' }), /#logo-icon/);
  const t2 = buildTheme(THEMES[0], { logo: { mode: 'text', text: 'Moon' } });
  assert.match(core.pageCss(t2, { frame: 'top' }), /#logo-icon[^{]*\{[^}]*display: none/);
});

test('pageCss in the live chat frame skips the page background', () => {
  const css = core.pageCss(theme, { frame: 'chat' });
  assert.doesNotMatch(css, /#gel-yt-bg/);
});

test('logoModel describes what goes in the corner', () => {
  assert.equal(core.logoModel(theme.logo), null);
  assert.deepEqual(core.logoModel({ mode: 'text', text: 'Moon' }), { image: null, text: 'Moon' });
  assert.deepEqual(core.logoModel({ mode: 'emblem', image: 'logo.png', text: '' }), { image: 'logo.png', text: '' });
  assert.deepEqual(core.logoModel({ mode: 'hidden' }), { image: null, text: '' });
  assert.deepEqual(core.logoModel({ mode: 'text', text: '   ' }), { image: null, text: 'YouTube' });
});

test('every theme builds CSS without errors and has readable text', () => {
  assert.ok(THEMES.length >= 15);
  for (const t of THEMES) {
    const th = buildTheme(t);
    const css = core.pageCss(th, { frame: 'top' });
    assert.ok(css.length > 500, t.id);
    assert.ok(require('../src/youtube/themes.js').contrast(th.palette.text, th.palette.bg) >= 7, t.id);
    assert.ok(th.effect && th.effect.id, t.id);
  }
});

test('buildTheme ignores colours that are not colours', () => {
  const t = buildTheme(THEMES[0], { seeds: { accent: 'banana', bg: '#123456' } });
  assert.equal(t.palette.accent, '#FF5FA2');
  assert.equal(t.palette.bg, '#123456');
});

test('the video player and its menus follow the theme', () => {
  const css = core.pageCss(theme, { frame: 'top' });
  for (const sel of ['.ytp-volume-slider-handle', '.ytp-large-play-button', '.ytp-autonav-toggle-button[aria-checked="true"]', '.ytp-popup', '.ytp-menuitem:hover', '.ytp-tooltip-text']) {
    assert.ok(css.includes(sel), sel);
  }
  assert.match(css, /\.ytp-popup[^{]*\{[^}]*backdrop-filter/);
});

test('cinema mode is on by default and dims everything but the player', () => {
  assert.equal(require('../src/youtube/themes.js').defaultLayout().cinema, true);
  const css = core.pageCss(theme, { frame: 'top' });
  const dim = css.split('\n').filter((l) => l.startsWith('html.gel-cinema') && /opacity: 0\.15/.test(l));
  assert.ok(dim.length > 0, 'has a dimming rule');
  for (const l of dim) {
    for (const part of l.split('{')[0].split(',')) assert.doesNotMatch(part, /movie_player|ytd-player|#player\b/, part);
  }
  assert.match(css, /html\.gel-cinema[^{]*#movie_player[^{]*\{[^}]*box-shadow/);
});

test('cinema mode can be switched off', () => {
  const off = buildTheme(THEMES[0], { layout: { cinema: false } });
  assert.doesNotMatch(core.pageCss(off, { frame: 'top' }), /gel-cinema/);
});

test('the search box gets a glowing accent ring when you type in it', () => {
  const css = core.pageCss(theme, { frame: 'top' });
  assert.match(css, /ytSearchboxComponentInputBoxHasFocus[^{]*\{[^}]*box-shadow[^}]*255, 95, 162/);
  assert.match(css, /ytSearchboxComponentSearchButton[^{]*\{[^}]*linear-gradient/);
});

test('the selected filter chip and Subscribe use the accent gradient', () => {
  const css = core.pageCss(theme, { frame: 'top' });
  assert.match(css, /ytChipShapeActive[^{]*\{[^}]*linear-gradient\(135deg, #FF5FA2, #9B6BFF\)/);
  assert.match(css, /ytd-subscribe-button-renderer[^{]*\{[^}]*linear-gradient\(135deg, #FF5FA2, #9B6BFF\)/);
});

test('the volume boost panel gets the theme colours and fonts', () => {
  const css = core.pageCss(theme, { frame: 'top' });
  assert.match(css, /:root \{[^}]*--gel-on-accent: #06050D;/);
  assert.match(css, /:root \{[^}]*--gel-menu: #2D2A3A;/);
  assert.match(css, /\.gel-boost-pop[^{]*\{[^}]*font-family: 'Gel Outfit'/);
});
