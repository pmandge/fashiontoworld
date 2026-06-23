#!/usr/bin/env node
/* Re-maps category + subcategory for ALL existing products using the current
 * category-map.js logic — WITHOUT re-fetching feeds. Mirrors buildProduct's
 * inputs exactly: typeText = `${feed_category} ${name}`, gender text = description.
 *
 * Dry-run by default (shows a summary + samples). --apply writes changes.
 *
 * From ~/fashiontoworld:
 *   node -r dotenv/config remap-categories.js          # preview
 *   node -r dotenv/config remap-categories.js --apply  # write
 */
const { Pool } = require('pg');
const cm = require('./backend/services/category-map.js');

const APPLY = process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const t0 = Date.now();
  // Pull the minimum needed to re-map. advertiser used for gender fallback.
  const { rows } = await pool.query(
    `SELECT id, name, description, feed_category, advertiser, gender, category, subcategory FROM products`
  );
  console.log(`Loaded ${rows.length} products in ${((Date.now()-t0)/1000).toFixed(1)}s. Computing new mapping...\n`);

  let catChanges = 0, subChanges = 0, bothChanges = 0;
  const updates = [];
  const catMoves = {};   // "old->new" category transitions count
  const sampleByMove = {};

  for (const p of rows) {
    const typeText = `${p.feed_category || ''} ${p.name || ''}`;
    const newCat = cm.mapCategory(typeText, p.description || '', p.gender, p.advertiser);
    const newSub = cm.mapSubcategory(typeText, newCat);

    const catChanged = newCat !== (p.category || '');
    const subChanged = newSub !== (p.subcategory || '');
    if (!catChanged && !subChanged) continue;

    if (catChanged) {
      catChanges++;
      const key = `${p.category||'(none)'} -> ${newCat||'(none)'}`;
      catMoves[key] = (catMoves[key] || 0) + 1;
      if (!sampleByMove[key]) sampleByMove[key] = (p.name||'').slice(0, 60);
    }
    if (subChanged) subChanges++;
    if (catChanged && subChanged) bothChanges++;

    updates.push({ id: p.id, cat: newCat, sub: newSub });
  }

  console.log(`Changes: ${updates.length} products`);
  console.log(`  category changes:    ${catChanges}`);
  console.log(`  subcategory changes: ${subChanges}`);
  console.log(`  both:                ${bothChanges}\n`);

  console.log('Category transitions (old -> new):');
  Object.entries(catMoves).sort((a,b)=>b[1]-a[1]).slice(0,30).forEach(([k,n]) => {
    console.log(`  ${String(n).padStart(6)}  ${k}     e.g. "${sampleByMove[k]}"`);
  });

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to update ${updates.length} rows.`);
    await pool.end(); process.exit(0);
  }

  console.log(`\nApplying ${updates.length} updates...`);
  const client = await pool.connect();
  let n = 0;
  try {
    await client.query('BEGIN');
    for (const u of updates) {
      await client.query('UPDATE products SET category=$1, subcategory=$2 WHERE id=$3', [u.cat, u.sub, u.id]);
      n++;
      if (n % 5000 === 0) console.log(`  ...${n}`);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ROLLBACK:', e.message);
    client.release(); await pool.end(); process.exit(1);
  }
  client.release();
  console.log(`\n✓ Updated ${n} rows in ${((Date.now()-t0)/1000).toFixed(1)}s.`);
  await pool.end(); process.exit(0);
})().catch(e => { console.error(e); pool.end(); process.exit(1); });
