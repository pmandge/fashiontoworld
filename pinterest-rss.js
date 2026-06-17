/**
 * pinterest-rss.js — builds clean RSS 2.0 feeds for Pinterest's "Connect your
 * RSS feed to auto-publish Pins" feature (different from the catalog/shopping
 * ingestion, which is region-limited). One feed per board/category.
 *
 * Each <item> becomes a Pin:
 *   - image  -> <media:content> + <enclosure>  (Pinterest's image source)
 *   - title  -> keyword-rich pin title
 *   - description -> SEO description (+ price)
 *   - link   -> a page on OUR site (category/search) with UTM tracking
 *
 * Brand-safety: lingerie / underwear / swimwear / adult content is excluded so
 * the connected (ad-running) account stays in good standing.
 *
 * Cached + background-refreshed so it never blocks a request on the 512MB box.
 */
const productDb = require('./product-db');

const SITE = 'https://fashiontoworld.co';
const PER_FEED = parseInt(process.env.PINTEREST_RSS_PER_FEED) || 50;
const CACHE_MS = 6 * 3600 * 1000; // 6h

// --- brand-safety filters ------------------------------------------------
// Mirror of the category-map ADULT_RE (kept local so this module is standalone).
const ADULT_RE = /\b(?:vibrator|dildo|butt[\s-]?plug|anal|sex\s*toys?|adult\s+(?:toy|toys|product|products|novelt\w+|dvd|video)|sexual\s+wellness|masturbat\w*|fleshlight|cock\s*ring|strapon|strap-on|bdsm|nipple\s+clamp|ball\s+gag|gag\s+ball|lubricant|lube|condoms?|prostate|g[\s-]?spot|clitoral|clitoris|erotica?|aphrodisiac|dominatrix|penis|(?:wand|personal|intimate|clitoral)\s+massager|pleasure\s+(?:toy|wand|ring|bead))s?\b/i;
// Apparel we deliberately keep OFF Pinterest (exposure / account-risk).
const EXCLUDE_RE = /\b(?:lingerie|underwear|bra|bras|panties|panty|thong|g[\s-]?string|brief|boxer|knicker|bodysuit|teddy|babydoll|chemise|corset|bustier|garter|nightwear|nightgown|nightie|negligee|sleepwear|pajama|pyjama|swimwear|swimsuit|swim\s*suit|bikini|monokini|one[\s-]?piece\s+swim|thong|nipple|fishnet|crotchless|see[\s-]?through|sheer\s+(?:bra|panty|teddy|bodysuit))\b/i;

