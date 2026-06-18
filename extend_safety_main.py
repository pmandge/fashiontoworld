import io, sys
p = 'backend/services/product-db-postgres.js'
s = io.open(p, encoding='utf-8').read()

if 'SAFE_CLAUSE' not in s:
    print('ABORT: SAFE_CLAUSE not defined (run add_safety_filter first)'); sys.exit(1)

# Apply SAFE_CLAUSE to the main query() WHERE clause.
# The query builds `const w = where.length ? 'WHERE ' + where.join(' AND ') : '';`
# We append the safety clause to `w` so EVERY product listing/search excludes unsafe items.
old = "const w = where.length ? 'WHERE ' + where.join(' AND ') : '';"
new = "const w = (where.length ? 'WHERE ' + where.join(' AND ') : 'WHERE 1=1') + SAFE_CLAUSE;"

if old not in s:
    if "SAFE_CLAUSE;" in s and "WHERE 1=1" in s:
        print('NOTE: main query already has SAFE_CLAUSE'); sys.exit(0)
    print('ABORT: main query WHERE builder not found'); sys.exit(1)

s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('OK: SAFE_CLAUSE now applied to main query() — site-wide brand safety')
