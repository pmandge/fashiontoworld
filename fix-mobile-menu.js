#!/usr/bin/env node
/* Adds 'watches' to mobile-menu.js so the mobile menu shows Watches with its
 * dropdown (it was missing from both the ICONS map and the pages array).
 * Fetches the live file, patches, writes ./nav-fixed/public/js/mobile-menu.js.
 *
 * From ~/fashiontoworld:  node nav-fix/fix-mobile-menu.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE = 'https://fashiontoworld.co';
const OUT = path.join(process.cwd(), 'nav-fixed', 'public', 'js');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d));
    }).on('error', reject);
  });
}

(async () => {
  let js = await fetchUrl(`${SITE}/public/js/mobile-menu.js`);
  const orig = js;
  let changes = [];

  // 1. Add a watches icon to the ICONS map (insert after the bags icon entry).
  //    Match: bags:'...<path .../>',  then append watches:'...'.
  if (!/watches\s*:/.test(js.split("const pages")[0] || js)) {
    const watchIcon = `watches:'<circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2M9 2h6M9 22h6"/>'`;
    // insert right before jewellery: in the ICONS object
    const before = js;
    js = js.replace(/(jewellery:'<path d="M12 3l4 5-4 13-4-13zM8 8h8"\/>',)/, `${watchIcon}, $1`);
    if (js !== before) changes.push('added watches icon');
  }

  // 2. Add 'watches' to the pages array, between 'bags' and 'jewellery'.
  const before2 = js;
  js = js.replace(/(\[)('women','men','shoes','bags')(,'jewellery')/, `$1$2,'watches'$3`);
  if (js !== before2) changes.push("added 'watches' to pages array");

  if (js === orig) {
    console.log('No changes made — patterns not found or already patched. Manual check needed.');
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'mobile-menu.js'), js, 'utf8');
  console.log('✓ mobile-menu.js patched:');
  changes.forEach(c => console.log('   - ' + c));
  console.log('   written to nav-fixed/public/js/mobile-menu.js');

  // sanity: confirm watches now present in pages array
  const hasPages = /'bags','watches','jewellery'/.test(js);
  console.log('   pages array now has watches:', hasPages);
})().catch(e => { console.error(e); process.exit(1); });
