#!/usr/bin/env node
/* Re-derives correct SHOE subcategory for shoe products mislabeled with a
 * non-shoe subcategory (e.g. "Cap Toe" boots -> was Hats; brand "Pantanetti"
 * -> was Trousers). Opens its OWN pg pool, so it needs no module changes.
 *
 * From ~/fashiontoworld:
 *   node -r dotenv/config backend/seo/fix-shoe-subcats.js          # preview
 *   node -r dotenv/config backend/seo/fix-shoe-subcats.js --apply  # write
 */
const { Pool } = require('pg');
const APPLY = process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const SHOE_RULES = [
  [/sneaker|trainer/i, 'Sneakers'],
  [/ankle boot|chelsea boot|combat boot|western boot|over the knee|\bboots?\b/i, 'Boots'],
  [/ugg/i, 'Boots'],
  [/\bheel|pump/i, 'Heels'],
  [/sandal/i, 'Sandals'],
  [/espadrille/i, 'Espadrilles'],
  [/\bmule|slides|flip ?flop/i, 'Mules & Slides'],
  [/slipper/i, 'Slippers'],
  [/loafer|moccasin|derby|oxford|brogue|monk strap|lace ?up|dress shoe/i, 'Loafers'],
  [/ballet ?flat|\bflat/i, 'Flats'],
];
const VALID = ['Sneakers','Boots','Heels','Sandals','Loafers','Flats','Espadrilles','Mules & Slides','Slippers'];

function deriveShoeSub(name) {
  const n = name || '';
  for (const [re, label] of SHOE_RULES) if (re.test(n)) return label;
  return 'Boots';
}

(async () => {
  // All shoes whose subcategory is NOT a valid shoe subcategory (and non-empty).
  const { rows } = await pool.query(
    `SELECT id, name, subcategory FROM products
     WHERE category = 'shoes'
       AND subcategory IS NOT NULL AND subcategory <> ''
       AND subcategory <> ALL($1)`,
    [VALID]
  );

  const changes = rows.map(r => ({ id: r.id, name: r.name, old: r.subcategory, neu: deriveShoeSub(r.name) }));
  console.log(`Found ${changes.length} shoe products with a non-shoe subcategory.\n`);
  console.log('Sample of changes:');
  changes.slice(0, 25).forEach(x => console.log(`  [${x.old} -> ${x.neu}]  ${(x.name||'').slice(0,68)}`));

  if (!APPLY) {
    console.log(`\nDRY RUN — no changes written. Re-run with --apply to update ${changes.length} rows.`);
    await pool.end(); process.exit(0);
  }

  let n = 0;
  for (const x of changes) {
    await pool.query('UPDATE products SET subcategory = $1 WHERE id = $2', [x.neu, x.id]);
    n++;
  }
  console.log(`\n✓ Updated ${n} rows.`);
  await pool.end(); process.exit(0);
})().catch(e => { console.error(e); pool.end(); process.exit(1); });
