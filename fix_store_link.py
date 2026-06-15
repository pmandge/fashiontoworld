import io, sys

# ---------- 1) product-db-postgres.js : add storeLink() + persist index + export ----------
p1 = 'backend/services/product-db-postgres.js'
s1 = io.open(p1, encoding='utf-8').read()

# 1a) persist the advertiser trigram index next to the other trgm indexes
idx_anchor = "    await pool.query('CREATE INDEX IF NOT EXISTS idx_brand_trgm ON products USING gin (brand gin_trgm_ops)');"
if idx_anchor not in s1:
    print('ABORT: brand_trgm index line not found'); sys.exit(1)
if 'idx_advertiser_trgm' not in s1:
    s1 = s1.replace(
        idx_anchor,
        idx_anchor + "\n    await pool.query('CREATE INDEX IF NOT EXISTS idx_advertiser_trgm ON products USING gin (advertiser gin_trgm_ops)');"
    )

# 1b) add storeLink() function right before the module.exports line
exports_line = "module.exports = { init, upsertMany, pruneOld, query, distinctBrands, setBrandLogo, stats, advertiserCounts, subcategoryFacets, topBrands };"
if exports_line not in s1:
    print('ABORT: exports line not found'); sys.exit(1)

store_link_fn = """// Fast affiliate-link lookup for the redirect handshake (go.html).
// No COUNT, no ORDER BY, no pagination — just one real outbound URL for a
// store. This avoids the expensive COUNT(*) path that makes the full product
// query slow for large advertisers.
async function storeLink(store) {
  const name = (store || '').trim();
  if (!name) return '';
  const r = await pool.query(
    "SELECT url FROM products WHERE advertiser ILIKE $1 AND url <> '' LIMIT 1",
    ['%' + name + '%']
  );
  return (r.rows[0] && r.rows[0].url) || '';
}

"""
s1 = s1.replace(exports_line, store_link_fn + exports_line)

# 1c) add storeLink to exports
s1 = s1.replace(
    "subcategoryFacets, topBrands };",
    "subcategoryFacets, topBrands, storeLink };"
)

io.open(p1, 'w', encoding='utf-8').write(s1)

# ---------- 2) server.js : add /api/store-link route ----------
p2 = 'backend/server.js'
s2 = io.open(p2, encoding='utf-8').read()

# Insert the route right before the stores route (a known anchor).
anchor = "app.get('/api/admitad/stores', async (req, res) => {"
if anchor not in s2:
    print('ABORT: stores route anchor not found'); sys.exit(1)
if "'/api/store-link'" not in s2:
    route = """app.get('/api/store-link', async (req, res) => {
  try {
    const url = await productDb.storeLink(req.query.store || '');
    res.json({ url: url });
  } catch (err) {
    res.status(500).json({ url: '', error: err.message });
  }
});
"""
    s2 = s2.replace(anchor, route + anchor)

io.open(p2, 'w', encoding='utf-8').write(s2)
print('OK: storeLink() + index added to product-db-postgres.js; /api/store-link route added to server.js')
