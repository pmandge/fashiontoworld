/* ============================================================================
 * shop-click.js — Shop Now / outbound store-click tracking
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS
 * The click-out to a merchant is the ONLY conversion this business has: it sets
 * the network's 60-90 day cookie. Before this script, GA4 recorded zero of them
 * (every "Key events" column read 0), so there was no way to tell whether paid
 * traffic ever reached a store.
 *
 * HOW IT WORKS
 * One delegated listener on <document>. Any click on a link that leaves
 * fashiontoworld.co is treated as a store click-out. That is deliberately
 * network-agnostic: Admitad ROTATES its tracking domains (codeaven.com,
 * alitems.com, artfut.com, ad.admitad.com...), so a hardcoded domain list would
 * silently stop working. Anything outbound counts; internal links never do.
 *
 * Fires:
 *   - GA4    : shop_now_click   (mark this as a Key event in GA4 Admin)
 *   - Pinterest: 'lead' conversion — this is what lets the campaign switch from
 *     Consideration (optimises for cheap clicks) to Conversions (optimises for
 *     people who actually click through to a store).
 * ========================================================================== */
(function () {
  'use strict';

  var SITE_HOST = location.hostname.replace(/^www\./, '');

  // Domains that are ours / not a store click-out.
  var IGNORE = [
    SITE_HOST,
    'api.fashiontoworld.co',
    'images.weserv.nl',
    'images.unsplash.com',
    'clarity.ms',
    'googletagmanager.com',
    'google-analytics.com',
    'pinimg.com',
    'pinterest.com'
  ];

  function isOutbound(href) {
    if (!href || !/^https?:\/\//i.test(href)) return false;
    try {
      var h = new URL(href, location.href).hostname.replace(/^www\./, '');
      for (var i = 0; i < IGNORE.length; i++) {
        if (h === IGNORE[i] || h.endsWith('.' + IGNORE[i])) return false;
      }
      return true;
    } catch (e) { return false; }
  }

  // Best-effort: name the affiliate network from the redirect host.
  function networkOf(host) {
    if (/awin1\.com|awin\.com/i.test(host)) return 'awin';
    if (/codeaven|alitems|artfut|admitad|lenkmio|hoglg/i.test(host)) return 'admitad';
    if (/cfjump|commissionfactory/i.test(host)) return 'commission_factory';
    return 'other';
  }

  // Pull the merchant/product identifiers out of the redirect URL where we can.
  function idsFrom(url) {
    var out = {};
    try {
      var u = new URL(url);
      var q = u.searchParams;
      // AWIN: awin1.com/pclick.php?p=<product>&a=<publisher>&m=<merchant>
      if (q.get('m')) out.merchant_id = q.get('m');
      if (q.get('p')) out.product_id = q.get('p');
      // Admitad: .../g/<hash>/?f_id=<feed>&ulp=<encoded destination>
      if (q.get('f_id')) out.merchant_id = q.get('f_id');
      var ulp = q.get('ulp');
      if (ulp) {
        try { out.destination = new URL(ulp).hostname.replace(/^www\./, ''); } catch (e) {}
      }
    } catch (e) {}
    return out;
  }

  // Card context, if the click happened inside a product card.
  function cardData(el) {
    var card = el.closest ? el.closest('.pcard, [data-wid]') : null;
    if (!card) return {};
    var g = function (k) { return card.getAttribute(k) || undefined; };
    return {
      item_name: g('data-name'),
      item_brand: g('data-brand'),
      price_text: g('data-price')
    };
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;

    var href = a.getAttribute('href');
    if (!isOutbound(href)) return;

    var host = '';
    try { host = new URL(href, location.href).hostname.replace(/^www\./, ''); } catch (e) {}

    var payload = {
      link_url: href,
      link_domain: host,
      affiliate_network: networkOf(host),
      page_location: location.href,
      page_path: location.pathname
    };

    var ids = idsFrom(href);
    for (var k in ids) { if (ids[k]) payload[k] = ids[k]; }

    var cd = cardData(a);
    for (var c in cd) { if (cd[c]) payload[c] = cd[c]; }

    // --- GA4 -----------------------------------------------------------------
    // These links open in a new tab, so the page isn't unloading and the event
    // has time to send normally. transport_type beacon is belt-and-braces.
    if (typeof window.gtag === 'function') {
      payload.transport_type = 'beacon';
      window.gtag('event', 'shop_now_click', payload);
    }

    // --- Pinterest ------------------------------------------------------------
    // DELIBERATELY NOT FIRED HERE. public/js/pin-events.js already sends the
    // pintrk 'lead' conversion on outbound clicks. Firing it here too would
    // double-count every store click in Pinterest and corrupt any campaign
    // optimised against that conversion. pin-events.js owns Pinterest;
    // this file owns GA4. Keep it that way.

    // --- Clarity -------------------------------------------------------------
    if (typeof window.clarity === 'function') {
      try { window.clarity('set', 'shop_now_click', payload.affiliate_network); } catch (e) {}
    }
  }, true); // capture phase: fires even if something else stops propagation
})();
