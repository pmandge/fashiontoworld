#!/usr/bin/env node
/* Fixes the Watches nav link across all pages:
 *   - Inserts <a href='/pages/watches'>Watches</a> between Bags and Jewellery
 *     on pages missing it.
 *   - Corrects any existing Watches link that points to /pages/search?q=watch
 *     (or similar) to the proper category page /pages/watches.
 *
 * Fetches each LIVE page, patches, writes to ./nav-fixed/pages/<slug>.html.
 * Frontend files — upload the results to GitHub (Netlify auto-deploys).
 *
 * From ~/fashiontoworld:
 *   node nav-fix/fix-nav-watches.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE = 'https://fashiontoworld.co';
const OUT = path.join(process.cwd(), 'nav-fixed');
const OUT_PAGES = path.join(OUT, 'pages');

// page slug -> live URL. index is special (root).
const PAGES = ['index','women','men','shoes','bags','jewellery','watches','accessories','deals','beauty','kids','brands','coupons'];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

// The proper Watches link, matching the site's anchor style (single quotes).
const WATCHES_LINK = "<a href='/pages/watches'>Watches</a>";

function patch(html) {
  let changed = false;
  let out = html;

  // 1. Fix any wrong Watches link variants -> /pages/watches
  //    e.g. href='/pages/search?q=watch' >Watches<  OR href='/pages/watches.html'
  const wrongRe = /<a href='\/pages\/(?:search\?q=watch|watches\.html)'>Watches<\/a>/g;
  if (wrongRe.test(out)) {
    out = out.replace(wrongRe, WATCHES_LINK);
    changed = true;
  }

  // 2. If there's still no Watches link at all, insert it between Bags and Jewellery.
  if (!/>Watches<\/a>/.test(out)) {
    // Find the Bags link and insert Watches right after it.
    const bagsRe = /(<a href='\/pages\/bags'>Bags<\/a>)/;
    if (bagsRe.test(out)) {
      out = out.replace(bagsRe, `$1${WATCHES_LINK}`);
      changed = true;
    }
  }

  return { out, changed };
}

(async () => {
  fs.mkdirSync(OUT_PAGES, { recursive: true });
  let done = 0, skipped = 0;

  for (const slug of PAGES) {
    const url = slug === 'index' ? `${SITE}/index.html` : `${SITE}/pages/${slug}.html`;
    let html;
    try { html = await fetchUrl(url); }
    catch (e) { console.log(`  ! ${slug}: fetch failed (${e.message})`); continue; }

    const { out, changed } = patch(html);
    if (!changed) {
      console.log(`  = ${slug}: already correct, skipped`);
      skipped++;
      continue;
    }

    // Count how many Watches links exist now (should be exactly 1 in nav; mobile nav may add another)
    const n = (out.match(/>Watches<\/a>/g) || []).length;
    const outName = slug === 'index' ? 'index.html' : `${slug}.html`;
    const outPath = slug === 'index' ? path.join(OUT, outName) : path.join(OUT_PAGES, outName);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, out, 'utf8');
    console.log(`  ✓ ${slug}: patched (${n} Watches link(s)) -> ${outPath.replace(process.cwd()+'/','')}`);
    done++;
  }

  console.log(`\nDone. ${done} pages patched, ${skipped} already correct.`);
  console.log(`Output in: ${OUT.replace(process.cwd()+'/','')}/`);
})().catch(e => { console.error(e); process.exit(1); });
