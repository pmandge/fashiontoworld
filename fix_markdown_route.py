import io, sys

p = 'backend/server.js'
s = io.open(p, encoding='utf-8').read()

# 1) Add markdown to the destructured query params
old_destr = "    const { category, subcategory, gender, brand, advertiser, color, size, sale, minprice, maxprice, page = 1, limit = 24, sort, q } = req.query;"
new_destr = "    const { category, subcategory, gender, brand, advertiser, color, size, sale, markdown, minprice, maxprice, page = 1, limit = 24, sort, q } = req.query;"
if old_destr not in s:
    print('ABORT: destructure line not found'); sys.exit(1)
s = s.replace(old_destr, new_destr)

# 2) Pass markdown into the query() call
old_call = "      category, subcategory, gender, brand, advertiser, color, size, onSale: sale === 'true',"
new_call = "      category, subcategory, gender, brand, advertiser, color, size, onSale: sale === 'true', markdown: markdown === 'true',"
if old_call not in s:
    print('ABORT: query call line not found'); sys.exit(1)
s = s.replace(old_call, new_call)

io.open(p, 'w', encoding='utf-8').write(s)
print('OK: /api/admitad/products now honors markdown=true')
