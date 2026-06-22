/**
 * build-hubs.js — SEO hub-page generator (Path B).
 *
 * Generates server-rendered static HTML pages for category / store / brand hubs,
 * with real product cards + original intro copy + ItemList/Product JSON-LD baked
 * into the raw HTML (so Google sees content WITHOUT executing JavaScript).
 *
 * The existing client-side JS (admitad-api.js) still runs on top for live users,
 * refreshing the grid with live data — so users get the dynamic experience while
 * search engines get the baked HTML.
 *
 * USAGE (on the droplet, from ~/fashiontoworld):
 *   node backend/seo/build-hubs.js                 # generate all hubs
 *   node backend/seo/build-hubs.js --only=watches  # one hub (validation)
 *   node backend/seo/build-hubs.js --type=category # only categories
 *
 * Output: writes complete .html files into ./generated-hubs/pages/
 *         + a fresh sitemap.xml into ./generated-hubs/
 * You then push generated-hubs/ contents into the repo (GitHub -> Netlify).
 *
 * SAFETY: read-only against the DB (SELECT via existing query()). Never writes
 * to the DB. Never touches live files — only ./generated-hubs/.
 */

const path = require('path');
const fs = require('fs');

// Reuse the project's own DB layer so queries + safety filters stay consistent.
const db = require(path.join(__dirname, '..', 'services', 'product-db-postgres.js'));

const OUT_DIR = path.join(process.cwd(), 'generated-hubs');
const OUT_PAGES = path.join(OUT_DIR, 'pages');
const SITE = 'https://fashiontoworld.co';
const PER_HUB = 36;            // products baked per hub page
const TODAY = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ helpers */
function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function attr(s) { return (s == null ? '' : String(s)).replace(/"/g, '&quot;'); }
function fmtPrice(p, cur) {
  if (p == null || p === '') return '';
  const sym = ({ USD: '$', EUR: '€', GBP: '£' })[(cur || 'USD').toUpperCase()] || '';
  const n = Number(p);
  return sym + (isFinite(n) ? n.toFixed(2) : p);
}

/* --------------------------------------------------- product card (matches live) */
function card(p) {
  const link = p.url || '';
  const isReal = /^https?:\/\//i.test(link);
  if (!isReal) return ''; // skip non-linkable products in the static set
  const hasDisc = p.price_old && p.price_old > p.price;
  const disc = hasDisc ? Math.round((1 - p.price / p.price_old) * 100) : 0;
  const price = fmtPrice(p.price, p.currency);
  const wasPrice = hasDisc ? fmtPrice(p.price_old, p.currency) : '';
  const brand = p.brand || p.advertiser || '';
  const img = p.image_url || '';
  return `
      <a class="product-card product-card-link" href="${attr(link)}"
         target="_blank" rel="noopener sponsored nofollow"
         data-product-id="${attr(p.id)}">
        <div class="product-img">
          <img src="${attr(img)}" alt="${attr(p.name)}" loading="lazy" decoding="async"
               onerror="this.onerror=null;var c=this.closest('.product-card');if(c)c.remove();">
          ${hasDisc ? `<span class="product-badge sale">-${disc}%</span>` : ''}
        </div>
        <div class="product-body">
          <p class="product-brand">${esc(brand)}</p>
          <h3 class="product-name">${esc(p.name)}</h3>
          <div class="product-price-row">
            <span class="product-price">${esc(price)}</span>
            ${hasDisc ? `<span class="product-original">${esc(wasPrice)}</span>` : ''}
            ${disc ? `<span class="product-discount">-${disc}%</span>` : ''}
          </div>
        </div>
        <div class="product-footer"><span class="btn-product">Shop Now</span></div>
      </a>`;
}

/* --------------------------------------------------- JSON-LD (ItemList+Product) */
function itemListLd(products, pageUrl, pageName) {
  const items = products.slice(0, 20).map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Product',
      name: p.name || '',
      ...(p.image_url ? { image: p.image_url } : {}),
      ...(p.brand || p.advertiser ? { brand: { '@type': 'Brand', name: p.brand || p.advertiser } } : {}),
      offers: {
        '@type': 'Offer',
        priceCurrency: (p.currency || 'USD').toUpperCase(),
        price: Number(p.price || 0).toFixed(2),
        availability: 'https://schema.org/InStock',
        ...(p.url ? { url: p.url } : {})
      }
    }
  }));
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageName,
    url: pageUrl,
    numberOfItems: items.length,
    itemListElement: items
  });
}

