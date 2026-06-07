/**
 * coupon-feed.js — fetches & parses an Admitad coupon XML export feed.
 * The feed URL (which contains private credentials) is read from
 * process.env.COUPON_FEED_URL — NEVER hardcoded (the repo is public).
 * Tolerant parser: handles the common Admitad coupon tags + variants.
 * Cached in memory for 1 hour to keep the small DB/droplet light.
 */
const sax = require('sax');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

let _cache = { at: 0, data: null };

function fetchText(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    const lib = url.indexOf('https') === 0 ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'FashionToWorld/1.0 (+coupons)', 'Accept-Encoding': 'gzip, deflate' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return resolve(fetchText(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let stream = res;
      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

function parse(xml) {
  return new Promise((resolve) => {
    const parser = sax.parser(false, { trim: true, lowercase: true });
    const out = []; let cur = null; let tag = ''; let inCampaign = false; let campaignName = '';
    parser.onopentag = function (n) {
      const name = n.name;
      if (name === 'advcampaign') { inCampaign = true; campaignName = ''; }
      if (name === 'coupon' || name === 'offer' || name === 'item') cur = { advertiser_name: campaignName, regions: [], categories: [], types: [] };
      tag = name;
    };
    function text(txt) {
      if (!txt) return; const v = txt.trim(); if (!v) return;
      if (!cur) { if (inCampaign && (tag === 'name' || tag === 'advcampaign_name')) campaignName = (campaignName || '') + v; return; }
      switch (tag) {
        case 'name': case 'title': cur.name = (cur.name || '') + v; break;
        case 'description': case 'short_name': cur.description = (cur.description || '') + v; break;
        case 'discount': cur.discount = (cur.discount || '') + v; break;
        case 'promocode': case 'code': cur.promocode = (cur.promocode || '') + v; break;
        case 'advcampaign_name': case 'campaign_name': case 'campaign': case 'advertiser': case 'advertiser_name': cur.advertiser_name = (cur.advertiser_name || '') + v; break;
        case 'goto_link': case 'goto': case 'url': case 'link': case 'deeplink': cur.url = (cur.url || '') + v; break;
        case 'date_end': case 'datetime_end': case 'end_date': case 'actual_end': cur.date_end = v; break;
        case 'status': cur.status = v.toLowerCase(); break;
        case 'image': case 'logo': case 'image_url': cur.image = (cur.image || '') + v; break;
        case 'region': cur.regions.push(v); break;
        case 'category': case 'categorie': cur.categories.push(v); break;
        case 'type': cur.types.push(v); break;
        case 'id': if (!cur.id) cur.id = v; break;
      }
    }
    parser.ontext = text; parser.oncdata = text;
    parser.onclosetag = function (name) {
      if (name === 'advcampaign') { inCampaign = false; campaignName = ''; }
      if (name === 'coupon' || name === 'offer' || name === 'item') {
        if (cur && (cur.name || cur.promocode || cur.discount || cur.url)) {
          out.push({
            id: cur.id || (cur.name || '').slice(0, 40),
            name: cur.name || '', description: cur.description || '',
            advertiser_name: cur.advertiser_name || '', logo: cur.image || '',
            promocode: cur.promocode || '', discount: cur.discount || '',
            status: cur.status || 'active', regions: cur.regions || [],
            types: cur.types || [], categories: cur.categories || [],
            url: cur.url || '', date_end: cur.date_end || null,
          });
        }
        cur = null;
      }
      tag = '';
    };
    parser.onerror = function () { try { parser.resume(); } catch (e) {} };
    parser.onend = function () { resolve(out); };
    try { parser.write(xml).close(); } catch (e) { resolve(out); }
  });
}

async function getCoupons(limit) {
  const url = process.env.COUPON_FEED_URL;
  if (!url) return null; // not configured -> caller falls back to the API
  if (_cache.data && Date.now() - _cache.at < 3600000) return _cache.data.slice(0, limit || 60);
  const xml = await fetchText(url);
  let coupons = await parse(xml);
  coupons = coupons.filter((c) => !c.status || c.status === 'active');
  _cache = { at: Date.now(), data: coupons };
  return coupons.slice(0, limit || 60);
}

module.exports = { getCoupons };
