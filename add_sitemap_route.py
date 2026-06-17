import io, sys
p = 'backend/server.js'
s = io.open(p, encoding='utf-8').read()

if "services/sitemap" in s:
    print('NOTE: sitemap already wired'); sys.exit(0)

# require near the pinterest-rss require (which we added earlier)
anchor = "const pinterestRss = require('./services/pinterest-rss');"
if anchor not in s:
    # fall back to catalog require
    anchor = "const pinterestCatalog = require('./services/pinterest-catalog');"
if anchor not in s:
    print('ABORT: no anchor require found'); sys.exit(1)
s = s.replace(anchor, anchor + "\nconst sitemap = require('./services/sitemap');")

# add the route after the pinterest rss index route if present, else after catalog route
route_anchor = "app.get('/api/pinterest/rss', function (req, res) {"
if route_anchor in s:
    # insert a full route block right before this line
    new = """app.get('/api/sitemap.xml', async (req, res) => {
  try {
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=21600');
    const xml = sitemap.getSitemap(_brandsDirCache.data || []);
    res.send(xml);
  } catch (e) { res.status(500).send('<?xml version="1.0"?><error>' + e.message + '</error>'); }
});

""" + route_anchor
    s = s.replace(route_anchor, new)
else:
    # fallback: after catalog.xml route
    cat_route = """    const xml = await pinterestCatalog.getFeed();
    res.send(xml);
  } catch (e) { res.status(500).send('<?xml version="1.0"?><error>' + e.message + '</error>'); }
});"""
    if cat_route not in s:
        print('ABORT: no route anchor found'); sys.exit(1)
    new = cat_route + """

app.get('/api/sitemap.xml', async (req, res) => {
  try {
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=21600');
    const xml = sitemap.getSitemap(_brandsDirCache.data || []);
    res.send(xml);
  } catch (e) { res.status(500).send('<?xml version="1.0"?><error>' + e.message + '</error>'); }
});"""
    s = s.replace(cat_route, new)

io.open(p,'w',encoding='utf-8').write(s)
print('OK: added /api/sitemap.xml route')
