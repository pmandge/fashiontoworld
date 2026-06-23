#!/usr/bin/env node
/* Fixes the Watches nav link. Current LIVE breakage: the Watches anchor was
 * inserted INSIDE the Bags <li>:
 *   <li><a href='/pages/bags'>Bags</a><a href='/pages/watches'>Watches</a></li>
 * which fuses into "BagsWatches". This splits it into two proper <li> items:
 *   <li><a href='/pages/bags'>Bags</a></li><li><a href='/pages/watches'>Watches</a></li>
 * Also: inserts Watches if entirely missing, and corrects search?q=watch nav links.
 *
 * From ~/fashiontoworld:  node nav-fix/fix-nav-watches.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE = 'https://fashiontoworld.co';
const OUT = path.join(process.cwd(), 'nav-fixed');
const OUT_PAGES = path.join(OUT, 'pages');
const PAGES = ['index','women','men','shoes','bags','jewellery','watches','accessories','deals','beauty','kids','brands','coupons'];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d));
    }).on('error', reject);
  });
}

const BAGS_LI    = "<li><a href='/pages/bags'>Bags</a></li>";
const WATCHES_LI = "<li><a href='/pages/watches'>Watches</a></li>";

function patch(html) {
  let out = html;

  // CASE A — the fusion bug: Bags + Watches anchors share one <li>. Split them.
  out = out.replace(
    /<li><a href='\/pages\/bags'>Bags<\/a><a href='\/pages\/watches'>Watches<\/a><\/li>/g,
    BAGS_LI + WATCHES_LI
  );

  // CASE B — a nav Watches link pointing at search/watches.html (in its own <li>): fix target.
  out = out.replace(
    /<li><a href='\/pages\/(?:search\?q=watch|watches\.html)'>Watches<\/a><\/li>/g,
    WATCHES_LI
  );

  // CASE C — Watches entirely missing: insert a <li> after the Bags <li>.
  if (!/<a href='\/pages\/watches'>Watches<\/a>/.test(out)) {
    out = out.replace(
      /(<li><a href='\/pages\/bags'>Bags<\/a><\/li>)/,
      `$1${WATCHES_LI}`
    );
  }

  return { out, changed: out !== html };
}

(async () => {
  fs.mkdirSync(OUT_PAGES, { recursive: true });
  let done = 0, skipped = 0;
  for (const slug of PAGES) {
    const url = slug === 'index' ? `${SITE}/index.html` : `${SITE}/pages/${slug}.html`;
    let html;
    try { html = await fetchUrl(url); } catch (e) { console.log(`  ! ${slug}: ${e.message}`); continue; }
    const { out, changed } = patch(html);
    if (!changed) { console.log(`  = ${slug}: already correct`); skipped++; continue; }
    // sanity: count nav Watches <li> and check no fusion remains
    const fused = (out.match(/Bags<\/a><a href='\/pages\/watches'/g) || []).length;
    const outPath = slug === 'index' ? path.join(OUT, 'index.html') : path.join(OUT_PAGES, `${slug}.html`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, out, 'utf8');
    console.log(`  ✓ ${slug}: patched (fusion remaining: ${fused})`);
    done++;
  }
  console.log(`\nDone. ${done} patched, ${skipped} already correct. Output: nav-fixed/`);
})().catch(e => { console.error(e); process.exit(1); });
