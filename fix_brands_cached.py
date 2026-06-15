import io, sys

# ============ product-db-postgres.js: add brandCountsRaw() ============
p1 = 'backend/services/product-db-postgres.js'
s1 = io.open(p1, encoding='utf-8').read()

# Add a lean GROUP BY brand (no anti-join) next to topBrands.
anchor = """async function topBrands(limit) {
  const r = await pool.query(`SELECT brand, COUNT(*)::int c FROM products WHERE brand IS NOT NULL AND brand <> '' AND LOWER(brand) NOT IN (SELECT DISTINCT LOWER(advertiser) FROM products WHERE advertiser IS NOT NULL AND advertiser <> '') GROUP BY brand ORDER BY c DESC LIMIT $1`, [limit || 12]);
  return r.rows.map(function (row) { return { name: row.brand, count: row.c }; });
}"""
if anchor not in s1:
    print('ABORT: topBrands not found'); sys.exit(1)

addition = anchor + """

// Lean brand counts: GROUP BY only, no anti-join (the anti-join made topBrands a
// 4.5-min double scan). Cleaning/exclusion is done in JS on the cached result.
// Heavy enough to run only in the background and cache.
async function brandCountsRaw() {
  const r = await pool.query("SELECT brand, COUNT(*)::int c FROM products WHERE brand IS NOT NULL AND brand <> '' AND image_url IS NOT NULL AND image_url <> '' GROUP BY brand ORDER BY c DESC");
  return r.rows.map(function (row) { return { name: row.brand, count: row.c }; });
}"""
s1 = s1.replace(anchor, addition)

# export brandCountsRaw
if 'brandCountsRaw' not in s1.split('module.exports')[1]:
    s1 = s1.replace("topBrands, storeLink, topDealsPerStore };",
                    "topBrands, storeLink, topDealsPerStore, brandCountsRaw };")
io.open(p1, 'w', encoding='utf-8').write(s1)

# ============ server.js: cached + cleaned brands endpoint ============
p2 = 'backend/server.js'
s2 = io.open(p2, encoding='utf-8').read()

# Insert the cache + refresh + route just before the existing /api/brands/top route.
anchor2 = "app.get('/api/brands/top', async (req, res) => {"
if anchor2 not in s2:
    print('ABORT: /api/brands/top anchor not found'); sys.exit(1)

block = """// ---- Cached, cleaned brands directory (the raw query is a heavy scan) ----
let _brandsCache = { at: 0, data: [] };
let _brandsFetching = false;
// Non-brands to hide: feed artifacts / tags / store-as-brand noise.
const BRAND_EXCLUDE = new Set(['loopi', 'luxefashionclothing', 'thrifted']);
function brandNormKey(name) {
  // Merge spelling variants: "Dolce&Gabbana" == "Dolce & Gabbana".
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
async function refreshBrands() {
  if (_brandsFetching) return; _brandsFetching = true;
  try {
    const raw = await productDb.brandCountsRaw();
    // Build the set of store/advertiser names to exclude (brand == store noise).
    const advs = (await productDb.advertiserCounts()) || [];
    const advSet = new Set(advs.map(function (a) { return brandNormKey(a.name); }));
    // Clean + merge duplicate spellings (keep the nicest display label).
    const merged = {};
    for (const b of raw) {
      const lc = String(b.name || '').toLowerCase().trim();
      if (!lc) continue;
      if (BRAND_EXCLUDE.has(lc)) continue;            // junk list
      const key = brandNormKey(b.name);
      if (!key) continue;
      if (advSet.has(key)) continue;                  // store name as brand
      if (!merged[key]) merged[key] = { name: b.name, count: 0 };
      merged[key].count += b.count;
      // Prefer the display label that has spaces (usually the prettier one).
      if (/\\s/.test(b.name) && !/\\s/.test(merged[key].name)) merged[key].name = b.name;
    }
    const list = Object.keys(merged).map(function (k) { return merged[k]; })
      .sort(function (a, b) { return b.count - a.count; });
    _brandsCache = { at: Date.now(), data: list };
    console.log('[brands] cached', list.length, 'cleaned brands');
  } catch (e) { console.error('[brands]', e.message); }
  finally { _brandsFetching = false; }
}
// Warm on boot (after deals) and refresh every 6h.
setTimeout(function () { refreshBrands(); }, 12000);
setInterval(function () { refreshBrands(); }, 6 * 3600 * 1000);

// Paginated + searchable cleaned brands list for the Brands directory page.
app.get('/api/brands/all', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=600');
    if (Date.now() - _brandsCache.at > 6 * 3600 * 1000 + 60000) refreshBrands();
    let list = _brandsCache.data || [];
    const q = (req.query.q || '').trim().toLowerCase();
    if (q) list = list.filter(function (b) { return b.name.toLowerCase().indexOf(q) > -1; });
    const letter = (req.query.letter || '').trim().toUpperCase();
    if (letter && /^[A-Z]$/.test(letter)) list = list.filter(function (b) { return (b.name[0] || '').toUpperCase() === letter; });
    const total = list.length;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const per = Math.min(parseInt(req.query.limit) || 48, 100);
    const start = (page - 1) * per;
    const items = list.slice(start, start + per);
    res.json({ brands: items, total: total, page: page, per: per, ready: _brandsCache.at > 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
"""

s2 = s2.replace(anchor2, block + anchor2)
io.open(p2, 'w', encoding='utf-8').write(s2)
print('OK: added brandCountsRaw() + cached/cleaned /api/brands/all endpoint')
