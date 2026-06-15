import io, sys

# server.js ONLY — product-db already has brandCountsRaw. Uses _brandsDirCache
# (the existing _brandsCache is a different feature).
p2 = 'backend/server.js'
s2 = io.open(p2, encoding='utf-8').read()

if 'api/brands/all' in s2:
    print('NOTE: /api/brands/all already present, nothing to do'); sys.exit(0)

anchor2 = "app.get('/api/brands/top', async (req, res) => {"
if anchor2 not in s2:
    print('ABORT: /api/brands/top anchor not found'); sys.exit(1)

block = """// ---- Cached, cleaned brands directory (the raw query is a heavy scan) ----
let _brandsDirCache = { at: 0, data: [] };
let _brandsDirFetching = false;
// Non-brands to hide: feed artifacts / tags / store-as-brand noise.
const BRAND_EXCLUDE = new Set(['loopi', 'luxefashionclothing', 'thrifted']);
function brandNormKey(name) {
  // Merge spelling variants: "Dolce&Gabbana" == "Dolce & Gabbana".
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
async function refreshBrands() {
  if (_brandsDirFetching) return; _brandsDirFetching = true;
  try {
    const raw = await productDb.brandCountsRaw();
    const advs = (await productDb.advertiserCounts()) || [];
    const advSet = new Set(advs.map(function (a) { return brandNormKey(a.name); }));
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
      if (/\\s/.test(b.name) && !/\\s/.test(merged[key].name)) merged[key].name = b.name;
    }
    const list = Object.keys(merged).map(function (k) { return merged[k]; })
      .sort(function (a, b) { return b.count - a.count; });
    _brandsDirCache = { at: Date.now(), data: list };
    console.log('[brands] cached', list.length, 'cleaned brands');
  } catch (e) { console.error('[brands]', e.message); }
  finally { _brandsDirFetching = false; }
}
setTimeout(function () { refreshBrands(); }, 12000);
setInterval(function () { refreshBrands(); }, 6 * 3600 * 1000);

app.get('/api/brands/all', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=600');
    if (Date.now() - _brandsDirCache.at > 6 * 3600 * 1000 + 60000) refreshBrands();
    let list = _brandsDirCache.data || [];
    const q = (req.query.q || '').trim().toLowerCase();
    if (q) list = list.filter(function (b) { return b.name.toLowerCase().indexOf(q) > -1; });
    const letter = (req.query.letter || '').trim().toUpperCase();
    if (letter && /^[A-Z]$/.test(letter)) list = list.filter(function (b) { return (b.name[0] || '').toUpperCase() === letter; });
    const total = list.length;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const per = Math.min(parseInt(req.query.limit) || 48, 100);
    const start = (page - 1) * per;
    const items = list.slice(start, start + per);
    res.json({ brands: items, total: total, page: page, per: per, ready: _brandsDirCache.at > 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
"""

s2 = s2.replace(anchor2, block + anchor2)
io.open(p2, 'w', encoding='utf-8').write(s2)
print('OK: /api/brands/all (cached+cleaned) added to server.js')
