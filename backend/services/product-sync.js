/**
 * ============================================================
 * FashionToWorld — Product Feed Sync
 * ============================================================
 * Downloads every configured product feed, parses it, maps
 * categories/subcategories, stores products, then resolves brand
 * logos. Runs on a schedule (default daily) — fully automatic.
 *
 * Streams + batches so 150k+ products stay memory-safe.
 * ============================================================
 */
const { parseFeed } = require('./feed-parser');
const { getFeeds } = require('../config/product-feeds');
const productDb = require('./product-db');
const { resolveBrandLogos } = require('./brand-logos');
const { shipsWorldwide } = require('../config/worldwide-stores');

let lastRun = null;
let running = false;

async function syncAllFeeds() {
  if (running) { console.log('[ProductSync] already running'); return; }
  running = true;
  const runStamp = Date.now();
  try {
    await productDb.init();
    const feeds = getFeeds();
    if (!feeds.length) {
      console.log('[ProductSync] No feeds configured (set PRODUCT_FEEDS).');
      return { total: 0, feeds: 0 };
    }
    console.log(`[ProductSync] Starting — ${feeds.length} feed(s)`);
    let grandTotal = 0;
    for (const feed of feeds) {
      let batch = [];
      let n = 0;
      const flush = async () => { if (batch.length) { await productDb.upsertMany(batch, runStamp); batch = []; } };
      try {
        await parseFeed(feed, {}, (p) => {
          // Only keep products from worldwide-shipping stores
          if ((feed.network || 'admitad') === 'admitad' && !shipsWorldwide(p.advertiser_name || feed.advertiser)) return;
          if (p.category === 'excluded') return; // drop non-fashion homeware/drinkware
          batch.push(p); n++;
          if (batch.length >= 500) { const b = batch; batch = []; productDb.upsertMany(b, runStamp).catch(()=>{}); }
        });
        await flush();
        grandTotal += n;
        console.log(`[ProductSync] ${feed.advertiser} (${feed.format || 'admitad-yml'}): ${n} products`);
      } catch (e) {
        await flush().catch(()=>{});
        console.warn(`[ProductSync] ${feed.advertiser} failed: ${e.message}`);
      }
    }
    const pruned = await productDb.pruneOld(runStamp);
    lastRun = new Date().toISOString();
    console.log(`[ProductSync] Stored ${grandTotal} products, removed ${pruned} de-listed`);

    // Resolve brand logos (cached; safe to run each sync)
    try { await resolveBrandLogos(); } catch (e) { console.warn('[BrandLogos] failed:', e.message); }

    return { total: grandTotal, feeds: feeds.length, pruned, at: lastRun };
  } finally {
    running = false;
  }
}

function startProductSync() {
  const feeds = getFeeds();
  if (!feeds.length) { console.log('[ProductSync] No feeds; idle.'); return; }
  setTimeout(() => syncAllFeeds().catch(e => console.error('[ProductSync]', e.message)), 8000);
  setInterval(() => syncAllFeeds().catch(e => console.error('[ProductSync]', e.message)), 24 * 60 * 60 * 1000);
  console.log('[ProductSync] Scheduled daily.');
}

async function getStatus() {
  const s = await productDb.stats();
  return { lastRun, running, ...s };
}

module.exports = { syncAllFeeds, startProductSync, getStatus };