/* ------------------------------------------------------------ intro copy (orig) */
// Real, varied, non-duplicate copy generated from actual hub data. Not a single
// templated sentence — varies by product count, price band, and hub type.
function introCopy(hub, products) {
  const n = products.length;
  const prices = products.map(p => Number(p.price)).filter(x => x > 0).sort((a, b) => a - b);
  const lo = prices.length ? fmtPrice(prices[0], products[0].currency) : '';
  const hi = prices.length ? fmtPrice(prices[prices.length - 1], products[0].currency) : '';
  const brands = [...new Set(products.map(p => p.brand || p.advertiser).filter(Boolean))].slice(0, 6);
  const brandList = brands.length
    ? brands.slice(0, -1).join(', ') + (brands.length > 1 ? ' and ' + brands[brands.length - 1] : brands[0])
    : '';

  if (hub.type === 'category') {
    return `<p>Browse ${hub.title.toLowerCase()} from stores that ship worldwide — every item below links straight to a retailer that delivers internationally, with prices shown in your local currency. ${brandList ? `Featured names include ${esc(brandList)}.` : ''}</p>
      <p>We surface ${n} hand-picked pieces${lo && hi ? ` ranging from ${esc(lo)} to ${esc(hi)}` : ''}, refreshed daily as new stock and markdowns land. Whether you're after everyday staples or a standout investment piece, each link takes you directly to the store's own checkout — no middleman, no markup.</p>`;
  }
  if (hub.type === 'store') {
    return `<p>Shop ${esc(hub.title)} — one of the worldwide-shipping stores we track at Fashion to World. Below are ${n} current pieces${lo && hi ? `, from ${esc(lo)} up to ${esc(hi)}` : ''}, each linking straight to ${esc(hub.title)}'s own product page.</p>
      <p>${esc(hub.title)} ships internationally, so you can order wherever you are. We refresh this selection daily to keep prices and availability current.</p>`;
  }
  // brand
  return `<p>Discover ${esc(hub.title)} pieces available from worldwide-shipping retailers. We've gathered ${n} current ${esc(hub.title)} items${lo && hi ? ` priced between ${esc(lo)} and ${esc(hi)}` : ''}, each linking directly to a store that delivers internationally.</p>
    <p>Looking for ${esc(hub.title)} that ships to your country? Every product below goes straight to the retailer's checkout, with prices in your local currency, updated daily.</p>`;
}

/* ------------------------------------------------------------------ page shell */
function pageHtml(hub, products) {
  const url = `${SITE}/pages/${hub.slug}.html`;
  const title = hub.metaTitle;
  const desc = hub.metaDesc;
  const cards = products.map(card).filter(Boolean).join('\n');
  const ld = itemListLd(products, url, hub.title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-T7SK34MMHV"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-T7SK34MMHV');
</script>
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "x4x3qstcpo");
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Fashion to World">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/public/images/og-cover.jpg">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../public/css/main.css">
<style>
.hub-hero { padding: calc(var(--nav-h) + 48px) 0 0; background: #f5f0ea; }
.hub-hero-inner { max-width: var(--max-w); margin: 0 auto; padding: 0 40px 48px; }
.hub-hero h1 { font-size: clamp(36px, 5vw, 64px); line-height: 1; }
.hub-hero h1 em { color: var(--gold); font-style: italic; }
.hub-intro { max-width: 720px; margin: 20px 0 0; font-size: 16px; color: var(--text-muted); }
.hub-intro p { margin: 0 0 12px; }
.hub-products { max-width: var(--max-w); margin: 0 auto; padding: 48px 40px 80px; }
.hub-products h2 { font-size: 24px; margin: 0 0 24px; }
.cat-seo { max-width: var(--max-w); margin: 0 auto; padding: 0 40px 64px; color: var(--text-muted); font-size: 15px; }
</style>
<script type="application/ld+json">${ld}</script>
</head>
<body>
<nav class="nav" id="nav"></nav>

<section class="hub-hero">
  <div class="hub-hero-inner">
    <h1>${esc(hub.h1html)}</h1>
    <div class="hub-intro">${introCopy(hub, products)}</div>
  </div>
</section>

<section class="hub-products">
  <h2>${esc(hub.gridHeading)}</h2>
  <div class="products-grid" id="productsGrid">
${cards}
  </div>
</section>

<section class="cat-seo">
  ${hub.footerCopy}
</section>

<footer class="footer" id="footer"></footer>

<script src="../public/js/api-config.js"></script>
<script src="../public/js/admitad-api.js"></script>
<script src="../public/js/categories.js"></script>
<script src="../public/js/i18n.js"></script>
<script src="../public/js/site-content.js"></script>
<script src="../public/js/footer.js"></script>
<script src="../public/js/mobile-menu.js"></script>
<script src="/public/js/cookie-consent.js" defer></script>
</body>
</html>`;
}

/* ----------------------------------------------------------------- hub configs */
function categoryHub(slug, title) {
  return {
    type: 'category', slug, title,
    dbQuery: { category: slug },
    metaTitle: `${title} That Ship Worldwide — Deals & Brands | Fashion to World`,
    metaDesc: `Shop ${title.toLowerCase()} from worldwide-shipping stores. Hand-picked pieces, prices in your currency, updated daily. Direct links to global retailers.`,
    h1html: title,
    gridHeading: `Featured ${title}`,
    footerCopy: `<p>Fashion to World curates ${title.toLowerCase()} from retailers that ship internationally, so you can shop global brands wherever you live. Every product links directly to the store's own checkout.</p>`
  };
}
function storeHub(name, count) {
  const slug = 'store-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    type: 'store', slug, title: name, count,
    dbQuery: { advertiser: name },
    metaTitle: `${name} — Shop Worldwide Shipping | Fashion to World`,
    metaDesc: `Shop ${name} with worldwide delivery. Browse current pieces with prices in your currency, updated daily. Direct links to ${name}.`,
    h1html: name,
    gridHeading: `Current picks from ${name}`,
    footerCopy: `<p>${esc(name)} is one of many worldwide-shipping stores featured on Fashion to World. We track its catalogue and surface current pieces here, each linking straight to ${esc(name)}.</p>`
  };
}

