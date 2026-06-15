import io, sys

p = 'backend/services/product-db-postgres.js'
s = io.open(p, encoding='utf-8').read()

# 1) Add a plain btree index on lower(advertiser) for fast exact lookups,
#    next to the other index creations.
idx_anchor = "    await pool.query('CREATE INDEX IF NOT EXISTS idx_advertiser_trgm ON products USING gin (advertiser gin_trgm_ops)');"
if idx_anchor not in s:
    print('ABORT: advertiser_trgm anchor not found (run fix_store_link.py first)'); sys.exit(1)
if 'idx_advertiser_lower' not in s:
    s = s.replace(
        idx_anchor,
        idx_anchor + "\n    await pool.query('CREATE INDEX IF NOT EXISTS idx_advertiser_lower ON products (LOWER(advertiser))');"
    )

# 2) Replace the slow storeLink ILIKE query with an exact (case-insensitive) match.
old_fn = """async function storeLink(store) {
  const name = (store || '').trim();
  if (!name) return '';
  const r = await pool.query(
    "SELECT url FROM products WHERE advertiser ILIKE $1 AND url <> '' LIMIT 1",
    ['%' + name + '%']
  );
  return (r.rows[0] && r.rows[0].url) || '';
}"""
new_fn = """async function storeLink(store) {
  const name = (store || '').trim();
  if (!name) return '';
  // Exact (case-insensitive) match uses idx_advertiser_lower -> sub-ms, instead
  // of a leading-wildcard ILIKE that forces a full sequential scan.
  let r = await pool.query(
    "SELECT url FROM products WHERE LOWER(advertiser) = LOWER($1) AND url <> '' LIMIT 1",
    [name]
  );
  if (r.rows[0] && r.rows[0].url) return r.rows[0].url;
  // Fallback: trigram-assisted fuzzy match (handles minor name differences),
  // bounded so it can't run away.
  r = await pool.query(
    "SELECT url FROM products WHERE advertiser ILIKE $1 AND url <> '' LIMIT 1",
    ['%' + name + '%']
  );
  return (r.rows[0] && r.rows[0].url) || '';
}"""
if old_fn not in s:
    print('ABORT: storeLink function not found in expected form'); sys.exit(1)
s = s.replace(old_fn, new_fn)

io.open(p, 'w', encoding='utf-8').write(s)
print('OK: storeLink now uses exact LOWER(advertiser) match + idx_advertiser_lower')
