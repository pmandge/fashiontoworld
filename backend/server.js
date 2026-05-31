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

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CONFIG.ADMITAD_CLIENT_ID,
    client_secret: CONFIG.ADMITAD_CLIENT_SECRET,
    scope: 'advcampaigns banners coupons feeds products deeplink_generator statistics website',
  });

  const res = await fetch(`${CONFIG.ADMITAD_API_BASE}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
  url.searchParams.set('website', CONFIG.ADMITAD_WEBSITE_ID);

  // Serialize params; arrays become repeated keys (e.g. category=1&category=2)
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      v.forEach(item => url.searchParams.append(k, item));
    } else {
      url.searchParams.set(k, v);
    }
  });

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Admitad API error: ${res.status}`);
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

// Coupons — ALL NETWORKS merged, FASHION ONLY, geo-aware
app.get('/api/admitad/coupons', async (req, res) => {
  try {
    const { page = 1, limit = 24, type } = req.query;
    const region = req.query.region || req.geo.region;
    const language = req.query.lang || req.geo.language;

    // Serve from the auto-synced multi-network cache first (fast + always fresh)
    const cache = readCache();
    if (cache.coupons && cache.coupons.length) {
      let coupons = cache.coupons;
      if (region) coupons = coupons.filter(c => !c.regions?.length || c.regions.includes(region.toUpperCase()));
      if (type) coupons = coupons.filter(c => (c.types || []).some(t => t.toLowerCase().includes(type.toLowerCase())));
      const start = (parseInt(page) - 1) * parseInt(limit);
      return res.json({
        coupons: coupons.slice(start, start + parseInt(limit)),
        total: coupons.length, region, language,
        networks: cache.networks, updatedAt: cache.updatedAt,
      });
    }

    // Cache empty (first run) → pull live from all networks
    const data = await aggregator.getCoupons({ region, language, limit: parseInt(limit), page: parseInt(page), type });
    res.json({ ...data, region, language });
  } catch (err) {
    console.error('[API/coupons]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fashion products — geo-aware
app.get('/api/admitad/products', async (req, res) => {
  try {
    const { category, page = 1, limit = 24, sort = 'popularity', q } = req.query;
    const region = req.query.region || req.geo.region;

    const data = await cached('fashion-products', (params) =>
      fashionFeed.getFashionProducts(params)
    )({ subcategory: category, region, page: parseInt(page), limit: parseInt(limit), sort, q });

    res.json({ ...data, region });
  } catch (err) {
    console.error('[API/products]', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
