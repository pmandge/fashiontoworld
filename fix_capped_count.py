import io, sys

p = 'backend/services/product-db-postgres.js'
s = io.open(p, encoding='utf-8').read()

# Replace the unbounded COUNT(*) with a capped count: count rows only up to a
# ceiling (500) via a subquery with LIMIT. Beyond that we report 2000 and the
# response marks it approximate. Exact count for small result sets; fast for
# huge ones (no full scan). The expensive part was counting ALL matching rows.
old = "  const totalR = await pool.query(`SELECT COUNT(*)::int n FROM products ${w}`, vals);"
new = """  // Capped count: counting ALL matching rows is a full scan (slow for large
  // filtered sets like deals). Count up to a ceiling instead — exact for small
  // sets, fast "N+" for large ones. The rows query below is index-fast anyway.
  const COUNT_CAP = 500;
  const totalR = await pool.query(
    `SELECT COUNT(*)::int n FROM (SELECT 1 FROM products ${w} LIMIT ${COUNT_CAP}) _c`,
    vals
  );"""
if old not in s:
    print('ABORT: COUNT line not found'); sys.exit(1)
s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8').write(s)
print('OK: COUNT is now capped at 500 (no more full-scan counts)')
