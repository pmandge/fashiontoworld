import io, sys

p = 'backend/server.js'
s = io.open(p, encoding='utf-8').read()

if "pinterest-rss" in s:
    print('NOTE: pinterest-rss already wired'); sys.exit(0)

# 1) require the module next to the existing pinterest-catalog require
anchor_req = "const pinterestCatalog = require('./services/pinterest-catalog');"
if anchor_req not in s:
    print('ABORT: pinterest-catalog require not found'); sys.exit(1)
s = s.replace(anchor_req, anchor_req + "\nconst pinterestRss = require('./services/pinterest-rss');")

# 2) add the routes right after the catalog.xml route block
anchor_route = """app.get('/api/pinterest/catalog.xml', async (req, res) => {
  try {
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=21600');
    const xml = await pinterestCatalog.getFeed();
    res.send(xml);
  } catch (e) { res.status(500).send('<?xml version="1.0"?><error>' + e.message + '</error>'); }
});"""
if anchor_route not in s:
    print('ABORT: catalog route block not found'); sys.exit(1)

new_routes = anchor_route + """

// Pinterest RSS auto-publish feeds (one per board/category). Brand-safe,
// links to our own pages with UTM tracking. e.g. /api/pinterest/rss/watches.xml
app.get('/api/pinterest/rss/:feed.xml', async (req, res) => {
  try {
    const key = String(req.params.feed || '').toLowerCase();
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=21600');
    const xml = await pinterestRss.getFeed(key);
    res.send(xml);
  } catch (e) {
    res.status(404).send('<?xml version="1.0"?><error>' + (e.message || 'not found') + '</error>');
  }
});
// Index of available feeds (handy reference).
app.get('/api/pinterest/rss', function (req, res) {
  const base = 'https://api.fashiontoworld.co/api/pinterest/rss/';
  res.json({ feeds: pinterestRss.feedKeys().map(function (k) { return { key: k, url: base + k + '.xml' }; }) });
});"""

s = s.replace(anchor_route, new_routes)
io.open(p, 'w', encoding='utf-8').write(s)
print('OK: added /api/pinterest/rss/:feed.xml routes + index')
