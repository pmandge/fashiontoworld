/* ============================================================
   API REQUEST DE-DUPLICATION          added 23 July 2026
   ------------------------------------------------------------
   PROBLEM (measured on the live site)
     Category pages fired /api/admitad/products THREE times
     simultaneously; the homepage fired /api/products/status
     twice. All copies started within ~1ms of each other, so
     every one missed the still-empty cache and each did the
     full database query.

     On a 1 vCPU / 512 MB droplet, concurrent duplicate queries
     are what turn a fast page into a slow one.

   FIX
     Coalesce identical in-flight GET requests to the API.
     If a request for the same URL is already in the air, later
     callers receive the SAME response instead of issuing a new
     network request.

   SAFETY
     * Only touches GET requests to api.fashiontoworld.co
     * Every caller still gets its own readable Response (clone)
     * Entries are released as soon as the request settles
     * Failures are never cached — errors propagate normally
     * Removing this file restores the previous behaviour exactly

   INSTALL
     Load BEFORE admitad-api.js. Easiest: add to the Netlify
     "before </head>" snippet:
       <script src="/public/js/api-dedupe.js"></script>

   VERIFY
     Load a category page, then in the browser console:
       window.__apiDedupe
     -> { saved: 2, ... }   any number above 0 means duplicate
        requests were prevented.
   ============================================================ */

(function () {
  'use strict';

  if (typeof window.fetch !== 'function') return;

  var API_HOST = 'api.fashiontoworld.co';

  // url -> in-flight promise
  var inflight = Object.create(null);

  // Keep a settled entry this long (ms) so near-simultaneous
  // callers still coalesce. This is de-duplication, not caching:
  // the backend already caches with a 10 minute TTL.
  var SETTLE_GRACE_MS = 250;

  var stats = { saved: 0, deduped: [], passthrough: 0 };
  window.__apiDedupe = stats;

  var nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var url;
    try {
      url = (typeof input === 'string') ? input : (input && input.url) || '';
    } catch (e) {
      return nativeFetch(input, init);
    }

    var method = String(
      (init && init.method) || (input && input.method) || 'GET'
    ).toUpperCase();

    // Only dedupe plain GETs to our own API.
    if (method !== 'GET' || url.indexOf(API_HOST) === -1) {
      stats.passthrough++;
      return nativeFetch(input, init);
    }

    // Already in flight -> share it.
    if (inflight[url]) {
      stats.saved++;
      var path = url;
      try { path = new URL(url).pathname; } catch (e) {}
      if (stats.deduped.indexOf(path) === -1) stats.deduped.push(path);
      return inflight[url].then(function (res) { return res.clone(); });
    }

    var p = nativeFetch(input, init);

    inflight[url] = p;

    p.then(function () {
      setTimeout(function () { delete inflight[url]; }, SETTLE_GRACE_MS);
    }, function () {
      // never keep a failed request around
      delete inflight[url];
    });

    return p.then(function (res) { return res.clone(); });
  };
})();
