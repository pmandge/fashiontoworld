/**
 * cookie-consent.js — lightweight GDPR-style consent banner.
 * Buttons: Accept all · Reject all · Manage (Analytics / Marketing toggles;
 * Necessary is always on). Choice saved to localStorage for 6 months.
 * Other scripts can react via:  window.addEventListener('ftwconsent', e => e.detail)
 * or check  window.ftwConsent.accepted('analytics').  Footer link can call
 * window.ftwConsent.reopen() to let users change their mind.
 */
(function () {
  var KEY = 'ftw_consent_v1';
  function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function apply(p) {
    window.ftwConsentState = p;
    try { window.dispatchEvent(new CustomEvent('ftwconsent', { detail: p })); } catch (e) {}
    // HOOK: load analytics / marketing tags here when allowed, e.g.
    //   if (p.analytics) { /* inject GA/GTM */ }
    //   if (p.marketing) { /* inject ad/retargeting pixels */ }
  }
  function save(p) {
    p.ts = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
    document.cookie = 'ftw_consent=1; path=/; max-age=15552000; samesite=lax';
    apply(p); hide();
  }

  function injectStyles() {
    if (document.getElementById('ftw-cc-style')) return;
    var s = document.createElement('style'); s.id = 'ftw-cc-style';
    s.textContent =
      ".ftw-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:14px;box-shadow:0 16px 50px rgba(0,0,0,.22);max-width:680px;margin:0 auto;font-family:'DM Sans',system-ui,sans-serif;animation:ftwccup .4s ease}" +
      "@keyframes ftwccup{from{transform:translateY(22px);opacity:0}to{transform:none;opacity:1}}" +
      ".ftw-cc-inner{padding:18px 20px}" +
      ".ftw-cc h4{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:21px;color:#1a1410;margin:0}" +
      ".ftw-cc p{font-size:13px;line-height:1.55;color:#6b6b6b;margin:6px 0 0}" +
      ".ftw-cc p a{color:#a8862f}" +
      ".ftw-cc-prefs{display:flex;flex-wrap:wrap;gap:16px;margin:14px 0 2px}" +
      ".ftw-cc-prefs label{display:flex;align-items:center;gap:8px;font-size:13px;color:#1a1410;cursor:pointer}" +
      ".ftw-cc-prefs input{width:16px;height:16px;accent-color:#c9a84c}" +
      ".ftw-cc-prefs small{color:#9a9085}" +
      ".ftw-cc-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}" +
      ".ftw-cc-btn{font-family:inherit;font-size:13px;font-weight:500;padding:10px 18px;border-radius:30px;cursor:pointer;border:1px solid #1a1410;background:#fff;color:#1a1410;transition:.15s}" +
      ".ftw-cc-btn.ghost:hover{background:#f5f2ec}" +
      ".ftw-cc-btn.solid{background:#c0492f;border-color:#c0492f;color:#fff}" +
      ".ftw-cc-btn.solid:hover{background:#9e3a24}" +
      "@media(max-width:560px){.ftw-cc-actions{justify-content:stretch}.ftw-cc-btn{flex:1 1 auto}}";
    document.head.appendChild(s);
  }

  var el = null;
  function build() {
    injectStyles();
    el = document.createElement('div');
    el.className = 'ftw-cc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Cookie consent');
    el.innerHTML =
      '<div class="ftw-cc-inner">' +
        '<h4>We value your privacy</h4>' +
        '<p>We use cookies to run the site, understand traffic and improve your experience. You can accept all, reject non-essential, or choose. See our <a href="/pages/privacy.html">Privacy Policy</a>.</p>' +
        '<div class="ftw-cc-prefs" id="ftwCcPrefs" style="display:none">' +
          '<label><input type="checkbox" checked disabled> Necessary <small>Always on</small></label>' +
          '<label><input type="checkbox" id="ftwAnalytics"> Analytics</label>' +
          '<label><input type="checkbox" id="ftwMarketing"> Marketing</label>' +
        '</div>' +
        '<div class="ftw-cc-actions">' +
          '<button class="ftw-cc-btn ghost" id="ftwManage">Manage</button>' +
          '<button class="ftw-cc-btn ghost" id="ftwReject">Reject all</button>' +
          '<button class="ftw-cc-btn solid" id="ftwAccept">Accept all</button>' +
          '<button class="ftw-cc-btn solid" id="ftwSave" style="display:none">Save preferences</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    var prefs = el.querySelector('#ftwCcPrefs');
    var manage = el.querySelector('#ftwManage');
    var save_ = el.querySelector('#ftwSave');
    var accept = el.querySelector('#ftwAccept');
    manage.onclick = function () {
      var open = prefs.style.display !== 'none';
      prefs.style.display = open ? 'none' : 'flex';
      save_.style.display = open ? 'none' : 'inline-block';
      manage.textContent = open ? 'Manage' : 'Hide';
    };
    accept.onclick = function () { save({ necessary: true, analytics: true, marketing: true }); };
    el.querySelector('#ftwReject').onclick = function () { save({ necessary: true, analytics: false, marketing: false }); };
    save_.onclick = function () {
      save({ necessary: true, analytics: el.querySelector('#ftwAnalytics').checked, marketing: el.querySelector('#ftwMarketing').checked });
    };
    // pre-fill toggles if a prior choice exists
    var p = read();
    if (p) { el.querySelector('#ftwAnalytics').checked = !!p.analytics; el.querySelector('#ftwMarketing').checked = !!p.marketing; }
  }
  function show() { if (!el) build(); else el.style.display = 'block'; }
  function hide() { if (el) el.style.display = 'none'; }

  window.ftwConsent = {
    get: read,
    reopen: show,
    accepted: function (cat) { var p = read(); return !!(p && p[cat]); }
  };

  function start() { var existing = read(); if (existing) { apply(existing); } else { show(); } }
  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
