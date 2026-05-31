/**
 * ============================================================
 * FashionToWorld — Dynamic Multi-Affiliate Aggregator
 * ============================================================
 * Reads backend/config/networks.js and AUTOMATICALLY builds a
 * working adapter for every network whose credentials exist in
 * the environment. Add networks by editing the config file only.
 *
 * One unified, fashion-only, de-duplicated feed out the back.
 * ============================================================
 */

const NETWORKS = require('../config/networks');

// ---- Shared fashion filter ----
const FASHION_PATTERNS = ['fashion','clothing','clothes','apparel','shoes','footwear','bags','accessories','jewelry','jewellery','watches','lingerie','underwear','swimwear','kids','children','beauty','cosmetics','sportswear','activewear','luxury','dress','denim','outerwear'];
const EXCLUDE = ['electronics','computer','laptop','smartphone','gadget','travel','flight','hotel','booking','grocery','restaurant','finance','bank','loan','insurance','crypto','casino','betting','pharma','supplement','furniture','appliance','vehicle','software','hosting','vpn','gaming','course','pet food'];

function isFashion(text) {
  const h = (text || '').toLowerCase();
  if (EXCLUDE.some(p => h.includes(p))) return false;
  return FASHION_PATTERNS.some(p => h.includes(p));
}

// ---- helpers ----
function env(name) { return process.env[name]; }
function resolveTemplate(str) {
  // replace {ENV_VAR} in URLs with env values
  return String(str).replace(/\{([A-Z0-9_]+)\}/g, (_, k) => env(k) || '');
}
function getPath(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function resolveQuery(query) {
  // values that are ENV var names get replaced with their value
  const out = {};
  for (const k in query) {
    const v = query[k];
    out[k] = (typeof v === 'string' && env(v)) ? env(v) : v;
  }
  return out;
}

// ---- token cache per network ----
const tokenCache = {};

async function getAuthHeaders(net) {
  const a = net.auth || { type: 'none' };
  if (a.type === 'none') return {};
  if (a.type === 'bearer') return { Authorization: 'Bearer ' + env(a.token) };
  if (a.type === 'apikey_header') return { [a.header]: env(a.key) };
  if (a.type === 'basic') {
    const cred = Buffer.from(env(a.username) + ':' + env(a.password)).toString('base64');
    return { Authorization: 'Basic ' + cred };
  }
  if (a.type === 'oauth2') {
    const key = net.label;
    if (tokenCache[key] && Date.now() < tokenCache[key].exp - 60000) {
      return { Authorization: 'Bearer ' + tokenCache[key].token };
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env(a.clientId),
      client_secret: env(a.clientSecret),
    });
    if (a.scope) body.set('scope', a.scope);
    const r = await fetch(a.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!r.ok) throw new Error(net.label + ' token ' + r.status);
    const d = await r.json();
    tokenCache[key] = { token: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
    return { Authorization: 'Bearer ' + d.access_token };
  }
  return {};
}

function normalizeItem(raw, map, networkName) {
  const cats = getPath(raw, map.categoriesPath);
  let categories = [];
  if (Array.isArray(cats)) {
    categories = cats.map(c => (map.categoryNameKey ? getPath(c, map.categoryNameKey) : c)).filter(Boolean);
  } else if (typeof cats === 'string') {
    categories = [cats];
  }
  const regions = getPath(raw, map.regionsPath);
  return {
    id: networkName + '-' + (getPath(raw, map.id) || Math.random().toString(36).slice(2)),
    name: getPath(raw, map.name) || '',
    description: getPath(raw, map.description) || '',
    advertiser_name: getPath(raw, map.advertiser_name) || '',
    promocode: getPath(raw, map.promocode) || '',
    discount: getPath(raw, map.discount) || '',
    price: map.price ? parseFloat(getPath(raw, map.price) || 0) : undefined,
    price_old: map.price_old ? (getPath(raw, map.price_old) ? parseFloat(getPath(raw, map.price_old)) : null) : undefined,
    currency: map.currency ? (getPath(raw, map.currency) || 'USD') : undefined,
    image_url: map.image_url ? (getPath(raw, map.image_url) || '') : undefined,
    url: getPath(raw, map.url) || '',
    affiliate_url: map.affiliate_url ? (getPath(raw, map.affiliate_url) || getPath(raw, map.url) || '') : undefined,
    status: getPath(raw, map.status) || 'active',
    rating: parseFloat(getPath(raw, map.rating) || 0),
    categories: categories,
    regions: Array.isArray(regions) ? regions : [],
    network: networkName,
  };
}

async function fetchFeed(net, networkName, kind, extra) {
  const cfg = net[kind];
  if (!cfg) return [];
  try {
    const headers = Object.assign({}, await getAuthHeaders(net), cfg.headers || {});
    let url = resolveTemplate(cfg.url);
    const opts = { method: cfg.method || 'GET', headers };

    if (cfg.method === 'POST') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(Object.assign({}, cfg.body || {}, extra || {}));
    } else {
      const q = resolveQuery(Object.assign({}, cfg.query || {}, extra || {}));
      const usp = new URLSearchParams();
      for (const k in q) if (q[k] !== undefined && q[k] !== '') usp.set(k, q[k]);
      const qs = usp.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }

    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(networkName + ' ' + kind + ' ' + r.status);

    let data;
    if (cfg.format === 'xml') {
      // XML networks (e.g. CJ) need a parser; skip gracefully until added
      console.warn('[' + networkName + '] XML parsing not yet wired; skipping');
      return [];
    } else {
      data = await r.json();
    }
    const arr = getPath(data, cfg.resultsPath) || [];
    return (Array.isArray(arr) ? arr : []).map(raw => normalizeItem(raw, cfg.map, networkName));
  } catch (e) {
    console.warn('[' + networkName + '] ' + kind + ' failed:', e.message);
    return [];
  }
}

