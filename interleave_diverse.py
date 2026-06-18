import io, sys
p = 'backend/services/product-db-postgres.js'
s = io.open(p, encoding='utf-8').read()

old = """  const perStore = {}; const out = [];
  for (const row of r.rows) {
    const a = row.advertiser || '';
    if ((perStore[a] || 0) >= cap) continue;
    perStore[a] = (perStore[a] || 0) + 1;
    out.push(row);
    if (out.length >= want) break;
  }
  return out;
}"""

new = """  // Bucket products by store (each store keeps its top `cap`, discount-sorted).
  const byStore = {}; const order = [];
  for (const row of r.rows) {
    const a = row.advertiser || '';
    if (!byStore[a]) { byStore[a] = []; order.push(a); }
    if (byStore[a].length < cap) byStore[a].push(row);
  }
  // Round-robin across stores so the rail leads with VARIETY (one per store
  // before repeating) instead of one store's whole block up front.
  const out = [];
  for (let i = 0; i < cap; i++) {
    for (let s = 0; s < order.length; s++) {
      const list = byStore[order[s]];
      if (list[i]) { out.push(list[i]); if (out.length >= want) return out; }
    }
  }
  return out;
}"""

if old not in s:
    print('ABORT: diverseDiscounts loop not found'); sys.exit(1)
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('OK: diverseDiscounts now interleaves stores round-robin')
