/**
 * pinterest-catalog.js — builds a product feed in the Google-Shopping / RSS 2.0
 * format that Pinterest ingests to auto-create Product Pins (real images, titles,
 * prices) and keep them synced. Cached + background-refreshed so it never blocks
 * a request on the small server. Capped to a sensible number of quality products.
 */
const productDb = require('./product-db');

const MAX_ITEMS = parseInt(process.env.PINTEREST_FEED_MAX) || 5000;
const SITE = 'https://fashiontoworld.co';
let _cache = { at: 0, xml: null };
let _building = false;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function build() {
  const res = await productDb.query({ limit: MAX_ITEMS, sort: 'popularity' });
  const products = (res.products || []).filter(function (p) {
    var img = p && (p.image_url || p.image_link);
    var link = p && (p.affiliate_url || p.url);
    return p && p.name && img && link && Number(p.price) > 0;
  });

  var items = products.map(function (p) {
    var img = p.image_url || p.image_link;
    var link = p.affiliate_url || p.url;
    var cur = (p.currency || 'USD').toUpperCase();
    var onSale = p.price_old && Number(p.price_old) > Number(p.price);
    var regular = (onSale ? Number(p.price_old) : Number(p.price)).toFixed(2) + ' ' + cur;
    var title = esc(String(p.name).slice(0, 140));
    var desc = esc(String(p.description || p.name || title).slice(0, 4000));
    var brand = esc(p.brand || p.advertiser_name || 'Fashion to World');
    var ptype = esc(p.category || 'Fashion');
    var s = '<item>' +
      '<g:id>' + esc(p.id) + '</g:id>' +
      '<g:title>' + title + '</g:title>' +
      '<g:description>' + desc + '</g:description>' +
      '<g:link>' + esc(link) + '</g:link>' +
      '<g:image_link>' + esc(img) + '</g:image_link>' +
      '<g:availability>in stock</g:availability>' +
      '<g:price>' + regular + '</g:price>' +
      (onSale ? '<g:sale_price>' + Number(p.price).toFixed(2) + ' ' + cur + '</g:sale_price>' : '') +
      '<g:condition>new</g:condition>' +
      '<g:brand>' + brand + '</g:brand>' +
      '<g:product_type>' + ptype + '</g:product_type>' +
      '<g:google_product_category>Apparel &amp; Accessories</g:google_product_category>' +
      '</item>';
    return s;
  }).join('');

  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel>' +
    '<title>Fashion to World</title>' +
    '<link>' + SITE + '</link>' +
    '<description>Worldwide-shipping fashion from trusted stores, updated daily.</description>' +
    items +
    '</channel></rss>';
}

function refresh() {
  if (_building) return;
  _building = true;
  build().then(function (xml) { _cache = { at: Date.now(), xml: xml }; })
    .catch(function (e) { console.error('[pinterest-catalog]', e.message); })
    .then(function () { _building = false; });
}

async function getFeed() {
  if (_cache.xml && Date.now() - _cache.at < 12 * 3600 * 1000) return _cache.xml;
  if (_cache.xml) { refresh(); return _cache.xml; }   // stale -> serve old, refresh in bg
  _cache.xml = await build();                          // first ever -> build inline once
  _cache.at = Date.now();
  return _cache.xml;
}

// warm at startup + refresh twice a day, in the background
setTimeout(refresh, 8000);
setInterval(refresh, 12 * 3600 * 1000);

module.exports = { getFeed };
