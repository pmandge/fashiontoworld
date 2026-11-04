// Pure render helpers for the product edge function.
// ESM (.mjs) so both Netlify Edge (Deno) and Node tests can import it.

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function img(u, w) {
  if (!u) return '';
  return 'https://images.weserv.nl/?url=' +
    encodeURIComponent(String(u).replace(/^https?:\/\//, '')) +
    '&w=' + (w || 700) + '&output=webp&q=82';
}

// Inject per-product SEO (title, meta, canonical, OG, Product JSON-LD) + a
// crawlable content block into the static product.html shell. The client JS
// still hydrates the full interactive PDP on top (it reads the id from the
// ftw:pid meta / clean URL). Returns the modified HTML string.
export function injectProduct(shell, p, id, canonicalUrl) {
  const name = p.name || 'Product';
  const brand = p.brand || p.advertiser || '';
  const price = Number(p.price) || 0;
  const priceOld = Number(p.price_old) || 0;
  const cur = p.currency || p.display_currency || 'USD';
  const image = img(p.image_url || (p.images && p.images[0]), 800);
  const link = p.affiliate_url || p.url || '';
  const retailer = p.advertiser || brand || 'our partner store';
  const title = (brand ? brand + ' ' : '') + name + ' — Fashion to World';
  const desc = (brand ? brand + ' · ' : '') + name +
    ' — ships worldwide, priced in your currency. Compare and shop via worldwide-shipping stores.';
  const priceMain = p.price_display || ((price ? price.toFixed(2) : '') + ' ' + cur).trim();
  const priceOldTxt = p.price_old_display || (priceOld ? priceOld.toFixed(2) + ' ' + cur : '');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: image ? [image] : undefined,
    description: p.description ? String(p.description).slice(0, 500) : desc,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    offers: {
      '@type': 'Offer',
      price: price ? price.toFixed(2) : undefined,
      priceCurrency: cur,
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    },
  };

  const headBlock = [
    `<link rel="canonical" href="${esc(canonicalUrl)}">`,
    `<meta name="ftw:pid" content="${esc(id)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    image ? `<meta property="og:image" content="${esc(image)}">` : '',
    `<meta property="og:url" content="${esc(canonicalUrl)}">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}</script>`,
  ].filter(Boolean).join('\n');

  const contentBlock = `
    <div class="pdp-grid">
      <div class="pdp-gallery">${image ? `<img class="pdp-main-img" src="${esc(image)}" alt="${esc(name)}" width="800" height="1000">` : ''}</div>
      <div class="pdp-info">
        ${brand ? `<p class="pdp-brand">${esc(brand)}</p>` : ''}
        <h1 class="pdp-name">${esc(name)}</h1>
        <div class="pdp-price-row"><span class="pdp-price">${esc(priceMain)}</span>${priceOld > price && priceOldTxt ? `<span class="pdp-price-old">${esc(priceOldTxt)}</span>` : ''}</div>
        <p class="pdp-retailer">Sold &amp; shipped by <b>${esc(retailer)}</b> — ships worldwide</p>
        ${link ? `<a class="pdp-cta" href="${esc(link)}" target="_blank" rel="nofollow noopener sponsored">Shop Now</a>` : ''}
        ${p.description ? `<div class="pdp-desc"><h3>Details</h3><p>${esc(String(p.description).slice(0, 900))}</p></div>` : ''}
      </div>
    </div>`;

  let out = shell;
  out = out.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  out = out.replace(/(<meta\s+name="description"[^>]*content=")[^"]*(")/i, `$1${esc(desc)}$2`);
  out = out.replace(/<\/head>/i, headBlock + '\n</head>');
  // Prepend the crawlable block inside #pdpContent (client overwrites on hydrate).
  out = out.replace(/(<div[^>]*id="pdpContent"[^>]*>)/i, `$1${contentBlock}`);
  return out;
}
