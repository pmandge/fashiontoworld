/**
 * ============================================================
 * FashionToWorld — Shared Footer
 * ============================================================
 * Injects an identical footer on every page so styling and
 * links stay consistent. Replaces any existing <footer>.
 * Path-aware so links work from / and /pages/.
 * ============================================================
 */
(function () {
  var inPages = location.pathname.includes('/pages/');
  var P = inPages ? '' : 'pages/';
  var HOME = inPages ? '../index.html' : 'index.html';

  var html =
    '<div class="container">' +
      '<div class="footer-grid">' +
        '<div class="footer-brand">' +
          '<a href="' + HOME + '" class="logo">' +
            '<span class="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></span>' +
            '<span class="logo-fw">Fashion</span><span class="logo-to">to</span><span class="logo-w">World</span>' +
          '</a>' +
          '<p>Your global destination for fashion discovery. We connect you with the world\'s best brands and exclusive deals — delivered worldwide.</p>' +
          '<div class="footer-social">' +
            '<a href="#" aria-label="Instagram">IG</a>' +
            '<a href="#" aria-label="Pinterest">PT</a>' +
            '<a href="#" aria-label="TikTok">TK</a>' +
            '<a href="#" aria-label="YouTube">YT</a>' +
          '</div>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>Shop</h4>' +
          '<ul>' +
            '<li><a href="' + P + 'women.html">Women</a></li>' +
            '<li><a href="' + P + 'men.html">Men</a></li>' +
            '<li><a href="' + P + 'shoes.html">Shoes</a></li>' +
            '<li><a href="' + P + 'bags.html">Bags</a></li>' +
            '<li><a href="' + P + 'jewellery.html">Jewellery &amp; Watches</a></li>' +
            '<li><a href="' + P + 'accessories.html">Accessories</a></li>' +
            '<li><a href="' + P + 'deals.html">Sales &amp; Deals</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>Brands</h4>' +
          '<ul>' +
            '<li><a href="' + P + 'brands.html">All Brands</a></li>' +
            '<li><a href="' + P + 'brands.html?tier=luxury">Luxury</a></li>' +
            '<li><a href="' + P + 'brands.html?tier=premium">Premium</a></li>' +
            '<li><a href="' + P + 'brands.html?tier=highstreet">High Street</a></li>' +
            '<li><a href="' + P + 'brands.html?tier=sport">Sport &amp; Active</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>Company</h4>' +
          '<ul>' +
            '<li><a href="' + P + 'about.html">About Us</a></li>' +
            '<li><a href="' + P + 'blog.html">Style Blog</a></li>' +
            '<li><a href="' + P + 'contact.html">Contact</a></li>' +
            '<li><a href="' + P + 'affiliate-disclosure.html">Affiliate Disclosure</a></li>' +
            '<li><a href="' + P + 'privacy.html">Privacy Policy</a></li>' +
            '<li><a href="' + P + 'terms.html">Terms of Use</a></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<p>© 2025 FashionToWorld. All rights reserved. This site contains affiliate links. We may earn a commission when you purchase through our links at no extra cost to you.</p>' +
      '</div>' +
    '</div>';

  function inject() {
    var footer = document.querySelector('footer.footer');
    if (!footer) {
      footer = document.createElement('footer');
      footer.className = 'footer';
      document.body.appendChild(footer);
    }
    footer.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
