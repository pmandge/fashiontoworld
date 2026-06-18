import io, sys

# 1) Add freshDeals() to product-db-postgres.js — discounted items, RECENCY sorted
p1 = 'backend/services/product-db-postgres.js'
s1 = io.open(p1, encoding='utf-8').read()

if 'freshDeals' in s1:
    print('NOTE: freshDeals already present')
else:
    anchor = "async function diverseDiscounts("
    if anchor not in s1:
        print('ABORT: diverseDiscounts anchor missing'); sys.exit(1)
    fn = """async function freshDeals(limit, perStoreCap) {
  // "Today's Top Deals" — discounted items sorted by RECENCY (newest markdowns)
  // rather than biggest %, so it surfaces DIFFERENT products than the
  // discount-%-sorted "Biggest Discounts" rail. Safety + quality filtered.
  const cap = perStoreCap || 2;
  const want = limit || 12;
  const r = await pool.query(`
    SELECT * FROM products
    WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
      ${SAFE_CLAUSE}
    ORDER BY updated_at DESC, discount DESC
    LIMIT 4000
  `);
  const byStore = {}; const order = [];
  for (const row of r.rows) {
    const a = row.advertiser || '';
    if (!byStore[a]) { byStore[a] = []; order.push(a); }
    if (byStore[a].length < cap) byStore[a].push(row);
  }
  const out = [];
  for (let i = 0; i < cap; i++) {
    for (let s = 0; s < order.length; s++) {
      if (byStore[order[s]][i]) { out.push(byStore[order[s]][i]); if (out.length >= want) return out; }
    }
  }
  return out;
}

async function diverseDiscounts("""
    s1 = s1.replace(anchor, fn, 1)
    s1 = s1.replace("diverseDiscounts, trendingMix, brandCountsRaw };",
                    "diverseDiscounts, trendingMix, freshDeals, brandCountsRaw };")
    io.open(p1, 'w', encoding='utf-8').write(s1)
    print('OK: added freshDeals recency-sorted plus export')

# 2) Point refreshTopDeals at freshDeals instead of topDealsPerStore
p2 = 'backend/server.js'
s2 = io.open(p2, encoding='utf-8').read()

old = "const deals = await productDb.topDealsPerStore(TARGET);"
new = "const deals = await productDb.freshDeals(TARGET, 2);  // recency-sorted, distinct from Biggest Discounts"
if old in s2:
    s2 = s2.replace(old, new)
    io.open(p2, 'w', encoding='utf-8').write(s2)
    print('OK: Top Deals now uses freshDeals recency')
else:
    print('WARN: topDealsPerStore call not found')
