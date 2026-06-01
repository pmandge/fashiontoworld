/**
 * ============================================================
 * FashionToWorld — Brand Logo Resolver
 * ============================================================
 * Resolves brand NAMES (from product feeds) to logo image URLs.
 *
 * HONEST EXPECTATIONS:
 *  - Well-known brands (Nike, Zara, Gucci...) usually resolve.
 *  - Obscure / mis-spelled brand names often won't — those fall
 *    back to a clean styled text badge on the card (handled in UI).
 *  - We only look up each UNIQUE brand once, then cache the result
 *    in the DB, so 150k products = a few thousand lookups max.
 *
 * METHOD: We use logo.dev / Clearbit-style domain logo endpoints,
 * which return a logo for a domain. We derive a likely domain from
 * the brand name. No API key needed for the basic logo endpoint;
 * set LOGO_API_TOKEN if you sign up for a higher-rate service.
 * ============================================================
 */

const https = require('https');
const productDb = require('./product-db');

// Known brand → domain overrides (improves hit rate for big names)
const DOMAIN_OVERRIDES = {
  'roberto cavalli': 'robertocavalli.com',
  'nike': 'nike.com', 'adidas': 'adidas.com', 'zara': 'zara.com',
  'h&m': 'hm.com', 'gucci': 'gucci.com', 'prada': 'prada.com',
  'versace': 'versace.com', 'dolce & gabbana': 'dolcegabbana.com',
  'calvin klein': 'calvinklein.com', 'tommy hilfiger': 'tommy.com',
  'ralph lauren': 'ralphlauren.com', 'levi\'s': 'levi.com', 'levis': 'levi.com',
  'mango': 'mango.com', 'asos': 'asos.com', 'dkny': 'dkny.com',
  'guess': 'guess.com', 'diesel': 'diesel.com', 'lacoste': 'lacoste.com',
  'puma': 'puma.com', 'reebok': 'reebok.com', 'new balance': 'newbalance.com',
  'michael kors': 'michaelkors.com', 'coach': 'coach.com', 'fendi': 'fendi.com',
  'balenciaga': 'balenciaga.com', 'burberry': 'burberry.com', 'armani': 'armani.com',
};

function brandToDomain(brand) {
  const key = brand.trim().toLowerCase();
  if (DOMAIN_OVERRIDES[key]) return DOMAIN_OVERRIDES[key];
  // derive: strip non-alphanumerics, append .com
  const slug = key.replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  if (!slug) return null;
  return slug + '.com';
}

function logoUrlFor(domain) {
  // logo.dev public logo endpoint (token optional via LOGO_API_TOKEN)
  const token = process.env.LOGO_API_TOKEN;
  if (token) return `https://img.logo.dev/${domain}?token=${token}&size=128&format=png`;
  // Clearbit logo endpoint (no key, best-effort)
  return `https://logo.clearbit.com/${domain}`;
}

// HEAD-check a logo URL to see if it actually exists (avoids broken images)
function logoExists(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({ method: 'HEAD', hostname: u.hostname, path: u.pathname + u.search, timeout: 6000 },
        (res) => resolve(res.statusCode >= 200 && res.statusCode < 400));
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch { resolve(false); }
  });
}

/**
 * Resolve logos for all distinct brands currently in the DB and
 * store the result (logo URL or '' for "no logo, use text").
 * Run this AFTER a product sync. Gentle, cached, one pass.
 */
async function resolveBrandLogos() {
  const brands = await productDb.distinctBrands();
  console.log(`[BrandLogos] Resolving logos for ${brands.length} brands...`);
  let found = 0;
  for (const brand of brands) {
    const domain = brandToDomain(brand);
    if (!domain) { await productDb.setBrandLogo(brand, ''); continue; }
    const url = logoUrlFor(domain);
    const ok = await logoExists(url);
    await productDb.setBrandLogo(brand, ok ? url : '');
    if (ok) found++;
    await new Promise(r => setTimeout(r, 120)); // be gentle on the logo service
  }
  console.log(`[BrandLogos] Done — ${found}/${brands.length} brands got a logo (rest use text badge)`);
  return { total: brands.length, found };
}

module.exports = { resolveBrandLogos, brandToDomain, logoUrlFor };