class Aggregator {
  constructor() {
    // Build the active network list from config + env
    this.active = Object.keys(NETWORKS).filter(name => {
      const net = NETWORKS[name];
      return (net.enabledIf || []).every(v => !!env(v));
    });
    if (this.active.length) {
      console.log('[Aggregator] Active networks:', this.active.join(', '));
    } else {
      console.log('[Aggregator] No networks configured yet (demo mode).');
    }
  }

  enabledNames() { return this.active; }

  _dedupe(items, keyFn) {
    const seen = new Set();
    return items.filter(it => {
      const k = keyFn(it);
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }

  async getCoupons(opts = {}) {
    const results = await Promise.allSettled(
      this.active.map(name => fetchFeed(NETWORKS[name], name, 'coupons'))
    );
    let coupons = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    coupons = coupons.filter(c =>
      c.status !== 'expired' &&
      (isFashion((c.categories || []).join(' ') + ' ' + c.name + ' ' + c.advertiser_name) || (c.categories || []).length === 0)
    );
    if (opts.region) {
      coupons = coupons.filter(c => !c.regions.length || c.regions.includes(opts.region.toUpperCase()));
    }
    coupons = this._dedupe(coupons, c => (c.advertiser_name + '|' + c.promocode + '|' + c.name).toLowerCase());
    coupons.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return { coupons, total: coupons.length, networks: this.active };
  }

  async getProducts(opts = {}) {
    const extra = {};
    if (opts.subcategory) extra.category = opts.subcategory;
    if (opts.q) extra.q = opts.q;
    const results = await Promise.allSettled(
      this.active.map(name => fetchFeed(NETWORKS[name], name, 'products', extra))
    );
    let products = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    products = this._dedupe(products, p => (p.advertiser_name + '|' + p.name).toLowerCase());
    return { products, total: products.length, networks: this.active };
  }
}

module.exports = { Aggregator, isFashion };
