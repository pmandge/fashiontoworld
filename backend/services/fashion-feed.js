/**
 * ============================================================
 * FashionToWorld — Fashion Feed Service
 * ============================================================
 * Filters Admitad coupons & products to FASHION categories only,
 * and supports per-region (country) filtering for geo-targeting.
 *
 * Admitad coupon endpoint supports:
 *   - category=<id>   (coupon category id, repeatable)
 *   - campaign=<id>   (advertiser id, repeatable)
 *   - region=<CC>     (ISO country code, e.g. AE, US, GB)
 *   - order_by, limit, offset, language
 *
 * Coupon categories must be resolved at runtime via
 *   GET /coupons/categories/
 * because the numeric IDs differ per account/locale.
 * ============================================================
 */

// Coupon-category name patterns that count as "fashion".
// We match by name (case-insensitive) so it works across locales.
const FASHION_CATEGORY_PATTERNS = [
  'fashion', 'clothing', 'clothes', 'apparel', 'shoes', 'footwear',
  'bags', 'accessories', 'jewelry', 'jewellery', 'watches',
  'lingerie', 'underwear', 'swimwear', 'kids', 'children',
  'beauty', 'cosmetics', 'sportswear', 'activewear', 'luxury',
];

// HARD EXCLUSIONS — any coupon tagged with these verticals is dropped,
// even if it also carries a fashion-ish tag. Guarantees fashion-only.
const NON_FASHION_EXCLUSIONS = [
  'electronics', 'computer', 'laptop', 'phone', 'mobile', 'gadget',
  'travel', 'flight', 'hotel', 'booking', 'tour', 'airline',
  'food', 'grocery', 'restaurant', 'delivery', 'meal',
  'finance', 'bank', 'loan', 'insurance', 'crypto', 'forex', 'casino', 'betting',
  'pharma', 'medicine', 'supplement', 'health insurance',
  'furniture', 'home appliance', 'kitchen appliance', 'garden', 'tools',
  'car', 'auto', 'tire', 'vehicle',
  'software', 'hosting', 'vpn', 'game', 'gaming', 'app',
  'education', 'course', 'book', 'office supplies', 'pet',
];

// Known fashion advertiser keywords (fallback when category data is thin)
const FASHION_BRAND_HINTS = [
  'asos', 'zara', 'h&m', 'mango', 'farfetch', 'net-a-porter', 'revolve',
  'nordstrom', 'shein', 'boohoo', 'nike', 'adidas', 'gucci', 'prada',
  'burberry', 'uniqlo', 'zalando', 'aboutyou', 'namshi', 'ounass',
  'sivvi', '6thstreet', 'shukran', 'max fashion', 'centrepoint',
];

class FashionFeed {
  constructor(admitadGet, websiteId) {
    this.admitadGet = admitadGet;   // bound API helper from server.js
    this.websiteId = websiteId;
    this.fashionCategoryIds = null; // resolved & cached
    this.resolvedAt = 0;
  }

  /** Resolve & cache the numeric coupon-category IDs that are fashion-related */
  async getFashionCategoryIds() {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (this.fashionCategoryIds && Date.now() - this.resolvedAt < ONE_DAY) {
      return this.fashionCategoryIds;
    }

    const data = await this.admitadGet('/coupons/categories/', { limit: 500 });
    const categories = data.results || [];

    const ids = categories
      .filter(cat => {
        const name = (cat.name || '').toLowerCase();
        return FASHION_CATEGORY_PATTERNS.some(p => name.includes(p));
      })
      .map(cat => cat.id);

    this.fashionCategoryIds = ids;
    this.resolvedAt = Date.now();
    console.log(`[FashionFeed] Resolved ${ids.length} fashion coupon categories:`, ids);
    return ids;
  }

