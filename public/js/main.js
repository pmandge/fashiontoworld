/**
 * FashionToWorld — Main JS
 * Navigation, search, utilities
 */

// ─── NAV SCROLL ──────────────────────────────────────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  });
}

// ─── SEARCH ──────────────────────────────────────────────────
function toggleSearch() {
  const bar = document.getElementById('searchBar');
  if (!bar) return;
  bar.classList.toggle('open');
  if (bar.classList.contains('open')) {
    setTimeout(() => document.getElementById('searchInput')?.focus(), 50);
  }
}

async function handleSearch(e) {
  if (e.key !== 'Enter') return;
  const q = e.target.value.trim();
  if (!q) return;
  window.location.href = `/pages/search.html?q=${encodeURIComponent(q)}`;
}

// ─── MOBILE MENU ─────────────────────────────────────────────
function toggleMenu() {
  const links = document.querySelector('.nav-links');
  if (!links) return;
  links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
  links.style.flexDirection = 'column';
  links.style.position = 'absolute';
  links.style.top = '72px';
  links.style.left = '0';
  links.style.right = '0';
  links.style.background = 'var(--white)';
  links.style.padding = '20px 40px';
  links.style.borderBottom = '1px solid var(--border)';
}

// ─── NEWSLETTER ──────────────────────────────────────────────
function handleNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const btn = e.target.querySelector('button');
  const email = input.value;

  // In production, POST to /api/newsletter with email
  btn.textContent = '✓ Subscribed!';
  btn.style.background = '#27ae60';
  input.value = '';
  input.placeholder = 'Thanks for subscribing!';
  setTimeout(() => {
    btn.textContent = 'Subscribe';
    btn.style.background = '';
    input.placeholder = 'Your email address';
  }, 4000);
}

// ─── INFINITE SCROLL HELPER ──────────────────────────────────
function setupInfiniteScroll(callback) {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) callback();
  }, { rootMargin: '300px' });

  const sentinel = document.getElementById('scrollSentinel');
  if (sentinel) observer.observe(sentinel);
}

// ─── LAZY IMAGES ─────────────────────────────────────────────
function initLazyImages() {
  const imgs = document.querySelectorAll('img[loading="lazy"]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.src = e.target.dataset.src || e.target.src;
          io.unobserve(e.target);
        }
      });
    });
    imgs.forEach(img => io.observe(img));
  }
}

// ─── SMOOTH ANCHOR SCROLL ────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ─── TRACKING PIXEL (Admitad re-attribution) ─────────────────
function loadAdmitadPixel(websiteId) {
  if (!websiteId) return;
  const s = document.createElement('script');
  s.src = `https://www.artfut.com/static/tagtag.min.js?campaign_code=${websiteId}`;
  s.async = true;
  document.head.appendChild(s);
  s.onerror = () => {
    // Fallback pixel
    const img = new Image();
    img.src = `https://ad.admitad.com/r?campaign_code=${websiteId}`;
  };
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLazyImages();
  // loadAdmitadPixel('YOUR_WEBSITE_ID'); // Uncomment after setup
});

// ─── APPLY EDITABLE SITE CONTENT ─────────────────────────────
// Reads window.SITE_CONTENT (from site-content.js) and applies
// text to any element with a data-content="path.to.value" attr.
(function applySiteContent() {
  function apply() {
    var C = window.SITE_CONTENT;
    if (!C) return;

    document.querySelectorAll('[data-content]').forEach(function (el) {
      var path = el.getAttribute('data-content');
      var val = path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, C);
      if (typeof val === 'string') el.textContent = val;
    });

    // Announcement bar
    if (C.announcement && !document.getElementById('announceBar')) {
      var bar = document.createElement('div');
      bar.id = 'announceBar';
      bar.textContent = C.announcement;
      bar.style.cssText = 'background:#0f0f0f;color:#f5f2ec;text-align:center;font-size:12px;letter-spacing:.04em;padding:8px 16px;font-family:var(--font-sans)';
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
