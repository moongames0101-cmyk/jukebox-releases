const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/lib/color.js');
const T = require('../src/lib/themegen.js');
const { PRESETS } = require('../src/lib/presets.js');

const KEYS = T.COLOR_KEYS.map(k => k.key);

test('covers every colour Spicetify knows', () => {
  assert.deepStrictEqual(KEYS.slice().sort(), Object.keys(T.ORIGINAL).sort());
  assert.strictEqual(KEYS.length, 18);
});

test('generatePalette fills all 18 colours with valid hex, dark and light', () => {
  for (const mode of ['dark', 'light']) {
    const p = T.generatePalette({ mode, bg: mode === 'dark' ? '101820' : 'F4F6F8', text: mode === 'dark' ? 'EEEEEE' : '1A1A1A', accent: 'FF6EC7' });
    for (const k of KEYS) assert.match(p[k], /^[0-9A-F]{6}$/, `${mode} ${k}`);
  }
});

test('every preset is complete and readable', () => {
  assert.ok(PRESETS.length >= 10);
  const ids = new Set();
  for (const p of PRESETS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`); ids.add(p.id);
    for (const k of KEYS) assert.match(p.colors[k], /^[0-9A-F]{6}$/, `${p.id} ${k}`);
    const ratio = C.contrast(p.colors.text, p.colors.main);
    assert.ok(ratio >= 7, `${p.id} text contrast ${ratio.toFixed(2)}`);
    const sub = C.contrast(p.colors.subtext, p.colors.main);
    assert.ok(sub >= 4.5, `${p.id} subtext contrast ${sub.toFixed(2)}`);
    assert.ok(T.FONTS.some(f => f.id === p.style.font), `${p.id} font`);
  }
});

test('color.ini has one Gel section with every key', () => {
  const ini = T.buildColorIni(PRESETS[1]);
  const lines = ini.split('\r\n');
  assert.ok(lines.includes('[Gel]'));
  const kv = lines.filter(l => /^[a-z-]+\s+=\s+[0-9A-F]{6}$/.test(l));
  assert.strictEqual(kv.length, 18);
  for (const k of KEYS) assert.ok(kv.some(l => l.startsWith(k + ' ') || l.startsWith(k + '=')), k);
  assert.strictEqual(lines.filter(l => /^\[/.test(l)).length, 1);
});

test('color.ini survives bad input', () => {
  const ini = T.buildColorIni({ name: 'Bad\nname', colors: { main: 'zzz', text: '#abc' } });
  assert.ok(ini.includes('text               = AABBCC') || /text\s+= AABBCC/.test(ini));
  assert.ok(/main\s+= 121212/.test(ini));
  assert.ok(!/Bad\nname/.test(ini));
});

test('user.css: colours only by default', () => {
  const css = T.buildUserCss({ name: 'Plain', colors: T.ORIGINAL, style: T.defaultStyle() });
  assert.ok(!css.includes('@import'));
  assert.ok(!css.includes('Root__top-container'));
  assert.ok(css.includes('Colours only'));
});

test('user.css: font import comes first, and family is applied', () => {
  const css = T.buildUserCss({ name: 'F', colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { font: 'Space Grotesk' }) });
  assert.ok(css.startsWith('@import url("https://fonts.googleapis.com/css?family=Space+Grotesk:400,500,700,800,900&display=swap");'));
  assert.ok(css.includes('font-family: "Space Grotesk"'));
});

test('user.css: custom font is sanitised and not imported', () => {
  const css = T.buildUserCss({ name: 'F', colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { font: 'custom', customFont: 'Segoe UI"; } body{x' }) });
  assert.ok(!css.includes('@import'));
  assert.ok(css.includes('font-family: "Segoe UI  bodyx"'));
});

test('user.css: roundness, glow and picture blocks', () => {
  const img = 'data:image/jpeg;base64,' + Buffer.from('fake').toString('base64');
  const css = T.buildUserCss({ name: 'All', colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { radius: 16, glow: true, bgImage: img, bgBlur: 10, bgDim: 0.4, panelOpacity: 0.6 }) });
  assert.ok(css.includes('border-radius: 16px !important'));
  assert.ok(css.includes('control-button-playpause'));
  assert.ok(css.includes(img));
  assert.ok(css.includes('--spice-main: rgba(18,18,18, 0.60) !important'));
  assert.ok(css.includes('backdrop-filter: blur(10px)'));
  assert.ok(css.includes('rgba(0,0,0, 0.40)'));
});

test('user.css: rejects a background that is not an image data URL', () => {
  const css = T.buildUserCss({ name: 'X', colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { bgImage: 'https://evil.example/x.png") ; } * { display:none' }) });
  assert.ok(!css.includes('evil.example'));
});

test('user.css: braces are balanced for every preset', () => {
  for (const p of PRESETS) {
    const css = T.buildUserCss(Object.assign({}, p, { style: Object.assign({}, p.style, { radius: 12, glow: true }) }));
    const open = (css.match(/{/g) || []).length, close = (css.match(/}/g) || []).length;
    assert.strictEqual(open, close, p.id);
  }
});

const FX = require('../src/lib/fx.js');

test('theme.js is empty when there is no animation', () => {
  assert.strictEqual(T.buildThemeJs({ colors: T.ORIGINAL, style: T.defaultStyle() }), '');
});

test('theme.js for every effect is valid, standalone JavaScript', () => {
  for (const { id } of FX.EFFECTS.filter(e => e.id !== 'none')) {
    const js = T.buildThemeJs({ colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { fx: { effect: id } }) });
    assert.ok(js.includes(`"effect":"${id}"`), id);
    assert.doesNotThrow(() => new Function(js), id);
    assert.ok(!/Gel\.|require\(/.test(js), `${id} must not depend on Gel's own code`);
  }
});

