/**
 * ============================================================
 * FashionToWorld — Modern Product Filter (shared by category pages)
 * ============================================================
 * Reads window.FILTER_CONFIG = { category, gender } and renders a
 * dynamic sidebar (price slider, searchable multi-select brands,
 * on-sale toggle, active-filter pills) + a toolbar (live count, sort,
 * mobile Filters button). Filters apply INSTANTLY — no Apply button.
 * Talks to AdmitadAPI.getProducts(); products render with the existing
 * outbound affiliate card. Subcategory buttons in the page keep working
 * (this module defines window.loadSub / loadSale / loadMore).
 * ============================================================
 */
(function () {
  var cfg = window.FILTER_CONFIG || {};
  var CATEGORY = cfg.category || '';
  var GENDER = cfg.gender || '';
  var API = window.AdmitadAPI;
  var PRICE_CAP = 1000;

  var grid = document.getElementById('productsGrid');
  var countEl = document.getElementById('productsCount');
  var moreBtn = document.getElementById('loadMoreBtn');
  var sidebar = document.getElementById('filterSidebar') || document.querySelector('.sidebar');
  var toolbar = document.querySelector('.products-toolbar');
  if (!API || !grid || !sidebar) return;

  var state = {
    sub: '', sale: false, brands: new Set(), advertiser: '', colors: new Set(), sizes: new Set(),
    minp: '', maxp: '', sort: 'popularity', page: 1
  };

  (function () {
    var q = new URLSearchParams(location.search);
    if (q.get('brand')) state.brands.add(q.get('brand'));
    if (q.get('advertiser')) state.advertiser = q.get('advertiser');
    if (q.get('cat')) state.sub = q.get('cat');
    if (q.get('sale')) state.sale = true;
    if (q.get('minprice')) state.minp = q.get('minprice');
    if (q.get('maxprice')) state.maxp = q.get('maxprice');
  })();

  // ---------- sidebar markup ----------
  sidebar.classList.add('mf-sidebar');
  sidebar.innerHTML =
    '<div class="mf-block mf-active-block" id="mfActiveBlock" style="display:none">' +
      '<div class="mf-head">Active filters <button class="mf-clear" id="mfClear">Clear all</button></div>' +
      '<div class="mf-pills" id="mfPills"></div>' +
    '</div>' +
    '<div class="mf-block">' +
      '<div class="mf-head">Price</div>' +
      '<div class="mf-range"><div class="mf-track"></div><div class="mf-fill" id="mfFill"></div>' +
        '<input type="range" id="mfMinR" min="0" max="' + PRICE_CAP + '" value="0">' +
        '<input type="range" id="mfMaxR" min="0" max="' + PRICE_CAP + '" value="' + PRICE_CAP + '"></div>' +
      '<div class="mf-price"><input type="number" id="mfMinN" placeholder="Min"><span>&#8211;</span><input type="number" id="mfMaxN" placeholder="Max"></div>' +
    '</div>' +
    '<div class="mf-block">' +
      '<div class="mf-head">Brand</div>' +
      '<input type="text" class="mf-search" id="mfBrandSearch" placeholder="Search brands\u2026">' +
      '<div class="mf-opts" id="mfBrands"><p class="mf-muted">Loading brands\u2026</p></div>' +
    '</div>' +
    '<div class="mf-block" id="mfColorBlock" style="display:none">' +
      '<div class="mf-head">Colour</div>' +
      '<div class="mf-swatches" id="mfColors"></div>' +
    '</div>' +
    '<div class="mf-block" id="mfSizeBlock" style="display:none">' +
      '<div class="mf-head">Size</div>' +
      '<div class="mf-sizes" id="mfSizes"></div>' +
    '</div>' +
    '<div class="mf-block">' +
      '<label class="mf-toggle" id="mfSale"><span>On sale only</span><span class="mf-tg"></span></label>' +
    '</div>';

  // ---------- toolbar (count + sort + mobile filters btn) ----------
  if (toolbar) {
    toolbar.innerHTML =
      '<button class="mf-filterbtn" id="mfOpen"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M7 12h10M10 18h4"/></svg> Filters</button>' +
      '<span id="productsCount">Loading\u2026</span>' +
      '<div class="mf-sortwrap">Sort <select id="mfSort" class="sort-select">' +
        '<option value="popularity">Featured</option>' +
        '<option value="price_asc">Price: Low \u2192 High</option>' +
        '<option value="price_desc">Price: High \u2192 Low</option>' +
        '<option value="discount">Biggest Discount</option>' +
      '</select></div>';
    countEl = document.getElementById('productsCount');
  }

  // re-query elements we just created
  var minR = document.getElementById('mfMinR'), maxR = document.getElementById('mfMaxR');
  var minN = document.getElementById('mfMinN'), maxN = document.getElementById('mfMaxN');
  var fill = document.getElementById('mfFill');
  var saleTg = document.getElementById('mfSale');
  var brandBox = document.getElementById('mfBrands');
  var brandSearch = document.getElementById('mfBrandSearch');
  var pillsBox = document.getElementById('mfPills');
  var activeBlock = document.getElementById('mfActiveBlock');
  var sortSel = document.getElementById('mfSort');
  var colorBox = document.getElementById('mfColors');
  var sizeBox = document.getElementById('mfSizes');
  var colorBlock = document.getElementById('mfColorBlock');
  var sizeBlock = document.getElementById('mfSizeBlock');
  function escA(s){return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function colorHex(name){var m={black:'#222',white:'#efe9da',grey:'#9a9a9a',gray:'#9a9a9a',red:'#b23b3b',blue:'#3b5b9b',navy:'#243b66',green:'#3b7d5b',beige:'#d8c5a8',brown:'#6b4a2f',pink:'#d98fb0',purple:'#7d5ba6',gold:'#c9a84c',silver:'#c8c8c8',yellow:'#e3c34a',orange:'#d98841',cream:'#efe9d8',tan:'#c8a97a'};var k=(name||'').toLowerCase().trim();if(m[k])return m[k];var hit=Object.keys(m).filter(function(x){return k.indexOf(x)>-1;})[0];return hit?m[hit]:'#bbb';}
  function renderColors(cols){if(!colorBox||!cols.length)return;colorBlock.style.display='';colorBox.innerHTML=cols.map(function(c){return '<button class="mf-sw'+(state.colors.has(c)?' on':'')+'" data-c="'+escA(c)+'" title="'+escA(c)+'" style="background:'+colorHex(c)+'"></button>';}).join('');colorBox.querySelectorAll('.mf-sw').forEach(function(b){b.onclick=function(){var c=b.getAttribute('data-c');if(state.colors.has(c)){state.colors.delete(c);b.classList.remove('on');}else{state.colors.add(c);b.classList.add('on');}load(true);};});}
  function renderSizes(szs){if(!sizeBox||!szs.length)return;sizeBlock.style.display='';sizeBox.innerHTML=szs.map(function(s){return '<button class="mf-size'+(state.sizes.has(s)?' on':'')+'" data-s="'+escA(s)+'">'+escA(s)+'</button>';}).join('');sizeBox.querySelectorAll('.mf-size').forEach(function(b){b.onclick=function(){var s=b.getAttribute('data-s');if(state.sizes.has(s)){state.sizes.delete(s);b.classList.remove('on');}else{state.sizes.add(s);b.classList.add('on');}load(true);};});}

  if (state.sale) saleTg.classList.add('on');
  if (state.minp) { minR.value = state.minp; minN.value = state.minp; }
  if (state.maxp) { maxR.value = state.maxp; maxN.value = state.maxp; }
  paintRange();

  // ---------- helpers ----------
  function paintRange() {
    var lo = +minR.value, hi = +maxR.value;
    fill.style.left = (lo / PRICE_CAP * 100) + '%';
    fill.style.right = (100 - hi / PRICE_CAP * 100) + '%';
  }
  var debTimer;
  function debounced() { clearTimeout(debTimer); debTimer = setTimeout(function () { load(true); }, 350); }

  function syncRange(src) {
    if (+minR.value > +maxR.value - 10) { if (src === 'min') minR.value = maxR.value - 10; else maxR.value = +minR.value + 10; }
    minN.value = minR.value; maxN.value = maxR.value;
    state.minp = (+minR.value > 0) ? minR.value : '';
    state.maxp = (+maxR.value < PRICE_CAP) ? maxR.value : '';
    paintRange(); debounced();
  }
  minR.oninput = function () { syncRange('min'); };
  maxR.oninput = function () { syncRange('max'); };
  minN.onchange = function () { minR.value = this.value || 0; syncRange('min'); };
  maxN.onchange = function () { maxR.value = this.value || PRICE_CAP; syncRange('max'); };

  saleTg.onclick = function () { state.sale = !state.sale; saleTg.classList.toggle('on', state.sale); load(true); };
  if (sortSel) sortSel.onchange = function () { state.sort = this.value; load(true); };
  brandSearch.oninput = function () { renderBrands(this.value); };
  document.getElementById('mfClear').onclick = function () {
    state.sub = ''; state.sale = false; state.brands.clear(); state.advertiser = ''; state.colors.clear(); state.sizes.clear();
    state.minp = ''; state.maxp = '';
    minR.value = 0; maxR.value = PRICE_CAP; minN.value = ''; maxN.value = ''; paintRange();
    saleTg.classList.remove('on');
    if (colorBox) colorBox.querySelectorAll('.on').forEach(function (x) { x.classList.remove('on'); });
    if (sizeBox) sizeBox.querySelectorAll('.on').forEach(function (x) { x.classList.remove('on'); });
    document.querySelectorAll('.subcat-btn').forEach(function (b, idx) { b.classList.toggle('active', idx === 0); });
    renderBrands(brandSearch.value);
    load(true);
  };

  // ---------- brands (distinct for this category) ----------
  var allBrands = [];
  async function loadBrands() {
    try {
      var data = await API.getProducts({ category: CATEGORY, gender: GENDER, limit: 100, sort: 'popularity' });
      allBrands = [].concat.apply([], (data && data.products ? data.products : []).map(function (p) { return p.brand ? [p.brand] : []; }));
      allBrands = Array.from(new Set(allBrands)).sort();
      renderBrands('');
      var prods = (data && data.products) ? data.products : [];
      var cols = Array.from(new Set(prods.map(function (x) { return (x.color || '').trim(); }).filter(Boolean))).slice(0, 14);
      var szs = Array.from(new Set(prods.map(function (x) { return (x.size || '').trim(); }).filter(Boolean))).slice(0, 14);
      renderColors(cols); renderSizes(szs);
    } catch (e) { brandBox.innerHTML = '<p class="mf-muted">\u2014</p>'; }
  }
  function renderBrands(q) {
    var list = allBrands.filter(function (b) { return !q || b.toLowerCase().indexOf(q.toLowerCase()) > -1; });
    // keep any selected brands visible even if not in the sample
    state.brands.forEach(function (b) { if (list.indexOf(b) < 0 && (!q || b.toLowerCase().indexOf(q.toLowerCase()) > -1)) list.unshift(b); });
    if (!list.length) { brandBox.innerHTML = '<p class="mf-muted">No brands match.</p>'; return; }
    brandBox.innerHTML = list.map(function (b) {
      var id = 'b_' + b.replace(/[^a-z0-9]/gi, '');
      return '<label class="mf-opt"><input type="checkbox" id="' + id + '" ' + (state.brands.has(b) ? 'checked' : '') + '> ' +
        '<span>' + b.replace(/</g, '&lt;') + '</span></label>';
    }).join('');
    list.forEach(function (b) {
      var id = 'b_' + b.replace(/[^a-z0-9]/gi, '');
      var el = document.getElementById(id);
      if (el) el.onchange = function () { this.checked ? state.brands.add(b) : state.brands.delete(b); load(true); };
    });
  }

  // ---------- active pills ----------
  function renderPills() {
    var items = [];
    if (state.sub) items.push(['Category', state.sub, function () { state.sub = ''; document.querySelectorAll('.subcat-btn').forEach(function (b, idx) { b.classList.toggle('active', idx === 0); }); }]);
    state.brands.forEach(function (b) { items.push(['Brand', b, function () { state.brands.delete(b); renderBrands(brandSearch.value); }]); });
    state.colors.forEach(function (c) { items.push(['Colour', c, function () { state.colors.delete(c); var x = colorBox && colorBox.querySelector('[data-c="' + c + '"]'); if (x) x.classList.remove('on'); }]); });
    state.sizes.forEach(function (s) { items.push(['Size', s, function () { state.sizes.delete(s); var x = sizeBox && sizeBox.querySelector('[data-s="' + s + '"]'); if (x) x.classList.remove('on'); }]); });
    if (state.advertiser) items.push(['Store', state.advertiser, function () { state.advertiser = ''; }]);
    if (state.sale) items.push(['', 'On sale', function () { state.sale = false; saleTg.classList.remove('on'); }]);
    if (state.minp || state.maxp) items.push(['Price', '$' + (state.minp || 0) + '\u2013$' + (state.maxp || PRICE_CAP + '+'), function () { state.minp = ''; state.maxp = ''; minR.value = 0; maxR.value = PRICE_CAP; minN.value = ''; maxN.value = ''; paintRange(); }]);
    if (!items.length) { activeBlock.style.display = 'none'; return; }
    activeBlock.style.display = '';
    pillsBox.innerHTML = '';
    items.forEach(function (it) {
      var pill = document.createElement('button');
      pill.className = 'mf-pill';
      pill.innerHTML = (it[0] ? '<b>' + it[0] + ':</b> ' : '') + it[1] + ' <span>&times;</span>';
      pill.onclick = function () { it[2](); load(true); };
      pillsBox.appendChild(pill);
    });
  }

  // ---------- fetch + render ----------
  async function load(reset) {
    if (reset) { grid.innerHTML = '<div class="loading-skeleton"></div>'.repeat(8); state.page = 1; }
    renderPills();
    var data = await API.getProducts({
      category: CATEGORY, gender: GENDER, subcategory: state.sub,
      brand: Array.from(state.brands).join(','), advertiser: state.advertiser,
      color: Array.from(state.colors).join(','), size: Array.from(state.sizes).join(','),
      sale: state.sale ? 'true' : '', minprice: state.minp, maxprice: state.maxp,
      page: state.page, limit: 24, sort: state.sort
    });
    var products = (data && data.products) || [];
    var total = (data && data.total) || 0;
    if (countEl) countEl.textContent = total.toLocaleString() + ' products';
    if (!products.length && reset) {
      grid.innerHTML = '<div class="empty-state"><p>No products match these filters. Try widening the price range or clearing a brand.</p></div>';
      if (moreBtn) moreBtn.style.display = 'none';
      return;
    }
    var html = products.map(API.renderProductCard).join('');
    if (reset) grid.innerHTML = html; else grid.insertAdjacentHTML('beforeend', html);
    if (moreBtn) moreBtn.style.display = products.length < 24 ? 'none' : 'block';
  }

  // ---------- globals for the existing subcategory buttons ----------
  window.loadSub = function (sub, btn) {
    document.querySelectorAll('.subcat-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    state.sub = sub; state.sale = false; saleTg.classList.remove('on');
    load(true);
  };
  window.loadSale = function (btn) {
    document.querySelectorAll('.subcat-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    state.sale = true; state.sub = ''; saleTg.classList.add('on');
    load(true);
  };
  window.loadMore = function () { state.page++; load(false); };
  window.setSort = function (s) { state.sort = s; if (sortSel) sortSel.value = s; load(true); };
  window.applyFilters = function () { load(true); };

  // ---------- mobile drawer ----------
  var openBtn = document.getElementById('mfOpen');
  if (openBtn) {
    var backdrop = document.createElement('div'); backdrop.className = 'mf-backdrop';
    document.body.appendChild(backdrop);
    var closer = document.createElement('button'); closer.className = 'mf-close'; closer.innerHTML = 'Done';
    sidebar.insertBefore(closer, sidebar.firstChild);
    function openD() { sidebar.classList.add('open'); backdrop.classList.add('open'); }
    function closeD() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
    openBtn.onclick = openD; backdrop.onclick = closeD; closer.onclick = closeD;
  }

  // collapsible facets (modern, no long scroll): tap a heading to open/close
  sidebar.querySelectorAll('.mf-block').forEach(function (block) {
    var head = block.querySelector('.mf-head');
    if (!head || head.querySelector('.mf-clear')) return; // skip the Active-filters block
    block.classList.add('mf-collapsible');
    head.insertAdjacentHTML('beforeend', '<span class="mf-chev">\u25be</span>');
    head.addEventListener('click', function (e) { if (e.target.closest('.mf-clear')) return; block.classList.toggle('collapsed'); });
  });
  if (colorBlock) colorBlock.classList.add('collapsed');
  if (sizeBlock) sizeBlock.classList.add('collapsed');

  // init
  load(true);
  loadBrands();
  if (API.populateRecommendations) {
    API.populateRecommendations('recommendGrid', { category: CATEGORY, limit: 4, sectionId: 'recommendSection' });
  }
})();
