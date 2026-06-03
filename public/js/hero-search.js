/**
 * Hero live search — type-ahead suggestions powered by AdmitadAPI.getProducts({q}).
 * Shows up to 6 matching products in a dropdown (each links out to the retailer),
 * plus a "see all results" link. Enter or the Search button → full search page.
 */
(function () {
  function searchPath(q) { return '/pages/search.html?q=' + encodeURIComponent(q); }
  function esc(s) { return (s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function row(p) {
    var link = p.affiliate_url || p.url || '';
    var out = /^https?:/i.test(link);
    var href = out ? link : searchPath(p.name || '');
    var price = p.price_display || (p.price ? ('$' + p.price) : '');
    var img = p.image_url || '';
    return '<a class="ls-row" href="' + href + '"' + (out ? ' target="_blank" rel="sponsored nofollow noopener"' : '') + '>' +
      '<span class="ls-thumb" style="background-image:url(\'' + esc(img) + '\')"></span>' +
      '<span class="ls-info"><span class="ls-name">' + esc(p.name || '') + '</span>' +
      '<span class="ls-brand">' + esc(p.brand || p.advertiser_name || '') + '</span></span>' +
      '<span class="ls-price">' + esc(price) + '</span></a>';
  }

  function attach(input, dd) {
    if (!input || !dd) return;
    var timer;
    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 2) { dd.classList.remove('open'); dd.innerHTML = ''; return; }
      timer = setTimeout(function () {
        dd.innerHTML = '<div class="ls-loading">Searching\u2026</div>';
        dd.classList.add('open');
        AdmitadAPI.getProducts({ q: q, limit: 6, sort: 'popularity' }).then(function (data) {
          if (input.value.trim() !== q) return; // stale
          var items = (data && data.products) || [];
          if (!items.length) {
            dd.innerHTML = '<div class="ls-empty">No matches for \u201c' + esc(q) + '\u201d</div>';
            return;
          }
          dd.innerHTML = items.map(row).join('') +
            '<a class="ls-all" href="' + searchPath(q) + '">See all results for \u201c' + esc(q) + '\u201d \u2192</a>';
        }).catch(function () { dd.classList.remove('open'); });
      }, 280);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var q = input.value.trim(); if (q) location.href = searchPath(q); }
    });
  }

  function ensureDropdown(host) {
    var dd = host.querySelector('.ls-dropdown');
    if (!dd) { host.style.position = 'relative'; dd = document.createElement('div'); dd.className = 'ls-dropdown'; host.appendChild(dd); }
    return dd;
  }
  function init() {
    if (!window.AdmitadAPI) return;
    var hosts = document.querySelectorAll('.hero-search, .nav-search');
    hosts.forEach(function (host) {
      var input = host.querySelector('input'); if (!input) return;
      var dd = ensureDropdown(host);
      attach(input, dd);
      var btn = host.querySelector('button');
      if (btn) btn.onclick = function () { var q = input.value.trim(); if (q) location.href = searchPath(q); };
    });
    document.addEventListener('click', function (e) {
      document.querySelectorAll('.ls-dropdown.open').forEach(function (dd) {
        var host = dd.parentElement;
        if (host && !host.contains(e.target)) dd.classList.remove('open');
      });
    });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
