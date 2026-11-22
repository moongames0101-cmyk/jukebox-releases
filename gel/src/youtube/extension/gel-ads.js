/* Gel for YouTube: hides ads, and skips any video ad that still gets through.
   gel-ads-main.js takes ads out of YouTube's video data so they don't load at all. This
   script hides sponsored cards and banners, and if an ad does start (YouTube sometimes
   changes how it sends them) it is muted, covered, jumped to its end and skipped. */
(function (root) {
  'use strict';

  // Everything that is an ad (or a YouTube Premium upsell) outside the video itself.
  var HIDE = [
    'ytd-ad-slot-renderer',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-search-pyv-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-promoted-video-renderer',
    'ytd-compact-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-banner-promo-renderer',
    '#masthead-ad',
    'ytd-primetime-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)',
    'ytd-brand-video-shelf-renderer',
    'ytd-brand-video-singleton-renderer',
    '#player-ads',
    'ytd-companion-slot-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-ads-engagement-panel-content-renderer',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-image-overlay',
    'ytd-merch-shelf-renderer',
    'yt-mealbar-promo-renderer',
  ];

  function adCss() {
    return HIDE.join(',\n') + ' { display: none !important; }\n' +
      '.gel-ad-cover { position: absolute; inset: 0; z-index: 2000; display: grid; place-items: center; pointer-events: none;' +
      ' background: radial-gradient(60% 60% at 50% 45%, color-mix(in srgb, var(--gel-accent, #9B6BFF) 30%, #000), #000);' +
      ' color: #fff; font: 600 15px/1.3 var(--gel-font, Roboto, Arial, sans-serif); letter-spacing: .2px; }\n' +
      '.gel-ad-cover span { padding: 8px 16px; border-radius: 999px; background: rgba(255,255,255,.1); }\n' +
      '#movie_player.ad-showing .ytp-ad-module, #movie_player.ad-showing .ytp-ad-player-overlay-layout { opacity: 0 !important; }\n';
  }

  // One step of the skipper. frame: what the player looks like now.
  // Returns the new state and what to do (null means leave it alone).
  function decide(state, frame) {
    var act = { mute: null, rate: null, seek: null, play: false, clickSkip: false, cover: null };
    if (frame.ad) {
      var next = state.inAd ? state : { inAd: true, wasMuted: !!frame.muted, wasRate: frame.rate === 16 ? 1 : (frame.rate || 1) };
      if (!frame.muted) act.mute = true;
      if (frame.rate !== 16) act.rate = 16;
      // Jump to the end of what has loaded: jumping past it makes the player stop and wait.
      if (isFinite(frame.duration) && frame.duration > 0) {
        var loaded = frame.bufferedEnd || 0;
        var target = loaded >= frame.duration - 0.15 ? frame.duration : Math.round((loaded - 0.15) * 1000) / 1000;
        if (target > frame.time + 0.3) act.seek = target;
      }
      act.play = !!frame.paused;
      act.clickSkip = !!frame.skipButton;
      act.cover = true;
      if (!state.inAd) act.mute = true; // first frame of an ad: always make sure it's silent
      return { state: next, act: act };
    }
    if (state.inAd) {
      act.mute = state.wasMuted;
      if (frame.rate === 16) act.rate = state.wasRate;
      act.cover = false;
      return { state: { inAd: false, wasMuted: false, wasRate: 1 }, act: act };
    }
    return { state: state, act: act };
  }

  var SKIP = '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button, .videoAdUiSkipButton';

  // Runs the skipper and the hiding rules on the page, and tells gel-ads-main.js (which
  // takes ads out of YouTube's video data) to do its part. Returns { stop() }.
  function start(doc) {
    doc = doc || root.document;
    doc.documentElement.setAttribute('gel-ads', 'on');
    var style = doc.createElement('style');
    style.id = 'gel-yt-ads';
    style.textContent = adCss();
    (doc.head || doc.documentElement).appendChild(style);
    var state = { inAd: false, wasMuted: false, wasRate: 1 };
    var watched = null, observer = null;

    function cover(player, on) {
      var el = player.querySelector(':scope > .gel-ad-cover');
      if (on && !el) {
        el = doc.createElement('div');
        el.className = 'gel-ad-cover';
        var t = doc.createElement('span');
        t.textContent = 'Gel is skipping an ad…';
        el.appendChild(t);
        player.appendChild(el);
      } else if (!on && el) el.remove();
    }

    function tick() {
      if (!style.isConnected) (doc.head || doc.documentElement).appendChild(style);
      var player = doc.getElementById('movie_player');
      if (player !== watched) {
        if (observer) observer.disconnect();
        watched = player;
        if (player && root.MutationObserver) {
          observer = new root.MutationObserver(tick);
          observer.observe(player, { attributes: true, attributeFilter: ['class'] });
        }
      }
      if (!player) return;
      var video = player.querySelector('video');
      if (!video) return;
      var skip = player.querySelector(SKIP);
      var res = decide(state, {
        ad: player.classList.contains('ad-showing'),
        muted: video.muted, rate: video.playbackRate, time: video.currentTime, duration: video.duration,
        paused: video.paused, skipButton: !!(skip && skip.offsetParent !== null),
        bufferedEnd: video.buffered && video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0,
      });
      state = res.state;
      var a = res.act;
      try {
        if (a.mute !== null) video.muted = a.mute;
        if (a.rate !== null) video.playbackRate = a.rate;
        if (a.seek !== null) video.currentTime = a.seek;
        if (a.play) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
        if (a.clickSkip) skip.click();
      } catch (e) { /* the player changed under us; next tick tries again */ }
      if (a.cover !== null) cover(player, a.cover);
    }

    var timer = root.setInterval(tick, 150);
    tick();
    return {
      stop: function () {
        root.clearInterval(timer);
        if (observer) observer.disconnect();
        var player = doc.getElementById('movie_player');
        if (player && state.inAd) {
          var video = player.querySelector('video');
          if (video) { video.muted = state.wasMuted; if (video.playbackRate === 16) video.playbackRate = state.wasRate; }
          cover(player, false);
        }
        style.remove();
        doc.documentElement.setAttribute('gel-ads', 'off');
      },
      tick: tick,
    };
  }

  var api = { HIDE: HIDE, adCss: adCss, decide: decide, start: start };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GelYtAds = api;
})(typeof window !== 'undefined' ? window : globalThis);
