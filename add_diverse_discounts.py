import io, sys

# ---- 1) Add diverseDiscounts() to product-db-postgres.js ----
p1 = 'backend/services/product-db-postgres.js'
s1 = io.open(p1, encoding='utf-8').read()

if 'diverseDiscounts' in s1:
    print('NOTE: diverseDiscounts already present')
else:
    anchor = """async function topDealsPerStore(limit) {"""
    if anchor not in s1:
        print('ABORT: topDealsPerStore not found'); sys.exit(1)

    new_fn = """async function diverseDiscounts(limit, perStoreCap) {
  // Like topDealsPerStore but allows up to `perStoreCap` products per store,
  // so the Trending / Biggest Discounts rails show variety (no single store
  // such as an eyewear feed flooding every slot). Uses the indexed discount
  // column; pool is wide so many stores are represented.
  const cap = perStoreCap || 2;
  const want = limit || 24;
  const r = await pool.query(`
    SELECT * FROM products
    WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
    ORDER BY discount DESC
    LIMIT 10000
  `);
  const perStore = {}; const out = [];
  for (const row of r.rows) {
    const a = row.advertiser || '';
    if ((perStore[a] || 0) >= cap) continue;
    perStore[a] = (perStore[a] || 0) + 1;
    out.push(row);
    if (out.length >= want) break;
  }
  return out;
}

async function topDealsPerStore(limit) {"""

    s1 = s1.replace(anchor, new_fn, 1)

    # export it
    s1 = s1.replace(
        "topDealsPerStore, brandCountsRaw };",
        "topDealsPerStore, diverseDiscounts, brandCountsRaw };"
    )
    io.open(p1, 'w', encoding='utf-8').write(s1)
    print('OK: added diverseDiscounts() to product-db-postgres.js')

# ---- 2) Add /api/products/diverse-discounts route to server.js ----
p2 = 'backend/server.js'
s2 = io.open(p2, encoding='utf-8').read()

if 'diverse-discounts' in s2:
    print('NOTE: diverse-discounts route already present')
else:
    anchor2 = "app.get('/api/products/top-deals', async (req, res) => {"
    if anchor2 not in s2:
        print('ABORT: top-deals route not found'); sys.exit(1)

    new_route = """app.get('/api/products/diverse-discounts', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 16, 40);
    const cap = Math.min(parseInt(req.query.cap) || 2, 5);
    if (Date.now() - _diverseDisc.at > 1800000) refreshDiverseDiscounts();
    let data = (_diverseDisc.data || []).slice(0, limit);
    // normalise for frontend (advertiser_name, image_url)
    data = data.map(function (pr) {
      pr.advertiser_name = pr.advertiser_name || pr.advertiser || '';
      var imgs = pr.images;
      if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; } }
      pr.image_url = pr.image_url || (Array.isArray(imgs) && imgs[0]) || '';
      return pr;
    });
    res.json({ products: data, total: data.length });
  } catch (e) { res.status(500).json({ products: [], error: e.message }); }
});

app.get('/api/products/top-deals', async (req, res) => {"""

    s2 = s2.replace(anchor2, new_route, 1)

    # add the cache + refresher near the top-deals one
    td_anchor = "setTimeout(function () { refreshTopDeals(); }, 6000);"
    if td_anchor not in s2:
        print('ABORT: refreshTopDeals timer not found'); sys.exit(1)
    refresher = """let _diverseDisc = { at: 0, data: [] };
let _ddFetching = false;
async function refreshDiverseDiscounts() {
  if (_ddFetching) return; _ddFetching = true;
  try {
    // up to 2 per store, ~32 products — enough for Trending + Biggest Discounts
    const rows = await productDb.diverseDiscounts(32, 2);
    _diverseDisc = { at: Date.now(), data: rows || [] };
  } catch (e) { console.error('[diverse-discounts]', e.message); }
  finally { _ddFetching = false; }
}
setTimeout(function () { refreshDiverseDiscounts(); }, 7000);
setInterval(function () { refreshDiverseDiscounts(); }, 1800000);

""" + td_anchor
    s2 = s2.replace(td_anchor, refresher, 1)
    io.open(p2, 'w', encoding='utf-8').write(s2)
    print('OK: added /api/products/diverse-discounts route + refresher to server.js')