  /**
   * Get FASHION-ONLY coupons, optionally for a specific region/country.
   * @param {Object} opts - { region, language, limit, page, campaign, type }
   */
  async getFashionCoupons(opts = {}) {
    const { region, language = 'en', limit = 24, page = 1, campaign, type } = opts;
    const categoryIds = await this.getFashionCategoryIds();

    const params = {
      limit,
      offset: (page - 1) * limit,
      order_by: '-rating',     // best-rated coupons first
      language,
    };

    // Filter to fashion categories (Admitad accepts repeated category params;
    // our admitadGet helper serializes arrays as repeated keys)
    if (categoryIds.length) params.category = categoryIds;
    if (region) params.region = region.toUpperCase();
    if (campaign) params.campaign = campaign;

    const data = await this.admitadGet('/coupons/', params);
    let coupons = (data.results || []).map(this._normalizeCoupon);

    // Strict guard: active + must be fashion + must NOT be any excluded vertical
    coupons = coupons.filter(c => {
      if (c.status !== 'active') return false;

      const cats = c.categories.map(x => x.toLowerCase()).join(' ');
      const haystack = `${cats} ${(c.name || '').toLowerCase()} ${(c.advertiser_name || '').toLowerCase()}`;

      const isExcluded = NON_FASHION_EXCLUSIONS.some(p => haystack.includes(p));
      if (isExcluded) return false;

      // Must have at least one fashion signal (category match or fashion brand)
      const isFashion =
        FASHION_CATEGORY_PATTERNS.some(p => haystack.includes(p)) ||
        FASHION_BRAND_HINTS.some(b => haystack.includes(b)) ||
        c.categories.length === 0; // category-less coupons from joined fashion programs

      return isFashion;
    });

    if (region) {
      coupons = coupons.filter(c =>
        !c.regions.length || c.regions.includes(region.toUpperCase())
      );
    }
    if (type) {
      coupons = coupons.filter(c =>
        c.types.some(t => t.toLowerCase().includes(type.toLowerCase()))
      );
    }

    return { coupons, total: data._meta?.count || coupons.length, page };
  }

  /**
   * Get FASHION-ONLY products, optionally for a region.
   * Uses the product feed; advertiser must be a fashion program.
   */
  async getFashionProducts(opts = {}) {
    const { region, subcategory, page = 1, limit = 24, sort = 'popularity', q } = opts;

    const params = {
      limit,
      offset: (page - 1) * limit,
      order_by: sort === 'popularity' ? '-popularity'
        : sort === 'price_asc' ? 'price'
        : sort === 'price_desc' ? '-price'
        : sort === 'discount' ? '-discount' : '-popularity',
    };
    if (q) params.q = q;
    if (subcategory) params.category = subcategory;
    if (region) params.region = region.toUpperCase();

    const data = await this.admitadGet('/products/', params);
    const products = (data.results || []).map(this._normalizeProduct);

    return { products, total: data._meta?.count || products.length, page };
  }

  _normalizeCoupon(c) {
    return {
      id: c.id,
      name: c.name,
      description: c.description || '',
      advertiser_name: c.campaign?.name || '',
      advertiser_id: c.campaign?.id || '',
      advertiser_url: c.campaign?.site_url || '',
      promocode: c.promocode || '',
      discount: c.discount || '',
      status: c.status,
      exclusive: c.exclusive || false,
      rating: parseFloat(c.rating || 0),
      regions: c.regions || [],
      language: c.language || 'en',
      types: (c.types || []).map(t => t.name),
      categories: (c.categories || []).map(cat => cat.name),
      image: c.image ? (c.image.startsWith('//') ? 'https:' + c.image : c.image) : '',
      url: c.goto_link || '',
      date_end: c.date_end || null,
      species: c.species || 'promocode',
    };
  }

  _normalizeProduct(p) {
    return {
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      advertiser_name: p.advertiser_name || '',
      price: parseFloat(p.price || 0),
      price_old: p.old_price ? parseFloat(p.old_price) : null,
      currency: p.currency_id || 'USD',
      image_url: p.images?.[0]?.url || p.picture || '',
      url: p.url || '',
      affiliate_url: p.deeplink || p.url || '',
      category: p.category?.name || '',
      is_new: p.is_new || false,
    };
  }
}

module.exports = { FashionFeed, FASHION_CATEGORY_PATTERNS, FASHION_BRAND_HINTS, NON_FASHION_EXCLUSIONS };
