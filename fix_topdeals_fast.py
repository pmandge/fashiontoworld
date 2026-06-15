import io, sys

p = 'backend/services/product-db-postgres.js'
s = io.open(p, encoding='utf-8').read()

# Replace the slow DISTINCT ON implementation with a fast indexed LIMIT + JS dedupe.
old = """async function topDealsPerStore(limit) {
  const r = await pool.query(`
    SELECT * FROM (
      SELECT DISTINCT ON (advertiser) *
      FROM products
      WHERE advertiser <> '' AND price > 0
        AND discount >= 0.1 AND discount <= 0.9
        AND image_url IS NOT NULL AND image_url <> ''
      ORDER BY advertiser, discount DESC
    ) s
    ORDER BY discount DESC
    LIMIT $1
  `, [limit || 12]);
  return r.rows;
}"""

new = """async function topDealsPerStore(limit) {
  // Pull a wide pool of top discounts (fast: uses idx_discount), then keep the
  // single best deal per store in JS. Faster + lighter than a DB DISTINCT ON,
  // and still fully dynamic. The pool is wide enough that lower-discount stores
  // are still represented.
  const r = await pool.query(`
    SELECT * FROM products
    WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
    ORDER BY discount DESC
    LIMIT 10000
  `);
  const seen = {}; const out = [];
  for (const row of r.rows) {
    const a = row.advertiser || '';
    if (seen[a]) continue;
    seen[a] = 1;
    out.push(row);
    if (out.length >= (limit || 12)) break;
  }
  return out;
}"""

if old not in s:
    print('ABORT: topDealsPerStore (DISTINCT ON version) not found'); sys.exit(1)
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('OK: topDealsPerStore now uses fast indexed LIMIT + JS dedupe (one per store)')
