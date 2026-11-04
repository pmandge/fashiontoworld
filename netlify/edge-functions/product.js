// Netlify Edge Function — on-demand render of product pages at /product/<slug>-<id>.
// Fetches the product, injects SEO head + Product JSON-LD + a crawlable content
// block into the static product.html shell, and CDN-caches the result. Scales to
// the full catalogue (renders on first request, cached thereafter).
//
// FAIL-SAFE: any problem (bad id, API error, missing product, fetch failure)
// 302-redirects to the existing client-rendered /pages/product.html?id=<id>,
// which works today — so a product URL is never a broken page.
import { injectProduct, slugify } from './product-render.mjs';

const API = (typeof Deno !== 'undefined' && Deno.env.get('FTW_API_BASE')) || 'https://api.fashiontoworld.co';

export default async (request) => {
  const url = new URL(request.url);
  // /product/<id>/<slug> — id is the first segment (format-agnostic: numeric,
  // prefixed or hyphenated ids all work). slug is decorative.
  const m = url.pathname.match(/^\/product\/([^/]+)/);
  if (!m) return; // not a product URL -> pass through
  const id = decodeURIComponent(m[1]);
  const fallback = () =>
    Response.redirect(new URL('/pages/product.html?id=' + encodeURIComponent(id), url.origin).toString(), 302);

  let product;
  try {
    const r = await fetch(API + '/api/products/' + encodeURIComponent(id), { headers: { accept: 'application/json' } });
    if (!r.ok) return fallback();
    const d = await r.json();
    product = d && d.product;
    if (!product || !product.name) return fallback();
  } catch (_) { return fallback(); }

  let shell;
  try {
    const s = await fetch(new URL('/pages/product.html', url.origin).toString());
    if (!s.ok) return fallback();
    shell = await s.text();
  } catch (_) { return fallback(); }

  // Canonical = the slugged form, so /product/<id> and /product/<id>/<slug>
  // all consolidate onto one URL.
  const canonical = url.origin + '/product/' + encodeURIComponent(id) + '/' + slugify(product.name);
  let html;
  try { html = injectProduct(shell, product, id, canonical); } catch (_) { return fallback(); }

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // No browser cache; cache hard at the CDN with background revalidation.
      'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
      'x-ftw-rendered': 'product-edge',
    },
  });
};

export const config = { path: '/product/*' };
