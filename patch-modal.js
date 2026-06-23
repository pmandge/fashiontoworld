const fs = require('fs');
const path = require('path');
const https = require('https');
const SITE = 'https://fashiontoworld.co';
const OUT = path.join(process.cwd(), 'nav-fixed', 'public', 'js');
function fetchUrl(url){return new Promise((res,rej)=>{https.get(url,r=>{if(r.statusCode!==200){rej(new Error('HTTP '+r.statusCode));return;}let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej);});}

(async()=>{
  let js = await fetchUrl(SITE+'/public/js/mobile-menu.js');
  const orig = js;

  // The exact old submit function (fake "You're in").
  const oldSubmit = `    submit: function (e) {
      e.preventDefault();
      const email = document.getElementById('ftwSubEmail').value;
      // TODO: POST to your email provider (Mailchimp/SendGrid) here
      const box = document.querySelector('#ftwSubModal > div');
      box.innerHTML =
        '<div style="padding:20px 0"><div style="font-size:40px;margin-bottom:10px">✓</div>' +
        '<div style="font-family:Georgia,serif;font-size:24px;color:#0f0f0f;margin-bottom:6px">You\\'re in!</div>' +
        '<p style="font-size:14px;color:#6b6b6b">Thanks for subscribing. Check your inbox for a welcome deal.</p>' +
        '<button onclick="FTWSubscribe.close()" style="margin-top:18px;padding:10px 28px;background:#0f0f0f;color:#fafaf8;border:none;border-radius:4px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;cursor:pointer">Done</button></div>';
      return false;
    },`;

  // New submit: real POST to /api/subscribe with proper DOI states.
  const newSubmit = `    submit: function (e) {
      e.preventDefault();
      var email = document.getElementById('ftwSubEmail').value;
      var box = document.querySelector('#ftwSubModal > div');
      var btn = document.querySelector('#ftwSubModal button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending\\u2026'; }
      var API = (window.API_BASE || 'https://api.fashiontoworld.co');
      fetch(API + '/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d && res.d.ok) {
          box.innerHTML =
            '<div style="padding:20px 0;text-align:center"><div style="font-size:40px;margin-bottom:10px;color:#c9a84c">\\u2709</div>' +
            '<div style="font-family:Georgia,serif;font-size:24px;color:#0f0f0f;margin-bottom:6px">Check your email</div>' +
            '<p style="font-size:14px;color:#6b6b6b;line-height:1.5">We\\'ve sent a confirmation link to <strong>' + email.replace(/</g,'&lt;') + '</strong>. Click it to confirm your subscription.</p>' +
            '<button onclick="FTWSubscribe.close()" style="margin-top:18px;padding:10px 28px;background:#0f0f0f;color:#fafaf8;border:none;border-radius:4px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;cursor:pointer">Done</button></div>';
        } else {
          var msg = (res.d && res.d.error === 'invalid_email') ? 'That email doesn\\'t look right \\u2014 please check and try again.' : 'Something went wrong. Please try again in a moment.';
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
    },`;

  if (js.indexOf(oldSubmit) === -1) {
    console.error('! could not find the exact old submit function — may have changed.');
    console.error('  Aborting so nothing is broken. Manual check needed.');
    process.exit(1);
  }
  js = js.replace(oldSubmit, newSubmit);

  if (js === orig) { console.error('! no change made'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'mobile-menu.js'), js, 'utf8');
  console.log('patched mobile-menu.js -> nav-fixed/public/js/mobile-menu.js');
  console.log('  real /api/subscribe wired:', js.indexOf('/api/subscribe') > -1);
  console.log('  DOI "check your email" state:', js.indexOf('Check your email') > -1);
})().catch(function(e){ console.error(e); process.exit(1); });
