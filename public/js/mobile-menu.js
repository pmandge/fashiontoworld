/**
 * ============================================================
 * FashionToWorld — Mobile Menu (burger drawer) + Subscribe
 * ============================================================
 * - Injects a working slide-in drawer with all fashion
 *   categories + subcategories (from FASHION_TAXONOMY)
 * - Ensures every page nav has a working burger button
 * - Adds a "Subscribe" button (nav + drawer) that opens a
 *   simple email-capture modal — works on every page
 * - Path-aware links (works from / and from /pages/)
 * ============================================================
 */

(function () {
  // Are we inside /pages/ ? Adjust relative links accordingly.
  const inPages = location.pathname.includes('/pages/');
  const root = inPages ? '' : 'pages/';          // link prefix to subpages
  const home = inPages ? '../index.html' : 'index.html';

  // Shared: fetch the real subcategories once (used by both mobile drawer + desktop mega)
  let _facetsPromise = null;
  function getFacets() {
    if (_facetsPromise) return _facetsPromise;
    const base = window.API_BASE || '';
    _facetsPromise = fetch(base + '/api/categories/subcategories')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return _facetsPromise;
  }
  function subItems(c, facets) {
    var items = [];
    var real = facets && facets[c.slug];
    if (real && real.length) items = real.map(function (s) { return s.name; });
    else Object.values(c.subcategories).forEach(function (g) { g.items.forEach(function (it) { items.push(it); }); });
    var seen = {};
    return items.filter(function (n) { var k = n.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function renderCats(tax, facets) {
    var ICONS = { women:'<path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 9l-2 7h3l-1 6h4l-1-6h3L12 9"/>', men:'<path d="M6 3h12l-2 5 2 13H6l2-13z"/>', kids:'<circle cx="12" cy="5" r="2.5"/><path d="M8 9h8l-1 5h-2l1 7h-4l1-7H9z"/>', shoes:'<path d="M2 16h13l5 2h2v2H2zM2 10v6h4l-1-6z"/>', bags:'<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>', watches:'<circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2M9 2h6M9 22h6"/>', jewellery:'<path d="M12 3l4 5-4 13-4-13zM8 8h8"/>', accessories:'<circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 12h2"/>', beauty:'<path d="M12 2l2 6h-4zM10 8h4v6a2 2 0 0 1-4 0zM9 20h6"/>' };
    var cats = '';
    for (var key in tax) {
      var c = tax[key];
      var icon = ICONS[c.slug] || '<circle cx="12" cy="12" r="9"/>';
      var subs = subItems(c, facets).slice(0, 16);
      var links = subs.map(function (it) {
        return '<a href="' + catUrl(c.slug) + '?cat=' + encodeURIComponent(it) + '" style="display:block;padding:6px 0;font-size:13px;color:#6b6b6b;text-decoration:none">' + it + '</a>';
      }).join('');
      cats +=
        '<details style="border-bottom:1px solid rgba(0,0,0,.07)">' +
          '<summary style="list-style:none;cursor:pointer;padding:16px 0;display:flex;align-items:center;gap:12px">' +
            '<span style="display:inline-flex;width:34px;height:34px;border-radius:50%;background:#f5f2ec;align-items:center;justify-content:center;flex-shrink:0">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c9a84c" stroke-width="1.4">' + icon + '</svg>' +
            '</span>' +
            '<span style="flex:1"><a href="' + catUrl(c.slug) + '" style="font-family:Georgia,serif;font-size:19px;font-weight:600;color:#0f0f0f;text-decoration:none;display:block;line-height:1.2">' + c.label + '</a></span>' +
            '<span style="color:#c9a84c;font-size:20px;font-weight:300">+</span>' +
          '</summary>' +
          '<div style="padding:0 0 14px 46px">' + links + '</div>' +
        '</details>';
    }
    return cats;
  }

  function catUrl(slug) {
    // Every top-level category now has its own real page.
    const pages = ['women','men','shoes','bags','watches','jewellery','accessories','beauty','kids','deals','brands'];
    if (pages.includes(slug)) return root + slug + '.html';
    // Subcategories fall back to women.html with a filter
    return root + 'women.html?cat=' + encodeURIComponent(slug);
  }

  function build() {
    const tax = window.FASHION_TAXONOMY || {};

    // ---- Drawer + overlay ----
    const overlay = document.createElement('div');
    overlay.id = 'mmOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);opacity:0;visibility:hidden;transition:opacity .25s;z-index:1998';
    overlay.addEventListener('click', close);

    const drawer = document.createElement('aside');
    drawer.id = 'mmDrawer';
    drawer.setAttribute('aria-label', 'Menu');
    drawer.style.cssText = 'position:fixed;top:0;right:0;height:100%;width:84%;max-width:340px;background:#fafaf8;transform:translateX(100%);transition:transform .28s ease;z-index:1999;overflow-y:auto;box-shadow:-8px 0 40px rgba(0,0,0,.15)';

    var cats = renderCats(tax, null);

    drawer.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.1)">' +
        '<span style="font-family:Georgia,serif;font-size:20px;font-weight:600">Fashion<span style="font-size:9px;letter-spacing:2px;color:#c9a84c">TO</span><span style="color:#c9a84c">World</span></span>' +
        '<button id="mmClose" aria-label="Close menu" style="background:none;border:none;font-size:24px;cursor:pointer;color:#1a1a1a;line-height:1">&times;</button>' +
      '</div>' +
      '<div style="padding:8px 20px 20px">' +
        '<div style="display:flex;border:1.5px solid #0f0f0f;border-radius:6px;overflow:hidden;margin-bottom:14px">' +
          '<input id="mmSearch" type="text" placeholder="Search products & brands…" style="flex:1;border:none;padding:11px 14px;font-size:14px;outline:none;font-family:inherit">' +
          '<button id="mmSearchBtn" aria-label="Search" style="background:#0f0f0f;color:#fff;border:none;padding:0 16px;cursor:pointer;font-size:15px">⌕</button>' +
        '</div>' +
        '<a href="' + root + 'coupons.html" style="display:block;background:#c9a84c;color:#0f0f0f;text-align:center;padding:12px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;text-decoration:none;margin-bottom:8px">Coupons</a>' +
        '<button onclick="FTWSubscribe.open()" style="width:100%;background:#0f0f0f;color:#fafaf8;border:none;padding:12px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;margin-bottom:16px">Subscribe</button>' +
        '<div id="mmCats">' + cats + '</div>' +
        '<a href="' + root + 'brands.html" style="display:block;padding:14px 0;font-family:Georgia,serif;font-size:18px;color:#0f0f0f;text-decoration:none;border-bottom:1px solid rgba(0,0,0,.08)">All Brands</a>' +
        '<a href="' + root + 'blog.html" style="display:block;padding:14px 0;font-family:Georgia,serif;font-size:18px;color:#0f0f0f;text-decoration:none">Style Blog</a>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    getFacets().then(function (f) { var el = document.getElementById('mmCats'); if (el && f) el.innerHTML = renderCats(tax, f); });
    drawer.querySelector('#mmClose').addEventListener('click', close);

    // ---- Floating "Coupons" CTA (appears after scrolling) ----
    if (!document.getElementById('floatCta')) {
      var fc = document.createElement('a');
      fc.id = 'floatCta';
      fc.className = 'float-cta';
      fc.href = root + 'coupons.html';
      fc.innerHTML = '<span class="fc-ico">🔥</span> Coupons';
      document.body.appendChild(fc);
      var onScroll = function () {
        if (window.scrollY > 600) fc.classList.add('visible');
        else fc.classList.remove('visible');
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Search box → search results page
    var mmSearch = drawer.querySelector('#mmSearch');
    var mmSearchBtn = drawer.querySelector('#mmSearchBtn');
    function goSearch() {
      var q = (mmSearch.value || '').trim();
      if (q) window.location.href = root + 'search.html?q=' + encodeURIComponent(q);
    }
    if (mmSearchBtn) mmSearchBtn.addEventListener('click', goSearch);
    if (mmSearch) mmSearch.addEventListener('keyup', function (e) { if (e.key === 'Enter') goSearch(); });

    // ---- Ensure a burger exists in every nav ----
    document.querySelectorAll('.nav-inner').forEach(function (navInner) {
      let burger = navInner.querySelector('.nav-burger');
      if (!burger) {
        burger = document.createElement('button');
        burger.className = 'nav-burger';
        burger.setAttribute('aria-label', 'Open menu');
        navInner.appendChild(burger);
      }
      burger.innerHTML = '<span class="burger-lines"><span></span><span></span><span></span></span><span class="burger-label">Menu</span>';
      burger.onclick = open;
    });
  }

  function open() {
    document.getElementById('mmDrawer').style.transform = 'translateX(0)';
    const o = document.getElementById('mmOverlay');
    o.style.opacity = '1'; o.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
  }
  function close() {
    document.getElementById('mmDrawer').style.transform = 'translateX(100%)';
    const o = document.getElementById('mmOverlay');
    o.style.opacity = '0'; o.style.visibility = 'hidden';
    document.body.style.overflow = '';
  }

  // ---- Subscribe modal (works on all pages) ----
  const FTWSubscribe = {
    open: function () {
      if (document.getElementById('ftwSubModal')) { document.getElementById('ftwSubModal').style.display = 'flex'; return; }
      const m = document.createElement('div');
      m.id = 'ftwSubModal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px';
      m.innerHTML =
        '<div style="background:#fafaf8;border-radius:12px;max-width:400px;width:100%;padding:32px;position:relative;text-align:center">' +
          '<button onclick="FTWSubscribe.close()" aria-label="Close" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;color:#999">&times;</button>' +
          '<div style="font-family:Georgia,serif;font-size:28px;color:#0f0f0f;margin-bottom:8px">Get Exclusive Deals <em style="color:#c9a84c">First</em></div>' +
          '<p style="font-size:14px;color:#6b6b6b;margin-bottom:20px">Weekly fashion deals &amp; new arrivals, delivered to your inbox.</p>' +
          '<form onsubmit="return FTWSubscribe.submit(event)">' +
            '<input id="ftwSubEmail" type="email" required placeholder="Your email address" style="width:100%;padding:14px 16px;border:2px solid #0f0f0f;border-radius:4px;font-size:15px;outline:none;margin-bottom:10px;font-family:inherit">' +
            '<button type="submit" style="width:100%;padding:14px;background:#0f0f0f;color:#fafaf8;border:none;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;cursor:pointer">Subscribe</button>' +
          '</form>' +
          '<p style="font-size:11px;color:#aaa;margin-top:12px">No spam. Unsubscribe anytime.</p>' +
        '</div>';
      document.body.appendChild(m);
      setTimeout(function(){ document.getElementById('ftwSubEmail').focus(); }, 50);
    },
    close: function () {
      const m = document.getElementById('ftwSubModal');
      if (m) m.style.display = 'none';
    },
    submit: function (e) {
      e.preventDefault();
      var email = document.getElementById('ftwSubEmail').value;
      var box = document.querySelector('#ftwSubModal > div');
      var btn = document.querySelector('#ftwSubModal button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }
      var API = (window.API_BASE || 'https://api.fashiontoworld.co');
      fetch(API + '/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d && res.d.ok) {
          box.innerHTML =
            '<div style="padding:20px 0;text-align:center"><div style="font-size:40px;margin-bottom:10px;color:#c9a84c">\u2709</div>' +
            '<div style="font-family:Georgia,serif;font-size:24px;color:#0f0f0f;margin-bottom:6px">Check your email</div>' +
            '<p style="font-size:14px;color:#6b6b6b;line-height:1.5">We\'ve sent a confirmation link to <strong>' + email.replace(/</g,'&lt;') + '</strong>. Click it to confirm your subscription.</p>' +
            '<button onclick="FTWSubscribe.close()" style="margin-top:18px;padding:10px 28px;background:#0f0f0f;color:#fafaf8;border:none;border-radius:4px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;cursor:pointer">Done</button></div>';
        } else {
          var msg = (res.d && res.d.error === 'invalid_email') ? 'That email doesn\'t look right \u2014 please check and try again.' : 'Something went wrong. Please try again in a moment.';
          if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
          var err = document.getElementById('ftwSubErr');
          if (!err) { err = document.createElement('p'); err.id = 'ftwSubErr'; err.style.cssText = 'font-size:13px;color:#c0392b;margin-top:10px'; var f = document.querySelector('#ftwSubModal form'); if (f) f.appendChild(err); }
          err.textContent = msg;
        }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
        var err2 = document.getElementById('ftwSubErr');
        if (!err2) { err2 = document.createElement('p'); err2.id = 'ftwSubErr'; err2.style.cssText = 'font-size:13px;color:#c0392b;margin-top:10px'; var f2 = document.querySelector('#ftwSubModal form'); if (f2) f2.appendChild(err2); }
        err2.textContent = 'Network error. Please try again.';
      });
      return false;
    },
  };
  window.FTWSubscribe = FTWSubscribe;

  // Data-driven mega menus: a clean, evenly-aligned grid of the subcategories
  // that actually exist in the product feed. Falls back to the curated taxonomy.
  async function buildMegaMenus() {
    const tax = window.FASHION_TAXONOMY || {};
    const facets = await getFacets();

    document.querySelectorAll('.nav-links > li > a').forEach(function (link) {
      const label = link.textContent.trim().toLowerCase();
      let key = null;
      for (const k in tax) { if (tax[k].label.toLowerCase() === label) { key = k; break; } }
      if (!key) return;
      const c = tax[key];
      const li = link.parentElement;
      if (li.querySelector('.mega')) return;

      let items = [];
      const real = facets && facets[c.slug];
      if (real && real.length) {
        items = real.map(function (s) { return s.name; });           // already sorted by count
      } else {
        Object.values(c.subcategories).forEach(function (g) { g.items.forEach(function (it) { items.push(it); }); });
      }
      // de-dupe (case-insensitive) and cap so the grid stays tidy
      const seen = {};
      items = items.filter(function (n) { const k = n.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 21);
      if (!items.length) return;

      const mega = document.createElement('div');
      mega.className = 'mega';
      mega.style.setProperty('--mega-rows', Math.max(3, Math.ceil(items.length / 3)));
      mega.innerHTML = '<div class="mega-list">' + items.map(function (name) {
        return '<a href="' + catUrl(c.slug) + '?cat=' + encodeURIComponent(name) + '">' + name + '</a>';
      }).join('') + '</div>';
      li.appendChild(mega);
    });
  }

  function init() {
    build();
    buildMegaMenus();
    // Add a desktop "Subscribe" button to nav-actions on every page
    document.querySelectorAll('.nav-actions').forEach(function (actions) {
      if (actions.querySelector('.btn-subscribe')) return;
      const btn = document.createElement('button');
      btn.className = 'btn-subscribe';
      btn.textContent = 'Subscribe';
      btn.setAttribute('onclick', 'FTWSubscribe.open()');
      btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:13px;color:#6b6b6b;font-family:inherit;letter-spacing:.03em';
      actions.insertBefore(btn, actions.firstChild);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ===== Sticky mobile bottom nav (injected site-wide) ===== */
(function () {
  function build() {
    if (document.querySelector('.botnav')) return;
    var path = location.pathname;
    function activeKey() {
      if (path === '/' || /\/index(\.html)?$/.test(path)) return 'home';
      if (/saved/.test(path)) return 'saved';
      if (/coupons|deals/.test(path)) return 'deals';
      if (/search/.test(path)) return 'search';
      return '';
    }
    var active = activeKey();
    var ICON = {
      home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>',
      cats:'<svg viewBox="0 0 24 24"><path d="M3 5h18M3 12h18M3 19h18"/></svg>',
      search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
      saved:'<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
      deals:'<svg viewBox="0 0 24 24"><path d="M6 2h12l-1 7H7L6 2zM4 9h16l-1 13H5L4 9z"/></svg>'
    };
    function a(key, href, label, icon, badge) {
      var on = active === key ? ' class="on"' : '';
      return '<a href="' + href + '"' + on + ' data-key="' + key + '" aria-label="' + label + '">' + icon + label + (badge ? '<span class="botnav-saved-badge"></span>' : '') + '</a>';
    }
    var nav = document.createElement('nav');
    nav.className = 'botnav';
    nav.setAttribute('aria-label', 'Quick navigation');
    nav.innerHTML =
      a('home','/','Home',ICON.home,false) +
      '<a href="#" data-key="cats" aria-label="Categories">' + ICON.cats + 'Categories</a>' +
      a('search','/pages/search','Search',ICON.search,false) +
      a('saved','/pages/saved','Saved',ICON.saved,true) +
      a('deals','/pages/coupons','Coupons',ICON.deals,false);
    document.body.appendChild(nav);

    var catBtn = nav.querySelector('[data-key="cats"]');
    if (catBtn) catBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var burger = document.querySelector('.nav-burger');
      if (burger) { burger.click(); return; }
      var drawer = document.getElementById('mmDrawer');
      if (drawer) drawer.style.transform = 'translateX(0)';
    });

    function paintBadge() {
      var n = 0;
      try { n = (JSON.parse(localStorage.getItem('ftw_saved') || '[]')).length; } catch (e) {}
      document.querySelectorAll('.botnav-saved-badge').forEach(function (b) {
        if (n > 0) { b.textContent = n > 99 ? '99+' : n; b.style.display = 'flex'; }
        else { b.style.display = 'none'; }
      });
    }
    paintBadge();
    window.addEventListener('storage', function (e) { if (e.key === 'ftw_saved') paintBadge(); });
    window.FTWBotnavBadge = paintBadge;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

/* ===== Site-wide wishlist helper (so hearts work on every page) ===== */
(function () {
  if (window.FTWWish) return; // homepage's home-v2.js already defined it
  var WISH_KEY = 'ftw_saved';
  function wishGet() { try { return JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); } catch (e) { return []; } }
  function wishHas(id) { return wishGet().some(function (x) { return x.id === id; }); }
  function updateWishBadges() {
    var n = wishGet().length;
    document.querySelectorAll('.botnav-saved-badge').forEach(function (b) {
      if (n > 0) { b.textContent = n > 99 ? '99+' : n; b.style.display = 'flex'; }
      else { b.style.display = 'none'; }
    });
  }
  function wishToggle(item) {
    var list = wishGet(); var i = list.findIndex(function (x) { return x.id === item.id; });
    if (i > -1) { list.splice(i, 1); } else { list.unshift(item); }
    try { localStorage.setItem(WISH_KEY, JSON.stringify(list.slice(0, 200))); } catch (e) {}
    updateWishBadges();
    return i === -1;
  }
  window.FTWWish = { get: wishGet, has: wishHas, toggle: wishToggle, key: function (p) { return (p.id || p.url || p.name || '').toString(); } };

  // Mark already-saved hearts (idempotent; only touches hearts not yet marked)
  function paintHearts() {
    document.querySelectorAll('.card-heart[data-wid]:not(.checked)').forEach(function (h) {
      h.classList.add('checked');
      if (wishHas(h.getAttribute('data-wid'))) h.classList.add('on');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ paintHearts(); updateWishBadges(); });
  else { paintHearts(); updateWishBadges(); }
  // Re-paint after async product loads, on a gentle timer (no MutationObserver
  // loop — products render after fetch, so a few polls catch them safely).
  var _tries = 0;
  var _iv = setInterval(function () {
    paintHearts();
    if (++_tries >= 10) clearInterval(_iv);   // ~5s of polling then stop
  }, 500);
})();
