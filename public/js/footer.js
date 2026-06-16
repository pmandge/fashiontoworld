/**
 * Shared rich footer — injected identically on EVERY page (one source of truth).
 * Path-aware so links work from / and /pages/. Popular Brands use the real
 * brand filter (?brand=); Featured Stores use the advertiser filter (?advertiser=).
 */
(function () {
  var inPages = location.pathname.indexOf('/pages/') > -1;
  var P = inPages ? '' : 'pages/';
  var HOME = inPages ? '../index.html' : 'index.html';
  var SEARCH = P + 'search.html';
  var enc = encodeURIComponent;
  function link(href, label) { var ext = href.indexOf('go.html') !== -1 ? ' target="_blank" rel="noopener"' : ''; return '<a href="' + href + '"' + ext + '>' + label + '</a>'; }

  var stores = ['The Luxury Closet','Stylewe','AliExpress','Noracora','Justfashionnow','ChicMe','Glasseslit','Italo Jewelry','Wayrates','Symbol Fashion','Alibaba','Hacoo'];
  var brands = ['Valentino','Prada','Balenciaga','Max Mara','Bottega Veneta','Jimmy Choo','Balmain','Dolce & Gabbana','The Row','Brunello Cucinelli'];

  var shopLinks = link(P+'women.html','Women')+link(P+'men.html','Men')+link(P+'kids.html','Kids')+link(P+'shoes.html','Shoes')+link(P+'bags.html','Bags')+link(SEARCH+'?q=watch','Watches')+link(P+'jewellery.html','Jewellery')+link(P+'accessories.html','Accessories')+link(P+'beauty.html','Beauty');
  var storeLinks = stores.map(function(s){return link(P+'go.html?store='+enc(s), s);}).join('');
  var brandLinks = brands.map(function(b){return link(P+'go.html?brand='+enc(b), b);}).join('');
  var editLinks = link(SEARCH+'?q='+enc('swimwear'),'Vacation')+link(SEARCH+'?q='+enc('occasion dress'),'Wedding Guest')+link(SEARCH+'?q='+enc('tailored blazer'),'Workwear')+link(SEARCH+'?q='+enc('evening dress'),'Date Night')+link(SEARCH+'?q='+enc('activewear'),'Athleisure')+link(SEARCH+'?maxprice=50','Under $50')+link(SEARCH+'?sale=true','On Sale')+link(P+'coupons.html','Coupons')+link(SEARCH+'?markdown=true&sort=discount','All Deals')+link(P+'women.html','New In');
  var companyLinks = link(P+'about.html','About Us')+link(P+'blog.html','Style Blog')+link(P+'contact.html','Contact')+link(P+'affiliate-disclosure.html','Affiliate Disclosure')+link(P+'privacy.html','Privacy Policy')+link(P+'terms.html','Terms');

  var html = '<div class="container">' +
    '<div class="mega-foot">' +
      '<div class="foot-col brand-col">' +
        '<a href="' + HOME + '" class="logo" style="color:#fff;font-family:var(--font-serif);font-size:22px;display:inline-block;text-decoration:none">Fashion <span style="color:#c9a84c;font-style:italic;font-size:15px">to</span> World</a>' +
        '<p>Curated, worldwide-shipping fashion from trusted stores \u2014 verified deals, updated daily, priced in your currency.</p>' +
      '</div>' +
      '<div class="foot-col"><h4>Shop</h4>' + shopLinks + '</div>' +
      '<div class="foot-col"><h4>Featured Stores</h4>' + storeLinks + '</div>' +
      '<div class="foot-col"><h4>Popular Brands</h4><span id="footBrands">' + brandLinks + '</span></div>' +
      '<div class="foot-col"><h4>Shop the Edit</h4>' + editLinks + '</div>' +
      '<div class="foot-col"><h4>Company</h4>' + companyLinks + '</div>' +
    '</div>' +
    '<div class="foot-disclosure"><b>Affiliate disclosure:</b> Fashion to World is an affiliate website. Links to retailers are affiliate links, which means we may earn a commission if you make a purchase \u2014 at no extra cost to you. Prices and availability are set by the retailer and verified daily, but may change. We are not the seller; purchases complete on the retailer&#39;s own site.</div>' +
  '</div>';

  function loadTopBrands() {
    try {
      var base = window.API_BASE || '';
      fetch(base + '/api/brands/top?limit=12')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (list) {
          if (!list || !list.length) return;
          var el = document.getElementById('footBrands'); if (!el) return;
          el.innerHTML = list.map(function (b) { return link(P + 'go.html?brand=' + enc(b.name), b.name); }).join('');
        }).catch(function () {});
    } catch (e) {}
  }
  function inject() {
    var footer = document.querySelector('footer.footer');
    if (!footer) { footer = document.createElement('footer'); footer.className = 'footer'; document.body.appendChild(footer); }
    footer.innerHTML = html;
    loadTopBrands();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
