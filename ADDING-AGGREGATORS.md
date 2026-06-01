# Adding Other Affiliate Aggregators (Awin, CJ, Rakuten…)

Your product pipeline is **multi-aggregator**. Admitad works today; other
networks plug in through the same system. Here's how each case works.

---

## Case 1 — More Admitad stores (easiest)

Just add the feed to your `PRODUCT_FEEDS` setting. Each Admitad feed uses the
`admitad-yml` format. In your `.env`, feeds are separated by `;` and fields by `|`:

```
PRODUCT_FEEDS=admitad|Symbol Fashion|admitad-yml|https://export.admitad.com/...;admitad|Italo Jewelry|admitad-yml|https://export.admitad.com/...
```

Add as many as you like. Restart the server (`pm2 restart fashiontoworld`).
No code changes. They all merge into one product catalog automatically.

---

## Case 2 — A different aggregator (Awin, CJ, Rakuten, Impact…)

These provide product feeds too, but in **different file formats** with
different column names. The pipeline handles this with **parser adapters**.

### What's already built in
- `admitad-yml` — Admitad XML feeds ✅
- `generic-csv` — most CSV/TSV feeds (Awin, CJ, Rakuten) ✅ — you just supply
  the column mapping (which of their columns is the name, price, image, etc.)

### Adding a CSV-based aggregator (e.g. Awin)
1. In Awin, generate your product feed (CSV) and copy its download URL.
2. Open `backend/config/product-feeds.js` and add an entry to `HARDCODED`,
   mapping their columns to ours. Awin example:

```js
{ network: 'awin', advertiser: 'Some Brand', format: 'generic-csv',
  url: 'https://productdata.awin.com/datafeed/download/...csv',
  columns: {
    id: 'aw_product_id', name: 'product_name', brand: 'brand_name',
    price: 'search_price', price_old: 'rrp_price', currency: 'currency',
    image_url: 'merchant_image_url', url: 'aw_deep_link',
    category: 'merchant_category', description: 'description',
  } }
```

3. The column names on the right must match the **header row** of that
   network's CSV. Open the feed once, look at row 1, and match them up.
   (Send me the header row and I'll write the mapping for you.)
4. Restart. Their products flow into the same catalog, auto-categorized.

### Adding an aggregator with a totally custom format (XML, JSON, etc.)
If a network uses a format neither adapter handles, it needs a small new
adapter file:
1. Create `backend/services/parsers/<name>.js` exporting:
   ```js
   module.exports = { format: '<name>', parse(url, opts, onRaw) { ... } };
   ```
   It reads the feed and calls `onRaw({ id, name, brand, price, price_old,
   currency, images, url, feed_category, gender, color, size })` per product.
2. Register it in `backend/services/feed-parser.js` (`register(require('./parsers/<name>'))`).
3. Use `format: '<name>'` in your feed config.

This is ~1 hour of work per new format. Send me a sample of the feed and I'll
build the adapter.

---

## What stays the same no matter the aggregator

- **Categorization** (Women/Men/Shoes/Bags/Jewellery + subcategories)
- **Brand logos**
- **The database** and how products are stored
- **The website display**

Only the *reading* of each network's specific file format differs — and that's
isolated in the parser adapters. So your site always shows one unified,
consistently-categorized catalog regardless of how many networks feed it.

---

## Quick reference

| You want to… | Do this |
|--------------|---------|
| Add an Admitad store | Add a line to `PRODUCT_FEEDS` (format `admitad-yml`) |
| Add an Awin/CJ store | Add to `HARDCODED` with `generic-csv` + column map |
| Add a custom-format network | New adapter in `parsers/`, then register it |
| See what formats exist | Check `parsers/` folder |
