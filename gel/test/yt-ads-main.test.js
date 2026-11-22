const { test } = require('node:test');
const assert = require('node:assert/strict');
const main = require('../src/youtube/extension/gel-ads-main.js');

const playerResponse = () => ({
  videoDetails: { videoId: 'abc', title: 'A video' },
  streamingData: { formats: [1, 2] },
  adPlacements: [{ adPlacementRenderer: {} }],
  playerAds: [{ playerLegacyDesktopWatchAdsRenderer: {} }],
  adSlots: [{ adSlotRenderer: {} }],
  adBreakHeartbeatParams: 'xyz',
  auxiliaryUi: { messageRenderers: { bkaEnforcementMessageViewModel: { title: 'Ad blockers are not allowed' }, other: 1 } },
});

test('prune takes every ad out of a player response and keeps the video', () => {
  const r = main.prune(playerResponse());
  for (const k of ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams']) assert.equal(k in r, false, k);
  assert.deepEqual(r.videoDetails, { videoId: 'abc', title: 'A video' });
  assert.deepEqual(r.streamingData, { formats: [1, 2] });
});

test('prune removes the "ad blockers are not allowed" message', () => {
  const r = main.prune(playerResponse());
  assert.equal('bkaEnforcementMessageViewModel' in r.auxiliaryUi.messageRenderers, false);
  assert.equal(r.auxiliaryUi.messageRenderers.other, 1);
});

test('prune finds player responses wrapped inside other responses and lists', () => {
  const wrapped = main.prune({ playerResponse: playerResponse(), response: { contents: 1 } });
  assert.equal('adPlacements' in wrapped.playerResponse, false);
  const list = main.prune([{ response: {} }, { playerResponse: playerResponse() }]);
  assert.equal('playerAds' in list[1].playerResponse, false);
});

test('prune leaves everything else alone', () => {
  assert.equal(main.prune(null), null);
  assert.equal(main.prune('text'), 'text');
  assert.deepEqual(main.prune({ contents: [{ videoRenderer: { title: 'x' } }] }), { contents: [{ videoRenderer: { title: 'x' } }] });
});

// A pretend page: just enough of window for install().
function fakePage({ attr = null, cache = null } = {}) {
  class Response { constructor(body) { this.body = body; } json() { return Promise.resolve(JSON.parse(this.body)); } }
  const attrs = { 'gel-ads': attr };
  const win = {
    JSON: { parse: JSON.parse, stringify: JSON.stringify },
    Response,
    document: { documentElement: { getAttribute: (k) => (k in attrs ? attrs[k] : null) } },
    localStorage: { getItem: (k) => (k === 'gel-yt-cache-v1' ? cache : null) },
  };
  return { win, attrs };
}
const cacheWith = (adblock) => JSON.stringify({ raw: JSON.stringify({ enabled: false, adblock }) });

test('when ads are switched on, YouTube never sees ads in what it reads', async () => {
  const { win } = fakePage({ attr: 'on' });
  main.install(win);
  assert.equal('adPlacements' in win.JSON.parse(JSON.stringify(playerResponse())), false);
  const viaFetch = await new win.Response(JSON.stringify(playerResponse())).json();
  assert.equal('playerAds' in viaFetch, false);
  win.ytInitialPlayerResponse = playerResponse();
  assert.equal('adSlots' in win.ytInitialPlayerResponse, false);
  assert.equal(win.ytInitialPlayerResponse.videoDetails.videoId, 'abc');
});

test('when ads are switched off, nothing is changed', async () => {
  const { win } = fakePage({ attr: 'off' });
  main.install(win);
  assert.equal('adPlacements' in win.JSON.parse(JSON.stringify(playerResponse())), true);
  win.ytInitialPlayerResponse = playerResponse();
  assert.equal('adPlacements' in win.ytInitialPlayerResponse, true);
});

test('before Gel has said anything, the last setting saved on this computer is used', () => {
  const on = fakePage({ cache: cacheWith(true) });
  main.install(on.win);
  assert.equal('adPlacements' in on.win.JSON.parse(JSON.stringify(playerResponse())), false);
  const off = fakePage({ cache: cacheWith(false) });
  main.install(off.win);
  assert.equal('adPlacements' in off.win.JSON.parse(JSON.stringify(playerResponse())), true);
});

test('turning ads off takes effect without reloading the page', () => {
  const page = fakePage({ attr: 'on' });
  main.install(page.win);
  page.attrs['gel-ads'] = 'off';
  assert.equal('adPlacements' in page.win.JSON.parse(JSON.stringify(playerResponse())), true);
});

test('JSON.parse still works normally for everything else, including revivers', () => {
  const { win } = fakePage({ attr: 'on' });
  main.install(win);
  assert.deepEqual(win.JSON.parse('[1,2,3]'), [1, 2, 3]);
  assert.equal(win.JSON.parse('{"a":2}', (k, v) => (k === 'a' ? v * 2 : v)).a, 4);
  assert.throws(() => win.JSON.parse('{nope'));
});

test('installing twice does not wrap twice', () => {
  const { win } = fakePage({ attr: 'on' });
  main.install(win);
  const first = win.JSON.parse;
  main.install(win);
  assert.equal(win.JSON.parse, first);
});
