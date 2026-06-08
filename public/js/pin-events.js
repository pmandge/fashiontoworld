/**
 * pin-events.js — fires a Pinterest conversion event whenever a visitor clicks
 * an OUTBOUND link to a store / affiliate network (any external http(s) link
 * leaving fashiontoworld.co). Works for every store + future networks with no
 * extra wiring. Safe no-op if the Pinterest tag (pintrk) isn't loaded.
 */
(function () {
  function isOutbound(href) {
    if (!href || !/^https?:\/\//i.test(href)) return false;
    try { return new URL(href, location.href).hostname.replace(/^www\./, '') !== location.hostname.replace(/^www\./, ''); }
    catch (e) { return false; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!isOutbound(href)) return;
    if (typeof window.pintrk !== 'function') return;
    var store = '';
    try { store = new URL(href, location.href).hostname.replace(/^www\./, ''); } catch (e) {}
    // 'lead' = a qualified outbound click-through to a retailer (closest signal to a sale on an affiliate site)
    window.pintrk('track', 'lead', {
      lead_type: 'outbound_click',
      line_items: [{ product_name: (a.textContent || '').trim().slice(0, 100), product_category: store }]
    });
  }, true);
})();
