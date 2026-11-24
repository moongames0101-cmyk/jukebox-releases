const { test } = require('node:test');
const assert = require('node:assert/strict');
const boost = require('../src/youtube/extension/gel-boost.js');

const ORIGIN = 'https://www.youtube.com';

// A stand-in for the browser's audio engine: records what Gel connects.
function fakeAudio(startState = 'running') {
  const made = [];
  class Param {
    constructor(v) { this.value = v; }
    setTargetAtTime(v) { this.value = v; }
    setValueAtTime(v) { this.value = v; }
    cancelScheduledValues() {}
  }
  class Node {
    constructor(kind) { this.kind = kind; this.out = []; }
    connect(n) { this.out.push(n); return n; }
  }
  class Ctx {
    constructor() { this.state = startState; this.currentTime = 0; this.destination = new Node('speakers'); this.sources = []; made.push(this); }
    createMediaElementSource(video) {
      if (video.taken) throw new Error('InvalidStateError: already connected');
      video.taken = true;
      const n = new Node('video');
      n.video = video;
      this.sources.push(n);
      return n;
    }
    createGain() { const n = new Node('gain'); n.gain = new Param(1); return n; }
    createDynamicsCompressor() {
      const n = new Node('limiter');
      n.threshold = new Param(-24); n.knee = new Param(30); n.ratio = new Param(12); n.attack = new Param(0.003); n.release = new Param(0.25);
      return n;
    }
    resume() { this.state = 'running'; if (this.onstatechange) this.onstatechange(); return Promise.resolve(); }
  }
  return { Ctx, made };
}
const video = (src = 'blob:https://www.youtube.com/7da058c6') => ({ currentSrc: src, src });
function memory(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}
const engine = (audio, storage = memory()) => boost.makeEngine({ AudioContext: audio && audio.Ctx, storage, origin: ORIGIN });
const chainOf = (ctx) => { const src = ctx.sources[0]; const gain = src.out[0]; const lim = gain.out[0]; return { src, gain, lim, dest: lim.out[0] }; };

test('levels stay between 100% and 600%, in steps of 10', () => {
  assert.equal(boost.clamp(250), 250);
  assert.equal(boost.clamp(254), 250);
  assert.equal(boost.clamp(256), 260);
  assert.equal(boost.clamp(53), 100);
  assert.equal(boost.clamp(999), 600);
  assert.equal(boost.clamp('300'), 300);
  assert.equal(boost.clamp(undefined), 100);
  assert.equal(boost.clamp(NaN), 100);
  assert.equal(boost.clamp(null), 100);
});

test('at 100% the sound passes through untouched', () => {
  const c = boost.chain(100);
  assert.equal(c.gain, 1);
  assert.equal(c.ratio, 1);
  assert.equal(c.threshold, 0);
});

test('boosting makes it louder and switches the limiter on so it does not crackle', () => {
  const c = boost.chain(300);
  assert.equal(c.gain, 3);
  assert.ok(c.ratio >= 10, 'limiter ratio');
  assert.ok(c.threshold < 0, 'limiter threshold');
  assert.equal(boost.chain(600).gain, 6);
});

test('the badge on the button says how many times louder', () => {
  assert.equal(boost.badge(100), '');
  assert.equal(boost.badge(200), '2×');
  assert.equal(boost.badge(250), '2.5×');
  assert.equal(boost.badge(110), '1.1×');
  assert.equal(boost.badge(600), '6×');
});

test('scrolling over the button moves the level 10% at a time', () => {
  assert.equal(boost.nudge(200, -100), 210);
  assert.equal(boost.nudge(200, 100), 190);
  assert.equal(boost.nudge(600, -1), 600);
  assert.equal(boost.nudge(100, 1), 100);
  assert.equal(boost.nudge(200, 0), 200);
});

test("only video YouTube streams itself is boosted (anything else would go silent)", () => {
  assert.equal(boost.safe(video(), ORIGIN), true);
  assert.equal(boost.safe(video('https://www.youtube.com/clip.mp4'), ORIGIN), true);
  assert.equal(boost.safe(video('https://rr3---sn.googlevideo.com/videoplayback?x=1'), ORIGIN), false);
  assert.equal(boost.safe(video('blob:https://evil.example/123'), ORIGIN), false);
  assert.equal(boost.safe(video(''), ORIGIN), false);
});

test('nothing is touched until you boost past 100%', () => {
  const audio = fakeAudio();
  const e = engine(audio);
  assert.equal(e.level(), 100);
  assert.equal(e.attach(video()), 'idle');
  assert.equal(audio.made.length, 0);
});

