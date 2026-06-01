/**
 * ============================================================
 * FashionToWorld — API Endpoint Config
 * ============================================================
 * ONE place that decides where the website fetches data from.
 *
 * - Empty string ('')  → same site (Netlify functions). Use this
 *   while coupons are served by Netlify.
 * - Full URL           → your DigitalOcean server, once everything
 *   (coupons + products) is unified there.
 *
 * EXAMPLES:
 *   window.API_BASE = '';                                  // Netlify
 *   window.API_BASE = 'https://api.fashiontoworld.co';     // DigitalOcean (with subdomain + HTTPS)
 *   window.API_BASE = 'http://123.45.67.89:8080';          // DigitalOcean (raw IP, testing only)
 *
 * NOTE: browsers block "mixed content" — if your site is https,
 * the API must also be https. Use the subdomain option for production.
 * ============================================================
 */
window.API_BASE = '';

// Helper: build a full API URL from a path like '/api/admitad/coupons'
window.apiUrl = function (path) {
  var base = window.API_BASE || '';
  if (!path.startsWith('/')) path = '/' + path;
  return base + path;
};
