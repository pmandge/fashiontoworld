/**
 * ============================================================
 * FashionToWorld — Admitad API Integration
 * ============================================================
 * 
 * SETUP: Copy /backend/config/admitad.config.js and fill in:
 *   - ADMITAD_CLIENT_ID
 *   - ADMITAD_CLIENT_SECRET
 *   - ADMITAD_WEBSITE_ID
 * 
 * This file handles:
 *   1. OAuth2 token management (auto-refresh)
 *   2. Product datafeed fetch + local cache
 *   3. Coupon/deal fetch
 *   4. Affiliate link generation
 *   5. Publisher statistics
 * ============================================================
 */

const AdmitadAPI = (() => {

  // ─── CONFIG (injected from backend or env) ───────────────────
  const CONFIG = {
    // For client-side use, these come from your backend proxy
    // NEVER expose client_secret in frontend JS
    // baseUrl respects window.API_BASE (set in api-config.js), so you can
    // point the whole site at Netlify ('') or DigitalOcean (full URL).
    baseUrl: ((window.API_BASE || '') + '/api/admitad'),
    cacheTimeout: 30 * 60 * 1000,   // 30 minutes cache
    defaultLocale: 'en',
    currency: 'USD',
    pageSize: 24,
  };

  // ─── CACHE ───────────────────────────────────────────────────
  const cache = new Map();

  function setCache(key, data) {
    cache.set(key, { data, ts: Date.now() });
  }

  function getCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CONFIG.cacheTimeout) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  // ─── HTTP HELPER ─────────────────────────────────────────────
  async function request(endpoint, params = {}) {
    const cached = getCache(endpoint + JSON.stringify(params));
    if (cached) return cached;

    const url = new URL(CONFIG.baseUrl + endpoint, window.location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setCache(endpoint + JSON.stringify(params), data);
      return data;
    } catch (err) {
      console.warn('AdmitadAPI fetch failed:', err);
      return null;
    }
  }

  // ─── PUBLIC API ──────────────────────────────────────────────

  /**
   * Get products from Admitad datafeed
   * @param {Object} opts - { category, brand, page, sort, q }
   */
  async function getProducts(opts = {}) {
    return request('/products', {
      category: opts.category || '',
      brand: opts.brand || '',
      page: opts.page || 1,
      limit: opts.limit || CONFIG.pageSize,
      sort: opts.sort || 'popularity',
      q: opts.q || '',
      currency: CONFIG.currency,
    });
  }

  /**
   * Get active coupons/promotions
   * @param {Object} opts - { brand, page }
   */
  async function getCoupons(opts = {}) {
    return request('/coupons', {
      brand: opts.brand || '',
      page: opts.page || 1,
      limit: opts.limit || 10,
      status: 'active',
    });
  }

  /**
   * Get advertiser/brand list
   * @param {Object} opts - { tier, page, q }
   */
  async function getBrands(opts = {}) {
    return request('/brands', {
      tier: opts.tier || '',
      page: opts.page || 1,
      limit: opts.limit || 24,
      q: opts.q || '',
    });
  }

  /**
   * Get categories tree
   */
  async function getCategories() {
    return request('/categories');
  }

  /**
   * Generate affiliate deep link for a product URL
   * @param {string} productUrl - Original product URL
   * @param {string} advertiserId - Admitad advertiser ID
   */
  async function getAffiliateLink(productUrl, advertiserId) {
    const data = await request('/affiliate-link', {
      url: encodeURIComponent(productUrl),
      adv_id: advertiserId,
    });
    return data?.affiliate_url || productUrl;
  }

  /**
   * Get publisher statistics (revenue, clicks, conversions)
   * @param {Object} opts - { dateFrom, dateTo }
   */
  async function getStats(opts = {}) {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    return request('/stats', {
      date_from: opts.dateFrom || weekAgo,
      date_to: opts.dateTo || today,
    });
  }

  // ─── RENDER HELPERS ──────────────────────────────────────────

  function renderProductCard(product) {
    const hasDiscount = product.price_old && product.price_old > product.price;
    const discount = hasDiscount
      ? Math.round((1 - product.price / product.price_old) * 100)
      : 0;

    return `
      <article class="product-card">
        <div class="product-img">
          <img src="${product.image_url || '/public/images/placeholder.jpg'}"
               alt="${product.name}"
               loading="lazy"
               onerror="this.src='/public/images/placeholder.jpg'">
          ${hasDiscount ? `<span class="product-badge sale">-${discount}%</span>` : ''}
          ${product.is_new ? `<span class="product-badge">New</span>` : ''}
        </div>
        <div class="product-body">
          <p class="product-brand">${product.brand || product.advertiser_name}</p>
          <h3 class="product-name">${product.name}</h3>
          <div class="product-price-row">
            <span class="product-price">${formatPrice(product.price, product.currency)}</span>
            ${hasDiscount ? `<span class="product-original">${formatPrice(product.price_old, product.currency)}</span>` : ''}
            ${discount ? `<span class="product-discount">-${discount}%</span>` : ''}
          </div>
        </div>
        <div class="product-footer">
          <a href="${product.affiliate_url || product.url}"
             class="btn-product"
             target="_blank"
             rel="noopener sponsored"
             data-product-id="${product.id}"
             onclick="trackClick('${product.id}', '${product.advertiser_name}')">
            Shop Now
          </a>
        </div>
      </article>
    `;
  }

  function renderCouponCard(coupon) {
    return `
      <div class="deal-coupon" onclick="copyCouponCode('${coupon.promocode}', this)">
        <div class="deal-coupon-logo">🏷️</div>
        <div class="deal-coupon-info">
          <p class="deal-coupon-store">${coupon.advertiser_name}</p>
          <p class="deal-coupon-title">${coupon.name}</p>
          ${coupon.promocode
            ? `<span class="deal-coupon-code">🔖 ${coupon.promocode}</span>`
            : `<span class="deal-coupon-code">Auto-applied</span>`}
        </div>
      </div>
    `;
  }

  function renderBrandTile(brand) {
    return `
      <a href="/pages/brand.html?id=${brand.id}&name=${encodeURIComponent(brand.name)}"
         class="brand-tile">
        <span class="brand-tile-name">${brand.name}</span>
        <span class="brand-tile-products">${brand.products_count || ''} Products</span>
      </a>
    `;
  }

  // ─── UTILITIES ───────────────────────────────────────────────

  function formatPrice(amount, currency = 'USD') {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function trackClick(productId, brandName) {
    // Send to analytics (Google Analytics / Admitad pixel)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'select_item', {
        item_id: productId,
        item_name: brandName,
        content_type: 'product',
      });
    }
    if (typeof admitadReExternal !== 'undefined') {
      admitadReExternal.reExternal();
    }
  }

  function copyCouponCode(code, el) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      const orig = el.querySelector('.deal-coupon-code').textContent;
      el.querySelector('.deal-coupon-code').textContent = '✓ Copied!';
      setTimeout(() => {
        el.querySelector('.deal-coupon-code').textContent = orig;
      }, 2000);
    });
  }

  // ─── AUTO-POPULATE PAGE SECTIONS ─────────────────────────────

  async function populateTrending(containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = await getProducts({ sort: 'popularity', limit: 6, ...opts });
    if (!data?.products?.length) {
      container.innerHTML = renderFallbackProducts();
      return;
    }

    container.innerHTML = data.products.map(renderProductCard).join('');
  }

  async function populateCoupons(containerId, limit = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = await getCoupons({ limit });
    if (!data?.coupons?.length) {
      container.innerHTML = renderFallbackCoupons();
      return;
    }

    container.innerHTML = data.coupons.map(renderCouponCard).join('');
  }

  async function populateBrands(containerId, limit = 12) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = await getBrands({ limit });
    if (!data?.brands?.length) {
      container.innerHTML = renderFallbackBrands();
      return;
    }

    container.innerHTML = data.brands.map(renderBrandTile).join('');
  }

  async function populateCategories(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Curated fashion imagery per category (free Unsplash photos)
    const IMG = {
      women: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80',
      men: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=500&q=80',
      kids: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=500&q=80',
      shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80',
      bags: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80',
      jewellery: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80',
      accessories: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80',
      beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&q=80',
      luxury: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&q=80',
      sustainable: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80',
    };

    const tax = window.FASHION_TAXONOMY;
    let tiles;
    if (tax) {
      tiles = Object.values(tax).map((c) => ({
        name: c.label,
        img: IMG[c.slug] || '',
        url: (c.slug === 'women' || c.slug === 'men') ? `/pages/${c.slug}.html` : `/pages/women.html?cat=${c.slug}`,
      }));
    } else {
      tiles = Object.keys(IMG).map(k => ({ name: k, img: IMG[k], url: `/pages/women.html?cat=${k}` }));
    }

    container.innerHTML = tiles.map(cat => `
      <a href="${cat.url}" class="category-card">
        <div class="category-card-bg" style="background-image:url('${cat.img}');background-size:cover;background-position:center"></div>
        <span class="category-card-label">${cat.name}</span>
      </a>
    `).join('');
  }

  // ─── HERO BANNER (fed from Admitad) ──────────────────────────
  // Pulls one top-rated fashion deal + a featured product so the
  // hero showcases a live offer. Falls back to the static design.
  async function populateHeroBanner() {
    // Featured product → floating card
    try {
      const prod = await getProducts({ sort: 'popularity', limit: 1 });
      const p = prod?.products?.[0];
      if (p) {
        const card = document.querySelector('.product-card-float');
        if (card) {
          const img = card.querySelector('.pcf-img');
          if (img && p.image_url) img.style.backgroundImage = `url('${p.image_url}')`, img.style.backgroundSize = 'cover';
          const brand = card.querySelector('.pcf-brand');
          const name = card.querySelector('.pcf-name');
          const price = card.querySelector('.pcf-price');
          if (brand) brand.textContent = p.brand || p.advertiser_name;
          if (name) name.textContent = p.name;
          if (price) price.textContent = formatPrice(p.price, p.currency);
          // Make the whole floating card clickable to the real store
          card.style.cursor = 'pointer';
          card.onclick = () => window.open(p.affiliate_url || p.url, '_blank', 'noopener');
        }
      }
    } catch (e) { /* keep static card */ }

    // Top deal → "Up to X% Off" badge
    try {
      const deals = await getCoupons({ limit: 10 });
      const list = deals?.coupons || [];
      const best = list
        .map(c => ({ c, pct: parseInt((c.discount || '').replace(/\D/g, '')) || 0 }))
        .sort((a, b) => b.pct - a.pct)[0];
      if (best && best.pct > 0) {
        const badge = document.querySelector('.hero-badge-2');
        if (badge) badge.textContent = `Up to ${best.pct}% Off`;
      }
    } catch (e) { /* keep static badge */ }
  }

  // ─── FALLBACKS (when API is not yet configured) ───────────────

  function renderFallbackProducts() {
    const demoProducts = [
      { name: 'Silk Midi Dress', brand: 'Zara', price: 89, price_old: 129, currency: 'USD', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80', id: '1', advertiser_name: 'Zara', url: 'pages/deals.html', affiliate_url: 'pages/deals.html' },
      { name: 'Classic Leather Bag', brand: 'Mango', price: 149, price_old: null, currency: 'USD', image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80', id: '2', advertiser_name: 'Mango', url: 'pages/deals.html', affiliate_url: 'pages/deals.html' },
      { name: 'Tailored Blazer', brand: 'ASOS', price: 65, price_old: 95, currency: 'USD', image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80', id: '3', advertiser_name: 'ASOS', url: 'pages/deals.html', affiliate_url: 'pages/deals.html' },
      { name: 'Floral Maxi Skirt', brand: 'H&M', price: 39, price_old: null, currency: 'USD', image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&q=80', id: '4', advertiser_name: 'H&M', url: 'pages/deals.html', affiliate_url: 'pages/deals.html' },
      { name: 'White Sneakers', brand: 'Nike', price: 110, price_old: 130, currency: 'USD', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80', id: '5', advertiser_name: 'Nike', url: 'pages/deals.html', affiliate_url: 'pages/deals.html' },
      { name: 'Gold Hoop Earrings', brand: 'Mejuri', price: 45, price_old: null, currency: 'USD', image_url: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=400&q=80', id: '6', advertiser_name: 'Mejuri', url: 'pages/deals.html', affiliate_url: 'pages/deals.html' },
    ];
    return demoProducts.map(renderProductCard).join('');
  }

  function renderFallbackCoupons() {
    return [
      { advertiser_name: 'ASOS', name: '20% Off Everything', promocode: 'FASHION20' },
      { advertiser_name: 'Zara', name: 'Free Shipping on Orders $50+', promocode: '' },
      { advertiser_name: 'Net-a-Porter', name: '15% Off New Arrivals', promocode: 'NEW15' },
    ].map(renderCouponCard).join('');
  }

  function renderFallbackBrands() {
    return [
      'Gucci', 'Zara', 'ASOS', 'Prada', 'Mango', 'H&M',
      'Burberry', 'Versace', 'Net-a-Porter', 'Farfetch', 'Valentino', 'Balenciaga'
    ].map((name, i) => renderBrandTile({ id: i + 1, name, products_count: Math.floor(Math.random() * 500) + 50 })).join('');
  }

  // ─── DATAFEED SYNC MANAGER ───────────────────────────────────
  // This runs on page load to pre-warm the cache

  async function initDatafeed() {
    await Promise.allSettled([
      populateCategories('categoryGrid'),
      populateHeroBanner(),
      populateTrending('trendingProducts'),
      populateCoupons('dealsPreview', 3),
      populateBrands('brandsGrid', 12),
    ]);
  }

  // ─── PUBLIC INTERFACE ────────────────────────────────────────
  return {
    getProducts,
    getCoupons,
    getBrands,
    getCategories,
    getAffiliateLink,
    getStats,
    renderProductCard,
    renderCouponCard,
    renderBrandTile,
    formatPrice,
    trackClick,
    copyCouponCode,
    populateTrending,
    populateCoupons,
    populateBrands,
    populateCategories,
    populateHeroBanner,
    initDatafeed,
  };
})();

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdmitadAPI.initDatafeed());
} else {
  AdmitadAPI.initDatafeed();
}

// Expose globally
window.AdmitadAPI = AdmitadAPI;
window.copyCouponCode = AdmitadAPI.copyCouponCode;
window.trackClick = AdmitadAPI.trackClick;
