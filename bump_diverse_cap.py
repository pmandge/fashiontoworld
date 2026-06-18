import io, sys
p = 'backend/server.js'
s = io.open(p, encoding='utf-8').read()

old = "const rows = await productDb.diverseDiscounts(32, 2);"
new = "const rows = await productDb.diverseDiscounts(32, 4);"

if old not in s:
    if new in s:
        print('NOTE: cap already 4'); sys.exit(0)
    print('ABORT: diverseDiscounts(32, 2) call not found'); sys.exit(1)

s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('OK: raised per-store cap 2 -> 4 (pool ~16 products)')
