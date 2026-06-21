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
    (function () {
      var base = window.API_BASE || '';
      fetch(base + '/api/products/status').then(function (r) { return r.json(); }).then(function (d) {
        var tot = (d && d.total) || 169000;
        animateCount(tot); setTrustProducts(tot);
        document.querySelectorAll('.js-prodcount').forEach(function (e) { e.textContent = tot.toLocaleString(); });
        var pi = document.querySelector('.nav-search input'); if (pi) pi.placeholder = 'Search ' + tot.toLocaleString() + '+ products…';
      }).catch(function () { animateCount(169000); });
    })();
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
      { n: 'On Sale', img: '1445205170230-053b83016050', href: 'pages/search.html?sale=true' }
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
      { n: 'Vacation', img: '1523381210434-271e8be1f52b', href: 'pages/search.html?q=swimwear' },
      { n: 'Wedding Guest', img: '1566174053879-31528523f8ae', href: 'pages/search.html?q=occasion%20dress' },
      { n: 'Workwear', img: '1490481651871-ab68de25d43d', href: 'pages/search.html?q=tailored%20blazer' },
      { n: 'Date Night', img: '1539109136881-3be0616acf4b', href: 'pages/search.html?q=evening%20dress' },
      { n: 'Athleisure', img: '1483721310020-03333e577078', href: 'pages/search.html?q=activewear' },
      { n: 'Coats & Jackets', img: '1441984904996-e0b6ba687e04', href: 'pages/search.html?q=coat' },
      { n: 'Statement Jewellery', img: '1515562141207-7a88fb7ce338', href: 'pages/search.html?q=statement%20necklace' },
      { n: 'Sneaker Edit', img: '1542291026-7eec264c27ff', href: 'pages/shoes.html?cat=Sneakers' },
      { n: 'Bags We Love', img: '1584917865442-de89df76afd3', href: 'pages/bags.html' },
      { n: 'Best Sellers', img: '1483985988355-763728e1935b', href: 'pages/search.html?q=designer%20handbag' }
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
      'symbol': { d: 'symbol.fashion', t: 'Essentials', cats: ['women', 'market'] },
      'alibaba': { d: 'alibaba.com', t: 'Marketplace', cats: ['market'] },
      'hacoo': { d: 'hacoo.com', t: 'Marketplace', cats: ['market'] },
      'watches of usa': { d: 'watchesofusa.com', t: 'Watches', cats: ['luxury'] },
      'cerqular': { d: 'cerqular.com', t: 'Sustainable fashion', cats: ['women', 'luxury'] },
      'metro brazil': { d: 'metrobrazil.com', t: 'Global marketplace', cats: ['market', 'women'] },
      'watch home': { d: 'watchhome.com', t: 'Watches', cats: ['luxury'] },
      'silverbene': { d: 'silverbene.com', t: 'Jewellery', cats: ['luxury'] },
      'watch enclave': { d: 'watchenclave.co.uk', t: 'Watches', cats: ['watches', 'luxury'] },
      'paul smith': { d: 'paulsmith.com', t: 'Designer', cats: ['luxury', 'women'] },
      'luxefashion': { d: 'luxefashion.com', t: "Women's fashion", cats: ['women'] },
      'niidor': { d: 'niidor.com', t: "Women's fashion", cats: ['women'] },
      'lichi': { d: 'lichi.com', t: "Women's fashion", cats: ['women'] },
      'nadula': { d: 'nadula.com', t: "Women's fashion", cats: ['women'] },
      'ecom deal': { d: '', t: "Women's fashion", cats: ['women'] },
      'drippy': { d: '', t: 'Custom', cats: ['market'] }
    };
    function metaFor(name) { var n = (name || '').toLowerCase(); for (var k in META) { if (n.indexOf(k) > -1) return META[k]; } return { d: '', t: 'Worldwide store', cats: ['all'] }; }
    function build(name, count) { var m = metaFor(name); return { name: name, count: count, d: m.d, t: m.t, cats: m.cats }; }
    function pickBalanced(all, max) {
      var order = ['market', 'women', 'luxury', 'watches', 'jewellery', 'eyewear'];
      var buckets = {}; order.forEach(function (c) { buckets[c] = []; });
      var other = [];
      all.forEach(function (s) {
        var cats = s.cats || [];
        var placed = false;
        for (var i = 0; i < order.length; i++) { if (cats.indexOf(order[i]) > -1) { buckets[order[i]].push(s); placed = true; break; } }
        if (!placed) other.push(s);
      });
      var out = [], seen = {};
      function take(s) { if (s && !seen[s.name]) { seen[s.name] = 1; out.push(s); } }
      var idx = {}; order.forEach(function (c) { idx[c] = 0; });
      var progress = true;
      while (out.length < max && progress) {
        progress = false;
        for (var j = 0; j < order.length && out.length < max; j++) {
          var c = order[j], list = buckets[c];
          if (idx[c] < list.length) { take(list[idx[c]++]); progress = true; }
        }
      }
      for (var k = 0; k < other.length && out.length < max; k++) take(other[k]);
      for (var m2 = 0; m2 < all.length && out.length < max; m2++) take(all[m2]);
      return out;
    }
    var STORES = ['The Luxury Closet', 'AliExpress', 'Stylewe', 'Noracora', 'Justfashionnow', 'ChicMe', 'Glasseslit', 'Italo Jewelry', 'Wayrates'].map(function (n) { return build(n, null); });
    function draw(cat) {
      rail.innerHTML = STORES.filter(function (s) { return cat === 'all' || (s.cats || []).indexOf(cat) > -1; }).map(function (s) {
        var logo = s.d ? ('<img alt="' + esc(s.name) + '" loading="lazy" src="https://logo.clearbit.com/' + s.d + '" onerror="this.onerror=null;this.src=\'https://www.google.com/s2/favicons?domain=' + s.d + '&sz=128\'">') : s.name.trim()[0];
        var cta = (s.count != null) ? (s.count.toLocaleString() + ' items &#8250;') : 'Visit store &#8250;';
        return '<a class="store" target="_blank" rel="noopener" href="pages/go.html?store=' + encodeURIComponent(s.name) + '">' +
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
        if (rows.length) {
          var built = rows.map(function (r) { return build(r.name, r.count); });
          STORES = pickBalanced(built, 15);
          var on = chips && chips.querySelector('.schip.on');
          draw(on ? (on.getAttribute('data-cat') || on.getAttribute('data-c') || 'all') : 'all');
        }
        var cnt = (data && data.count) || rows.length;
        if (cnt) setTrustStores(cnt);
        if (data && data.total_products && window.__ftwTotal) window.__ftwTotal(data.total_products);
        if (data) {
          var sc = data.count || (data.stores && data.stores.length) || 0;
          if (sc) document.querySelectorAll('.js-storecount').forEach(function (e) { e.textContent = sc; });
          if (data.total_products) {
            document.querySelectorAll('.js-prodcount').forEach(function (e) { e.textContent = data.total_products.toLocaleString(); });
            var pi2 = document.querySelector('.nav-search input'); if (pi2) pi2.placeholder = 'Search ' + data.total_products.toLocaleString() + '+ products…';
          }
        }
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
      '<div class="pcard-foot"><a class="pcard-btn" href="' + href + '"' + (out ? ' target="_blank" rel="sponsored nofollow noopener"' : '') + '>Shop Now &#8594;</a></div></article>';
  }

  // Fetch helper: supports a custom `endpoint` (e.g. diverse-discounts) with
  // limit + offset, otherwise falls back to the standard products API.
  async function fetchProducts(opts) {
    if (opts && opts.endpoint) {
      var base = window.API_BASE || '';
      var qs = [];
      if (opts.limit) qs.push('limit=' + encodeURIComponent(opts.limit));
      if (opts.offset) qs.push('offset=' + encodeURIComponent(opts.offset));
      var url = base + opts.endpoint + (qs.length ? ('?' + qs.join('&')) : '');
      var r = await fetch(url);
      return r.ok ? await r.json() : { products: [] };
    }
    return await API.getProducts(opts);
  }

  async function fillProducts(id, opts, cardOpts) {
    var el = document.getElementById(id); if (!el || !API) return;
    el.innerHTML = '<div class="loading-skeleton"></div>'.repeat(8);
    try {
      var data = await fetchProducts(opts);
      var items = (data && data.products) || [];
      if (opts && opts.slice) items = items.slice(opts.slice[0], opts.slice[1]);
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
  // Trending + Biggest Discounts use the store-diversified discount pool (max
  // 2 per store) so no single store floods the rail. Biggest Discounts takes a
  // later slice so it shows different products than Trending.
  fillProducts('prods', { endpoint: '/api/products/trending', limit: 16 });                       // Trending — premium mix (watches/bags/dresses/jewellery)
  lazyFill('prodsBig', { endpoint: '/api/products/diverse-discounts', limit: 8 });                    // Biggest Discounts — diverse markdowns
  lazyFill('prods2', { sort: 'popularity', limit: 8, page: 1, minprice: 8 }, { newBadge: true });      // New In — on scroll

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

    if (tick) {
      try {
        var data = await API.getCoupons({ limit: 12 });
        var cs = (data && data.coupons) || [];
        if (cs.length) {
          var items = cs.map(function (c) { var u = c.url || 'pages/coupons.html'; var out = /^https?:/i.test(u); return '<a class="ticker-item" href="' + u + '"' + (out ? ' target="_blank" rel="sponsored nofollow noopener"' : '') + '><b>' + esc(shortOffer(c)) + '</b> at ' + esc(c.advertiser_name || 'a worldwide store') + '</a>'; });
          tick.innerHTML = items.concat(items).join('');
        } else { tickFallback(tick); }
      } catch (e) { tickFallback(tick); }
    }

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
    tick.innerHTML = f.concat(f).map(function (x) { return '<a class="ticker-item" href="pages/coupons.html">' + x + '</a>'; }).join('');
  }
})();
