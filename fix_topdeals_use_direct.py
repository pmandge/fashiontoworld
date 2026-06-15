import io, sys

p = 'backend/server.js'
s = io.open(p, encoding='utf-8').read()

# Replace the take()-based block with direct use of topDealsPerStore rows.
# The DB function already filters (price>0, discount band, has image) and
# dedups to one-per-store, so no take() re-filtering is needed. We just map the
# raw rows to the shape the frontend expects (advertiser_name from advertiser).
old = """    // One best deal per store (DB-level DISTINCT ON, indexed discount column),
    // cached in the background so the cost never hits a user request. Dynamic:
    // new discount-carrying stores appear automatically on the next refresh.
    const deals = await productDb.topDealsPerStore(TARGET);
    take(deals || []);
    _topDeals = { at: Date.now(), data: out };"""

new = """    // One best deal per store (DB-level DISTINCT ON, indexed discount column),
    // cached in the background so the cost never hits a user request. Dynamic:
    // new discount-carrying stores appear automatically on the next refresh.
    // The DB query already filters + dedups to one-per-store, so use rows
    // directly (just normalise advertiser -> advertiser_name for the frontend).
    const deals = await productDb.topDealsPerStore(TARGET);
    (deals || []).forEach(function (pr) {
      if (out.length >= TARGET) return;
      pr.advertiser_name = pr.advertiser_name || pr.advertiser || '';
      var imgs = pr.images;
      if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; } }
      pr.image_url = pr.image_url || (Array.isArray(imgs) && imgs[0]) || '';
      out.push(pr);
    });
    _topDeals = { at: Date.now(), data: out };"""

if old not in s:
    print('ABORT: top-deals block not found in expected form'); sys.exit(1)
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('OK: refreshTopDeals now uses topDealsPerStore rows directly (one per store)')
