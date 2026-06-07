/**
 * nav-speed.js — perceived-speed upgrades for navigation, site-wide.
 *  1) Hover/touch prefetch: quietly pre-loads an internal page when the user
 *     hovers (desktop) or touches (mobile) a link, so the click feels instant.
 *  2) Thin top progress bar: shows a loading bar during navigation.
 * Pure vanilla, ~1KB, no dependencies. Safe to load on every page.
 */
(function () {
  // ---------- 1) Prefetch on hover / touchstart ----------
  var done = {};
  function sameOrigin(href) {
    try { var u = new URL(href, location.href); return u.origin === location.origin && /\.html($|\?|#)|\/$/.test(u.pathname) === false ? u.origin === location.origin : u.origin === location.origin; }
    catch (e) { return false; }
  }
  function prefetch(href) {
    try {
      var u = new URL(href, location.href);
      if (u.origin !== location.origin) return;           // internal only
      if (u.pathname === location.pathname && u.search === location.search) return;
      var key = u.pathname + u.search;
      if (done[key]) return; done[key] = 1;
      var l = document.createElement('link');
      l.rel = 'prefetch'; l.href = u.href; l.as = 'document';
      document.head.appendChild(l);
    } catch (e) {}
  }
  function candidate(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href[0] === '#' || /^(mailto:|tel:|javascript:)/i.test(href) || a.target === '_blank' || a.hasAttribute('download')) return;
    prefetch(href);
  }
  var hoverTimer;
  document.addEventListener('mouseover', function (e) { clearTimeout(hoverTimer); hoverTimer = setTimeout(function () { candidate(e); }, 65); }, { passive: true });
  document.addEventListener('touchstart', candidate, { passive: true });

  // ---------- 2) Top progress bar on navigation ----------
  var bar = document.createElement('div');
  bar.id = 'nav-progress';
  bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0;z-index:99999;background:#c9a84c;box-shadow:0 0 8px rgba(201,168,76,.6);transition:width .25s ease,opacity .3s ease;opacity:0;pointer-events:none';
  function ready(fn){ if(document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () { document.body.appendChild(bar); });
  var timer;
  function start() {
    if (!bar.parentNode && document.body) document.body.appendChild(bar);
    bar.style.opacity = '1'; bar.style.width = '0';
    var w = 8;
    bar.style.width = w + '%';
    clearInterval(timer);
    timer = setInterval(function () { w += (90 - w) * 0.12; bar.style.width = w + '%'; }, 200);
  }
  // Start the bar when the user clicks/navigates an internal link
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href[0] === '#' || /^(mailto:|tel:|javascript:)/i.test(href) || a.target === '_blank' || a.hasAttribute('download')) return;
    try { if (new URL(href, location.href).origin === location.origin) start(); } catch (e2) {}
  }, true);
  // Finish on actual unload (page is leaving) and reset on show
  window.addEventListener('beforeunload', function () { clearInterval(timer); bar.style.width = '100%'; });
  window.addEventListener('pageshow', function () { clearInterval(timer); bar.style.width = '0'; bar.style.opacity = '0'; });
})();
