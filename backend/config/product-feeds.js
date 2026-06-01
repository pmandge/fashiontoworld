/**
 * ============================================================
 * FashionToWorld — Product Feed Sources (EDIT THIS)
 * ============================================================
 * Each feed declares which PARSER format to use, so you can mix
 * aggregators (Admitad, Awin, CJ, Rakuten...) in one site.
 *
 * Formats available:
 *   'admitad-yml'  → Admitad XML feeds (just url + advertiser)
 *   'generic-csv'  → Awin/CJ/Rakuten CSV feeds (also needs `columns`)
 *
 * RECOMMENDED: set feeds via the PRODUCT_FEEDS env var (keeps your
 * affiliate codes out of the code). Format for env (semicolon-
 * separated feeds, pipe-separated fields):
 *
 *   network|advertiser|format|url
 *
 * e.g.  admitad|Symbol Fashion|admitad-yml|https://export.admitad.com/...;admitad|Italo|admitad-yml|https://export.admitad.com/...
 *
 * CSV feeds (Awin etc.) need column mapping, which is easier to set
 * in the HARDCODED list below than in an env var.
 * ============================================================
 */

function fromEnv() {
  const raw = process.env.PRODUCT_FEEDS;
  if (!raw) return [];
  return raw.split(';').map(entry => {
    const parts = entry.split('|').map(s => s.trim());
    // Support both new 4-field and old 2-field (advertiser|url) formats
    if (parts.length >= 4) {
      const [network, advertiser, format, url] = parts;
      return { network, advertiser, format: format || 'admitad-yml', url };
    }
    const [advertiser, url] = parts;
    return { network: 'admitad', advertiser, format: 'admitad-yml', url };
  }).filter(f => f.url);
}

// Hardcoded feeds (use for CSV feeds that need column mapping)
const HARDCODED = [
  // --- Admitad (XML) example ---
  // { network: 'admitad', advertiser: 'Symbol Fashion', format: 'admitad-yml',
  //   url: 'https://export.admitad.com/.../export_adv_products/?user=...&code=...&format=xml' },

  // --- Awin (CSV) example — fill columns to match Awin's feed header ---
  // { network: 'awin', advertiser: 'Some Brand', format: 'generic-csv',
  //   url: 'https://productdata.awin.com/datafeed/download/...csv',
  //   columns: {
  //     id: 'aw_product_id', name: 'product_name', brand: 'brand_name',
  //     price: 'search_price', price_old: 'rrp_price', currency: 'currency',
  //     image_url: 'merchant_image_url', url: 'aw_deep_link',
  //     category: 'merchant_category', description: 'description',
  //   } },

  // --- CJ / Rakuten (CSV) — same pattern, different column names ---
];

function getFeeds() {
  const env = fromEnv();
  return [...env, ...HARDCODED];
}

module.exports = { getFeeds };
