#!/usr/bin/env python3
"""
Generates a complete sitemap.xml for fashiontoworld.co:
  - static pages (categories, info, blog, coupons, watches, all-deals)
  - top brand pages (brands with >= MIN_PRODUCTS), linking to search.html?brand=
Pulls brands live from the API, paginating through /api/brands/all.
Output: ./sitemap.xml  (commit to GitHub repo root -> Netlify serves it)
"""
import urllib.request, json, datetime, sys
from urllib.parse import quote

API   = "https://api.fashiontoworld.co/api/brands/all"
SITE  = "https://fashiontoworld.co"
MIN_PRODUCTS = 10                     # brand must have >= this many products
TODAY = datetime.date.today().isoformat()

# ---- static URLs (loc, changefreq, priority) ----
STATIC = [
    ("/",                              "daily",   "1.0"),
    ("/pages/women.html",              "daily",   "0.9"),
    ("/pages/men.html",                "daily",   "0.9"),
    ("/pages/shoes.html",              "daily",   "0.9"),
    ("/pages/bags.html",               "daily",   "0.9"),
    ("/pages/jewellery.html",          "daily",   "0.9"),
    ("/pages/watches.html",            "daily",   "0.9"),
    ("/pages/accessories.html",        "daily",   "0.8"),
    ("/pages/beauty.html",             "weekly",  "0.7"),
    ("/pages/kids.html",               "weekly",  "0.7"),
    ("/pages/coupons.html",            "daily",   "0.8"),
    ("/pages/search.html?markdown=true&sort=discount", "daily", "0.8"),  # All Deals
    ("/pages/deals.html",              "weekly",  "0.6"),
    ("/pages/brands.html",             "weekly",  "0.8"),
    ("/pages/blog.html",               "weekly",  "0.6"),
    ("/pages/blog-trends-2025.html",   "monthly", "0.5"),
    ("/pages/blog-capsule-wardrobe.html","monthly","0.5"),
    ("/pages/blog-spotting-deals.html","monthly", "0.5"),
    ("/pages/about.html",              "monthly", "0.4"),
    ("/pages/contact.html",            "monthly", "0.4"),
    ("/pages/affiliate-disclosure.html","yearly", "0.3"),
    ("/pages/privacy.html",            "yearly",  "0.3"),
    ("/pages/terms.html",             "yearly",  "0.3"),
]

def fetch_brands():
    brands, page = [], 1
    while True:
        url = f"{API}?page={page}"
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                d = json.loads(r.read().decode())
        except Exception as e:
            print(f"  ! page {page} failed: {e}", file=sys.stderr); break
        batch = d.get("brands", [])
        if not batch: break
        brands.extend(batch)
        total = d.get("total", 0); per = d.get("per", len(batch) or 1)
        if page * per >= total or len(batch) < per: break
        page += 1
    return brands

def esc(s):
    return (str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
            .replace('"',"&quot;").replace("'","&apos;"))

def url_block(loc, changefreq, priority, lastmod=TODAY):
    return ("  <url>\n"
            f"    <loc>{esc(loc)}</loc>\n"
            f"    <lastmod>{lastmod}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            "  </url>\n")

def main():
    print("Fetching brands from API...", file=sys.stderr)
    brands = fetch_brands()
    print(f"  got {len(brands)} brands", file=sys.stderr)
    kept = [b for b in brands if int(b.get("count", 0)) >= MIN_PRODUCTS]
    print(f"  {len(kept)} brands with >= {MIN_PRODUCTS} products", file=sys.stderr)

    out = ['<?xml version="1.0" encoding="UTF-8"?>\n',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n']
    for loc, cf, pr in STATIC:
        out.append(url_block(SITE + loc, cf, pr))
    # brand pages -> search.html?brand=NAME ; priority scaled a touch by size
    for b in kept:
        name = b["name"]; cnt = int(b.get("count", 0))
        pr = "0.7" if cnt >= 500 else ("0.6" if cnt >= 100 else "0.5")
        loc = f"{SITE}/pages/search.html?brand={quote(name)}"
        out.append(url_block(loc, "weekly", pr))
    out.append('</urlset>\n')

    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write("".join(out))
    total_urls = len(STATIC) + len(kept)
    print(f"OK: wrote sitemap.xml with {total_urls} URLs "
          f"({len(STATIC)} static + {len(kept)} brands)", file=sys.stderr)

if __name__ == "__main__":
    main()
