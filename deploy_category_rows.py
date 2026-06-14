import io, sys

# ---------- Edit JS file: admitad-api.js ----------
jsp = 'public/js/admitad-api.js'
js = io.open(jsp, encoding='utf-8').read()

# Edit 1: extend getProducts to forward markdown + minprice
j_old1 = """  async function getProducts(opts = {}) {
    return request('/products', {
      category: opts.category || '',
      brand: opts.brand || '',
      page: opts.page || 1,
      limit: opts.limit || CONFIG.pageSize,
      sort: opts.sort || 'popularity',
      q: opts.q || '',
      currency: CONFIG.currency,
    });
  }"""
j_new1 = """  async function getProducts(opts = {}) {
    const params = {
      category: opts.category || '',
      brand: opts.brand || '',
      page: opts.page || 1,
      limit: opts.limit || CONFIG.pageSize,
      sort: opts.sort || 'popularity',
      q: opts.q || '',
      currency: CONFIG.currency,
    };
    if (opts.markdown) params.markdown = 'true';
    if (opts.minprice != null) params.minprice = opts.minprice;
    return request('/products', params);
  }"""

# Edit 2: add populateCategoryRow + dedupe right after populateTrending
j_old2 = """    container.innerHTML = data.products.map(renderProductCard).join('');
  }
  async function populateCoupons(containerId, limit = 3) {"""
j_new2 = """    container.innerHTML = data.products.map(renderProductCard).join('');
  }
  // Normalise a product name so size/colour variants collapse to one card:
  // "Kim Dress (Storm) | size: XS" -> "kim dress"
  function dedupeKey(p) {
    return (p.name || '')
      .toLowerCase()
      .replace(/\\|\\s*size:.*$/i, '')
      .replace(/\\([^)]*\\)/g, '')
      .replace(/\\s*-\\s*(xs|s|m|l|xl|xxl|\\d+[a-z]{0,2})\\s*$/i, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  // Fashion category row: genuine markdowns only, price floor kills junk,
  // variants de-duped, capped per store, then the first N distinct shown.
  async function populateCategoryRow(containerId, category, count = 8) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const data = await getProducts({
      category: category,
      markdown: true,
      minprice: 8,
      sort: 'discount',
      limit: 60,
    });
    const all = (data && data.products) || [];
    const seenName = {}, perStore = {}, out = [];
    for (const p of all) {
      if (out.length >= count) break;
      if (!(p.price > 0)) continue;
      const key = dedupeKey(p);
      if (!key || seenName[key]) continue;
      const store = (p.advertiser_name || p.brand || '').toLowerCase();
      if (store && (perStore[store] || 0) >= 2) continue;
      seenName[key] = 1;
      perStore[store] = (perStore[store] || 0) + 1;
      out.push(p);
    }
    if (!out.length) {
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;font-family:var(--font-serif);font-size:20px">New arrivals coming soon.</p>';
      return;
    }
    container.innerHTML = out.map(renderProductCard).join('');
  }
  async function populateCoupons(containerId, limit = 3) {"""

# Edit 3: wire the three rows into the init Promise.all
j_old3 = "      populateTrending('trendingProducts'),"
j_new3 = """      populateTrending('trendingProducts'),
      populateCategoryRow('womenProducts', 'women', 8),
      populateCategoryRow('menProducts', 'men', 8),
      populateCategoryRow('watchesProducts', 'watches', 8),"""

for tag, o, n in [('JS1', j_old1, j_new1), ('JS2', j_old2, j_new2), ('JS3', j_old3, j_new3)]:
    if js.count(o) != 1:
        print('ABORT', tag, '- found', js.count(o)); sys.exit(1)
    js = js.replace(o, n)

# ---------- Edit HTML file: index.html ----------
hp = 'index.html'
html = io.open(hp, encoding='utf-8').read()

h_old = """</section>
<!-- DEALS BANNER -->"""
h_new = """</section>

<!-- WOMEN -->
<section class="section">
  <div class="container">
    <div class="section-header">
      <p class="section-eyebrow">Shop Women</p>
      <h2 class="section-title">Women's Edit</h2>
      <a href="pages/women.html" class="section-link">See More →</a>
    </div>
    <div class="products-grid" id="womenProducts">
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
    </div>
  </div>
</section>

<!-- MEN -->
<section class="section">
  <div class="container">
    <div class="section-header">
      <p class="section-eyebrow">Shop Men</p>
      <h2 class="section-title">Men's Edit</h2>
      <a href="pages/men.html" class="section-link">See More →</a>
    </div>
    <div class="products-grid" id="menProducts">
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
    </div>
  </div>
</section>

<!-- WATCHES -->
<section class="section">
  <div class="container">
    <div class="section-header">
      <p class="section-eyebrow">Timepieces</p>
      <h2 class="section-title">Watches</h2>
      <a href="pages/women.html?cat=watches" class="section-link">See More →</a>
    </div>
    <div class="products-grid" id="watchesProducts">
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
    </div>
  </div>
</section>
<!-- DEALS BANNER -->"""

if html.count(h_old) != 1:
    print('ABORT HTML - found', html.count(h_old)); sys.exit(1)
html = html.replace(h_old, h_new)

# ---------- write ----------
io.open(jsp, 'w', encoding='utf-8').write(js)
io.open(hp, 'w', encoding='utf-8').write(html)
print('OK: 3 JS edits + 1 HTML edit applied')
