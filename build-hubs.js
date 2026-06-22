/**
 * build-hubs.js v2 — SEO ENRICHMENT of existing category pages.
 *
 * Instead of building new pages, this FETCHES the live category page (which
 * already has the polished, mobile-tested design) and injects SEO content into
 * the raw HTML that Google reads without running JavaScript:
 *   1. Real product cards into the empty #productsGrid (replacing skeletons)
 *   2. Original intro copy into the existing .cat-content slot
 *   3. ItemList + Product JSON-LD into the <head>
 *
 * Everything else — hero, subcategory chips, filters, nav, footer, scripts —
 * is left exactly as-is. The live JS still hydrates the grid for real users;
 * Google gets the baked content.
 *
 * USAGE (on the droplet, from ~/fashiontoworld):
 *   node -r dotenv/config backend/seo/build-hubs.js --only=women
 *   node -r dotenv/config backend/seo/build-hubs.js            # all categories
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

const db = require(path.join(__dirname, '..', 'services', 'product-db-postgres.js'));

const OUT_DIR = path.join(process.cwd(), 'generated-hubs');
const OUT_PAGES = path.join(OUT_DIR, 'pages');
const SITE = 'https://fashiontoworld.co';
const PER_HUB = 36;

function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function attr(s) { return (s == null ? '' : String(s)).replace(/"/g, '&quot;'); }
function fmtPrice(p, cur) {
  if (p == null || p === '') return '';
  const sym = ({ USD: '$', EUR: '\u20ac', GBP: '\u00a3' })[(cur || 'USD').toUpperCase()] || '';
  const n = Number(p);
  return sym + (isFinite(n) ? n.toFixed(2) : p);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function card(p) {
  const link = p.url || '';
  if (!/^https?:\/\//i.test(link)) return '';
  const hasDisc = p.price_old && p.price_old > p.price;
  const disc = hasDisc ? Math.round((1 - p.price / p.price_old) * 100) : 0;
  const price = fmtPrice(p.price, p.currency);
  const wasPrice = hasDisc ? fmtPrice(p.price_old, p.currency) : '';
  const brand = p.brand || p.advertiser || '';
  const img = p.image_url || '';
  const heart = '<button class="card-heart" type="button" aria-label="Save" data-wid="' + attr(p.id) + '" data-wname="' + attr(p.name) + '" data-wimg="' + attr(img) + '" data-wprice="' + attr(price) + '" data-wbrand="' + attr(brand) + '" data-wurl="' + attr(link) + '" onclick="event.preventDefault();event.stopPropagation();if(window.FTWWish){var it={id:this.getAttribute(\'data-wid\'),name:this.getAttribute(\'data-wname\'),brand:this.getAttribute(\'data-wbrand\'),price:this.getAttribute(\'data-wprice\'),img:this.getAttribute(\'data-wimg\'),href:this.getAttribute(\'data-wurl\')};var on=window.FTWWish.toggle(it);this.classList.toggle(\'on\',on);if(window.FTWBotnavBadge)window.FTWBotnavBadge();}return false;"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>';
  return '<a class="product-card product-card-link" href="' + attr(link) + '" target="_blank" rel="noopener sponsored nofollow" data-product-id="' + attr(p.id) + '"><div class="product-img"><img src="' + attr(img) + '" alt="' + attr(p.name) + '" loading="lazy" decoding="async" onerror="this.onerror=null;var c=this.closest(\'.product-card\');if(c)c.remove();">' + (hasDisc ? '<span class="product-badge sale">-' + disc + '%</span>' : '') + heart + '</div><div class="product-body"><p class="product-brand">' + esc(brand) + '</p><h3 class="product-name">' + esc(p.name) + '</h3><div class="product-price-row"><span class="product-price">' + esc(price) + '</span>' + (hasDisc ? '<span class="product-original">' + esc(wasPrice) + '</span>' : '') + (disc ? '<span class="product-discount">-' + disc + '%</span>' : '') + '</div></div><div class="product-footer"><span class="btn-product">Shop Now</span></div></a>';
}

function itemListLd(products, pageUrl, pageName) {
  const items = products.slice(0, 20).map((p, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: {
      '@type': 'Product', name: p.name || '',
      ...(p.image_url ? { image: p.image_url } : {}),
      ...(p.brand || p.advertiser ? { brand: { '@type': 'Brand', name: p.brand || p.advertiser } } : {}),
      offers: { '@type': 'Offer', priceCurrency: (p.currency || 'USD').toUpperCase(), price: Number(p.price || 0).toFixed(2), availability: 'https://schema.org/InStock', ...(p.url ? { url: p.url } : {}) }
    }
  }));
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ItemList', name: pageName, url: pageUrl,
    numberOfItems: items.length, itemListElement: items
  }) + '</scr' + 'ipt>';
}

function introCopy(title, products) {
  const n = products.length;
  const prices = products.map(p => Number(p.price)).filter(x => x > 0).sort((a, b) => a - b);
  const lo = prices.length ? fmtPrice(prices[0], products[0].currency) : '';
  const hi = prices.length ? fmtPrice(prices[prices.length - 1], products[0].currency) : '';
  const brands = [...new Set(products.map(p => p.brand || p.advertiser).filter(Boolean))].slice(0, 6);
  const brandList = brands.length ? brands.slice(0, -1).join(', ') + (brands.length > 1 ? ' and ' + brands[brands.length - 1] : brands[0]) : '';
  return '<p>Browse ' + title.toLowerCase() + ' from stores that ship worldwide \u2014 every item below links straight to a retailer that delivers internationally, with prices shown in your local currency. ' + (brandList ? 'Featured names include ' + esc(brandList) + '.' : '') + '</p>' +
    '<p>We surface ' + n + ' hand-picked pieces' + (lo && hi ? ' ranging from ' + esc(lo) + ' to ' + esc(hi) : '') + ', refreshed daily as new stock and markdowns land. Whether you are after everyday staples or a standout investment piece, each link takes you directly to the store\u2019s own checkout \u2014 no middleman, no markup.</p>';
}

async function enrich(hub) {
  let products = [];
  try {
    const res = await db.query({ category: hub.slug, sort: 'discount', limit: PER_HUB });
    products = (res && res.products || []).filter(p => p.image_url && /^https?:\/\//i.test(p.url || ''));
  } catch (e) { console.error('  ! query failed for ' + hub.slug + ': ' + e.message); return null; }
  if (products.length < 6) { console.log('  - skip ' + hub.slug + ' (' + products.length + ' usable products)'); return null; }

  let html;
  try { html = await fetchUrl(SITE + '/pages/' + hub.slug + '.html'); }
  catch (e) { console.error('  ! fetch failed for ' + hub.slug + ': ' + e.message); return null; }

  const before = html.length;
  const cards = products.map(card).filter(Boolean).join('\n');
  const gridRe = /(<div class="products-grid" id="productsGrid">)([\s\S]*?)(<\/div>)/;
  if (gridRe.test(html)) { html = html.replace(gridRe, '$1\n' + cards + '\n$3'); }
  else { console.error('  ! productsGrid not found in ' + hub.slug); return null; }

  const copy = introCopy(hub.title, products);
  const contentRe = /(<div class="cat-content"[^>]*>)([\s\S]*?)(<\/div>)/;
  if (contentRe.test(html)) { html = html.replace(contentRe, '$1' + copy + '$3'); }

  const ld = itemListLd(products, SITE + '/pages/' + hub.slug + '.html', hub.title);
  html = html.replace('</head>', ld + '\n</head>');

  fs.mkdirSync(OUT_PAGES, { recursive: true });
  fs.writeFileSync(path.join(OUT_PAGES, hub.slug + '.html'), html, 'utf8');
  console.log('  \u2713 ' + hub.slug + '.html (' + products.length + ' products, ' + before + '->' + html.length + ' bytes)');
  return { slug: hub.slug, url: SITE + '/pages/' + hub.slug + '.html' };
}

async function main() {
  const args = process.argv.slice(2);
  const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1];
  if (db.init) { try { await db.init(); } catch (e) {} }

  const CATEGORIES = [
    ['women', "Women's Fashion"], ['men', "Men's Fashion"], ['kids', "Kids' Fashion"],
    ['shoes', 'Shoes'], ['bags', 'Bags'], ['jewellery', 'Jewellery'],
    ['accessories', 'Accessories'], ['beauty', 'Beauty']
  ];
  let hubs = CATEGORIES.map(([slug, title]) => ({ slug, title }));
  if (only) hubs = hubs.filter(h => h.slug === only);

  console.log('Enriching ' + hubs.length + ' category page(s)...');
  const built = [];
  for (const hub of hubs) { const r = await enrich(hub); if (r) built.push(r); }

  fs.writeFileSync(path.join(OUT_DIR, 'hubs-manifest.json'),
    JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: built.length, hubs: built }, null, 2));
  console.log('\nDone. ' + built.length + ' pages enriched in generated-hubs/pages/');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