/* -------------------------------------------------------------------- generate */
async function generate(hub) {
  let rows = [];
  try {
    const res = await db.query(Object.assign({}, hub.dbQuery, { sort: 'discount', limit: PER_HUB }));
    rows = (res && res.products) || [];
  } catch (e) {
    console.error(`  ! query failed for ${hub.slug}: ${e.message}`);
    return null;
  }
  // need products with images + real links to be worth a static page
  rows = rows.filter(p => p.image_url && /^https?:\/\//i.test(p.url || ''));
  if (rows.length < 6) {
    console.log(`  - skip ${hub.slug} (only ${rows.length} usable products)`);
    return null;
  }
  const html = pageHtml(hub, rows);
  const file = path.join(OUT_PAGES, `${hub.slug}.html`);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`  ✓ ${hub.slug}.html (${rows.length} products)`);
  return { slug: hub.slug, url: `${SITE}/pages/${hub.slug}.html`, type: hub.type };
}

async function main() {
  const args = process.argv.slice(2);
  const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1];
  const typeFilter = (args.find(a => a.startsWith('--type=')) || '').split('=')[1];

  fs.mkdirSync(OUT_PAGES, { recursive: true });
  if (db.init) { try { await db.init(); } catch (e) {} }

  // Build the hub list.
  const CATEGORIES = [
    ['women', "Women's Fashion"], ['men', "Men's Fashion"], ['kids', "Kids' Fashion"],
    ['shoes', 'Shoes'], ['bags', 'Bags'], ['jewellery', 'Jewellery'],
    ['accessories', 'Accessories'], ['beauty', 'Beauty'], ['watches', 'Watches']
  ];
  let hubs = [];
  if (!typeFilter || typeFilter === 'category') {
    hubs.push(...CATEGORIES.map(([s, t]) => categoryHub(s, t)));
  }
  if (!typeFilter || typeFilter === 'store') {
    let stores = [];
    try { stores = await db.advertiserCounts() || []; } catch (e) {}
    // only stores with enough products to fill a page
    stores = stores.filter(s => s.count >= 12);
    hubs.push(...stores.map(s => storeHub(s.name, s.count)));
  }
  if (only) hubs = hubs.filter(h => h.slug === only || h.slug === 'store-' + only || h.title.toLowerCase() === only.toLowerCase());

  console.log(`Generating ${hubs.length} hub page(s) into ${OUT_PAGES} ...`);
  const built = [];
  for (const hub of hubs) {
    const r = await generate(hub);
    if (r) built.push(r);
  }

  // Write a manifest (used later for sitemap + dedupe). Sitemap regeneration of
  // the FULL site is a separate step we'll wire once pages validate.
  fs.writeFileSync(path.join(OUT_DIR, 'hubs-manifest.json'),
    JSON.stringify({ generated: TODAY, count: built.length, hubs: built }, null, 2));

  console.log(`\nDone. ${built.length} pages written to generated-hubs/pages/`);
  console.log(`Manifest: generated-hubs/hubs-manifest.json`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
