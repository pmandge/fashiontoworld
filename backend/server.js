/**
 * ============================================================
 * FashionToWorld — Backend API Server (Node.js / Express)
 * ============================================================
 * 
 * This server:
 * 1. Handles Admitad OAuth2 token exchange (keeps secret safe)
 * 2. Proxies all Admitad API calls from the frontend
 * 3. Caches responses in memory (Redis-ready)
 * 4. Runs automatic datafeed sync every 2 hours
 * 5. Serves the frontend static files
 * 
 * START: node backend/server.js
 * DEPLOY: pm2 start backend/server.js --name fashionworld
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { FashionFeed } = require('./services/fashion-feed');
const { geoMiddleware } = require('./services/geo');

const app = express();
app.use(cors());
app.use(express.json());

let cookieParser;
try { cookieParser = require('cookie-parser'); app.use(cookieParser()); } catch (e) { /* optional */ }

app.use(geoMiddleware);

// ─── CONFIG ──────────────────────────────────────────────────
// Load from environment variables in production
const CONFIG = {
  ADMITAD_CLIENT_ID: process.env.ADMITAD_CLIENT_ID || 'YOUR_CLIENT_ID',
  ADMITAD_CLIENT_SECRET: process.env.ADMITAD_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
  ADMITAD_WEBSITE_ID: process.env.ADMITAD_WEBSITE_ID || 'YOUR_WEBSITE_ID',
  ADMITAD_API_BASE: 'https://api.admitad.com',
  PORT: process.env.PORT || 3000,
  CACHE_TTL: 30 * 60 * 1000,            // 30 minutes
  DATAFEED_SYNC_INTERVAL: 2 * 60 * 60 * 1000, // 2 hours
};

// ─── TOKEN MANAGEMENT ────────────────────────────────────────
let tokenCache = { access_token: null, expires_at: 0 };

