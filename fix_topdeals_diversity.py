import io, sys

p = 'backend/server.js'
s = io.open(p, encoding='utf-8').read()

# Change 1: one deal per store (was max 2)
old1 = "        if ((perStore[store] || 0) >= 2) continue;     // max 2 per store"
new1 = "        if ((perStore[store] || 0) >= 1) continue;     // one deal per store (max variety)"
if old1 not in s:
    print('ABORT: per-store cap line not found'); sys.exit(1)
s = s.replace(old1, new1)

# Change 2: target 12 for exactly 3 rows of 4
old2 = "    const TARGET = 15;                 // ~3 rows"
new2 = "    const TARGET = 12;                 // 3 rows of 4, one per store"
if old2 not in s:
    print('ABORT: TARGET line not found'); sys.exit(1)
s = s.replace(old2, new2)

io.open(p, 'w', encoding='utf-8').write(s)
print('OK: top deals now one-per-store, target 12 (3 rows)')
