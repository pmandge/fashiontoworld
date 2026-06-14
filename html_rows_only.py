import io, sys
hp = 'index.html'
html = io.open(hp, encoding='utf-8').read()

anchor = '<!-- DEALS BANNER -->'
if html.count(anchor) != 1:
    print('ABORT: anchor count', html.count(anchor)); sys.exit(1)

# Guard against double-apply: if rows already present, stop.
if 'id="womenProducts"' in html:
    print('ABORT: rows already present, not re-inserting'); sys.exit(1)

block = '''<!-- WOMEN -->
<section class="section">
  <div class="container">
    <div class="section-header">
      <p class="section-eyebrow">Shop Women</p>
      <h2 class="section-title">Women's Edit</h2>
      <a href="pages/women.html" class="section-link">See More \u2192</a>
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
      <a href="pages/men.html" class="section-link">See More \u2192</a>
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
      <a href="pages/women.html?cat=watches" class="section-link">See More \u2192</a>
    </div>
    <div class="products-grid" id="watchesProducts">
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      <div class="loading-skeleton"></div><div class="loading-skeleton"></div>
    </div>
  </div>
</section>

'''

html = html.replace(anchor, block + anchor, 1)
io.open(hp, 'w', encoding='utf-8').write(html)
print('OK: 3 category sections inserted before deals banner')
