/**
 * PostgreSQL implementation — recommended for 150k+ products.
 * Uses connection pooling and batch upserts for performance.
 * Set DATABASE_URL=postgres://user:pass@host:port/dbname
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  max: 10,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT, description TEXT, brand TEXT, brand_logo TEXT,
      advertiser TEXT, price REAL, price_old REAL, currency TEXT,
      image_url TEXT, images JSONB, url TEXT,
      category TEXT, subcategory TEXT, feed_category TEXT,
      gender TEXT, color TEXT, size TEXT, material TEXT,
      on_sale BOOLEAN, network TEXT, updated_at BIGINT
    );
    CREATE INDEX IF NOT EXISTS idx_cat ON products(category);
    CREATE INDEX IF NOT EXISTS idx_sub ON products(subcategory);
    CREATE INDEX IF NOT EXISTS idx_gender ON products(gender);
    CREATE INDEX IF NOT EXISTS idx_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_sale ON products(on_sale);
    CREATE INDEX IF NOT EXISTS idx_upd ON products(updated_at);
    CREATE INDEX IF NOT EXISTS idx_price ON products(price);
    CREATE INDEX IF NOT EXISTS idx_sale_upd ON products(on_sale, updated_at);
    CREATE INDEX IF NOT EXISTS idx_cat_upd ON products(category, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cat_price ON products(category, price);
    CREATE INDEX IF NOT EXISTS idx_cat_sale_upd ON products(category, on_sale DESC, updated_at DESC);
  `);
  // Fast text search: trigram indexes make `name/brand ILIKE '%q%'` index-accelerated.
  // Guarded so a missing extension can never block startup.
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_name_trgm ON products USING gin (name gin_trgm_ops)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_brand_trgm ON products USING gin (brand gin_trgm_ops)');
  } catch (e) { console.error('[search index] skipped:', e.message); }
}

async function upsertMany(products, runStamp) {
  if (!products.length) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const text = `
      INSERT INTO products (id,name,description,brand,brand_logo,advertiser,price,price_old,currency,
        image_url,images,url,category,subcategory,feed_category,gender,color,size,material,on_sale,network,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      ON CONFLICT (id) DO UPDATE SET
        name=$2,price=$7,price_old=$8,image_url=$10,images=$11,url=$12,
        category=$13,subcategory=$14,brand_logo=$5,on_sale=$20,updated_at=$22`;
    for (const p of products) {
      await client.query(text, [
        p.id, p.name, p.description || '', p.brand || '', p.brand_logo || '',
        p.advertiser_name || '', p.price || 0, p.price_old, p.currency || 'EUR',
        p.image_url || '', JSON.stringify(p.images || []), p.url || '',
        p.category || 'women', p.subcategory || '', p.feed_category || '',
        p.gender || 'unisex', p.color || '', p.size || '', p.material || '',
        !!p.on_sale, p.network || 'admitad', runStamp,
      ]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally {
    client.release();
  }
}

async function pruneOld(runStamp) {
  const r = await pool.query('DELETE FROM products WHERE updated_at < $1', [runStamp]);
  return r.rowCount;
}

async function query({ category, subcategory, gender, brand, advertiser, color, size, onSale, minprice, maxprice, q, sort, limit = 24, page = 1 } = {}) {
  const where = []; const vals = []; let i = 1;
  if (category)    { where.push(`category = $${i++}`); vals.push(category); }
  if (subcategory) { where.push(`subcategory = $${i++}`); vals.push(subcategory); }
  if (gender)      { where.push(`gender = $${i++}`); vals.push(gender); }
  if (brand)       {
    const bs = String(brand).split(',').map(s => s.trim()).filter(Boolean);
    if (bs.length === 1) { where.push(`brand = $${i++}`); vals.push(bs[0]); }
    else if (bs.length > 1) { where.push(`brand = ANY($${i++})`); vals.push(bs); }
  }
  if (advertiser)  { where.push(`advertiser ILIKE $${i++}`); vals.push(`%${advertiser}%`); }
  if (color)       { const cs = String(color).split(',').map(s => s.trim()).filter(Boolean); if (cs.length) { where.push(`color = ANY($${i++})`); vals.push(cs); } }
  if (size)        { const ss = String(size).split(',').map(s => s.trim()).filter(Boolean); if (ss.length) { where.push(`size = ANY($${i++})`); vals.push(ss); } }
  if (onSale)      { where.push(`on_sale = true`); }
  if (minprice != null) { where.push(`price >= $${i++}`); vals.push(minprice); }
  if (maxprice != null) { where.push(`price <= $${i++}`); vals.push(maxprice); }
  if (q)           { where.push(`(name ILIKE $${i} OR brand ILIKE $${i})`); vals.push(`%${q}%`); i++; }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  let order = 'updated_at DESC';
  if (sort === 'price_asc') order = 'price ASC';
  else if (sort === 'price_desc') order = 'price DESC';
  else if (sort === 'sale') order = 'on_sale DESC, price ASC';
  else if (sort === 'discount') order = 'on_sale DESC, updated_at DESC';
  const lim = Math.min(parseInt(limit) || 24, 100);
  const off = ((parseInt(page) || 1) - 1) * lim;
  const totalR = await pool.query(`SELECT COUNT(*)::int n FROM products ${w}`, vals);
  const rowsR = await pool.query(`SELECT * FROM products ${w} ORDER BY ${order} LIMIT ${lim} OFFSET ${off}`, vals);
  return {
    total: totalR.rows[0].n, page: parseInt(page) || 1,
    products: rowsR.rows.map(r => ({ ...r, images: Array.isArray(r.images) ? r.images : [] })),
  };
}

async function distinctBrands() {
  const r = await pool.query("SELECT DISTINCT brand FROM products WHERE brand <> '' ORDER BY brand");
  return r.rows.map(x => x.brand);
}
async function setBrandLogo(brand, logo) {
  await pool.query('UPDATE products SET brand_logo = $1 WHERE brand = $2', [logo, brand]);
}
async function stats() {
  const t = await pool.query('SELECT COUNT(*)::int n FROM products');
  const c = await pool.query('SELECT category, COUNT(*)::int n FROM products GROUP BY category');
  const b = await pool.query("SELECT COUNT(DISTINCT brand)::int n FROM products WHERE brand<>''");
  return { total: t.rows[0].n, byCategory: c.rows, brands: b.rows[0].n };
}

async function advertiserCounts() {
  const r = await pool.query("SELECT advertiser, COUNT(*)::int n FROM products WHERE advertiser <> '' GROUP BY advertiser ORDER BY n DESC");
  return r.rows.map(x => ({ name: x.advertiser, count: x.n }));
}

async function subcategoryFacets() {
  const r = await pool.query(`SELECT category, subcategory, COUNT(*)::int c FROM products WHERE subcategory IS NOT NULL AND subcategory <> '' AND category IS NOT NULL AND category <> '' GROUP BY category, subcategory ORDER BY c DESC`);
  const out = {};
  for (const row of r.rows) { (out[row.category] = out[row.category] || []).push({ name: row.subcategory, count: row.c }); }
  return out;
}

async function topBrands(limit) {
  const r = await pool.query(`SELECT brand, COUNT(*)::int c FROM products WHERE brand IS NOT NULL AND brand <> '' AND brand NOT IN (SELECT DISTINCT advertiser FROM products WHERE advertiser IS NOT NULL AND advertiser <> '') GROUP BY brand ORDER BY c DESC LIMIT $1`, [limit || 12]);
  return r.rows.map(function (row) { return { name: row.brand, count: row.c }; });
}

module.exports = { init, upsertMany, pruneOld, query, distinctBrands, setBrandLogo, stats, advertiserCounts, subcategoryFacets, topBrands };
