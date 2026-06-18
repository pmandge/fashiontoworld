import io, sys
p = 'backend/services/product-db-postgres.js'
s = io.open(p, encoding='utf-8').read()

# 1) Add a shared SAFE_CLAUSE constant near the top (after the pool/require area).
if 'SAFE_CLAUSE' not in s:
    # insert after the first line that ends the requires / pool setup.
    # Find a stable anchor: the module's first 'async function' OR 'const pool'
    marker = None
    for cand in ["const pool", "let pool", "module.exports"]:
        if cand in s:
            marker = cand; break
    safe_def = """// Brand-safety: exclude lingerie / intimates / swimwear / adult content from
// any customer-facing product query. Matches product name AND category/subcategory.
const SAFE_EXCLUDE = "(lingerie|intimate|sexy|underwear|knicker|panties|panty|thong|g-string|boxer brief|briefs|boyshort|bra |bras|bralette|bodysuit|teddy|babydoll|chemise|corset|bustier|garter|nightwear|nightgown|nightie|negligee|sleepwear|pajama|pyjama|swimwear|swimsuit|swim suit|bikini|monokini|fishnet|crotchless|see-through|see through|sheer|erotic|fetish|adult toy|nipple|g spot)";
const SAFE_CLAUSE = `
  AND COALESCE(name,'') !~* '${SAFE_EXCLUDE}'
  AND COALESCE(category,'') !~* '${SAFE_EXCLUDE}'
  AND COALESCE(subcategory,'') !~* '${SAFE_EXCLUDE}'
`;
"""
    # Put it right before the first 'async function' to keep it module-scoped.
    idx = s.find("async function")
    if idx == -1:
        print('ABORT: no async function anchor'); sys.exit(1)
    s = s[:idx] + safe_def + "\n" + s[idx:]
    print('OK: added SAFE_CLAUSE constant')
else:
    print('NOTE: SAFE_CLAUSE already present')

# 2) Apply SAFE_CLAUSE to the diverseDiscounts query.
old_q = """    SELECT * FROM products
    WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
    ORDER BY discount DESC
    LIMIT 10000"""
new_q = """    SELECT * FROM products
    WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
      ${SAFE_CLAUSE}
    ORDER BY discount DESC
    LIMIT 10000"""
if old_q in s:
    s = s.replace(old_q, new_q)
    print('OK: diverseDiscounts now filters unsafe content')
else:
    print('WARN: diverseDiscounts query not matched (may already be patched)')

# 3) Apply the same to topDealsPerStore query (so Today's Top Deals is safe too).
old_td = """    SELECT * FROM products
    WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
    ORDER BY discount DESC
    LIMIT 10000
  `);"""
# topDealsPerStore has identical text; the first replace above already changed
# the diverseDiscounts one. Now handle any remaining identical block.
count_blocks = s.count("""WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
    ORDER BY discount DESC""")
if count_blocks > 0:
    s = s.replace("""WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
    ORDER BY discount DESC""",
    """WHERE price > 0 AND discount >= 0.1 AND discount <= 0.9
      AND image_url IS NOT NULL AND image_url <> '' AND advertiser <> ''
      ${SAFE_CLAUSE}
    ORDER BY discount DESC""")
    print('OK: topDealsPerStore now filters unsafe content too')

io.open(p, 'w', encoding='utf-8').write(s)
print('DONE')
