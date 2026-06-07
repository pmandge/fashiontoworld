/**
 * ============================================================
 * FashionToWorld — Automatic Sync Engine
 * ============================================================
 * Keeps coupons & products from ALL affiliate networks fresh,
 * AUTOMATICALLY. You never trigger this by hand.
 *
 * Two ways it runs (you only need ONE):
 *
 *  A) ALWAYS-ON SERVER (DigitalOcean droplet / App Platform):
 *     server.js imports this and calls startAutoSync().
 *     A cron schedule re-pulls every network every 2 hours.
 *
 *  B) SERVERLESS (Netlify/Vercel): a scheduled function calls
 *     runSyncOnce() on a timer (configured in netlify.toml).
 *
 * The result is cached to disk (cache.json) and served instantly
 * to visitors, so the site is always fast AND always current.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../cache/feed-cache.json');
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day

function ensureCacheDir() {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); }
  catch { return { coupons: [], products: {}, updatedAt: null, networks: [] }; }
}

function writeCache(data) {
  ensureCacheDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

/**
 * Pull everything once from all enabled networks and cache it.
 * @param {Aggregator} aggregator
 */
async function runSyncOnce(aggregator) {
  const started = Date.now();
  console.log('[Sync] Starting at', new Date().toISOString());

  const out = { coupons: [], products: {}, updatedAt: null, networks: [] };

  try {
    // 1) Coupons (all networks, fashion-only, merged)
    const couponRes = await aggregator.getCoupons({ limit: 100 });
    out.coupons = couponRes.coupons;
    out.networks = couponRes.networks;

    // 2) Products per top category (pre-warmed so pages load instantly)
    const categories = ['women', 'men', 'kids', 'shoes', 'bags', 'jewellery', 'accessories', 'beauty'];
    for (const cat of categories) {
      try {
        const r = await aggregator.getProducts({ subcategory: cat, limit: 48 });
        out.products[cat] = r.products;
        await new Promise(res => setTimeout(res, 300)); // gentle rate-limit
      } catch (e) {
        console.warn(`[Sync] products/${cat} failed:`, e.message);
        out.products[cat] = [];
      }
    }

    out.updatedAt = new Date().toISOString();
    writeCache(out);
    console.log(`[Sync] Done in ${((Date.now() - started) / 1000).toFixed(1)}s — ` +
      `${out.coupons.length} coupons, networks: ${out.networks.join(', ') || 'none'}`);
  } catch (err) {
    console.error('[Sync] Failed:', err.message);
  }

  return out;
}

/**
 * Start the always-on schedule (Option A).
 * Runs once on boot, then every SYNC_INTERVAL_MS.
 */
function startAutoSync(aggregator) {
  // Don't block server startup
  setTimeout(() => runSyncOnce(aggregator), 3000);
  setInterval(() => runSyncOnce(aggregator), SYNC_INTERVAL_MS);
  console.log('[Sync] Auto-sync scheduled every', SYNC_INTERVAL_MS / 3600000, 'hours');
}

module.exports = { runSyncOnce, startAutoSync, readCache, CACHE_FILE };
