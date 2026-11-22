/* Gel for YouTube: takes ads out of YouTube's video data before its player reads it, so
   ads never load. Runs inside the page itself (Chrome's "MAIN" world) as the page starts.
   Gel's other script tells it whether ads are switched on through the gel-ads attribute
   on <html>; until then it goes by the last setting saved on this computer. */
(function () {
  'use strict';

  var AD_KEYS = ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams'];
  var CACHE_KEY = 'gel-yt-cache-v1';
  var MARK = '__gelAdsInstalled';

  function pruneOne(o) {
    if (!o || typeof o !== 'object') return;
    for (var i = 0; i < AD_KEYS.length; i++) if (AD_KEYS[i] in o) delete o[AD_KEYS[i]];
    var mr = o.auxiliaryUi && o.auxiliaryUi.messageRenderers;
    if (mr && typeof mr === 'object' && 'bkaEnforcementMessageViewModel' in mr) delete mr.bkaEnforcementMessageViewModel;
  }

  // Strips ads from a player response, one wrapped in { playerResponse }, or a list of them.
  function prune(data) {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) { for (var i = 0; i < data.length; i++) prune(data[i]); return data; }
    pruneOne(data);
    if (data.playerResponse) pruneOne(data.playerResponse);
    if (data.response && data.response.playerResponse) pruneOne(data.response.playerResponse);
    return data;
  }

  function install(win) {
    if (!win || win[MARK]) return;
    try { Object.defineProperty(win, MARK, { value: true }); } catch (e) { win[MARK] = true; }

    var saved = false;
    try {
      var c = JSON.parse(win.localStorage.getItem(CACHE_KEY) || 'null');
      saved = !!(c && c.raw && JSON.parse(c.raw).adblock);
    } catch (e) { /* nothing saved */ }
    function on() {
      var a = win.document && win.document.documentElement && win.document.documentElement.getAttribute('gel-ads');
      return a === 'on' || a === 'off' ? a === 'on' : saved;
    }

    // Wrapping keeps each function looking like the browser's own to the page.
    function wrap(obj, name, after) {
      var orig = obj && obj[name];
      if (typeof orig !== 'function') return;
      var Proxy = win.Proxy || (typeof globalThis !== 'undefined' && globalThis.Proxy);
      obj[name] = new Proxy(orig, {
        apply: function (target, self, args) {
          var result = Reflect.apply(target, self, args);
          return on() ? after(result) : result;
        },
      });
    }

    wrap(win.JSON, 'parse', prune);
    if (win.Response && win.Response.prototype) {
      wrap(win.Response.prototype, 'json', function (p) {
        return p && typeof p.then === 'function' ? p.then(function (d) { return on() ? prune(d) : d; }) : p;
      });
    }

    // The first video's data is written into the page as "var ytInitialPlayerResponse = {...}".
    ['ytInitialPlayerResponse'].forEach(function (name) {
      var value = win[name];
      try {
        Object.defineProperty(win, name, {
          configurable: true,
          enumerable: true,
          get: function () { return value; },
          set: function (v) { value = on() ? prune(v) : v; },
        });
      } catch (e) { /* the page already locked it */ }
    });
  }

  var api = { prune: prune, install: install, AD_KEYS: AD_KEYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (typeof window !== 'undefined') install(window);
})();
