/**
 * home-v2.js — controller for the redesigned homepage.
 * Static: hero carousel, count-up, Find Your Style, Shop the Edit, Featured
 * Stores rail (+chips), blog. Live (AdmitadAPI): ticker, Trending, New In,
 * Biggest Discounts, Today's Top Deals. Every live section fails soft: if the
 * API errors or returns nothing, that section simply hides — the page never breaks.
 */
(function () {
  var API = window.AdmitadAPI;
  function esc(s) { return (s || '').toString().replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hideSection(el) { if (!el) return; var s = el.closest('section'); if (s) s.style.display = 'none'; }

  /* ---------------- hero carousel + count-up ---------------- */
  (function () {
    var imgs = ['1490481651871-ab68de25d43d', '1445205170230-053b83016050', '1441984904996-e0b6ba687e04', '1539109136881-3be0616acf4b'];
    var wrap = document.getElementById('heroSlides');
    if (wrap) {
      var slides = imgs.map(function (id, i) {
        var d = document.createElement('div'); d.className = 'hero-slide' + (i === 0 ? ' on' : '');
        var url = 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=1900&q=80';
        var im = new Image(); im.onload = function () { d.style.backgroundImage = "url('" + url + "')"; }; im.src = url;
        wrap.appendChild(d); return d;
      });
      var hi = 0; setInterval(function () { slides[hi].classList.remove('on'); hi = (hi + 1) % slides.length; slides[hi].classList.add('on'); }, 5000);
    }
    var cnt = document.getElementById('cnt');
    function animateCount(target){ if(!cnt) return; var t0=null; requestAnimationFrame(function step(t){ if(!t0)t0=t; var p=Math.min((t-t0)/1500,1); cnt.textContent=Math.floor((1-Math.pow(1-p,3))*target).toLocaleString(); if(p<1)requestAnimationFrame(step); }); }
    function setTrustProducts(total){ document.querySelectorAll('.trust-item').forEach(function(it){ var lbl=it.querySelector('.trust-label'); if(lbl && /product/i.test(lbl.textContent)){ var num=it.querySelector('.trust-num'); if(num) num.textContent=(total>=1000?Math.round(total/1000)+'K+':total.toLocaleString()); } }); }
    animateCount(169000);
    window.__ftwTotal = function (val) { if (cnt && val) cnt.textContent = val.toLocaleString(); if (val) setTrustProducts(val); };
  })();

  /* ---------------- static: Find Your Style ---------------- */
  (function () {
    var el = document.getElementById('cats'); if (!el) return;
    var cats = [
      { n: 'Women', img: '1529139574466-a303027c1d8b', href: 'pages/women.html' },
      { n: 'Men', img: '1507003211169-0a1dd7228f2d', href: 'pages/men.html' },
      { n: 'Kids', img: '1503454537195-1dcabb73ffb9', href: 'pages/kids.html' },
      { n: 'Shoes', img: '1595950653106-6c9ebd614d3a', href: 'pages/shoes.html' },
      { n: 'Bags', img: '1584917865442-de89df76afd3', href: 'pages/bags.html' },
      { n: 'Jewellery', img: '1515562141207-7a88fb7ce338', href: 'pages/jewellery.html' },
      { n: 'Accessories', img: '1511499767150-a48a237f0083', href: 'pages/accessories.html' },
      { n: 'Beauty', img: '1596462502278-27bfdc403348', href: 'pages/beauty.html' },
      { n: 'Watches', img: '1523275335684-37898b6baf30', href: 'pages/search.html?q=watch', isNew: true },
      { n: 'On Sale', img: '1445205170230-053b83016050', href: 'pages/women.html?sale=true' }
    ];
    el.innerHTML = cats.map(function (c) {
      return '<a class="cat-tile' + (c.isNew ? ' new' : '') + '" href="' + c.href + '"><div class="ph" data-img="' + c.img + '"></div><div class="shade"></div><span class="lbl">' + c.n + '</span></a>';
    }).join('');
    bgFill(el.querySelectorAll('.ph'), 600);
  })();

  /* ---------------- static: Shop the Edit ---------------- */
  (function () {
    var el = document.getElementById('edits'); if (!el) return;
    var edits = [
      { n: 'Vacation', img: '1523381210434-271e8be1f52b', href: 'pages/women.html?cat=Swimwear' },
      { n: 'Wedding Guest', img: '1566174053879-31528523f8ae', href: 'pages/women.html?cat=Dresses' },
      { n: 'Workwear', img: '1490481651871-ab68de25d43d', href: 'pages/men.html' },
      { n: 'Date Night', img: '1539109136881-3be0616acf4b', href: 'pages/women.html?cat=Dresses' },
      { n: 'Athleisure', img: '1483721310020-03333e577078', href: 'pages/women.html' },
      { n: 'Coats & Jackets', img: '1441984904996-e0b6ba687e04', href: 'pages/women.html?cat=Coats' },
      { n: 'Statement Jewellery', img: '1515562141207-7a88fb7ce338', href: 'pages/jewellery.html' },
      { n: 'Sneaker Edit', img: '1596462502278-27bfdc403348', href: 'pages/shoes.html?cat=Sneakers' },
      { n: 'Bags We Love', img: '1584917865442-de89df76afd3', href: 'pages/bags.html' },
      { n: 'Best Sellers', img: '1483985988355-763728e1935b', href: 'pages/women.html' }
    ];
    el.innerHTML = edits.map(function (e) {
      return '<a class="edit-tile" href="' + e.href + '"><div class="ph" data-img="' + e.img + '"></div><div class="shade"></div><span class="lbl">' + e.n + '</span></a>';
    }).join('');
    bgFill(el.querySelectorAll('.ph'), 500);
  })();

  /* ---------------- static: blog ---------------- */
  (function () {
    var el = document.getElementById('blog'); if (!el) return;
    var blog = [
      { c: 'Trends', t: 'The 2026 colours worth buying now', e: 'Five shades dominating the season and the worldwide stores stocking them first.', img: '1483985988355-763728e1935b' },
      { c: 'Guides', t: 'How to spot a genuine deal', e: 'Verified discounts vs. inflated "was" prices — what to check before you click.', img: '1441984904996-e0b6ba687e04' },
      { c: 'Capsule', t: 'A 12-piece worldwide wardrobe', e: 'Build a season-proof capsule sourced entirely from stores that ship globally.', img: '1490481651871-ab68de25d43d' }
    ];
    el.innerHTML = blog.map(function (p) {
      return '<a class="blog-card" href="pages/blog.html"><div class="blog-img" data-img="' + p.img + '"></div><div class="blog-body"><span class="blog-cat">' + p.c + '</span><h3 class="blog-title">' + p.t + '</h3><p class="blog-ex">' + p.e + '</p></div></a>';
    }).join('');
    el.querySelectorAll('.blog-img').forEach(function (b) { b.style.background = 'linear-gradient(135deg,#cdbfa8,#9b8a70)'; });
    bgFill(el.querySelectorAll('.blog-img'), 600);
  })();

  /* ---------------- Featured Stores rail + chips (live counts) ---------------- */
  (function () {
    var rail = document.getElementById('rail'); var chips = document.getElementById('schips'); if (!rail) return;
    var META = {
      'the luxury closet': { d: 'theluxurycloset.com', t: 'Luxury resale', cats: ['luxury', 'women'] },
      'aliexpress': { d: 'aliexpress.com', t: 'Marketplace', cats: ['market'] },
      'stylewe': { d: 'stylewe.com', t: 'Designer wear', cats: ['luxury', 'women'] },
      'noracora': { d: 'noracora.com', t: "Women's fashion", cats: ['women'] },
      'justfashionnow': { d: 'justfashionnow.com', t: "Women's fashion", cats: ['women'] },
      'chicme': { d: 'chicme.com', t: 'Trend fashion', cats: ['women'] },
      'glasseslit': { d: 'glasseslit.com', t: 'Eyewear', cats: ['eyewear'] },
      'italo': { d: 'italojewelry.com', t: 'Jewellery', cats: ['luxury'] },
      'wayrates': { d: 'wayrates.com', t: "Men's fashion", cats: ['market'] },
      'symbol': { d: 'symbolclothing.com', t: 'Essentials', cats: ['women', 'market'] },
      'alibaba': { d: 'alibaba.com', t: 'Marketplace', cats: ['market'] },
      'hacoo': { d: 'hacoo.com', t: 'Marketplace', cats: ['market'] },
      'watches of usa': { d: 'watchesofusa.com', t: 'Watches', cats: ['luxury'] },
      'drippy': { d: '', t: 'Custom', cats: ['market'] }
    };
    function metaFor(name) { var n = (name || '').toLowerCase(); for (var k in META) { if (n.indexOf(k) > -1) return META[k]; } return { d: '', t: 'Worldwide store', cats: ['all'] }; }
    function build(name, count) { var m = metaFor(name); return { name: name, count: count, d: m.d, t: m.t, cats: m.cats }; }
    var STORES = ['The Luxury Closet', 'AliExpress', 'Stylewe', 'Noracora', 'Justfashionnow', 'ChicMe', 'Glasseslit', 'Italo Jewelry', 'Wayrates'].map(function (n) { return build(n, null); });
    function draw(cat) {
      rail.innerHTML = STORES.filter(function (s) { return cat === 'all' || (s.cats || []).indexOf(cat) > -1; }).map(function (s) {
        var logo = s.d ? ('<img alt="' + esc(s.name) + '" loading="lazy" src="https://logo.clearbit.com/' + s.d + '" onerror="this.onerror=null;this.src=\'https://www.google.com/s2/favicons?domain=' + s.d + '&sz=128\'">') : s.name.trim()[0];
        var cta = (s.count != null) ? (s.count.toLocaleString() + ' items &#8250;') : 'Visit store &#8250;';
        return '<a class="store" href="pages/search.html?advertiser=' + encodeURIComponent(s.name) + '">' +
          '<div class="store-logo">' + logo + '</div>' +
          '<div class="store-name">' + esc(s.name) + '</div><div class="store-tag">' + esc(s.t) + '</div>' +
          '<div class="store-count">' + cta + '</div></a>';
      }).join('');
    }
    draw('all');
    if (chips) chips.addEventListener('click', function (e) { var b = e.target.closest('.schip'); if (!b) return; chips.querySelectorAll('.schip').forEach(function (c) { c.classList.remove('on'); }); b.classList.add('on'); draw(b.getAttribute('data-cat') || b.getAttribute('data-c') || 'all'); });
    if (API && API.getStores) {
      API.getStores().then(function (data) {
        var rows = (data && data.stores) || [];
        if (rows.length) { STORES = rows.slice(0, 12).map(function (r) { return build(r.name, r.count); }); var on = chips && chips.querySelector('.schip.on'); draw(on ? (on.getAttribute('data-cat') || on.getAttribute('data-c') || 'all') : 'all'); }
        var cnt = (data && data.count) || rows.length;
        if (cnt) setTrustStores(cnt);
        if (data && data.total_products && window.__ftwTotal) window.__ftwTotal(data.total_products);
      }).catch(function () { });
    }
  })();
  function setTrustStores(n) { document.querySelectorAll('.trust-item').forEach(function (it) { var lbl = it.querySelector('.trust-label'); if (lbl && /store/i.test(lbl.textContent)) { var num = it.querySelector('.trust-num'); if (num) num.textContent = n; } }); }

  /* ---------------- shared image loader ---------------- */
  function bgFill(nodes, w) {
    nodes.forEach(function (ph) {
      var id = ph.getAttribute('data-img'); if (!id) return;
      var url = 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=' + (w || 600) + '&q=80';
      var im = new Image(); im.onload = function () { ph.style.backgroundImage = "url('" + url + "')"; }; im.src = url;
    });
  }

  /* ---------------- live product card ---------------- */
  function pcard(p, opts) {
    opts = opts || {};
    var link = p.affiliate_url || p.url || ''; var out = /^https?:/i.test(link); var href = out ? link : '#';
    var disc = (p.price_old && p.price_old > p.price) ? Math.round((1 - p.price / p.price_old) * 100) : 0;
    var price = p.price_display || (p.price ? ('$' + p.price) : '');
    var was = p.price_old ? (p.price_old_display || ('$' + p.price_old)) : '';
    var img = p.image_url || '';
    var badge = disc ? '<span class="pcard-badge">-' + disc + '%</span>' : (opts.newBadge ? '<span class="pcard-badge" style="background:var(--gold-deep)">New</span>' : '');
    return '<article class="pcard"><div class="pcard-img" style="background:#efe9df center/cover no-repeat' + (img ? (" url('" + esc(img) + "')") : '') + '">' + badge + '</div>' +
      '<div class="pcard-body"><p class="pcard-brand">' + esc(p.brand || p.advertiser_name || '') + '</p>' +
      '<h3 class="pcard-name">' + esc(p.name || '') + '</h3>' +
      '<p class="pcard-price">' + esc(price) + (was ? '<span class="was">' + esc(was) + '</span>' : '') + '</p></div>' +
      '<div class="pcard-foot"><a class="pcard-btn" href="' + href + '"' + (out ? ' target="_blank" rel="sponsored nofollow noopener"' : '') + '>Shop <span class="store">at ' + esc(p.advertiser_name || 'store') + '</span> &#8599;</a></div></article>';
  }

  async function fillProducts(id, opts, cardOpts) {
    var el = document.getElementById(id); if (!el || !API) return;
    el.innerHTML = '<div class="loading-skeleton"></div>'.repeat(8);
    try {
      var data = await API.getProducts(opts);
      var items = (data && data.products) || [];
      if (!items.length) { hideSection(el); return; }
      el.innerHTML = items.map(function (p) { return pcard(p, cardOpts); }).join('');
    } catch (e) { hideSection(el); }
  }

  /* ---------------- live: trending (eager) + lazy below-the-fold ---------------- */
  function lazyFill(id, opts, cardOpts) {
    var el = document.getElementById(id); if (!el) return;
    var target = el.closest('section') || el;
    if (!('IntersectionObserver' in window)) { fillProducts(id, opts, cardOpts); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); fillProducts(id, opts, cardOpts); } });
    }, { rootMargin: '900px 0px' });
    io.observe(target);
  }
  fillProducts('prods', { sort: 'discount', limit: 8, page: 1 });                       // Trending — near top, load now
  lazyFill('prodsBig', { sort: 'discount', limit: 8, page: 2 });                        // Biggest Discounts — on scroll
  lazyFill('prods2', { sort: 'popularity', limit: 8, page: 1 }, { newBadge: true });    // New In — on scroll

  /* ---------------- live: ticker + today's deals (coupons) ---------------- */
  function shortOffer(c) {
    if (c.discount) { return /%|off|\$/i.test(c.discount) ? c.discount : (c.discount + '% off'); }
    var m = (c.name || '').match(/(\$\s?\d+\s*off|\d+%\s*off|free\s+\w+)/i);
    return m ? m[0] : 'Deal';
  }
  (async function () {
    var tick = document.getElementById('tick');
    var deals = document.getElementById('todaysDeals');
    if (!API || (!tick && !deals)) return;

    // Ticker: real promo codes from the coupon feed
    if (tick) {
      try {
        var data = await API.getCoupons({ limit: 12 });
        var cs = (data && data.coupons) || [];
        if (cs.length) {
          var items = cs.map(function (c) { var u = c.url || 'pages/deals.html'; var out = /^https?:/i.test(u); return '<a class="ticker-item" href="' + u + '"' + (out ? ' target="_blank" rel="sponsored nofollow noopener"' : '') + '><b>' + esc(shortOffer(c)) + '</b> at ' + esc(c.advertiser_name || 'a worldwide store') + '</a>'; });
          tick.innerHTML = items.concat(items).join('');
        } else { tickFallback(tick); }
      } catch (e) { tickFallback(tick); }
    }

    // Today's Top Deals: one top-discounted product per store (variety across all 13 stores)
    if (deals) {
      deals.innerHTML = '<div class="loading-skeleton"></div>'.repeat(8);
      try {
        var base = window.API_BASE || '';
        var r = await fetch(base + '/api/products/top-deals');
        var dd = r.ok ? await r.json() : null;
        var dp = (dd && dd.products) || [];
        if (dp.length) { deals.innerHTML = dp.map(function (p) { return pcard(p, {}); }).join(''); }
        else { hideSection(deals); }
      } catch (e) { hideSection(deals); }
    }
  })();
  function tickFallback(tick) {
    var f = ['New season knitwear at <b>Stylewe</b>', 'Free shipping worldwide on <b>Noracora</b>', 'Up to <b>70% off</b> at The Luxury Closet', 'Verified deals, updated daily'];
    tick.innerHTML = f.concat(f).map(function (x) { return '<a class="ticker-item" href="pages/deals.html">' + x + '</a>'; }).join('');
  }
})();
