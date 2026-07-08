/* blog-shop.js — reusable dynamic product blocks for blog articles.
 *
 * Usage in any article: drop a block like this where you want live products:
 *   <div class="blog-shop" data-shop-title="Shop the Edit"
 *        data-category="beauty" data-sort="discount" data-limit="4"></div>
 *
 * Supported data-* attributes (all optional):
 *   data-category   e.g. women | men | shoes | bags | jewellery | watches | beauty | accessories
 *   data-q          free-text search, e.g. "white shirt"
 *   data-sort       popularity | discount | price_asc | price_desc | sale
 *   data-markdown   "true" to only show discounted items
 *   data-limit      how many products (default 4)
 *   data-shop-title heading shown above the block (default "Shop the Edit")
 *
 * The block always shows whatever is currently live in the catalogue, so it
 * never breaks when a specific product sells out. Each card links OUT to the
 * retailer via the product's affiliate URL (a click-out = a tracked cookie).
 */
(function () {
  var API_BASE = (window.API_BASE || '');

  function money(p) {
    if (p == null || p === '') return '';
    var cur = '$';
    return cur + Number(p).toFixed(2);
  }

  function cardHTML(p) {
    var link = p.affiliate_url || p.url || '#';
    var img = p.image_url || '';
    var brand = (p.brand || p.advertiser || '').toString();
    var name = (p.name || '').toString();
    var price = money(p.price);
    var old = (p.price_old && Number(p.price_old) > Number(p.price)) ? money(p.price_old) : '';
    var pct = '';
    if (old) {
      var d = Math.round((1 - Number(p.price) / Number(p.price_old)) * 100);
      if (d > 0 && d < 100) pct = '<span class="bs-pct">-' + d + '%</span>';
    }
    return '<a class="bs-card" href="' + link + '" target="_blank" rel="nofollow sponsored noopener">'
      + '<div class="bs-img">' + (pct) + '<img src="' + img + '" alt="' + name.replace(/"/g, '') + '" loading="lazy" decoding="async"></div>'
      + '<div class="bs-body">'
      + (brand ? '<div class="bs-brand">' + brand + '</div>' : '')
      + '<div class="bs-name">' + name + '</div>'
      + '<div class="bs-price">' + price + (old ? ' <span class="bs-old">' + old + '</span>' : '') + '</div>'
      + '<div class="bs-cta">Shop Now →</div>'
      + '</div></a>';
  }

  function buildQuery(d) {
    var params = new URLSearchParams();
    if (d.category) params.set('category', d.category);
    if (d.q) params.set('q', d.q);
    params.set('sort', d.sort || 'popularity');
    if (d.markdown === 'true') params.set('markdown', 'true');
    var limit = parseInt(d.limit || '4', 10) || 4;
    params.set('limit', String(limit * 2)); // over-fetch, then filter to valid click-outs
    params.set('page', '1');
    return params.toString();
  }

  async function fillBlock(block) {
    var d = block.dataset;
    var limit = parseInt(d.limit || '4', 10) || 4;
    var title = d.shopTitle || 'Shop the Edit';

    // shell with heading + skeleton
    block.innerHTML =
      '<div class="bs-head"><h4>' + title + '</h4>'
      + '<span class="bs-sub">Live from worldwide-shipping stores</span></div>'
      + '<div class="bs-grid" aria-busy="true">' + Array(limit).fill('<div class="bs-skel"></div>').join('') + '</div>';

    try {
      var url = API_BASE + '/api/admitad/products?' + buildQuery(d);
      var r = await fetch(url);
      var data = await r.json();
      var prods = (data && data.products ? data.products : []).filter(function (p) {
        return p.image_url && /^https?:/i.test(p.affiliate_url || p.url || '');
      }).slice(0, limit);

      var grid = block.querySelector('.bs-grid');
      if (!prods.length) { block.style.display = 'none'; return; }
      grid.removeAttribute('aria-busy');
      grid.innerHTML = prods.map(cardHTML).join('');
    } catch (e) {
      block.style.display = 'none';
    }
  }

  function init() {
    var blocks = document.querySelectorAll('.blog-shop');
    if (!blocks.length) return;
    blocks.forEach(fillBlock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
