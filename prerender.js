#!/usr/bin/env node
/**
 * FashionToWorld — build-time prerender for listing pages.
 *
 * Bakes the top products into each category/deals page's #productsGrid at build
 * time so the content is crawlable (fixes "Crawled - currently not indexed")
 * and paints fast. The existing client JS still hydrates on top (live prices,
 * filters, load-more) — this only fills the initial static HTML.
 *
 * FAIL-SAFE: any page whose fetch fails or returns too few products is left
 * exactly as committed (client-render fallback). This script never throws, so
 * it can never break a Netlify deploy. Runs at build where the API is reachable.
 *
 * Run: `node prerender.js`  (wired as the Netlify build command)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const API = process.env.FTW_API_BASE || 'https://api.fashiontoworld.co';
const PER_PAGE = parseInt(process.env.FTW_PRERENDER_COUNT, 10) || 48;
const MIN_OK = 8; // fewer than this -> leave the page alone

// page file -> { params for the API, gridId to inject into }
const TARGETS = [
  ['pages/women.html',       { category: 'women' },      'productsGrid'],
  ['pages/men.html',         { category: 'men' },        'productsGrid'],
  ['pages/shoes.html',       { category: 'shoes' },      'productsGrid'],
  ['pages/bags.html',        { category: 'bags' },       'productsGrid'],
  ['pages/watches.html',     { category: 'watches' },    'productsGrid'],
  ['pages/jewellery.html',   { category: 'jewellery' },  'productsGrid'],
  ['pages/accessories.html', { category: 'accessories' },'productsGrid'],
  ['pages/beauty.html',      { category: 'beauty' },     'productsGrid'],
  ['pages/kids.html',        { category: 'kids' },       'productsGrid'],
  // deals uses the same product-card markup, a different grid, and discount params
  ['pages/deals.html',       { sale: 'true', markdown: 'true', sort: 'discount', minprice: '5' }, 'dealsGrid'],
  // brand pages are handled on the on-demand edge layer (Phase 5), not here.
];

// ---------- pure helpers (exported for tests) ----------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function httpsImg(u) { return u ? String(u).replace(/^http:\/\//i, 'https://') : ''; }
function optimizedImg(u, w) {
  if (!u) return '';
  const stripped = String(u).replace(/^https?:\/\//i, '');
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(stripped) +
         '&w=' + (w || 400) + '&we&output=webp&q=82';
}
function priceText(p) {
  if (p.price_display) return p.price_display;
  const n = Number(p.price);
  return n ? (p.currency === 'USD' || !p.currency ? '$' + n.toFixed(2) : n.toFixed(2) + ' ' + p.currency) : '';
}
function priceOldText(p) {
  if (p.price_old_display) return p.price_old_display;
  const n = Number(p.price_old);
  return n ? (p.currency === 'USD' || !p.currency ? '$' + n.toFixed(2) : n.toFixed(2) + ' ' + p.currency) : '';
}

function card(p, i) {
  const link = p.affiliate_url || p.url || '';
  if (!/^https?:\/\//i.test(link)) return ''; // only real outbound links, like the client
  const hasDisc = p.price_old && Number(p.price_old) > Number(p.price);
  const disc = hasDisc ? Math.round((1 - Number(p.price) / Number(p.price_old)) * 100) : 0;
  const eager = i < 4;
  const brand = esc(p.brand || p.advertiser_name || '');
  const name = esc(p.name || '');
  // Internal product-page link (crawlable, followable) so Google can discover and
  // index /product/ pages — the card body goes here; "Shop Now" stays the outbound
  // affiliate link. Without this the product pages are orphans (sitemap-only) and
  // never index. Falls back to a plain div when there's no id.
  const purl = (p.id != null && p.id !== '') ? '/product/' + encodeURIComponent(p.id) + '/' + slugify(p.name) : '';
  const bodyOpen = purl ? '<a class="product-card-link" href="' + esc(purl) + '">' : '<div class="product-card-link">';
  const bodyClose = purl ? '</a>' : '</div>';
  return `
      <div class="product-card" data-product-id="${esc(p.id)}">
        ${bodyOpen}
          <div class="product-img">
            <img src="${esc(optimizedImg(p.image_url, 400))}" alt="${name}" width="400" height="500" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" data-orig="${esc(httpsImg(p.image_url))}"
                 onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src=this.getAttribute('data-orig');}else{this.onerror=null;var c=this.closest('.product-card');if(c)c.remove();}">
            ${hasDisc ? `<span class="product-badge sale">-${disc}%</span>` : ''}
          </div>
          <div class="product-body">
            <p class="product-brand">${brand}</p>
            <h3 class="product-name">${name}</h3>
            <div class="product-price-row">
              <span class="product-price">${esc(priceText(p))}</span>
              ${hasDisc ? `<span class="product-original">${esc(priceOldText(p))}</span>` : ''}
              ${disc ? `<span class="product-discount">-${disc}%</span>` : ''}
            </div>
          </div>
        ${bodyClose}
        <div class="product-footer"><a class="btn-product" href="${esc(link)}" target="_blank" rel="noopener sponsored nofollow">Shop Now</a></div>
      </div>`;
}

function itemListLd(products, pageUrl) {
  const items = products.slice(0, PER_PAGE).map((p, i) => ({
    '@type': 'ListItem', position: i + 1,
    name: String(p.name || '').slice(0, 160),
    image: httpsImg(p.image_url) || undefined,
  }));
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', url: pageUrl, numberOfItems: items.length, itemListElement: items };
  return '<script type="application/ld+json">\n' + JSON.stringify(ld) + '\n</script>\n';
}

// Replace the inner skeletons of #productsGrid with the prerendered cards,
// and inject an ItemList before </head>. Returns null if the grid isn't found.
function injectGrid(html, cardsHtml, itemLd, gridId) {
  gridId = gridId || 'productsGrid';
  const idIdx = html.search(new RegExp('<div[^>]*id="' + gridId + '"[^>]*>', 'i'));
  if (idIdx === -1) return null;
  const openTag = (html.slice(idIdx).match(/^<div[^>]*>/i) || [])[0];
  if (!openTag) return null;
  // Walk tag depth to find THIS div's matching close (skeleton children nest divs).
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = idIdx + openTag.length;
  let depth = 1, m, closeIdx = -1;
  while ((m = re.exec(html))) {
    if (m[0].toLowerCase() === '</div>') { if (--depth === 0) { closeIdx = m.index; break; } }
    else depth++;
  }
  if (closeIdx === -1) return null;
  let out = html.slice(0, idIdx) + openTag + '\n' + cardsHtml + '\n        ' + html.slice(closeIdx);
  if (itemLd && !/"@type":"ItemList"/.test(out)) {
    const h = out.toLowerCase().indexOf('</head>');
    if (h !== -1) out = out.slice(0, h) + itemLd + out.slice(h);
  }
  return out;
}

async function fetchProducts(params) {
  if (typeof fetch !== 'function') { console.warn('[prerender] no global fetch; skipping'); return []; }
  const u = new URL(API + '/api/admitad/products');
  Object.entries(Object.assign({ limit: PER_PAGE, sort: 'popularity', currency: 'USD' }, params))
    .forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  return (data && data.products) || [];
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'item';
}

// Curated product sitemap: top products per category -> /product/<id>/<slug>.
// Written to sitemap-products.xml (referenced from robots.txt). Fail-safe.
async function buildProductSitemap() {
  const PER_CAT = parseInt(process.env.FTW_SITEMAP_PER_CAT, 10) || 300;
  const cats = ['women', 'men', 'shoes', 'bags', 'watches', 'jewellery', 'accessories', 'beauty', 'kids'];
  const seen = Object.create(null);
  const urls = [];
  for (const c of cats) {
    let prods = [];
    try { prods = await fetchProducts({ category: c, limit: PER_CAT, sort: 'popularity' }); }
    catch (e) { console.warn('[prerender] sitemap fetch', c, '-', e.message); continue; }
    for (const p of prods) {
      if (!p || p.id == null) continue;
      const id = String(p.id);
      if (seen[id]) continue;
      seen[id] = 1;
      const loc = 'https://fashiontoworld.co/product/' + encodeURIComponent(id) + '/' + slugify(p.name);
      const lastmod = Number(p.updated_at) ? new Date(Number(p.updated_at)).toISOString().slice(0, 10) : '';
      urls.push('  <url><loc>' + loc + '</loc>' + (lastmod ? '<lastmod>' + lastmod + '</lastmod>' : '') + '<changefreq>weekly</changefreq></url>');
    }
  }
  if (urls.length < 50) { console.warn('[prerender] product sitemap: only ' + urls.length + ' urls — skipping'); return; }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
  fs.writeFileSync(path.join(__dirname, 'sitemap-products.xml'), xml);
  console.log('[prerender] product sitemap: ' + urls.length + ' product URLs written');
}

async function run() {
  const root = __dirname;
  let done = 0, skipped = 0;
  for (const [rel, params, gridId] of TARGETS) {
    const file = path.join(root, rel);
    try {
      if (!fs.existsSync(file)) { skipped++; continue; }
      const products = await fetchProducts(params);
      const cards = products.slice(0, PER_PAGE).map(card).filter(Boolean);
      if (cards.length < MIN_OK) { console.warn('[prerender] too few for', rel, '(' + cards.length + ') — leaving as-is'); skipped++; continue; }
      const pageUrl = 'https://fashiontoworld.co/' + rel;
      const html = fs.readFileSync(file, 'utf8');
      const out = injectGrid(html, cards.join('\n'), itemListLd(products, pageUrl), gridId);
      if (!out) { console.warn('[prerender] no #productsGrid in', rel); skipped++; continue; }
      fs.writeFileSync(file, out);
      console.log('[prerender] baked', cards.length, 'products into', rel);
      done++;
    } catch (e) {
      console.warn('[prerender] skip', rel, '-', e.message);
      skipped++;
    }
  }
  try { await buildProductSitemap(); } catch (e) { console.warn('[prerender] product sitemap failed:', e.message); }
  console.log(`[prerender] done: ${done} pages baked, ${skipped} left as-is`);
}

module.exports = { esc, optimizedImg, httpsImg, priceText, card, itemListLd, injectGrid, slugify, buildProductSitemap };
if (require.main === module) run();
