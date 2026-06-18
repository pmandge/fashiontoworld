import io, sys

# ---- 1) Add trendingMix() to product-db-postgres.js ----
p1 = 'backend/services/product-db-postgres.js'
s1 = io.open(p1, encoding='utf-8').read()

if 'trendingMix' in s1:
    print('NOTE: trendingMix already present')
else:
    anchor = "async function diverseDiscounts("
    if anchor not in s1:
        print('ABORT: diverseDiscounts anchor not found'); sys.exit(1)

    fn = """async function trendingMix(perCat) {
  // Curated premium mix for the homepage "Trending" rail: pulls from watches,
  // bags, jewellery and dresses across the FULL catalogue (all stores), then
  // interleaves so the rail rotates categories (watch, bag, dress, jewellery...).
  // Safety-filtered via SAFE_CLAUSE. Built in the background + cached, so the
  // (slightly heavier) per-category queries never hit a user request.
  const cap = perCat || 5;
  const cats = [
    { key: 'watch',    sql: "(category ILIKE '%watch%' OR name ILIKE '%watch%')" },
    { key: 'bag',      sql: "(category ILIKE '%bag%' OR name ILIKE '%handbag%' OR name ILIKE '%tote%')" },
    { key: 'dress',    sql: "(category ILIKE '%dress%' OR name ILIKE '%dress%')" },
    { key: 'jewel',    sql: "(category ILIKE '%jewel%' OR name ILIKE '%necklace%' OR name ILIKE '%bracelet%' OR name ILIKE '%earring%')" }
  ];
  const buckets = [];
  for (const c of cats) {
    try {
      const r = await pool.query(`
        SELECT * FROM products
        WHERE price > 0 AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
          AND ${c.sql}
          ${SAFE_CLAUSE}
        ORDER BY updated_at DESC
        LIMIT ${cap}
      `);
      buckets.push(r.rows);
    } catch (e) { buckets.push([]); }
  }
  // round-robin interleave
  const out = [];
  for (let i = 0; i < cap; i++) {
    for (let b = 0; b < buckets.length; b++) {
      if (buckets[b][i]) out.push(buckets[b][i]);
    }
  }
  return out;
}

async function diverseDiscounts("""
    s1 = s1.replace(anchor, fn, 1)
    s1 = s1.replace("diverseDiscounts, brandCountsRaw };", "diverseDiscounts, trendingMix, brandCountsRaw };")
    io.open(p1, 'w', encoding='utf-8').write(s1)
    print('OK: added trendingMix() + export')

# ---- 2) Add /api/products/trending route + cache to server.js ----
p2 = 'backend/server.js'
s2 = io.open(p2, encoding='utf-8').read()

if "'/api/products/trending'" in s2:
    print('NOTE: trending route already present')
else:
    anchor2 = "app.get('/api/products/diverse-discounts'"
    if anchor2 not in s2:
        print('ABORT: diverse-discounts route not found'); sys.exit(1)

    route = """app.get('/api/products/trending', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 16, 32);
    if (Date.now() - _trending.at > 1800000) refreshTrending();
    let data = (_trending.data || []).slice(0, limit).map(function (pr) {
      pr.advertiser_name = pr.advertiser_name || pr.advertiser || '';
      var imgs = pr.images;
      if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; } }
      pr.image_url = pr.image_url || (Array.isArray(imgs) && imgs[0]) || '';
      return pr;
    });
    res.json({ products: data, total: data.length });
  } catch (e) { res.status(500).json({ products: [], error: e.message }); }
});

app.get('/api/products/diverse-discounts'"""
    s2 = s2.replace(anchor2, route, 1)

    # cache + refresher next to diverse-discounts timer
    dd_anchor = "setTimeout(function () { refreshDiverseDiscounts(); }, 7000);"
    if dd_anchor not in s2:
        print('ABORT: diverse refresher timer not found'); sys.exit(1)
    refr = """let _trending = { at: 0, data: [] };
let _trFetching = false;
async function refreshTrending() {
  if (_trFetching) return; _trFetching = true;
  try {
    const rows = await productDb.trendingMix(5);   // ~5 per cat, 4 cats = up to 20
    _trending = { at: Date.now(), data: rows || [] };
  } catch (e) { console.error('[trending]', e.message); }
  finally { _trFetching = false; }
}
setTimeout(function () { refreshTrending(); }, 9000);
setInterval(function () { refreshTrending(); }, 1800000);

""" + dd_anchor
    s2 = s2.replace(dd_anchor, refr, 1)
    io.open(p2, 'w', encoding='utf-8').write(s2)
    print('OK: added /api/products/trending route + refresher')