async function getAccessToken() {
  if (tokenCache.access_token && Date.now() < tokenCache.expires_at - 60000) {
    return tokenCache.access_token;
  }

  // Admitad requires HTTP Basic auth: Authorization: Basic base64(client_id:client_secret)
  // (same working method as the live Netlify function). client_secret goes in
  // the header, NOT the body. Scopes use the *_for_website publisher names and
  // are overridable via ADMITAD_SCOPE so you never need a code change to adjust.
  let basic = process.env.ADMITAD_BASE64_HEADER;
  if (!basic) {
    basic = Buffer.from(
      CONFIG.ADMITAD_CLIENT_ID + ':' + CONFIG.ADMITAD_CLIENT_SECRET
    ).toString('base64');
  }

  const scope = process.env.ADMITAD_SCOPE ||
    'public_data coupons advcampaigns_for_website banners_for_website websites deeplink_generator';

  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', CONFIG.ADMITAD_CLIENT_ID);
  params.set('scope', scope);

  const res = await fetch(`${CONFIG.ADMITAD_API_BASE}/token/`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + basic,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: params,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  console.log('[Admitad] Token refreshed, expires in', data.expires_in, 'seconds');
  return tokenCache.access_token;
}

// ─── ADMITAD API HELPER ──────────────────────────────────────
async function admitadGet(endpoint, params = {}) {
  const token = await getAccessToken();
  const url = new URL(CONFIG.ADMITAD_API_BASE + endpoint);
  if (CONFIG.ADMITAD_WEBSITE_ID) url.searchParams.set('website', CONFIG.ADMITAD_WEBSITE_ID);

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach(item => url.searchParams.append(k, item));
    else url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Admitad ${endpoint} ${res.status} ${txt.slice(0, 150)}`);
  }
  return res.json();
}

// Fashion-only feed (resolves fashion category IDs, filters by region)
const fashionFeed = new FashionFeed(admitadGet, CONFIG.ADMITAD_WEBSITE_ID);

// Multi-network aggregator (Admitad + Awin + CJ + Rakuten + ...)
const { Aggregator } = require('./services/aggregator');
const { startAutoSync, readCache } = require('./sync');
const aggregator = new Aggregator();

// Start automatic continuous syncing of ALL configured networks (no manual trigger)
if (aggregator.enabledNames().length) {
  startAutoSync(aggregator);
}

// ─── RESPONSE CACHE ──────────────────────────────────────────
const apiCache = new Map();

function cached(key, fn) {
  return async (...args) => {
    const cacheKey = key + JSON.stringify(args);
    const entry = apiCache.get(cacheKey);
    if (entry && Date.now() - entry.ts < CONFIG.CACHE_TTL) {
      return entry.data;
    }
    const data = await fn(...args);
    apiCache.set(cacheKey, { data, ts: Date.now() });
    return data;
  };
}

// ─── ROUTES ──────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Coupons — FASHION, geo-aware. Uses the SAME proven logic as the live
// Netlify function (Basic-auth token, no language filter, relaxed mode,
// region ranking) so behaviour matches exactly after the move.
const FASHION_EXCLUDE = ['electronics','laptop','smartphone','gadget','flight','hotel','grocery','finance','bank','crypto','casino','betting','pharma','furniture','appliance','vpn','hosting'];
const { shipsWorldwide } = require('./config/worldwide-stores');

app.get('/api/admitad/coupons', async (req, res) => {
  try {
    res.set('Cache-Control', 'private, max-age=300');
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 24);
    const type = req.query.type;
    const region = (req.query.region || req.geo.region || '').toUpperCase();
    const language = req.query.lang || req.geo.language;
    const strict = process.env.FASHION_STRICT === 'true';
    const regionFilterOff = process.env.REGION_FILTER === 'off';

    // Pull from Admitad /coupons/ (website param added by admitadGet).
    // No language/order_by params — those returned zero in testing.
    const data = await admitadGet('/coupons/', {
      limit, offset: (page - 1) * limit,
      region: region || undefined,
    });

    let coupons = (data.results || []).map(c => {
      const regionList = (c.regions || []).map(r => (typeof r === 'string' ? r : r.region)).filter(Boolean);
      let desc = (c.description || '').replace(/not available[:\-].*/i, '').trim();
      if (/^([A-Z]{2}[,\s]*){3,}$/.test(desc)) desc = '';
      const rawLogo = c.campaign?.image || c.image || '';
      return {
        id: c.id, name: c.name, description: desc,
        advertiser_name: c.campaign?.name || '',
        logo: rawLogo ? (rawLogo.startsWith('//') ? 'https:' + rawLogo : rawLogo) : '',
        promocode: c.promocode || '', discount: c.discount || '', status: c.status,
        rating: parseFloat(c.rating || 0), regions: regionList,
        types: (c.types || []).map(t => t.name),
        categories: (c.categories || []).map(x => x.name),
        url: c.goto_link || '', date_end: c.date_end || null,
      };
    }).filter(c => {
      if (c.status && c.status !== 'active') return false;
      // Only worldwide-shipping stores
      if (!shipsWorldwide(c.advertiser_name)) return false;
      if (strict) {
        const hay = `${c.categories.join(' ')} ${c.name} ${c.advertiser_name}`.toLowerCase();
        if (FASHION_EXCLUDE.some(p => hay.includes(p))) return false;
      }
      return true;
    });

    if (type) coupons = coupons.filter(c => (c.types || []).some(t => t.toLowerCase().includes(type.toLowerCase())));

    if (region && !regionFilterOff) {
      coupons.sort((a, b) => {
        const aOk = a.regions.map(r => r.toUpperCase()).includes(region) ? 1 : 0;
        const bOk = b.regions.map(r => r.toUpperCase()).includes(region) ? 1 : 0;
        return bOk - aOk;
      });
    }

    res.json({ coupons, total: coupons.length, region, language, mode: strict ? 'strict' : 'relaxed' });
  } catch (err) {
    console.error('[API/coupons]', err.message);
    res.json({ coupons: [], total: 0, error: err.message, demo: true });
  }
});

// Real fashion products — served from the feed database
const productDb = require('./services/product-db');
const { startProductSync, getStatus, syncAllFeeds } = require('./services/product-sync');
const currency = require('./services/currency');

app.get('/api/admitad/products', async (req, res) => {
  try {
    res.set('Cache-Control', 'private, max-age=120');
    const { category, subcategory, gender, brand, advertiser, sale, minprice, maxprice, page = 1, limit = 24, sort, q } = req.query;
    const result = await productDb.query({
      category, subcategory, gender, brand, advertiser, onSale: sale === 'true',
      minprice: minprice ? parseFloat(minprice) : null,
      maxprice: maxprice ? parseFloat(maxprice) : null,
      q, sort, page: parseInt(page), limit: parseInt(limit),
    });
    if (result.total === 0) {
      return res.json({ products: [], total: 0, demo: true, note: 'product feeds syncing or none populated yet' });
    }
    // Convert prices to the visitor's currency (best-effort; keeps original if not possible)
    const toCur = (req.query.currency || req.geo.currency || 'USD').toUpperCase();
    for (const p of result.products) {
      const conv = await currency.convert(p.price, (p.currency || 'EUR').toUpperCase(), toCur);
      p.price_display = conv.formatted;
      p.price_converted = conv.amount;
      p.display_currency = conv.currency;
      if (p.price_old) {
        const convOld = await currency.convert(p.price_old, (p.currency || 'EUR').toUpperCase(), toCur);
        p.price_old_display = convOld.formatted;
      }
    }
    res.json({ ...result, region: req.geo.region, currency: toCur });
  } catch (err) {
    console.error('[API/products]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Product sync status + manual trigger (handy for first import)
// Distinct worldwide-shipping stores with live product counts (cached 10 min)
let _storesCache = { at: 0, data: null };
app.get('/api/admitad/stores', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=600');
    if (_storesCache.data && Date.now() - _storesCache.at < 600000) return res.json(_storesCache.data);
    const rows = (await productDb.advertiserCounts()) || [];
    const stores = rows.filter(s => shipsWorldwide(s.name));
    const out = { stores, count: stores.length, total_products: stores.reduce((a, s) => a + (s.count || 0), 0) };
    _storesCache = { at: Date.now(), data: out };
    res.json(out);
  } catch (err) {
    console.error('[API/stores]', err.message);
    res.status(500).json({ error: err.message, stores: [], count: 0 });
  }
});

app.get('/api/products/status', async (req, res) => {
  try { res.json(await getStatus()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/products/sync-now', async (req, res) => {
  res.json({ started: true, note: 'Sync running in background; check /api/products/status' });
  syncAllFeeds().catch(e => console.error('[sync-now]', e.message));
});

// Start the automatic daily product sync
startProductSync();

// Geo info — lets the frontend know detected country/language/currency
app.get('/api/geo', (req, res) => {
  res.json(req.geo);
});

// Brands / Advertisers
app.get('/api/admitad/brands', async (req, res) => {
  try {
    const { tier, page = 1, limit = 24, q } = req.query;

    const data = await cached('brands', async (params) => {
      return admitadGet('/advcampaigns/for_website/', {
        offset: (params.page - 1) * params.limit,
        limit: params.limit,
        search: params.q,
      });
    })({ tier, page, limit, q });

    const brands = (data.results || []).map(b => ({
      id: b.id,
      name: b.name,
      logo: b.logo || '',
      description: b.description || '',
      avg_ecpc: b.ecpc || null,
      products_count: b.products_count || null,
      commission: b.rates?.[0]?.rate || '',
    }));

    res.json({ brands, total: data.count || brands.length });
  } catch (err) {
    console.error('[API/brands]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Categories
app.get('/api/admitad/categories', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=3600');
    const data = await cached('categories', () => admitadGet('/categories/'))();
    res.json({ categories: data.results || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Affiliate deep link generator
app.get('/api/admitad/affiliate-link', async (req, res) => {
  try {
    const { url, adv_id } = req.query;
    if (!url) return res.status(400).json({ error: 'url required' });

    const token = await getAccessToken();
    const dlRes = await fetch(`${CONFIG.ADMITAD_API_BASE}/deeplink/${adv_id}/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ulp: [decodeURIComponent(url)],
        subid: 'fashionworld',
      }),
    });

    const dlData = await dlRes.json();
    res.json({ affiliate_url: dlData?.[0]?.url || decodeURIComponent(url) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publisher statistics
app.get('/api/admitad/stats', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const data = await admitadGet('/statistics/actions/', {
      date_start: date_from,
      date_end: date_to,
      website: CONFIG.ADMITAD_WEBSITE_ID,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DATAFEED AUTO-SYNC ──────────────────────────────────────
// Runs automatically every 2 hours to pre-warm caches
// In production: replace with a proper queue (Bull, Agenda)

let syncRunning = false;

async function runDatafeedSync() {
  if (syncRunning) return;
  syncRunning = true;
  console.log('[Sync] Starting datafeed sync at', new Date().toISOString());

  try {
    // Pre-warm product pages for top categories
    const categories = ['women', 'men', 'kids', 'shoes', 'bags', 'beauty'];
    for (const cat of categories) {
      await new Promise(r => setTimeout(r, 500)); // rate limit buffer
      const products = await admitadGet('/products/', { category: cat, limit: 24 });
      apiCache.set(`products${JSON.stringify([{ category: cat, page: 1, limit: 24, sort: 'popularity' }])}`,
        { data: products, ts: Date.now() });
    }

    // Pre-warm coupons
    const coupons = await admitadGet('/coupons/', { limit: 20, status: 'active' });
    apiCache.set(`coupons${JSON.stringify([{ page: 1, limit: 20 }])}`,
      { data: coupons, ts: Date.now() });

    console.log('[Sync] Datafeed sync complete at', new Date().toISOString());
  } catch (err) {
    console.error('[Sync] Error:', err.message);
  } finally {
    syncRunning = false;
  }
}

// Run on start + every 2 hours
if (CONFIG.ADMITAD_CLIENT_ID !== 'YOUR_CLIENT_ID') {
  runDatafeedSync();
  setInterval(runDatafeedSync, CONFIG.DATAFEED_SYNC_INTERVAL);
}

// ─── STATIC FILES ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../')));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../index.html'));
});

// ─── START ────────────────────────────────────────────────────
app.listen(CONFIG.PORT, () => {
  console.log(`\n🌍 FashionToWorld running at http://localhost:${CONFIG.PORT}`);
  console.log('📦 Admitad API proxy: /api/admitad/*');
  console.log('🔄 Datafeed sync: every 2 hours\n');
});

module.exports = app;
