import io, sys

path = 'backend/config/product-feeds.js'
s = io.open(path, encoding='utf-8').read()

old = """function awinFromEnv() {
  const raw = process.env.AWIN_FASHION_FEED_URL;
  if (!raw) return [];
  return raw.split(';').map(s => s.trim()).filter(Boolean).map((url, i) => ({
    network: 'awin',
    advertiser: 'Awin Fashion' + (i ? ' ' + (i + 1) : ''),
    format: 'generic-csv',
    columns: AWIN_COLUMNS,
    delimiter: ',',
    url,
  }));
}"""

new = """// Map each AWIN feed (by its numeric feed id, `fid`) to the real store name.
// SINGLE-merchant feeds: the name here is forced as the advertiser so that rows
// with a blank merchant_name still resolve to the correct store. The MULTI-
// merchant feed (cid feed 99205) is intentionally omitted -> advertiser stays
// empty so each product's own merchant_name is used.
// When you add a new single-merchant AWIN feed, add its fid + name here.
const AWIN_FEED_NAMES = {
  '113620': 'ECOM DEAL INC',
  '109666': 'Niidor',
  '115687': 'Paul Smith US',
  '115438': 'Luxefashion Clothing',
  // '99205': multi-merchant (cid) -> leave to per-row merchant_name
};
function awinFidFromUrl(url) {
  const m = url.match(/[/?&]fid[/=](\\d+)/);
  return m ? m[1] : '';
}
function awinFromEnv() {
  const raw = process.env.AWIN_FASHION_FEED_URL;
  if (!raw) return [];
  return raw.split(';').map(s => s.trim()).filter(Boolean).map((url, i) => {
    const fid = awinFidFromUrl(url);
    // Forced name for single-merchant feeds; '' for the multi feed so the
    // parser uses each row's merchant_name. Final fallback keeps the old
    // positional label only if a brand-new feed isn't mapped yet.
    const name = AWIN_FEED_NAMES[fid] || (fid === '99205' ? '' : ('Awin Fashion' + (i ? ' ' + (i + 1) : '')));
    return {
      network: 'awin',
      advertiser: name,
      format: 'generic-csv',
      columns: AWIN_COLUMNS,
      delimiter: ',',
      url,
    };
  });
}"""

if s.count(old) != 1:
    print('ABORT: awinFromEnv block not matched, found', s.count(old))
    sys.exit(1)

s = s.replace(old, new)
io.open(path, 'w', encoding='utf-8').write(s)
print('OK: AWIN feeds now mapped to real merchant names by fid')
