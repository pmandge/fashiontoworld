import io, sys

# ============ product-db-postgres.js ============
p1 = 'backend/services/product-db-postgres.js'
s1 = io.open(p1, encoding='utf-8').read()

# --- 1) Persist discount column + index in schema (so a rebuild recreates them) ---
sched_anchor = "    CREATE INDEX IF NOT EXISTS idx_cat_sale_upd ON products(category, on_sale DESC, updated_at DESC);"
if sched_anchor not in s1:
    print('ABORT: schema index anchor not found'); sys.exit(1)
if 'idx_discount' not in s1:
    s1 = s1.replace(
        sched_anchor,
        sched_anchor + "\n    CREATE INDEX IF NOT EXISTS idx_discount ON products(discount DESC);"
    )
# add the column to CREATE TABLE (after price_old) — only if not present
if 'discount REAL' not in s1:
    s1 = s1.replace(
        "advertiser TEXT, price REAL, price_old REAL, currency TEXT,",
        "advertiser TEXT, price REAL, price_old REAL, discount REAL DEFAULT 0, currency TEXT,"
    )

# --- 2) markdown filter -> use indexed discount column ---
old_md = "  if (markdown)    { where.push(`price_old IS NOT NULL AND price > 0 AND price_old > price AND price >= price_old * 0.1 AND price <= price_old * 0.9`); }"
new_md = "  if (markdown)    { where.push(`price > 0 AND discount >= 0.1 AND discount <= 0.9`); }"
if old_md not in s1:
    print('ABORT: markdown filter not found'); sys.exit(1)
s1 = s1.replace(old_md, new_md)

# --- 3) sort discount -> use indexed discount column ---
old_sort = '  else if (sort === \'discount\') order = "CASE WHEN price_old IS NOT NULL AND price_old > 0 THEN (price_old - price) / price_old ELSE 0 END DESC, on_sale DESC, updated_at DESC";'
new_sort = "  else if (sort === 'discount') order = 'discount DESC, on_sale DESC, updated_at DESC';"
if old_sort not in s1:
    print('ABORT: discount sort not found'); sys.exit(1)
s1 = s1.replace(old_sort, new_sort)

# --- 4) upsert: populate discount column on insert/update ---
old_cols = """      INSERT INTO products (id,name,description,brand,brand_logo,advertiser,price,price_old,currency,
        image_url,images,url,category,subcategory,feed_category,gender,color,size,material,on_sale,network,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      ON CONFLICT (id) DO UPDATE SET
        name=$2,price=$7,price_old=$8,image_url=$10,images=$11,url=$12,
        category=$13,subcategory=$14,brand_logo=$5,on_sale=$20,updated_at=$22`;"""
new_cols = """      INSERT INTO products (id,name,description,brand,brand_logo,advertiser,price,price_old,currency,
        image_url,images,url,category,subcategory,feed_category,gender,color,size,material,on_sale,network,updated_at,discount)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      ON CONFLICT (id) DO UPDATE SET
        name=$2,price=$7,price_old=$8,image_url=$10,images=$11,url=$12,
        category=$13,subcategory=$14,brand_logo=$5,on_sale=$20,updated_at=$22,discount=$23`;"""
if old_cols not in s1:
    print('ABORT: upsert columns not found'); sys.exit(1)
s1 = s1.replace(old_cols, new_cols)

# add the discount value to the params array
old_params = """        p.gender || 'unisex', p.color || '', p.size || '', p.material || '',
        !!p.on_sale, p.network || 'admitad', runStamp,
      ]);"""
new_params = """        p.gender || 'unisex', p.color || '', p.size || '', p.material || '',
        !!p.on_sale, p.network || 'admitad', runStamp,
        (p.price_old && p.price_old > 0 && p.price_old > p.price) ? (p.price_old - p.price) / p.price_old : 0,
      ]);"""
if old_params not in s1:
    print('ABORT: upsert params not found'); sys.exit(1)
s1 = s1.replace(old_params, new_params)

# --- 5) add topDealsPerStore using DISTINCT ON (background-cached) ---
exports_line = "subcategoryFacets, topBrands, storeLink };"
if exports_line not in s1:
    # maybe topDealsPerStore already partially added by earlier abandoned script? check
    if 'topDealsPerStore' in s1:
        print('NOTE: topDealsPerStore already present, skipping add')
    else:
        print('ABORT: exports anchor not found'); sys.exit(1)
else:
    fn = """// One best markdown deal per store (DISTINCT ON). Used by the background
// "Today's Top Deals" refresh only (cached), so its cost never hits a user
// request. Fully dynamic: every store with a qualifying discount contributes
// exactly one deal, discount-sorted.
async function topDealsPerStore(limit) {
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
}

"""
    s1 = s1.replace(exports_line, "subcategoryFacets, topBrands, storeLink, topDealsPerStore };")
    # insert function before module.exports
    s1 = s1.replace("module.exports = {", fn + "module.exports = {", 1)

io.open(p1, 'w', encoding='utf-8').write(s1)

# ============ server.js: point refreshTopDeals at topDealsPerStore ============
p2 = 'backend/server.js'
s2 = io.open(p2, encoding='utf-8').read()

# Handle whichever current form is present.
variants = [
"""    // genuine markdowns only, biggest discount first (no on-sale-flag fill)
    const md = await productDb.query({ markdown: true, sort: 'discount', limit: 250 });
    take((md && md.products) || []);
    _topDeals = { at: Date.now(), data: out };""",
]
new_block = """    // One best deal per store (DB-level DISTINCT ON, indexed discount column),
    // cached in the background so the cost never hits a user request. Dynamic:
    // new discount-carrying stores appear automatically on the next refresh.
    const deals = await productDb.topDealsPerStore(TARGET);
    take(deals || []);
    _topDeals = { at: Date.now(), data: out };"""
done = False
for v in variants:
    if v in s2:
        s2 = s2.replace(v, new_block); done = True; break
if not done:
    # maybe an earlier script already swapped it to topDealsPerStore
    if 'topDealsPerStore' in s2:
        print('NOTE: server.js already references topDealsPerStore')
        done = True
if not done:
    print('ABORT: refreshTopDeals query block not found in server.js'); sys.exit(1)

io.open(p2, 'w', encoding='utf-8').write(s2)
print('OK: discount column wired everywhere (markdown filter, sort, upsert, top-deals)')
