/**
 * Parser adapter: Google Shopping / Atom XML feeds
 * Format key: 'google-xml'
 *
 * Handles Admitad's product export (export_adv_products?format=xml) and any
 * Google-Merchant-style feed: <feed><entry> with <g:*> tags.
 * Emits raw product objects to onRaw(); the framework wraps them via
 * category-map.buildProduct.
 */
const sax = require('sax');
const https = require('https');
const http = require('http');

function parse(feedUrl, opts, onRaw) {
  return new Promise((resolve, reject) => {
    const lib = feedUrl.startsWith('https') ? https : http;
    const parser = sax.createStream(true, { trim: true, lowercase: true });
    let count = 0, inEntry = false, cur = null, curTag = '';

    parser.on('opentag', (node) => {
      const name = node.name; // lowercased, e.g. 'entry', 'g:title'
      if (name === 'entry') { inEntry = true; cur = {}; curTag = ''; }
      else if (inEntry) { curTag = name; }
    });

    parser.on('text', (t) => {
      if (!inEntry || !cur || !t) return;
      switch (curTag) {
        case 'g:id': cur.id = (cur.id || '') + t; break;
        case 'g:title': cur.name = (cur.name || '') + t; break;
        case 'g:description': cur.description = (cur.description || '') + t; break;
        case 'g:link': cur.url = (cur.url || '') + t; break;
        case 'g:image_link': cur._img = (cur._img || '') + t; break;
        case 'g:additional_image_link': cur._img2 = (cur._img2 || '') + t; break;
        case 'g:price': cur._price = (cur._price || '') + t; break;
        case 'g:sale_price': cur._sale = (cur._sale || '') + t; break;
        case 'g:brand': cur.brand = (cur.brand || '') + t; break;
        case 'g:product_type': cur.feed_category = (cur.feed_category || '') + t; break;
        case 'g:google_product_category': if (!cur.feed_category) cur.feed_category = (cur.feed_category || '') + t; break;
        case 'g:color': cur.color = (cur.color || '') + t; break;
        case 'g:size': cur.size = (cur.size || '') + t; break;
        case 'g:gender': cur.gender = (cur.gender || '') + t; break;
        case 'g:availability': cur._avail = (cur._avail || '') + t; break;
      }
    });

    parser.on('cdata', (t) => parser.emit('text', t));

    function money(s) {
      if (!s) return { amt: '', cur: '' };
      const m = String(s).trim().match(/([\d.]+)\s*([A-Za-z]{3})?/);
      return m ? { amt: m[1], cur: (m[2] || '').toUpperCase() } : { amt: '', cur: '' };
    }
    // alicdn (and many CDNs) append a size suffix like ".jpg_300x300.jpg" — strip it for full-res
    function bigImg(u) { return (u || '').trim().replace(/(\.(?:jpg|jpeg|png|webp))_\d+x\d+\.(?:jpg|jpeg|png|webp)$/i, '$1'); }

    parser.on('closetag', (name) => {
      if (name === 'entry') {
        if (cur && cur.name && cur.url) {
          const available = !cur._avail || /in[\s_]?stock|available/i.test(cur._avail);
          if (available) {
            const p = money(cur._price);
            const sp = money(cur._sale);
            let price = p.amt, priceOld = '';
            if (sp.amt && p.amt && parseFloat(sp.amt) < parseFloat(p.amt)) { priceOld = p.amt; price = sp.amt; }
            const images = [];
            const primary = (cur._img2 ? cur._img2.trim() : '') || (cur._img ? cur._img.trim() : '');
            const secondary = (cur._img ? cur._img.trim() : '');
            if (primary) images.push(primary);
            if (secondary && secondary !== primary) images.push(secondary);
            onRaw({
              id: cur.id, name: cur.name, description: cur.description,
              brand: cur.brand || '', price: price, price_old: priceOld,
              currency: p.cur || sp.cur || 'USD', images: images, url: cur.url,
              feed_category: cur.feed_category || '',
              gender: cur.gender || '', color: cur.color || '', size: cur.size || '',
              on_sale: !!priceOld,
            });
            count++;
            if (opts.max && count >= opts.max) parser._stop = true;
          }
        }
        cur = null; inEntry = false; curTag = '';
      } else { curTag = inEntry ? '' : ''; }
    });

    parser.on('error', reject);
    parser.on('end', () => resolve({ count }));

    function fetch(url, redirects) {
      const l = url.startsWith('https') ? https : http;
      const req = l.get(url, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects < 5) {
          res.resume();
          return fetch(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`feed HTTP ${res.statusCode}`));
        res.pipe(parser);
        res.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(180000, () => req.destroy(new Error('feed timeout')));
    }
    fetch(feedUrl, 0);
  });
}

module.exports = { format: 'google-xml', parse };
