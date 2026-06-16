/**
 * ============================================================
 * FashionToWorld — Internationalization (i18n)
 * ============================================================
 * - Detects visitor country via IP (free ipapi.co lookup, with
 *   fallback to the backend /api/geo which reads CDN headers)
 * - Auto-selects language based on country
 * - Translates all elements marked with data-i18n
 * - Renders a language switcher; choice is saved to localStorage
 *   AND a cookie so the backend can serve region-matched coupons
 * - Sets <html dir="rtl"> for Arabic
 * ============================================================
 */

const I18N = (() => {

  const SUPPORTED = ['en', 'ar', 'de', 'fr', 'es', 'it', 'pt', 'ru'];
  const RTL = ['ar', 'he', 'fa', 'ur'];

  const COUNTRY_LANG = {
    AE: 'ar', SA: 'ar', EG: 'ar', QA: 'ar', KW: 'ar',
    US: 'en', GB: 'en', AU: 'en', CA: 'en', IN: 'en',
    DE: 'de', AT: 'de', FR: 'fr', ES: 'es', MX: 'es',
    IT: 'it', BR: 'pt', PT: 'pt', RU: 'ru',
  };

  // ─── TRANSLATIONS ──────────────────────────────────────────
  // Add keys as needed; missing keys fall back to English.
  const DICT = {
    en: {
      nav_women: 'Women', nav_men: 'Men', nav_brands: 'Brands',
      nav_deals: 'Deals', nav_blog: 'Style Blog', nav_cta: 'Coupons',
      hero_eyebrow: 'New Season · Global Delivery',
      hero_title_1: "The World's", hero_title_2: 'Best Fashion', hero_title_3: 'In One Place',
      hero_sub: '10,000+ products from 200+ premium brands. Curated collections, real-time deals, and worldwide shipping.',
      shop_women: 'Shop Women', shop_men: 'Shop Men',
      stat_brands: 'Brands', stat_products: 'Products', stat_countries: 'Countries',
      cat_heading: 'Find Your Style', cat_eyebrow: 'Shop by Category',
      trending_eyebrow: "What's Hot Right Now", trending_heading: 'Trending This Week',
      view_all: 'View All', shop_now: 'Shop Now',
      deals_eyebrow: 'Limited Time', deals_heading: 'Up to 60% Off Top Brands',
      see_deals: 'See All Deals', get_deal: 'Get Deal', copy: 'Copy', copied: 'Copied!',
      no_code: 'No code needed — applied automatically',
      newsletter_heading: 'Get Exclusive Deals First', subscribe: 'Subscribe',
      newsletter_email: 'Your email address',
      footer_shop: 'Shop', footer_brands: 'Brands', footer_company: 'Company',
      deals_for_country: 'Showing fashion deals for',
    },
    ar: {
      nav_women: 'نساء', nav_men: 'رجال', nav_brands: 'العلامات التجارية',
      nav_deals: 'العروض', nav_blog: 'مدونة الأناقة', nav_cta: 'تسوق العروض',
      hero_eyebrow: 'موسم جديد · توصيل عالمي',
      hero_title_1: 'أفضل أزياء', hero_title_2: 'في العالم', hero_title_3: 'في مكان واحد',
      hero_sub: 'أكثر من 10,000 منتج من أكثر من 200 علامة تجارية مميزة. مجموعات منسقة وعروض فورية وشحن عالمي.',
      shop_women: 'تسوق نساء', shop_men: 'تسوق رجال',
      stat_brands: 'علامة تجارية', stat_products: 'منتج', stat_countries: 'دولة',
      cat_heading: 'اكتشف أناقتك', cat_eyebrow: 'تسوق حسب الفئة',
      trending_eyebrow: 'الأكثر رواجاً الآن', trending_heading: 'رائج هذا الأسبوع',
      view_all: 'عرض الكل', shop_now: 'تسوق الآن',
      deals_eyebrow: 'لفترة محدودة', deals_heading: 'خصم حتى 60% على أفضل العلامات',
      see_deals: 'شاهد كل العروض', get_deal: 'احصل على العرض', copy: 'نسخ', copied: 'تم النسخ!',
      no_code: 'لا حاجة لرمز — يطبق تلقائياً',
      newsletter_heading: 'احصل على العروض الحصرية أولاً', subscribe: 'اشترك',
      newsletter_email: 'عنوان بريدك الإلكتروني',
      footer_shop: 'تسوق', footer_brands: 'العلامات', footer_company: 'الشركة',
      deals_for_country: 'عرض عروض الأزياء لـ',
    },
    de: {
      nav_women: 'Damen', nav_men: 'Herren', nav_brands: 'Marken',
      nav_deals: 'Angebote', nav_blog: 'Style-Blog', nav_cta: 'Angebote',
      hero_eyebrow: 'Neue Saison · Weltweiter Versand',
      hero_title_1: 'Die beste', hero_title_2: 'Mode der Welt', hero_title_3: 'an einem Ort',
      hero_sub: 'Über 10.000 Produkte von mehr als 200 Premium-Marken. Kuratierte Kollektionen und weltweiter Versand.',
      shop_women: 'Damen shoppen', shop_men: 'Herren shoppen',
      stat_brands: 'Marken', stat_products: 'Produkte', stat_countries: 'Länder',
      cat_heading: 'Finde deinen Stil', cat_eyebrow: 'Nach Kategorie',
      trending_eyebrow: 'Gerade angesagt', trending_heading: 'Diese Woche im Trend',
      view_all: 'Alle ansehen', shop_now: 'Jetzt shoppen',
      deals_eyebrow: 'Begrenzte Zeit', deals_heading: 'Bis zu 60% Rabatt',
      see_deals: 'Alle Angebote', get_deal: 'Angebot holen', copy: 'Kopieren', copied: 'Kopiert!',
      no_code: 'Kein Code nötig — automatisch angewendet',
      newsletter_heading: 'Exklusive Angebote zuerst', subscribe: 'Abonnieren',
      newsletter_email: 'Deine E-Mail-Adresse',
      footer_shop: 'Shop', footer_brands: 'Marken', footer_company: 'Unternehmen',
      deals_for_country: 'Mode-Angebote für',
    },
    fr: {
      nav_women: 'Femme', nav_men: 'Homme', nav_brands: 'Marques',
      nav_deals: 'Offres', nav_blog: 'Blog Mode', nav_cta: 'Offres',
      hero_eyebrow: 'Nouvelle Saison · Livraison Mondiale',
      hero_title_1: 'La meilleure', hero_title_2: 'mode du monde', hero_title_3: 'en un seul endroit',
      hero_sub: 'Plus de 10 000 produits de plus de 200 marques premium. Collections sélectionnées et livraison mondiale.',
      shop_women: 'Achat Femme', shop_men: 'Achat Homme',
      stat_brands: 'Marques', stat_products: 'Produits', stat_countries: 'Pays',
      cat_heading: 'Trouvez votre style', cat_eyebrow: 'Par catégorie',
      trending_eyebrow: 'Tendance maintenant', trending_heading: 'Tendances de la semaine',
      view_all: 'Voir tout', shop_now: 'Acheter',
      deals_eyebrow: 'Durée limitée', deals_heading: "Jusqu'à 60% de réduction",
      see_deals: 'Voir les offres', get_deal: "Obtenir l'offre", copy: 'Copier', copied: 'Copié !',
      no_code: 'Pas de code — appliqué automatiquement',
      newsletter_heading: "Offres exclusives en avant-première", subscribe: "S'abonner",
      newsletter_email: 'Votre adresse e-mail',
      footer_shop: 'Boutique', footer_brands: 'Marques', footer_company: 'Entreprise',
      deals_for_country: 'Offres mode pour',
    },
    es: {
      nav_women: 'Mujer', nav_men: 'Hombre', nav_brands: 'Marcas',
      nav_deals: 'Ofertas', nav_blog: 'Blog de Estilo', nav_cta: 'Ofertas',
      hero_eyebrow: 'Nueva Temporada · Envío Mundial',
      hero_title_1: 'La mejor moda', hero_title_2: 'del mundo', hero_title_3: 'en un solo lugar',
      hero_sub: 'Más de 10,000 productos de más de 200 marcas premium. Colecciones seleccionadas y envío mundial.',
      shop_women: 'Comprar Mujer', shop_men: 'Comprar Hombre',
      stat_brands: 'Marcas', stat_products: 'Productos', stat_countries: 'Países',
      cat_heading: 'Encuentra tu estilo', cat_eyebrow: 'Por categoría',
      trending_eyebrow: 'Lo más popular ahora', trending_heading: 'Tendencia esta semana',
      view_all: 'Ver todo', shop_now: 'Comprar',
      deals_eyebrow: 'Tiempo limitado', deals_heading: 'Hasta 60% de descuento',
      see_deals: 'Ver ofertas', get_deal: 'Obtener oferta', copy: 'Copiar', copied: '¡Copiado!',
      no_code: 'Sin código — aplicado automáticamente',
      newsletter_heading: 'Ofertas exclusivas primero', subscribe: 'Suscribirse',
      newsletter_email: 'Tu correo electrónico',
      footer_shop: 'Tienda', footer_brands: 'Marcas', footer_company: 'Empresa',
      deals_for_country: 'Ofertas de moda para',
    },
  };
  // it, pt, ru fall back to en until translated
  DICT.it = DICT.en; DICT.pt = DICT.en; DICT.ru = DICT.en;

  let currentLang = 'en';
  let currentRegion = 'US';

  const LANG_NAMES = {
    en: 'English', ar: 'العربية', de: 'Deutsch', fr: 'Français',
    es: 'Español', it: 'Italiano', pt: 'Português', ru: 'Русский',
  };

  // ─── DETECT COUNTRY VIA IP ─────────────────────────────────
  async function detectCountry() {
    // 1. Try our own backend (reads CDN country header — fastest, no 3rd party)
    try {
      const r = await fetch((window.API_BASE || '') + '/api/geo');
      if (r.ok) {
        const g = await r.json();
        if (g.region) return { region: g.region, language: g.language };
      }
    } catch (e) { /* backend not running, fall through */ }

    // 2. Fallback: free IP geolocation service
    try {
      const r = await fetch('https://ipapi.co/json/');
      if (r.ok) {
        const d = await r.json();
        return {
          region: d.country_code || 'US',
          language: COUNTRY_LANG[d.country_code] || 'en',
        };
      }
    } catch (e) { /* offline, fall through */ }

    // 3. Last resort: browser language
    const browserLang = (navigator.language || 'en').split('-')[0];
    return { region: 'US', language: SUPPORTED.includes(browserLang) ? browserLang : 'en' };
  }

  // ─── APPLY TRANSLATIONS ────────────────────────────────────
  function t(key) {
    return (DICT[currentLang] && DICT[currentLang][key]) || DICT.en[key] || key;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (el.hasAttribute('data-i18n-attr')) {
        el.setAttribute(el.getAttribute('data-i18n-attr'), val);
      } else {
        el.textContent = val;
      }
    });

    // RTL handling for Arabic
    const isRtl = RTL.includes(currentLang);
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLang);
  }

  // ─── LANGUAGE SWITCHER UI ──────────────────────────────────
  function renderSwitcher() {
    let el = document.getElementById('langSwitcher');
    if (!el) {
      el = document.createElement('div');
      el.id = 'langSwitcher';
      el.style.cssText = 'position:relative;display:inline-block';
      const actions = document.querySelector('.nav-actions');
      if (actions) actions.insertBefore(el, actions.firstChild);
    }

    el.innerHTML = `
      <button onclick="I18N.toggleMenu()" style="background:none;border:none;cursor:pointer;font-size:13px;color:#6b6b6b;display:flex;align-items:center;gap:6px;font-family:inherit">
        🌐 ${currentLang.toUpperCase()} ▾
      </button>
      <div id="langMenu" style="display:none;position:absolute;top:32px;right:0;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.12);min-width:140px;z-index:2000;overflow:hidden">
        ${SUPPORTED.map(l => `
          <a href="#" onclick="I18N.setLanguage('${l}');return false"
             style="display:block;padding:10px 16px;font-size:14px;color:${l === currentLang ? '#c9a84c' : '#1a1a1a'};text-decoration:none"
             onmouseover="this.style.background='#f5f2ec'" onmouseout="this.style.background='#fff'">
            ${LANG_NAMES[l]}
          </a>`).join('')}
      </div>`;
  }

  function toggleMenu() {
    const m = document.getElementById('langMenu');
    if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
  }

  function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) lang = 'en';
    currentLang = lang;
    localStorage.setItem('fw_lang', lang);
    document.cookie = `fw_lang=${lang};path=/;max-age=31536000`;
    applyTranslations();
    renderSwitcher();
    const m = document.getElementById('langMenu');
    if (m) m.style.display = 'none';
    // Reload feeds in new language/region
    if (window.AdmitadAPI?.initDatafeed) window.AdmitadAPI.initDatafeed();
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang, region: currentRegion } }));
  }

  // ─── INIT ──────────────────────────────────────────────────
  async function init() {
    // Saved preference wins over IP
    const saved = localStorage.getItem('fw_lang');
    if (saved && SUPPORTED.includes(saved)) {
      currentLang = saved;
      currentRegion = localStorage.getItem('fw_region') || 'US';
    } else {
      const geo = await detectCountry();
      currentRegion = geo.region;
      currentLang = SUPPORTED.includes(geo.language) ? geo.language : 'en';
      localStorage.setItem('fw_region', currentRegion);
      document.cookie = `fw_region=${currentRegion};path=/;max-age=31536000`;
    }

    applyTranslations();
    renderSwitcher();
    document.dispatchEvent(new CustomEvent('i18nready', { detail: { lang: currentLang, region: currentRegion } }));
  }

  return {
    init, setLanguage, toggleMenu, t,
    get lang() { return currentLang; },
    get region() { return currentRegion; },
  };
})();

window.I18N = I18N;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18N.init());
} else {
  I18N.init();
}
