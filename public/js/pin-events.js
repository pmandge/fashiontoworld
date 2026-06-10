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
    var store = '', pid = '';
    try {
      var u = new URL(href, location.href);
      store = u.hostname.replace(/^www\./, '');
      var h = 0, s = href; for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
      pid = store + '-' + Math.abs(h).toString(36);
    } catch (e) { pid = 'outbound'; }
    // prefer a real product id if the link/card exposes one
    var dataPid = (a.getAttribute('data-pid')) || (a.closest('[data-id]') && a.closest('[data-id]').getAttribute('data-id'));
    if (dataPid) pid = dataPid;
    // 'lead' = a qualified outbound click-through to a retailer (closest signal to a sale on an affiliate site)
    window.pintrk('track', 'lead', {
      lead_type: 'outbound_click',
      line_items: [{ product_id: pid, product_name: (a.textContent || '').trim().slice(0, 100), product_category: store }]
    });
  }, true);
})();
