/**
 * Parser adapter: ADMITAD (YML/XML format)
 * Format key: 'admitad-yml'
 *
 * Emits raw product objects to onProduct(); the framework wraps
 * them into the standard shape via category-map.buildProduct.
 */
const sax = require('sax');
const https = require('https');
const http = require('http');

function parse(feedUrl, opts, onRaw) {
  return new Promise((resolve, reject) => {
    const lib = feedUrl.startsWith('https') ? https : http;
    const parser = sax.createStream(true, { trim: true, lowercase: true });
    const categories = {};
    let count = 0, inOffer = false, cur = null, curTag = '', curParam = '';

    parser.on('opentag', (node) => {
      const name = node.name;
      if (name === 'category') { curTag = 'category'; parser._cid = node.attributes.id; parser._ctext = ''; }
      else if (name === 'offer') { inOffer = true; cur = { id: node.attributes.id, available: node.attributes.available !== 'false', pictures: [], params: {} }; }
      else if (inOffer) { curTag = name; if (name === 'param') curParam = (node.attributes.name || '').toLowerCase(); }
    });
    parser.on('text', (t) => {
      if (!t) return;
      if (curTag === 'category') { parser._ctext += t; return; }
      if (!inOffer || !cur) return;
      switch (curTag) {
        case 'categoryid': cur.categoryId = (cur.categoryId || '') + t; break;
        case 'name': cur.name = (cur.name || '') + t; break;
        case 'description': cur.description = (cur.description || '') + t; break;
        case 'price': cur.price = (cur.price || '') + t; break;
        case 'oldprice': cur.oldprice = (cur.oldprice || '') + t; break;
        case 'currencyid': cur.currency = (cur.currency || '') + t; break;
        case 'picture': cur._pic = (cur._pic || '') + t; break;
        case 'url': cur.url = (cur.url || '') + t; break;
        case 'vendor': cur.vendor = (cur.vendor || '') + t; break;
        case 'material': cur.material = (cur.material || '') + t; break;
        case 'custom_label_4': cur.label = (cur.label || '') + t; break;
        case 'param': if (curParam) cur.params[curParam] = (cur.params[curParam] || '') + t; break;
      }
    });
    parser.on('cdata', (t) => parser.emit('text', t));
    parser.on('closetag', (name) => {
      if (name === 'category') { if (parser._cid) categories[parser._cid] = parser._ctext.trim(); curTag = ''; }
      else if (name === 'picture' && cur) { if (cur._pic) cur.pictures.push(cur._pic.trim()); cur._pic = ''; curTag = ''; }
      else if (name === 'offer') {
        if (cur && cur.available && cur.name && cur.url) {
          onRaw({
            id: cur.id, name: cur.name, description: cur.description,
            brand: cur.vendor, price: cur.price, price_old: cur.oldprice,
            currency: cur.currency, images: cur.pictures, url: cur.url,
            feed_category: categories[cur.categoryId] || '',
            gender: (cur.params.gender || ''), color: cur.params.color, size: cur.params.size,
            material: cur.material, on_sale: (cur.label || '').toLowerCase() === 'sale',
          });
          count++;
          if (opts.max && count >= opts.max) parser._stop = true;
        }
        cur = null; inOffer = false; curTag = '';
      } else { curTag = inOffer ? curTag : ''; }
    });
    parser.on('error', reject);
    parser.on('end', () => resolve({ count }));

    const req = lib.get(feedUrl, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return parse(res.headers.location, opts, onRaw).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`feed HTTP ${res.statusCode}`));
      res.pipe(parser);
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(180000, () => req.destroy(new Error('feed timeout')));
  });
}

module.exports = { format: 'admitad-yml', parse };
