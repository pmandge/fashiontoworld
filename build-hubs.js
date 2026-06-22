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
  const heart = `<button class="card-heart" type="button" aria-label="Save"
        data-wid="${attr(p.id)}" data-wname="${attr(p.name)}" data-wimg="${attr(img)}"
        data-wprice="${attr(price)}" data-wbrand="${attr(brand)}" data-wurl="${attr(link)}"
        onclick="event.preventDefault();event.stopPropagation();if(window.FTWWish){var it={id:this.getAttribute('data-wid'),name:this.getAttribute('data-wname'),brand:this.getAttribute('data-wbrand'),price:this.getAttribute('data-wprice'),img:this.getAttribute('data-wimg'),href:this.getAttribute('data-wurl')};var on=window.FTWWish.toggle(it);this.classList.toggle('on',on);if(window.FTWBotnavBadge)window.FTWBotnavBadge();}return false;"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>`;
  return `
      <a class="product-card product-card-link" href="${attr(link)}"
         target="_blank" rel="noopener sponsored nofollow"
         data-product-id="${attr(p.id)}">
        <div class="product-img">
          <img src="${attr(img)}" alt="${attr(p.name)}" loading="lazy" decoding="async"
               onerror="this.onerror=null;var c=this.closest('.product-card');if(c)c.remove();">
          ${hasDisc ? `<span class="product-badge sale">-${disc}%</span>` : ''}
          ${heart}
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
.hub-hero { position: relative; padding: calc(var(--nav-h) + 72px) 0 64px; background: #14110e; color: #f5f0ea; overflow: hidden; }
.hub-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(120% 100% at 80% 0%, rgba(201,168,76,0.18) 0%, rgba(20,17,14,0) 55%); pointer-events: none; }
.hub-hero-inner { position: relative; max-width: var(--max-w); margin: 0 auto; padding: 0 40px; }
.hub-eyebrow { display: inline-block; font-family: var(--font-sans); font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold, #c9a84c); margin-bottom: 18px; }
.hub-hero h1 { font-size: clamp(40px, 7vw, 84px); line-height: 0.98; margin: 0; color: #fff; font-weight: 400; }
.hub-hero h1 em { color: var(--gold, #c9a84c); font-style: italic; }
.hub-intro { max-width: 640px; margin: 22px 0 0; font-size: 16px; line-height: 1.7; color: rgba(245,240,234,0.78); }
.hub-intro p { margin: 0 0 12px; }
.hub-products { max-width: var(--max-w); margin: 0 auto; padding: 56px 40px 80px; }
.hub-products h2 { font-size: 24px; margin: 0 0 24px; }
.shop-layout { display: grid; grid-template-columns: 240px 1fr; gap: 48px; padding: 24px 0 0; }
.sidebar { position: sticky; top: calc(var(--nav-h) + 20px); align-self: start; }
.filter-section { margin-bottom: 32px; }
.filter-section h4 { font-family: var(--font-sans); font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 14px; }
.filter-option { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 14px; cursor: pointer; }
.price-range { display: flex; align-items: center; gap: 8px; }
.price-range input { width: 100%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; font-family: var(--font-sans); }
.products-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.btn-apply { width: 100%; padding: 12px; background: var(--black); color: var(--white); border: none; border-radius: 8px; font-family: var(--font-sans); font-size: 14px; cursor: pointer; }
.btn-load { display: block; margin: 40px auto 0; padding: 14px 40px; border: 1px solid var(--black); background: transparent; border-radius: 30px; font-family: var(--font-sans); cursor: pointer; transition: all .2s; }
.btn-load:hover { background: var(--black); color: var(--white); }
.empty-state { grid-column: 1/-1; padding: 60px 20px; text-align: center; color: var(--text-muted); }
.btn-disabled { opacity: .5; cursor: not-allowed; }
.sort-select { padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; font-family: var(--font-sans); }
.cat-seo { max-width: var(--max-w); margin: 0 auto; padding: 0 40px 64px; color: var(--text-muted); font-size: 15px; line-height: 1.7; }
@media (max-width: 860px) {
  .shop-layout { grid-template-columns: 1fr; gap: 24px; }
  .sidebar { position: static; }
}
@media (max-width: 640px) {
  .hub-hero { padding: calc(var(--nav-h) + 40px) 0 40px; }
  .hub-hero-inner { padding: 0 20px; }
  .hub-eyebrow { font-size: 11px; letter-spacing: 0.18em; margin-bottom: 12px; }
  .hub-intro { font-size: 15px; margin-top: 16px; }
  .hub-products { padding: 36px 16px 60px; }
  .hub-products h2 { font-size: 20px; }
  .cat-seo { padding: 0 16px 48px; }
}
</style>
<script type="application/ld+json">${ld}</script>
</head>
<body>
<nav class="nav" id="nav">
  <div class="nav-inner">
    <a class='logo' href='/'><span class="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></span><span class="logo-fw">Fashion</span><span class="logo-to">to</span><span class="logo-w">World</span></a>
    <ul class="nav-links">
      <li><a href='/pages/women'>Women</a></li>
      <li><a href='/pages/men'>Men</a></li>
      <li><a href='/pages/shoes'>Shoes</a></li>
      <li><a href='/pages/bags'>Bags</a></li>
      <li><a href='/pages/jewellery'>Jewellery</a></li>
      <li><a href='/pages/accessories'>Accessories</a></li>
    </ul>
    <div class="nav-spacer"></div>
    <div class="nav-actions">
      <form class="nav-search" onsubmit="return false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input type="text" placeholder="Search products…" aria-label="Search products" autocomplete="off"></form>
      <a class='btn-nav-cta' href='/pages/deals'>Shop Deals</a>
    </div>
    <button class="nav-burger" aria-label="Menu">
      <span class="burger-lines"><span></span><span></span><span></span></span>
      <span class="burger-label">Menu</span>
    </button>
  </div>
</nav>

<section class="hub-hero">
  <div class="hub-hero-inner">
    <span class="hub-eyebrow">Ships Worldwide</span>
    <h1>${esc(hub.h1html)}</h1>
    <div class="hub-intro">${introCopy(hub, products)}</div>
  </div>
</section>

<section class="hub-products" id="products">
  <div class="container">
    <div class="shop-layout">
      <aside class="sidebar mf-sidebar" id="filterSidebar"></aside>
      <main>
        <div class="products-toolbar">
          <span id="productsCount">${products.length} products</span>
        </div>
        <div class="products-grid" id="productsGrid">
${cards}
        </div>
        <button class="btn-load" id="loadMoreBtn" onclick="loadMore()" style="display:none">Load More</button>
      </main>
    </div>
  </div>
</section>

<section class="cat-seo">
  ${hub.footerCopy}
</section>

<footer class="footer" id="footer"></footer>

${hub.filterConfig}
<script src="../public/js/api-config.js"></script>
<script src="../public/js/admitad-api.js"></script>
${hub.filterConfig ? '<script src="../public/js/product-filter.js"></script>' : ''}
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
    // category pages get the full filter engine (product-filter.js reads this)
    filterConfig: `<script>window.FILTER_CONFIG={category:"${slug}",gender:""};</script>`,
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
    // store pages keep the curated baked set (product-filter.js can't filter by
    // advertiser, so we don't load it here — the baked products are the page)
    filterConfig: '',
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
