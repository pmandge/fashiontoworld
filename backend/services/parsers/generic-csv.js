/**
 * Parser adapter: GENERIC CSV
 * Format key: 'generic-csv'
 *
 * Works for most CSV/TSV product feeds (Awin, CJ, Rakuten, etc.).
 * Because each network names its columns differently, the column
 * mapping is passed per-feed via opts.columns, e.g.:
 *
 *   columns: {
 *     id: 'aw_product_id', name: 'product_name', brand: 'brand_name',
 *     price: 'search_price', price_old: 'rrp_price', currency: 'currency',
 *     image_url: 'merchant_image_url', url: 'aw_deep_link',
 *     category: 'merchant_category', description: 'description',
 *   }
 *
 * Streams line-by-line so large feeds stay memory-safe.
 */
const https = require('https');
const http = require('http');
const readline = require('readline');
const zlib = require('zlib');

function splitCsvLine(line, delim) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delim) { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parse(feedUrl, opts, onRaw) {
  return new Promise((resolve, reject) => {
    const lib = feedUrl.startsWith('https') ? https : http;
    const cols = opts.columns || {};
    const delim = opts.delimiter || (feedUrl.includes('.tsv') ? '\t' : ',');
    let header = null, idx = {}, count = 0;

    const req = lib.get(feedUrl, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return parse(res.headers.location, opts, onRaw).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`feed HTTP ${res.statusCode}`));
      const isGzip = /gzip/i.test(feedUrl) || /gzip/i.test(res.headers['content-encoding'] || '') || /gzip/i.test(res.headers['content-type'] || '');
      let stream = res;
      if (isGzip) { const gz = zlib.createGunzip(); res.pipe(gz); gz.on('error', reject); stream = gz; }
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      rl.on('line', (line) => {
        if (!header) {
          header = splitCsvLine(line, delim).map(h => h.trim().replace(/^"|"$/g, ''));
          header.forEach((h, i) => { idx[h] = i; });
          return;
        }
        const f = splitCsvLine(line, delim);
        const get = (key) => { const col = cols[key]; return col != null && idx[col] != null ? (f[idx[col]] || '').trim() : ''; };
        const name = get('name');
        const url = get('url');
        if (!name || !url) return;
        // Prefer the merchant's direct, full-resolution image; fall back to the
        // network's proxied thumbnail only if the merchant didn't supply one.
        const image = get('image_url') || get('image_url_alt');
        onRaw({
          id: get('id') || String(count),
          name, description: get('description'),
          brand: get('brand'),
          price: get('price'), price_old: get('price_old'),
          currency: get('currency') || opts.currency || 'EUR',
          images: image ? [image] : [],
          url,
          advertiser: get('advertiser'),
          feed_category: get('category'),
          gender: get('gender'), color: get('color'), size: get('size'),
        });
        count++;
        if (opts.max && count >= opts.max) { rl.close(); res.destroy(); }
      });
      rl.on('close', () => resolve({ count }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(180000, () => req.destroy(new Error('feed timeout')));
  });
}

module.exports = { format: 'generic-csv', parse };
