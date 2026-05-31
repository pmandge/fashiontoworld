/**
 * ============================================================
 * FashionToWorld — Geo Detection Middleware
 * ============================================================
 * Detects the visitor's country (region) and best language
 * from the request, in priority order:
 *
 *   1. ?region= / ?lang= query override (user clicked a switcher)
 *   2. Cookie (user's saved preference)
 *   3. CDN header (Cloudflare: cf-ipcountry, Vercel: x-vercel-ip-country)
 *   4. Accept-Language header
 *   5. Fallback: region=US, lang=en
 *
 * Adds req.geo = { region, language, currency }
 * ============================================================
 */

// Map country → default language + currency for fashion shopping
const COUNTRY_DEFAULTS = {
  AE: { language: 'ar', currency: 'AED' },
  SA: { language: 'ar', currency: 'SAR' },
  US: { language: 'en', currency: 'USD' },
  GB: { language: 'en', currency: 'GBP' },
  DE: { language: 'de', currency: 'EUR' },
  FR: { language: 'fr', currency: 'EUR' },
  ES: { language: 'es', currency: 'EUR' },
  IT: { language: 'it', currency: 'EUR' },
  IN: { language: 'en', currency: 'INR' },
  BR: { language: 'pt', currency: 'BRL' },
  RU: { language: 'ru', currency: 'RUB' },
  JP: { language: 'ja', currency: 'JPY' },
  CN: { language: 'zh', currency: 'CNY' },
  AU: { language: 'en', currency: 'AUD' },
  CA: { language: 'en', currency: 'CAD' },
};

// Languages the site actually has translations for
const SUPPORTED_LANGUAGES = ['en', 'ar', 'de', 'fr', 'es', 'it', 'pt', 'ru'];

function parseAcceptLanguage(header) {
  if (!header) return null;
  // "en-US,en;q=0.9,ar;q=0.8" → "en"
  const first = header.split(',')[0].trim().split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(first) ? first : null;
}

function geoMiddleware(req, res, next) {
  // 1. Country from CDN headers (most reliable in production)
  const headerCountry =
    req.headers['cf-ipcountry'] ||              // Cloudflare
    req.headers['x-vercel-ip-country'] ||       // Vercel
    req.headers['x-country-code'] ||            // generic
    null;

  // 2. Resolve region
  let region =
    (req.query.region || '').toUpperCase() ||
    (req.cookies?.fw_region || '').toUpperCase() ||
    (headerCountry || '').toUpperCase() ||
    'US';

  const defaults = COUNTRY_DEFAULTS[region] || { language: 'en', currency: 'USD' };

  // 3. Resolve language
  let language =
    (req.query.lang || '').toLowerCase() ||
    (req.cookies?.fw_lang || '').toLowerCase() ||
    parseAcceptLanguage(req.headers['accept-language']) ||
    defaults.language ||
    'en';

  if (!SUPPORTED_LANGUAGES.includes(language)) language = 'en';

  req.geo = {
    region,
    language,
    currency: defaults.currency,
    detectedCountry: headerCountry,
  };

  next();
}

module.exports = { geoMiddleware, COUNTRY_DEFAULTS, SUPPORTED_LANGUAGES };
