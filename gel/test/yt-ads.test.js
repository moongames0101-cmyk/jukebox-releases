const { test } = require('node:test');
const assert = require('node:assert/strict');
const ads = require('../src/youtube/extension/gel-ads.js');

const idle = { inAd: false, wasMuted: false, wasRate: 1 };
const adFrame = (o) => Object.assign({ ad: true, muted: false, rate: 1, time: 0.4, duration: 15, bufferedEnd: 15, paused: false, skipButton: false }, o);
const videoFrame = (o) => Object.assign({ ad: false, muted: false, rate: 1, time: 3, duration: 240, paused: false, skipButton: false }, o);

test('an ad is muted, sped up, jumped to its end and covered', () => {
  const { state, act } = ads.decide(idle, adFrame());
  assert.equal(state.inAd, true);
  assert.equal(act.mute, true);
  assert.equal(act.rate, 16);
  assert.equal(act.seek, 15);
  assert.equal(act.cover, true);
});

test('the Skip button is pressed as soon as it shows', () => {
  assert.equal(ads.decide(idle, adFrame({ skipButton: true })).act.clickSkip, true);
  assert.equal(ads.decide(idle, adFrame()).act.clickSkip, false);
});

test('an ad whose length is not known yet is not jumped', () => {
  assert.equal(ads.decide(idle, adFrame({ duration: NaN })).act.seek, null);
  assert.equal(ads.decide(idle, adFrame({ duration: 0 })).act.seek, null);
});

test('an ad that has only partly loaded is jumped to the end of what has loaded', () => {
  assert.equal(ads.decide(idle, adFrame({ duration: 20, bufferedEnd: 6, time: 0.4 })).act.seek, 5.85);
  assert.equal(ads.decide(idle, adFrame({ duration: 20, bufferedEnd: 0.5, time: 0.4 })).act.seek, null);
});

test('a paused ad is played so it can finish', () => {
  assert.equal(ads.decide(idle, adFrame({ paused: true })).act.play, true);
});

test('the player turning sound back on mid-ad is muted again', () => {
  const first = ads.decide(idle, adFrame());
  const again = ads.decide(first.state, adFrame({ muted: false, rate: 1, time: 0, duration: 64, bufferedEnd: 64 }));
  assert.equal(again.act.mute, true);
  assert.equal(again.act.rate, 16);
  assert.equal(again.act.seek, 64);
  assert.equal(again.state.wasMuted, false); // remembers how it was before the first ad
});

test('after the ad, sound and speed go back to how they were', () => {
  const inAd = ads.decide(idle, adFrame({ muted: false, rate: 1.5 })).state;
  const { state, act } = ads.decide(inAd, videoFrame({ muted: true, rate: 16 }));
  assert.equal(state.inAd, false);
  assert.equal(act.mute, false);
  assert.equal(act.rate, 1.5);
  assert.equal(act.cover, false);
});

test('someone who had YouTube muted stays muted after the ad', () => {
  const inAd = ads.decide(idle, adFrame({ muted: true })).state;
  assert.equal(ads.decide(inAd, videoFrame({ muted: true, rate: 16 })).act.mute, true);
});

test('the speed is left alone after the ad if YouTube already reset it', () => {
  const inAd = ads.decide(idle, adFrame({ rate: 1.25 })).state;
  assert.equal(ads.decide(inAd, videoFrame({ rate: 1.25 })).act.rate, null);
});

test('normal videos are never touched', () => {
  const { state, act } = ads.decide(idle, videoFrame({ muted: true, rate: 2, paused: true }));
  assert.deepEqual(state, idle);
  assert.deepEqual(act, { mute: null, rate: null, seek: null, play: false, clickSkip: false, cover: null });
});

test('the hiding rules cover sponsored cards, search ads, banners and video overlays', () => {
  const css = ads.adCss();
  for (const sel of ['ytd-ad-slot-renderer', 'ytd-in-feed-ad-layout-renderer', 'ytd-search-pyv-renderer', '#masthead-ad',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)', '#player-ads', '.ytp-ad-overlay-container', 'ytd-merch-shelf-renderer']) {
    assert.ok(css.includes(sel), sel);
  }
  assert.match(css, /\{ display: none !important; \}/);
});
