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

  function catUrl(slug) {
    // Map top-level slugs to their landing pages (women/men exist; others reuse women.html with ?cat=)
    if (slug === 'women') return root + 'women.html';
    if (slug === 'men') return root + 'men.html';
    if (slug === 'deals') return root + 'deals.html';
    if (slug === 'brands') return root + 'brands.html';
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

    // Inline SVG icons per category slug
    var ICONS = {
      women: '<path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 9l-2 7h3l-1 6h4l-1-6h3L12 9"/>',
      men: '<path d="M6 3h12l-2 5 2 13H6l2-13z"/>',
      kids: '<circle cx="12" cy="5" r="2.5"/><path d="M8 9h8l-1 5h-2l1 7h-4l1-7H9z"/>',
      shoes: '<path d="M2 16h13l5 2h2v2H2zM2 10v6h4l-1-6z"/>',
      bags: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
      jewellery: '<path d="M12 3l4 5-4 13-4-13zM8 8h8"/>',
      accessories: '<circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 12h2"/>',
      beauty: '<path d="M12 2l2 6h-4zM10 8h4v6a2 2 0 0 1-4 0zM9 20h6"/>',
      luxury: '<path d="M3 8l4 10h10l4-10-5 4-4-6-4 6z"/>',
      sustainable: '<path d="M12 3C7 7 5 11 12 21 19 11 17 7 12 3z"/>',
    };

    var cats = '';
    for (var key in tax) {
      var c = tax[key];
      var icon = ICONS[c.slug] || '<circle cx="12" cy="12" r="9"/>';
      var groupsArr = Object.keys(c.subcategories).map(function (gk) { return c.subcategories[gk]; });
      var itemCount = groupsArr.reduce(function (n, g) { return n + g.items.length; }, 0);
      var groups = groupsArr.map(function (g) {
        var items = g.items.map(function (it) {
          return '<a href="' + catUrl(c.slug) + '" style="display:block;padding:6px 0;font-size:13px;color:#6b6b6b;text-decoration:none;transition:color .15s" onmouseover="this.style.color=\'#0f0f0f\'" onmouseout="this.style.color=\'#6b6b6b\'">' + it + '</a>';
        }).join('');
        return '<div style="margin:10px 0 6px"><div style="font-family:\'DM Sans\',sans-serif;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#c9a84c;margin-bottom:4px">' + g.label + '</div>' + items + '</div>';
      }).join('');

      cats +=
        '<details style="border-bottom:1px solid rgba(0,0,0,.07)">' +
          '<summary style="list-style:none;cursor:pointer;padding:16px 0;display:flex;align-items:center;gap:12px">' +
            '<span style="display:inline-flex;width:34px;height:34px;border-radius:50%;background:#f5f2ec;align-items:center;justify-content:center;flex-shrink:0">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c9a84c" stroke-width="1.4">' + icon + '</svg>' +
            '</span>' +
            '<span style="flex:1">' +
              '<a href="' + catUrl(c.slug) + '" style="font-family:Georgia,\'Cormorant Garamond\',serif;font-size:19px;font-weight:600;color:#0f0f0f;text-decoration:none;display:block;line-height:1.2">' + c.label + '</a>' +
            '</span>' +
            '<span style="color:#c9a84c;font-size:20px;font-weight:300;transition:transform .2s">+</span>' +
          '</summary>' +
          '<div style="padding:0 0 14px 46px">' + groups + '</div>' +
        '</details>';
    }

    drawer.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.1)">' +
        '<span style="font-family:Georgia,serif;font-size:20px;font-weight:600">Fashion<span style="font-size:9px;letter-spacing:2px;color:#c9a84c">TO</span><span style="color:#c9a84c">World</span></span>' +
        '<button id="mmClose" aria-label="Close menu" style="background:none;border:none;font-size:24px;cursor:pointer;color:#1a1a1a;line-height:1">&times;</button>' +
      '</div>' +
      '<div style="padding:8px 20px 20px">' +
        '<a href="' + root + 'deals.html" style="display:block;background:#c9a84c;color:#0f0f0f;text-align:center;padding:12px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;text-decoration:none;margin-bottom:8px">Shop Deals</a>' +
        '<button onclick="FTWSubscribe.open()" style="width:100%;background:#0f0f0f;color:#fafaf8;border:none;padding:12px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;margin-bottom:16px">Subscribe</button>' +
        cats +
        '<a href="' + root + 'brands.html" style="display:block;padding:14px 0;font-family:Georgia,serif;font-size:18px;color:#0f0f0f;text-decoration:none;border-bottom:1px solid rgba(0,0,0,.08)">All Brands</a>' +
        '<a href="' + root + 'blog.html" style="display:block;padding:14px 0;font-family:Georgia,serif;font-size:18px;color:#0f0f0f;text-decoration:none">Style Blog</a>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    drawer.querySelector('#mmClose').addEventListener('click', close);

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
      const email = document.getElementById('ftwSubEmail').value;
      // TODO: POST to your email provider (Mailchimp/SendGrid) here
      const box = document.querySelector('#ftwSubModal > div');
      box.innerHTML =
        '<div style="padding:20px 0"><div style="font-size:40px;margin-bottom:10px">✓</div>' +
        '<div style="font-family:Georgia,serif;font-size:24px;color:#0f0f0f;margin-bottom:6px">You\'re in!</div>' +
        '<p style="font-size:14px;color:#6b6b6b">Thanks for subscribing. Check your inbox for a welcome deal.</p>' +
        '<button onclick="FTWSubscribe.close()" style="margin-top:18px;padding:10px 28px;background:#0f0f0f;color:#fafaf8;border:none;border-radius:4px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;cursor:pointer">Done</button></div>';
      return false;
    },
  };
  window.FTWSubscribe = FTWSubscribe;

  function buildMegaMenus() {
    const tax = window.FASHION_TAXONOMY || {};
    document.querySelectorAll('.nav-links > li > a').forEach(function (link) {
      const label = link.textContent.trim().toLowerCase();
      let key = null;
      for (const k in tax) {
        if (tax[k].label.toLowerCase() === label) { key = k; break; }
      }
      if (!key) return;
      const c = tax[key];
      const li = link.parentElement;
      if (li.querySelector('.mega')) return;

      const groups = Object.values(c.subcategories);
      const mega = document.createElement('div');
      mega.className = 'mega';
      mega.style.setProperty('--mega-rows', Math.ceil(groups.length / 2));
      mega.innerHTML = groups.map(function (g) {
        const items = g.items.slice(0, 8).map(function (it) {
          return '<a href="' + catUrl(c.slug) + '">' + it + '</a>';
        }).join('');
        return '<div class="mega-group"><h5>' + g.label + '</h5>' + items + '</div>';
      }).join('');
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
