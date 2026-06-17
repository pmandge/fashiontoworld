/**
 * sitemap.js — builds a self-updating XML sitemap for Google.
 *   - static pages (categories, info, blog, coupons, watches, all-deals)
 *   - brand pages (brands with >= MIN_PRODUCTS) -> search.html?brand=NAME
 *
 * Brands are pulled live (cached) so new stores/brands appear automatically
 * as the catalogue grows — no manual regeneration. Cached 6h, background
 * refreshed, so it never blocks a request on the small box.
 *
 * Exposed at /api/sitemap.xml ; submit that URL in Google Search Console.
 */
const SITE = 'https://fashiontoworld.co';
const MIN_PRODUCTS = parseInt(process.env.SITEMAP_MIN_PRODUCTS) || 10;
const CACHE_MS = 6 * 3600 * 1000;

// static URLs: [path, changefreq, priority]
const STATIC = [
  ['/', 'daily', '1.0'],
  ['/pages/women.html', 'daily', '0.9'],
  ['/pages/men.html', 'daily', '0.9'],
  ['/pages/shoes.html', 'daily', '0.9'],
  ['/pages/bags.html', 'daily', '0.9'],
  ['/pages/jewellery.html', 'daily', '0.9'],
  ['/pages/watches.html', 'daily', '0.9'],
  ['/pages/accessories.html', 'daily', '0.8'],
  ['/pages/beauty.html', 'weekly', '0.7'],
  ['/pages/kids.html', 'weekly', '0.7'],
  ['/pages/coupons.html', 'daily', '0.8'],
  ['/pages/search.html?markdown=true&sort=discount', 'daily', '0.8'], // All Deals
  ['/pages/deals.html', 'weekly', '0.6'],
  ['/pages/brands.html', 'weekly', '0.8'],
  ['/pages/blog.html', 'weekly', '0.6'],
  ['/pages/blog-trends-2025.html', 'monthly', '0.5'],
  ['/pages/blog-capsule-wardrobe.html', 'monthly', '0.5'],
  ['/pages/blog-spotting-deals.html', 'monthly', '0.5'],
  ['/pages/about.html', 'monthly', '0.4'],
  ['/pages/contact.html', 'monthly', '0.4'],
  ['/pages/affiliate-disclosure.html', 'yearly', '0.3'],
  ['/pages/privacy.html', 'yearly', '0.3'],
  ['/pages/terms.html', 'yearly', '0.3'],
];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function urlBlock(loc, changefreq, priority, lastmod) {
  return '<url>' +
    '<loc>' + esc(loc) + '</loc>' +
    '<lastmod>' + lastmod + '</lastmod>' +
    '<changefreq>' + changefreq + '</changefreq>' +
    '<priority>' + priority + '</priority>' +
    '</url>';
}

// Build the sitemap XML from the STATIC list + a CLEANED brand list.
// The caller passes the already-cleaned brands (same source as /api/brands/all)
// so the sitemap never includes junk/store-name artifacts.
function build(cleanedBrands) {
  const lastmod = new Date().toISOString().slice(0, 10);
  let body = '';
  STATIC.forEach(function (s) { body += urlBlock(SITE + s[0], s[1], s[2], lastmod); });

  const kept = (cleanedBrands || []).filter(function (b) {
    return b && b.name && Number(b.count) >= MIN_PRODUCTS;
  });
  kept.forEach(function (b) {
    const c = Number(b.count) || 0;
    const pr = c >= 500 ? '0.7' : (c >= 100 ? '0.6' : '0.5');
    const loc = SITE + '/pages/search.html?brand=' + encodeURIComponent(b.name);
    body += urlBlock(loc, 'weekly', pr, lastmod);
  });

  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    body +
    '</urlset>';
}

let _cache = { at: 0, xml: null };

// getSitemap(cleanedBrands): cleanedBrands is the array from _brandsDirCache.data.
// Cached 6h; rebuilds (cheap string work) when stale or when brand count changed.
function getSitemap(cleanedBrands) {
  const fresh = _cache.xml && (Date.now() - _cache.at) < CACHE_MS;
  if (fresh) return _cache.xml;
  const xml = build(cleanedBrands || []);
  _cache = { at: Date.now(), xml: xml };
  return xml;
}

module.exports = { getSitemap };