test('boosting sends the video through a gain and a limiter to the speakers', () => {
  const audio = fakeAudio();
  const e = engine(audio);
  e.set(300);
  const v = video();
  assert.equal(e.attach(v), 'on');
  const c = chainOf(audio.made[0]);
  assert.equal(c.src.video, v);
  assert.equal(c.gain.kind, 'gain');
  assert.equal(c.gain.gain.value, 3);
  assert.equal(c.lim.kind, 'limiter');
  assert.ok(c.lim.ratio.value >= 10);
  assert.equal(c.dest, audio.made[0].destination);
});

test('a video is only taken over once, and all videos share one audio engine', () => {
  const audio = fakeAudio();
  const e = engine(audio);
  e.set(200);
  const v = video();
  e.attach(v);
  assert.equal(e.attach(v), 'on');
  e.attach(video('blob:https://www.youtube.com/second'));
  assert.equal(audio.made.length, 1);
  assert.equal(audio.made[0].sources.length, 2);
});

test('changing the level changes videos that are already boosted', () => {
  const audio = fakeAudio();
  const e = engine(audio);
  e.set(300);
  e.attach(video());
  const c = chainOf(audio.made[0]);
  e.set(150);
  assert.equal(c.gain.gain.value, 1.5);
  e.set(100);
  assert.equal(c.gain.gain.value, 1);
  assert.equal(c.lim.ratio.value, 1);
  assert.equal(c.lim.threshold.value, 0);
});

test('the level is remembered for the next video and the next visit', () => {
  const store = memory();
  engine(fakeAudio(), store).set(250);
  assert.equal(store.map.get('gel-yt-boost'), '250');
  assert.equal(engine(fakeAudio(), store).level(), 250);
});

test('a broken saved level starts at 100%', () => {
  assert.equal(engine(fakeAudio(), memory({ 'gel-yt-boost': 'loud' })).level(), 100);
  assert.equal(engine(fakeAudio(), memory({ 'gel-yt-boost': '9000' })).level(), 600);
});

test('a blocked storage does not stop the booster', () => {
  const store = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const e = engine(fakeAudio(), store);
  assert.equal(e.level(), 100);
  assert.equal(e.set(300), 300);
  assert.equal(e.attach(video()), 'on');
});

test("before you've clicked the page the boost waits, and the video keeps its normal sound", async () => {
  const audio = fakeAudio('suspended');
  const e = engine(audio);
  e.set(300);
  const v = video();
  assert.equal(e.attach(v), 'waiting');
  assert.equal(e.status(), 'waiting');
  assert.equal(v.taken, undefined, 'the video must not be routed into a silent engine');
  await e.resume();
  assert.equal(e.attach(v), 'on');
  assert.equal(e.status(), 'on');
});

test('a video another extension already took over is reported, not broken', () => {
  const e = engine(fakeAudio());
  e.set(200);
  const v = video();
  v.taken = true;
  assert.equal(e.attach(v), 'failed');
  assert.equal(e.status(), 'failed');
});

test('video streamed from somewhere else is left alone', () => {
  const audio = fakeAudio();
  const e = engine(audio);
  e.set(200);
  assert.equal(e.attach(video('https://rr3---sn.googlevideo.com/videoplayback')), 'later');
  assert.equal(audio.made.length, 0);
});

test('switching the booster off in Gel puts the sound back, and on again brings the level back', () => {
  const audio = fakeAudio();
  const store = memory();
  const e = engine(audio, store);
  e.set(300);
  e.attach(video());
  const c = chainOf(audio.made[0]);
  e.bypass(true);
  assert.equal(c.gain.gain.value, 1);
  assert.equal(c.lim.ratio.value, 1);
  assert.equal(e.attach(video('blob:https://www.youtube.com/other')), 'idle');
  assert.equal(store.map.get('gel-yt-boost'), '300');
  e.bypass(false);
  assert.equal(c.gain.gain.value, 3);
});

test('a browser without Web Audio just reports that it cannot boost', () => {
  const e = boost.makeEngine({ AudioContext: undefined, storage: memory(), origin: ORIGIN });
  e.set(200);
  assert.equal(e.attach(video()), 'failed');
});

test('the status says what the button should show', () => {
  const e = engine(fakeAudio());
  assert.equal(e.status(), 'off');
  e.set(200);
  assert.equal(e.status(), 'ready');
  e.attach(video());
  assert.equal(e.status(), 'on');
  e.set(100);
  assert.equal(e.status(), 'off');
});
