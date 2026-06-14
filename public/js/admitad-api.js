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
      subcategory: opts.subcategory || '',
      gender: opts.gender || '',
      brand: opts.brand || '',
      advertiser: opts.advertiser || '',
      color: opts.color || '',
      size: opts.size || '',
      sale: opts.sale || '',
      minprice: opts.minprice || '',
      maxprice: opts.maxprice || '',
      markdown: opts.markdown || '',
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

  // Distinct worldwide stores with live product counts
  async function getStores() {
    return request('/stores', {});
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
    // Only use a real outbound affiliate link. Never fall back to an internal page.
    const link = product.affiliate_url || product.url || '';
    const isRealLink = /^https?:\/\//i.test(link);

    return `
      <article class="product-card">
        <div class="product-img">
          <img src="${product.image_url || ''}"
               alt="${product.name}"
               loading="lazy"
               decoding="async"
               onerror="this.onerror=null;var c=this.closest('.product-card');if(c)c.remove();">
          ${hasDiscount ? `<span class="product-badge sale">-${discount}%</span>` : ''}
          ${product.is_new ? `<span class="product-badge">New</span>` : ''}
        </div>
        <div class="product-body">
          <p class="product-brand">${product.brand || product.advertiser_name}</p>
          <h3 class="product-name">${product.name}</h3>
          <div class="product-price-row">
            <span class="product-price">${product.price_display || formatPrice(product.price, product.currency)}</span>
            ${hasDiscount ? `<span class="product-original">${product.price_old_display || formatPrice(product.price_old, product.currency)}</span>` : ''}
            ${discount ? `<span class="product-discount">-${discount}%</span>` : ''}
          </div>
        </div>
        <div class="product-footer">
          ${isRealLink ? `<a href="${link}"
             class="btn-product"
             target="_blank"
             rel="noopener sponsored nofollow"
             data-product-id="${product.id}"
             onclick="trackClick('${product.id}', '${product.advertiser_name}')">
            Shop Now
          </a>` : `<span class="btn-product btn-disabled">Unavailable</span>`}
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
      <a href="/pages/search.html?advertiser=${encodeURIComponent(brand.name)}"
         class="brand-tile">
        <span class="brand-tile-name">${brand.name}</span>
        <span class="brand-tile-products">${brand.products_count ? brand.products_count + ' Products' : 'Ships worldwide'}</span>
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

    const want = opts.limit || 6;
    // For variety, over-fetch a larger pool then randomly pick `want` items
    // (the API has no true popularity metric, so this keeps the row fresh).
    const fetchLimit = opts.random ? Math.max(want * 6, 48) : want;
    const data = await getProducts({ sort: opts.sort || 'popularity', limit: fetchLimit });
    let prods = (data?.products || []).filter(p =>
      p.image_url && /^https?:/i.test(p.affiliate_url || p.url || '')
    );
    if (!prods.length) {
      container.innerHTML = renderFallbackProducts();
      return;
    }
    if (opts.random) {
      // Fisher–Yates shuffle for a varied, fresh-looking selection each load
      for (let i = prods.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prods[i], prods[j]] = [prods[j], prods[i]];
      }
    }
    prods = prods.slice(0, want);
    container.innerHTML = prods.map(renderProductCard).join('');
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

  // ─── HOMEPAGE V2 SECTIONS ────────────────────────────────────

  // Hero collage: 1 big + 2 small real product images, each links to store
  async function populateHeroCollage() {
    const collage = document.getElementById('heroCollage');
    const bg = document.getElementById('heroBg');
    if (!collage) return;
    try {
      const data = await getProducts({ sort: 'popularity', limit: 8 });
      const prods = (data?.products || []).filter(p => p.image_url && /^https?:/i.test(p.affiliate_url || p.url || ''));
      if (prods.length < 3) { collage.style.display = 'none'; return; }

      const pick = prods.slice(0, 3);
      const classes = ['hcol-big', 'hcol-sm', 'hcol-sm'];
      collage.innerHTML = pick.map((p, i) => {
        const link = p.affiliate_url || p.url;
        const disc = (p.price_old && p.price_old > p.price)
          ? Math.round((1 - p.price / p.price_old) * 100) : 0;
        return `<a class="hcol ${classes[i]}" href="${link}" target="_blank" rel="noopener sponsored nofollow"
                   style="background-image:url('${p.image_url}')"
                   onclick="trackClick('${p.id}','${(p.advertiser_name||'').replace(/'/g,'')}')">
          ${disc ? `<span class="hcol-tag">-${disc}%</span>` : ''}
          <span class="hcol-info">
            <span class="hci-name">${(p.name||'').slice(0,28)}</span>
            <span class="hci-price">${p.price_display || ''}</span>
          </span>
        </a>`;
      }).join('');

      // Use the largest product image softly behind the hero text too
      if (bg && pick[0]?.image_url) {
        bg.style.backgroundImage = `url('${pick[0].image_url}')`;
      }
    } catch (e) { collage.style.display = 'none'; }
  }

  // Deal of the Day: top coupons with bold CTA
  async function populateDealOfDay(containerId = 'dotdGrid', limit = 3) {
    const container = document.getElementById(containerId);
    const section = document.getElementById('dotdSection');
    if (!container) return;
    const data = await getCoupons({ limit });
    const coupons = data?.coupons || [];
    if (!coupons.length) { if (section) section.style.display = 'none'; return; }
    if (section) section.style.display = '';
    container.innerHTML = coupons.slice(0, limit).map(c => {
      const direct = c.affiliate_url || c.url || c.goto_link || '';
      const isReal = /^https?:/i.test(direct);
      // Always clickable: use the store's outbound link if present,
      // otherwise send to the deals page (never a dead card).
      const href = isReal ? direct : '/pages/deals.html';
      const target = isReal ? ' target="_blank" rel="noopener sponsored nofollow"' : '';
      const badge = c.promocode ? `<span class="dotd-badge code">Code: ${c.promocode}</span>` : `<span class="dotd-badge">Deal</span>`;
      const title = (c.name || 'Special Offer').slice(0, 70);
      return `<a class="dotd-card" href="${href}"${target}>
        ${badge}
        <p class="dotd-store">${c.advertiser_name || ''}</p>
        <h3 class="dotd-title">${title}</h3>
        <div class="dotd-action">${isReal ? 'Grab This Deal ›' : 'View Deal ›'}</div>
      </a>`;
    }).join('');
  }

  // On Sale: products with a discount
  async function populateOnSale(containerId = 'saleProducts', limit = 4) {
    const container = document.getElementById(containerId);
    const section = document.getElementById('saleSection');
    if (!container) return;
    // Pull a pool and keep only items with a genuine markdown (price_old > price)
    const data = await getProducts({ sale: 'true', sort: 'discount', limit: 48 });
    let prods = (data?.products || []).filter(p =>
      p.image_url && /^https?:/i.test(p.affiliate_url || p.url || '') &&
      p.price_old && Number(p.price_old) > Number(p.price)
    );
    // If the catalogue genuinely has no discounted items, hide the section
    // rather than showing the same products as Trending.
    if (!prods.length) { if (section) section.style.display = 'none'; return; }
    if (section) section.style.display = '';
    // Shuffle for variety, then take `limit`
    for (let i = prods.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [prods[i], prods[j]] = [prods[j], prods[i]];
    }
    container.innerHTML = prods.slice(0, limit).map(renderProductCard).join('');
  }

  // ─── RECOMMENDATIONS ("You May Also Like") ───────────────────
  // Shows related products to keep shoppers browsing & clicking out.
  async function populateRecommendations(containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const limit = opts.limit || 4;
    try {
      const data = await getProducts({
        category: opts.category || '',
        sort: 'popularity',
        limit: limit * 2,
      });
      let prods = (data?.products || []).filter(p =>
        p.image_url && /^https?:/i.test(p.affiliate_url || p.url || '')
      );
      if (opts.excludeIds && opts.excludeIds.length) {
        prods = prods.filter(p => !opts.excludeIds.includes(p.id));
      }
      prods = prods.slice(0, limit);
      if (!prods.length) {
        const sec = opts.sectionId && document.getElementById(opts.sectionId);
        if (sec) sec.style.display = 'none';
        return;
      }
      container.innerHTML = prods.map(renderProductCard).join('');
    } catch (e) {
      const sec = opts.sectionId && document.getElementById(opts.sectionId);
      if (sec) sec.style.display = 'none';
    }
  }

  // Featured stores: worldwide-shipping partners. Each card links OUT to the
  // retailer using a real affiliate URL (pulled from one of the store's products).
  async function populateFeaturedStores(containerId = 'storesGrid') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const stores = [
      'Symbol Fashion', 'The Luxury Closet', 'Noracora', 'Stylewe', 'Justfashionnow',
      'Wayrates', 'Italo Jewelry', 'Glasseslit', 'ChicMe', 'AliExpress'
    ];
    // Render immediately with a safe fallback (internal filtered page),
    // then upgrade each card to a direct outbound affiliate link if we find one.
    container.innerHTML = stores.map((name, i) =>
      `<a class="store-card" id="storecard-${i}" href="/pages/search.html?advertiser=${encodeURIComponent(name)}">
        <span class="store-logo">${name[0]}</span>
        <span class="store-name">${name}</span>
        <span class="store-go">Visit Store ›</span>
      </a>`
    ).join('');

    // Upgrade links: fetch one product per store to get its outbound affiliate URL
    stores.forEach(async (name, i) => {
      try {
        const data = await getProducts({ advertiser: name, limit: 1 });
        const p = data?.products?.[0];
        const link = p && (p.affiliate_url || p.url);
        if (link && /^https?:/i.test(link)) {
          const card = document.getElementById(`storecard-${i}`);
          if (card) {
            card.setAttribute('href', link);
            card.setAttribute('target', '_blank');
            card.setAttribute('rel', 'noopener sponsored nofollow');
          }
        }
      } catch (e) {}
    });
  }

  // Deals ticker: scrolling strip of live deal text
  async function populateDealsTicker(trackId = 'dtTrack') {
    const track = document.getElementById(trackId);
    if (!track) return;
    try {
      const data = await getCoupons({ limit: 12 });
      const coupons = data?.coupons || [];
      if (!coupons.length) {
        const t = document.getElementById('dealsTicker');
        if (t) t.style.display = 'none';
        return;
      }
      const items = coupons.map(c => {
        const store = c.advertiser_name || 'Store';
        const offer = (c.name || 'Special offer').slice(0, 50);
        return `<span class="dt-item">${offer} at ${store}</span>`;
      });
      // Duplicate the set so the scroll loops seamlessly
      track.innerHTML = items.join('') + items.join('');
    } catch (e) {
      const t = document.getElementById('dealsTicker');
      if (t) t.style.display = 'none';
    }
  }

  // Trust bar count-up animation
  function animateTrustBar() {
    const nums = document.querySelectorAll('.trust-v2-num[data-count]');
    if (!nums.length) return;
    const run = (el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const dur = 1400; const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.4 });
      nums.forEach(n => io.observe(n));
    } else {
      nums.forEach(run);
    }
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

    const REAL_PAGES = ['women','men','shoes','bags','jewellery','accessories','beauty','kids'];
    const tax = window.FASHION_TAXONOMY;
    let tiles;
    if (tax) {
      tiles = Object.values(tax).map((c) => ({
        name: c.label,
        img: IMG[c.slug] || '',
        url: REAL_PAGES.includes(c.slug) ? `/pages/${c.slug}.html` : `/pages/women.html?cat=${c.slug}`,
      }));
    } else {
      tiles = Object.keys(IMG).map(k => ({ name: k, img: IMG[k], url: REAL_PAGES.includes(k) ? `/pages/${k}.html` : `/pages/women.html?cat=${k}` }));
    }

    // Two extra tiles to round out the grid (10 total): Deals + On Sale
    tiles.push({
      name: 'Deals',
      img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&q=80',
      url: '/pages/deals.html',
    });
    tiles.push({
      name: 'On Sale',
      img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&q=80',
      url: '/pages/women.html?sale=true',
    });

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

  // ─── FALLBACKS (when API returns nothing) ───────────────
  // No fake products — show an honest empty state instead, so we never
  // display items that link to the wrong place.
  function renderFallbackProducts() {
    return '<div class="empty-state"><p>Products are loading. Please refresh in a moment.</p></div>';
  }

  function renderFallbackCoupons() {
    return '<div class="empty-state"><p>Loading the latest deals…</p></div>';
  }

  function renderFallbackBrands() {
    // Real worldwide-shipping stores (shown only if the live brand list is unavailable)
    return [
      'Symbol Fashion', 'The Luxury Closet', 'Noracora', 'Justfashionnow',
      'Stylewe', 'Wayrates', 'Italo Jewelry', 'Glasseslit', 'ChicMe', 'AliExpress'
    ].map((name, i) => renderBrandTile({ id: i + 1, name, products_count: null })).join('');
  }

  // ─── DATAFEED SYNC MANAGER ───────────────────────────────────
  // This runs on page load to pre-warm the cache

  async function initDatafeed() {
    animateTrustBar();
    // Legacy loader: only fetch if the OLD page containers exist. The redesigned
    // homepage (home-v2.js) and category pages (product-filter.js) use different
    // IDs, so this no-ops and avoids ~7 wasteful fetches on every page load.
    var legacy = ['categoryGrid','dtTrack','trendingProducts','dotdGrid','saleProducts','dealsPreview','storesGrid'];
    if (!legacy.some(function (id) { return document.getElementById(id); })) return;
    await Promise.allSettled([
      populateCategories('categoryGrid'),
      populateDealsTicker('dtTrack'),
      populateTrending('trendingProducts', { limit: 8, random: true }),
      populateDealOfDay('dotdGrid', 3),
      populateOnSale('saleProducts', 4),
      populateCoupons('dealsPreview', 3),
      populateFeaturedStores('storesGrid'),
    ]);
  }

  // ─── PUBLIC INTERFACE ────────────────────────────────────────
  return {
    getProducts,
    getCoupons,
    getBrands,
    getStores,
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
    populateHeroCollage,
    populateDealOfDay,
    populateOnSale,
    populateFeaturedStores,
    populateDealsTicker,
    populateRecommendations,
    animateTrustBar,
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
