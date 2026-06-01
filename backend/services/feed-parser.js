/**
 * ============================================================
 * FashionToWorld — Feed Parser Framework (multi-aggregator)
 * ============================================================
 * Dispatches each feed to the correct parser adapter based on its
 * 'format' field, then wraps every raw product into the standard
 * shape via the shared category map.
 *
 * ADAPTERS (in ./parsers/):
 *   admitad-yml   → Admitad XML/YML feeds (working)
 *   generic-csv   → Awin / CJ / Rakuten style CSV feeds (configurable columns)
 *
 * TO ADD A NEW AGGREGATOR:
 *   1. Create ./parsers/<name>.js exporting { format, parse(url, opts, onRaw) }
 *   2. Register it in ADAPTERS below.
 *   3. Add feeds with that format in product-feeds config.
 * ============================================================
 */
const { buildProduct, mapCategory, mapSubcategory } = require('./category-map');

const ADAPTERS = {};
function register(adapter) { ADAPTERS[adapter.format] = adapter; }

register(require('./parsers/admitad-yml'));
register(require('./parsers/generic-csv'));

/**
 * Parse any feed, dispatching by format.
 * @param {object} feed { url, advertiser, network, format, columns?, delimiter?, currency? }
 * @param {object} opts { max? }
 * @param {function} onProduct standard-shape product callback
 */
function parseFeed(feed, opts, onProduct) {
  const format = feed.format || 'admitad-yml';
  const adapter = ADAPTERS[format];
  if (!adapter) return Promise.reject(new Error(`No parser for format '${format}'`));

  const wrapOpts = {
    advertiser: feed.advertiser,
    network: feed.network || 'admitad',
    columns: feed.columns,
    delimiter: feed.delimiter,
    currency: feed.currency,
    max: opts && opts.max,
  };

  return adapter.parse(feed.url, wrapOpts, (raw) => {
    const product = buildProduct(raw, { advertiser: feed.advertiser, network: feed.network || 'admitad' });
    if (product.name && product.url) onProduct(product);
  });
}

// Back-compat helper used by older code paths
function parseFeedStream(url, opts, onProduct) {
  return parseFeed({ url, advertiser: opts.advertiser, network: opts.network, format: 'admitad-yml' }, opts, onProduct);
}

module.exports = { parseFeed, parseFeedStream, mapCategory, mapSubcategory, registeredFormats: () => Object.keys(ADAPTERS) };