function isBrandSafe(p) {
  var hay = ((p.name || '') + ' ' + (p.subcategory || '') + ' ' + (p.category || '') + ' ' + (p.description || '')).toLowerCase();
  if (ADULT_RE.test(hay)) return false;
  if (EXCLUDE_RE.test(hay)) return false;
  return true;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function titleCase(s) {
  return String(s || '').toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

// Turn a raw feed name ("200730 Cateye Eyeglasses") into a pin-worthy title.
function pinTitle(p, suffix) {
  var raw = String(p.name || '').trim();
  // strip leading SKUs / pure-number tokens
  raw = raw.replace(/^\s*[#-]?\d{4,}\s*[-–:]?\s*/, '').replace(/\s{2,}/g, ' ').trim();
  if (!raw) raw = titleCase(p.category || 'Fashion Find');
  // Prepend brand when it's a real brand (not a store) and not already present.
  var brand = (p.brand || '').trim();
  if (brand && raw.toLowerCase().indexOf(brand.toLowerCase()) === -1 && brand.length < 24) {
    raw = brand + ' ' + raw;
  }
  var t = raw.slice(0, 90);
  if (suffix) t = (t + ' — ' + suffix).slice(0, 100);
  return t;
}

function pinDescription(p, keywords) {
  var bits = [];
  var name = String(p.name || '').replace(/^\s*[#-]?\d{4,}\s*[-–:]?\s*/, '').trim();
  if (name) bits.push(name + '.');
  var cur = (p.currency || 'USD').toUpperCase();
  var onSale = p.price_old && Number(p.price_old) > Number(p.price);
  if (Number(p.price) > 0) {
    bits.push(onSale
      ? ('Now ' + Number(p.price).toFixed(0) + ' ' + cur + ' (was ' + Number(p.price_old).toFixed(0) + ').')
      : (Number(p.price).toFixed(0) + ' ' + cur + '.'));
  }
  bits.push('Ships worldwide. ' + keywords);
  return bits.join(' ').slice(0, 480);
}

// Build a tracked link to one of OUR pages (audience-building, not direct-to-store).
function trackedLink(path, campaign) {
  var sep = path.indexOf('?') > -1 ? '&' : '?';
  return SITE + '/' + path.replace(/^\//, '') +
    sep + 'utm_source=pinterest&utm_medium=rss&utm_campaign=' + encodeURIComponent(campaign);
}

// --- feed definitions ----------------------------------------------------
// Each: how to SELECT products + where the pins LINK + pin keywords.
const FEEDS = {
  watches: {
    title: 'Watches — Worldwide Shipping | Fashion to World',
    query: { category: 'watches', sort: 'popularity', limit: 400 },
    landing: 'pages/search.html?q=watch',
    keywords: 'luxury watches, designer timepieces, worldwide shipping watches.',
    suffix: 'Ships Worldwide',
  },
  bags: {
    title: 'Designer Bags & Handbags | Fashion to World',
    query: { category: 'bags', sort: 'popularity', limit: 400 },
    landing: 'pages/bags.html',
    keywords: 'designer handbags, luxury bags, tote, crossbody, shoulder bag.',
    suffix: 'Shop Worldwide',
  },
  jewellery: {
    title: 'Fine Jewellery & Accessories | Fashion to World',
    query: { category: 'jewellery', sort: 'popularity', limit: 400 },
    landing: 'pages/jewellery.html',
    keywords: 'fine jewellery, necklaces, earrings, rings, gold jewellery.',
    suffix: 'Ships Worldwide',
  },
  dresses: {
    title: 'Dresses — Occasion, Midi & Maxi | Fashion to World',
    query: { category: 'women', subcategory: 'Dresses', sort: 'popularity', limit: 400 },
    landing: 'pages/search.html?q=dress',
    keywords: 'dresses, occasion dress, midi dress, maxi dress, outfit ideas.',
    suffix: 'Worldwide Shipping',
  },
  shoes: {
    title: 'Shoes & Footwear | Fashion to World',
    query: { category: 'shoes', sort: 'popularity', limit: 400 },
    landing: 'pages/shoes.html',
    keywords: 'designer shoes, heels, boots, sneakers, footwear.',
    suffix: 'Ships Worldwide',
  },
  luxury: {
    title: 'Luxury & Designer Fashion | Fashion to World',
    query: { sort: 'price_desc', limit: 500 },
    landing: 'pages/brands.html',
    keywords: 'luxury fashion, designer brands, Gucci, Prada, Dior, Valentino.',
    suffix: 'Designer, Shipped Worldwide',
  },
  sunglasses: {
    title: 'Sunglasses & Eyewear | Fashion to World',
    query: { q: 'sunglasses', sort: 'popularity', limit: 400 },
    landing: 'pages/search.html?q=sunglasses',
    keywords: 'sunglasses, designer eyewear, cat-eye, aviator, round frames.',
    suffix: 'Ships Worldwide',
  },
};

// Pick a MIXED set: some fresh, some premium, some on-sale; best images first.
function pickMixed(products, n) {
  var safe = products.filter(function (p) {
    var img = p && (p.image_url || p.image_link);
    return p && p.name && img && Number(p.price) > 0 && isBrandSafe(p);
  });
  if (safe.length <= n) return safe;
  var onSale = safe.filter(function (p) { return p.price_old && Number(p.price_old) > Number(p.price); });
  var premium = safe.slice().sort(function (a, b) { return Number(b.price) - Number(a.price); });
  var fresh = safe.slice(); // query already ordered (popularity/price)
  var out = [], seen = {};
  function take(list, count) {
    for (var i = 0; i < list.length && count > 0; i++) {
      var p = list[i]; if (!p || seen[p.id]) continue;
      seen[p.id] = 1; out.push(p); count--;
    }
  }
  // ~40% fresh, ~30% premium, ~30% on-sale
  take(fresh, Math.ceil(n * 0.4));
  take(premium, Math.ceil(n * 0.3));
  take(onSale, Math.ceil(n * 0.3));
  take(safe, n - out.length); // fill remainder
  return out.slice(0, n);
}

async function buildFeed(key) {
  var def = FEEDS[key];
  if (!def) throw new Error('unknown feed: ' + key);
  var res = await productDb.query(def.query);
  var chosen = pickMixed(res.products || [], PER_FEED);
  var items = chosen.map(function (p) {
    var img = p.image_url || p.image_link;
    var link = trackedLink(def.landing, key);
    var title = esc(pinTitle(p, def.suffix));
    var desc = esc(pinDescription(p, def.keywords));
    var pubDate = new Date(Number(p.updated_at) || Date.now()).toUTCString();
    return '<item>' +
      '<title>' + title + '</title>' +
      '<link>' + esc(link) + '</link>' +
      '<guid isPermaLink="false">ftw-' + key + '-' + esc(p.id) + '</guid>' +
      '<pubDate>' + pubDate + '</pubDate>' +
      '<description>' + desc + '</description>' +
      '<enclosure url="' + esc(img) + '" type="image/jpeg" />' +
      '<media:content url="' + esc(img) + '" medium="image" />' +
      '</item>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">' +
    '<channel>' +
    '<title>' + esc(def.title) + '</title>' +
    '<link>' + SITE + '/' + def.landing + '</link>' +
    '<description>' + esc('Curated worldwide-shipping ' + key + ' from Fashion to World — updated regularly.') + '</description>' +
    '<language>en-us</language>' +
    items +
    '</channel></rss>';
}

// --- cache + public API --------------------------------------------------
var _cache = {};     // key -> { at, xml }
var _building = {};

async function getFeed(key) {
  if (!FEEDS[key]) throw new Error('unknown feed');
  var c = _cache[key];
  if (c && c.xml && (Date.now() - c.at) < CACHE_MS) return c.xml;
  // Build synchronously the first time; afterwards refresh in background.
  if (c && c.xml) { refresh(key); return c.xml; }
  var xml = await buildFeed(key);
  _cache[key] = { at: Date.now(), xml: xml };
  return xml;
}

function refresh(key) {
  if (_building[key]) return;
  _building[key] = true;
  buildFeed(key)
    .then(function (xml) { _cache[key] = { at: Date.now(), xml: xml }; })
    .catch(function (e) { console.error('[pinterest-rss:' + key + ']', e.message); })
    .then(function () { _building[key] = false; });
}

function feedKeys() { return Object.keys(FEEDS); }

module.exports = { getFeed, feedKeys, FEEDS };
