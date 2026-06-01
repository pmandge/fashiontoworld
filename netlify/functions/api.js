/**
 * ============================================================
 * FashionToWorld — Netlify Serverless Function
 * ============================================================
 * One function that powers the whole Admitad fashion API on
 * Netlify's free tier. Self-contained (no external requires)
 * so it "just works" when deployed.
 *
 * Set these in Netlify → Site settings → Environment variables:
 *   ADMITAD_CLIENT_ID
 *   ADMITAD_CLIENT_SECRET
 *   ADMITAD_WEBSITE_ID
 *
 * Routes (via netlify.toml redirect /api/* → this function):
 *   /api/admitad/coupons    → fashion-only, geo-aware coupons
 *   /api/admitad/products   → fashion products
 *   /api/geo                → detected country/language/currency
 * ============================================================
 */

const API_BASE = 'https://api.admitad.com';

const FASHION_PATTERNS = ['fashion','clothing','clothes','apparel','shoes','footwear','bags','accessories','jewelry','jewellery','watches','lingerie','underwear','swimwear','kids','children','beauty','cosmetics','sportswear','activewear','luxury'];
const FASHION_BRANDS = ['asos','zara','h&m','mango','farfetch','net-a-porter','revolve','nordstrom','shein','boohoo','nike','adidas','gucci','prada','burberry','uniqlo','zalando','aboutyou','namshi','ounass','sivvi','6thstreet','centrepoint','max fashion'];
const EXCLUDE = ['electronics','computer','laptop','phone','mobile','gadget','travel','flight','hotel','booking','tour','airline','food','grocery','restaurant','meal','finance','bank','loan','insurance','crypto','forex','casino','betting','pharma','medicine','supplement','furniture','appliance','garden','car','auto','tire','vehicle','software','hosting','vpn','gaming','education','course','pet'];

const COUNTRY_DEFAULTS = {
  AE:{language:'ar',currency:'AED'}, SA:{language:'ar',currency:'SAR'}, US:{language:'en',currency:'USD'},
  GB:{language:'en',currency:'GBP'}, DE:{language:'de',currency:'EUR'}, FR:{language:'fr',currency:'EUR'},
  ES:{language:'es',currency:'EUR'}, IT:{language:'it',currency:'EUR'}, IN:{language:'en',currency:'INR'},
  BR:{language:'pt',currency:'BRL'}, AU:{language:'en',currency:'AUD'}, CA:{language:'en',currency:'CAD'},
};

let tokenCache = { token: null, exp: 0 };
let fashionCatCache = { ids: null, at: 0 };

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp - 60000) return tokenCache.token;

  // Admitad requires HTTP Basic auth: Authorization: Basic base64(client_id:client_secret)
  // You can either provide ADMITAD_BASE64_HEADER directly (from the credentials page),
  // or we build it from client_id + client_secret.
  let basic = process.env.ADMITAD_BASE64_HEADER;
  if (!basic) {
    basic = Buffer.from(
      process.env.ADMITAD_CLIENT_ID + ':' + process.env.ADMITAD_CLIENT_SECRET
    ).toString('base64');
  }

  // Scopes must be SPACE-separated. Admitad publisher data uses *_for_website
  // variants. The 403 errors tell us the exact name needed if one is wrong.
  // You can override via the ADMITAD_SCOPE env var without code changes.
  const scope = process.env.ADMITAD_SCOPE || [
    'public_data',
    'coupons_for_website',
    'advcampaigns_for_website',
    'banners_for_website',
    'websites',
    'deeplink_generator',
    'manage_advcampaigns',
  ].join(' ');

  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('client_id', process.env.ADMITAD_CLIENT_ID);
  body.set('scope', scope);

  const r = await fetch(`${API_BASE}/token/`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + basic,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`token ${r.status} ${txt.slice(0, 200)}`);
  }
  const d = await r.json();
  tokenCache = { token: d.access_token, exp: Date.now() + d.expires_in * 1000 };
  return tokenCache.token;
}

async function adGet(endpoint, params = {}) {
  const token = await getToken();
  const url = new URL(API_BASE + endpoint);
  if (process.env.ADMITAD_WEBSITE_ID) url.searchParams.set('website', process.env.ADMITAD_WEBSITE_ID);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach(i => url.searchParams.append(k, i));
    else url.searchParams.set(k, v);
  }
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`admitad ${endpoint} ${r.status} ${txt.slice(0, 150)}`);
  }
  return r.json();
}

async function fashionCategoryIds() {
  const DAY = 86400000;
  if (fashionCatCache.ids && Date.now() - fashionCatCache.at < DAY) return fashionCatCache.ids;
  try {
    const d = await adGet('/coupons/categories/', { limit: 500 });
    const ids = (d.results || [])
      .filter(c => FASHION_PATTERNS.some(p => (c.name || '').toLowerCase().includes(p)))
      .map(c => c.id);
    fashionCatCache = { ids, at: Date.now() };
    return ids;
  } catch (e) {
    // If categories aren't accessible, skip category filtering (we still
    // filter fashion client-side by name/brand). Don't break the coupons call.
    fashionCatCache = { ids: [], at: Date.now() };
    return [];
  }
}

