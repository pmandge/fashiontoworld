/**
 * ============================================================
 * FashionToWorld — Affiliate Networks Configuration
 * ============================================================
 * ADD A NEW AGGREGATOR BY ADDING ONE ENTRY HERE.
 * No other code changes needed. The aggregator reads this file
 * and automatically wires up every network whose credentials
 * are present in your environment variables.
 *
 * Each network entry describes:
 *   - how to authenticate
 *   - which URL to call for coupons / products
 *   - how to map THEIR field names to OUR standard names
 *
 * Supported auth types: 'oauth2', 'bearer', 'apikey_header',
 *   'apikey_query', 'basic', 'none'
 *
 * Field mapping uses dot-paths into each result item, e.g.
 *   name: 'advertiser.name'  → item.advertiser.name
 * ============================================================
 */

module.exports = {

  // ---------------------------------------------------------
  // ADMITAD (fully working)
  // ---------------------------------------------------------
  admitad: {
    label: 'Admitad',
    enabledIf: ['ADMITAD_CLIENT_ID', 'ADMITAD_CLIENT_SECRET'],
    auth: {
      type: 'oauth2_basic',
      tokenUrl: 'https://api.admitad.com/token/',
      clientId: 'ADMITAD_CLIENT_ID',
      clientSecret: 'ADMITAD_CLIENT_SECRET',
      base64Header: 'ADMITAD_BASE64_HEADER',
      scope: 'public_data coupons advcampaigns websites banners',
    },
    coupons: {
      url: 'https://api.admitad.com/coupons/',
      query: { website: 'ADMITAD_WEBSITE_ID', limit: 200, order_by: '-rating' },
      resultsPath: 'results',
      map: {
        id: 'id', name: 'name', description: 'description',
        advertiser_name: 'campaign.name', promocode: 'promocode',
        discount: 'discount', url: 'goto_link', status: 'status',
        rating: 'rating', date_end: 'date_end',
        categoriesPath: 'categories', categoryNameKey: 'name',
        regionsPath: 'regions',
      },
    },
    products: {
      url: 'https://api.admitad.com/products/',
      query: { website: 'ADMITAD_WEBSITE_ID', limit: 48, order_by: '-popularity' },
      resultsPath: 'results',
      map: {
        id: 'id', name: 'name', brand: 'brand', advertiser_name: 'advertiser_name',
        price: 'price', price_old: 'old_price', currency: 'currency_id',
        image_url: 'picture', url: 'url', affiliate_url: 'deeplink',
      },
    },
  },

  // ---------------------------------------------------------
  // AWIN  (set AWIN_API_TOKEN + AWIN_PUBLISHER_ID to enable)
  // ---------------------------------------------------------
  awin: {
    label: 'Awin',
    enabledIf: ['AWIN_API_TOKEN', 'AWIN_PUBLISHER_ID'],
    auth: { type: 'bearer', token: 'AWIN_API_TOKEN' },
    coupons: {
      url: 'https://api.awin.com/publishers/{AWIN_PUBLISHER_ID}/promotions/',
      method: 'POST',
      body: { filters: { membership: 'joined', type: 'voucher' } },
      resultsPath: 'data',
      map: {
        id: 'promotionId', name: 'title', description: 'description',
        advertiser_name: 'advertiser.name', promocode: 'voucherCode',
        url: 'urlTracking', status: 'status',
        categoriesPath: 'categories',
        regionsPath: 'regions',
      },
    },
    products: null, // Awin products are CSV feeds; enable later if needed
  },

  // ---------------------------------------------------------
  // CJ / Commission Junction
  // ---------------------------------------------------------
  cj: {
    label: 'CJ (Commission Junction)',
    enabledIf: ['CJ_API_TOKEN', 'CJ_WEBSITE_ID'],
    auth: { type: 'bearer', token: 'CJ_API_TOKEN' },
    coupons: {
      url: 'https://link-search.api.cj.com/v2/link-search',
      query: { 'website-id': 'CJ_WEBSITE_ID', 'link-type': 'coupon', 'records-per-page': 100 },
      format: 'xml',
      resultsPath: 'cj-api.links.link',
      map: {
        id: 'link-id', name: 'link-name', description: 'description',
        advertiser_name: 'advertiser-name', promocode: 'coupon-code',
        url: 'clickUrl', categoriesPath: 'category',
      },
    },
    products: null,
  },

  // ---------------------------------------------------------
  // RAKUTEN Advertising
  // ---------------------------------------------------------
  rakuten: {
    label: 'Rakuten Advertising',
    enabledIf: ['RAKUTEN_API_TOKEN'],
    auth: {
      type: 'oauth2',
      tokenUrl: 'https://api.linksynergy.com/token',
      clientId: 'RAKUTEN_CLIENT_ID',
      clientSecret: 'RAKUTEN_CLIENT_SECRET',
    },
    coupons: {
      url: 'https://api.linksynergy.com/coupon/1.0',
      resultsPath: 'couponfeed.link',
      map: {
        id: 'clickURL', name: 'offerdescription', description: 'offerdescription',
        advertiser_name: 'advertisername', promocode: 'couponcode',
        url: 'clickURL', categoriesPath: 'categories.category',
      },
    },
    products: null,
  },

  // ---------------------------------------------------------
  // IMPACT  (impact.com)
  // ---------------------------------------------------------
  impact: {
    label: 'Impact',
    enabledIf: ['IMPACT_ACCOUNT_SID', 'IMPACT_AUTH_TOKEN'],
    auth: { type: 'basic', username: 'IMPACT_ACCOUNT_SID', password: 'IMPACT_AUTH_TOKEN' },
    coupons: {
      url: 'https://api.impact.com/Mediapartners/{IMPACT_ACCOUNT_SID}/Deals',
      headers: { Accept: 'application/json' },
      resultsPath: 'Deals',
      map: {
        id: 'Id', name: 'Name', description: 'Description',
        advertiser_name: 'AdvertiserName', promocode: 'CouponCode',
        url: 'TrackingLink', categoriesPath: 'Categories',
      },
    },
    products: null,
  },

  // ---------------------------------------------------------
  // TEMPLATE — copy this block, rename, fill in, done.
  // ---------------------------------------------------------
  // mynetwork: {
  //   label: 'My Network',
  //   enabledIf: ['MYNETWORK_TOKEN'],
  //   auth: { type: 'bearer', token: 'MYNETWORK_TOKEN' },
  //   coupons: {
  //     url: 'https://api.mynetwork.com/coupons',
  //     query: { limit: 100 },
  //     resultsPath: 'data',           // where the array lives in the response
  //     map: {                          // their field → our field
  //       id: 'id', name: 'title', advertiser_name: 'merchant.name',
  //       promocode: 'code', url: 'tracking_url', categoriesPath: 'categories',
  //     },
  //   },
  //   products: null,
  // },

};