test('Sakura falls with pink petals by default', () => {
  const sakura = PRESETS.find(p => p.id === 'sakura');
  assert.strictEqual(sakura.style.fx.effect, 'petals');
  const cfg = FX.engineConfig(sakura.colors, sakura.style.fx);
  for (const c of cfg.colors) {
    const { h } = C.rgbToHsl(C.hexToRgb(c));
    assert.ok(h > 320 || h < 10, `${c} should be pink, hue ${h}`);
  }
});

test('user.css: animation layer in front vs behind', () => {
  const over = T.buildUserCss({ name: 'o', colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { fx: { effect: 'snow', layer: 'over' } }) });
  assert.ok(over.includes('z-index: 9999'));
  assert.ok(!over.includes('See-through panels'));
  const behind = T.buildUserCss({ name: 'b', colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { fx: { effect: 'snow', layer: 'behind' } }) });
  assert.ok(behind.includes('z-index: -1'));
  assert.ok(behind.includes('See-through panels'));
  assert.ok(behind.includes('html { background-color: #000000 !important; }'));
  assert.ok(behind.includes('.Root__top-container { background-color: transparent !important'));
  const open = (behind.match(/{/g) || []).length, close = (behind.match(/}/g) || []).length;
  assert.strictEqual(open, close);
});

test('sanitizeFx clamps silly values', () => {
  const f = FX.sanitizeFx({ effect: 'lasers', amount: 99, speed: -3, layer: 'sideways', color: 'nope' });
  assert.deepStrictEqual(f, { effect: 'none', amount: 1, speed: 0.4, layer: 'over', color: null });
});

const { GROUPS } = require('../src/lib/presets.js');

test('lots of themes, each in a known group, with valid fonts', () => {
  assert.ok(PRESETS.length >= 45, `only ${PRESETS.length} themes`);
  for (const g of GROUPS) assert.ok(PRESETS.filter(p => p.group === g.id).length >= 5, g.id);
  for (const p of PRESETS) {
    assert.ok(GROUPS.some(g => g.id === p.group), `${p.id} group`);
    assert.ok(p.style.headingFont === 'same' || T.isWebFont(p.style.headingFont), `${p.id} heading font`);
  }
  assert.ok(PRESETS.filter(p => p.group === 'anime').length >= 12);
});

test('heading font gets its own import and rule, after the main font', () => {
  const css = T.buildUserCss({ name: 'h', colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { font: 'Nunito', headingFont: 'Dela Gothic One' }) });
  const imports = css.split('\n').filter(l => l.startsWith('@import'));
  assert.strictEqual(imports.length, 2);
  assert.ok(css.indexOf('/* Heading font */') > css.indexOf('/* Font */'));
  assert.ok(css.includes('font-family: "Dela Gothic One", "Nunito",'));
  const same = T.buildUserCss({ name: 's', colors: T.ORIGINAL, style: Object.assign(T.defaultStyle(), { font: 'Inter', headingFont: 'Inter' }) });
  assert.strictEqual(same.split('\n').filter(l => l.startsWith('@import')).length, 1);
  const bogus = T.sanitizeStyle({ headingFont: 'Comic Sans"; }' });
  assert.strictEqual(bogus.headingFont, 'same');
});

test('every preset builds balanced CSS and runnable theme.js', () => {
  for (const p of PRESETS) {
    const css = T.buildUserCss(p);
    assert.strictEqual((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, p.id);
    const js = T.buildThemeJs(p);
    if (p.style.fx.effect === 'none') assert.strictEqual(js, '', p.id);
    else assert.doesNotThrow(() => new Function(js), p.id);
  }
});