function normCoupon(c) {
  return {
    id: c.id, name: c.name, description: c.description || '',
    advertiser_name: c.campaign?.name || '', advertiser_id: c.campaign?.id || '',
    promocode: c.promocode || '', discount: c.discount || '', status: c.status,
    rating: parseFloat(c.rating || 0), regions: c.regions || [], language: c.language || 'en',
    types: (c.types || []).map(t => t.name), categories: (c.categories || []).map(x => x.name),
    image: c.image ? (c.image.startsWith('//') ? 'https:' + c.image : c.image) : '',
    url: c.goto_link || '', date_end: c.date_end || null,
  };
}

function normProduct(p) {
  return {
    id: p.id, name: p.name, brand: p.brand || '', advertiser_name: p.advertiser_name || '',
    price: parseFloat(p.price || 0), price_old: p.old_price ? parseFloat(p.old_price) : null,
    currency: p.currency_id || 'USD', image_url: p.images?.[0]?.url || p.picture || '',
    url: p.url || '', affiliate_url: p.deeplink || p.url || '',
    category: p.category?.name || '', is_new: p.is_new || false,
  };
}

function detectGeo(event) {
  const headerCountry = event.headers['x-country'] || event.headers['x-nf-geo-country']
    || event.headers['cf-ipcountry'] || null;
  const q = event.queryStringParameters || {};
  let region = (q.region || headerCountry || 'US').toUpperCase();
  const def = COUNTRY_DEFAULTS[region] || { language: 'en', currency: 'USD' };
  let language = (q.lang || def.language || 'en').toLowerCase();
  return { region, language, currency: def.currency, detectedCountry: headerCountry };
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  const path = event.path.replace('/.netlify/functions/api', '').replace(/^\/api/, '');
  const q = event.queryStringParameters || {};
  const geo = detectGeo(event);

  try {
    // /geo
    if (path.endsWith('/geo')) {
      return { statusCode: 200, headers, body: JSON.stringify(geo) };
    }

    // /admitad/programs — how many advertiser programs are joined (diagnostic)
    if (path.includes('programs')) {
      try {
        const data = await adGet(`/advcampaigns/website/${process.env.ADMITAD_WEBSITE_ID}/`, { limit: 100 });
        const all = data.results || [];
        const connected = all.filter(p => p.connection_status === 'active' || p.status === 'active');
        return { statusCode: 200, headers, body: JSON.stringify({
          total_available: data._meta?.count || all.length,
          connected_count: connected.length,
          connected: connected.slice(0, 20).map(p => ({ name: p.name, status: p.connection_status || p.status })),
        }) };
      } catch (e) {
        return { statusCode: 200, headers, body: JSON.stringify({ error: e.message }) };
      }
    }

    // Missing credentials → tell the front-end to use demo fallback
    if (!process.env.ADMITAD_CLIENT_ID) {
      return { statusCode: 200, headers, body: JSON.stringify({ coupons: [], products: [], total: 0, demo: true }) };
    }

    // /admitad/coupons  (FASHION ONLY)
    if (path.includes('coupons')) {
      const limit = parseInt(q.limit || 24);
      const page = parseInt(q.page || 1);
      const catIds = await fashionCategoryIds();
      const data = await adGet('/coupons/', {
        limit, offset: (page - 1) * limit, order_by: '-rating',
        language: geo.language, category: catIds.length ? catIds : undefined,
        region: q.region || geo.region,
      });
      let coupons = (data.results || []).map(normCoupon).filter(c => {
        if (c.status !== 'active') return false;
        const hay = `${c.categories.join(' ')} ${c.name} ${c.advertiser_name}`.toLowerCase();
        if (EXCLUDE.some(p => hay.includes(p))) return false;
        return FASHION_PATTERNS.some(p => hay.includes(p)) || FASHION_BRANDS.some(b => hay.includes(b)) || c.categories.length === 0;
      });
      return { statusCode: 200, headers, body: JSON.stringify({ coupons, total: coupons.length, region: geo.region, language: geo.language }) };
    }

    // /admitad/products  (FASHION)
    // Admitad publisher product data comes via the "products" feed system,
    // which many accounts don't have enabled. We try it, but if it 404s or
    // isn't available, we return empty gracefully (site uses demo products),
    // so a missing product feed never shows as an error.
    if (path.includes('products')) {
      const limit = parseInt(q.limit || 24);
      const page = parseInt(q.page || 1);
      const order = q.sort === 'price_asc' ? 'price' : q.sort === 'price_desc' ? '-price' : '-popularity';
      try {
        const data = await adGet('/products/', {
          limit, offset: (page - 1) * limit, order_by: order,
          category: q.category || undefined, q: q.q || undefined,
        });
        const products = (data.results || []).map(normProduct);
        return { statusCode: 200, headers, body: JSON.stringify({ products, total: data._meta?.count || products.length, region: geo.region }) };
      } catch (e) {
        // Product feed not available on this account — return empty, no error
        return { statusCode: 200, headers, body: JSON.stringify({ products: [], total: 0, region: geo.region, note: 'product feed not enabled; using coupons' }) };
      }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'not found' }) };
  } catch (err) {
    // Fail soft: front-end falls back to demo content
    return { statusCode: 200, headers, body: JSON.stringify({ coupons: [], products: [], total: 0, error: err.message, demo: true }) };
  }
};
