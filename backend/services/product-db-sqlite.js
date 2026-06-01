/**
 * SQLite implementation (fallback / small-scale / testing).
 * Async API to match the Postgres implementation.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'products.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, name TEXT, description TEXT, brand TEXT, brand_logo TEXT,
    advertiser TEXT, price REAL, price_old REAL, currency TEXT,
    image_url TEXT, images TEXT, url TEXT,
    category TEXT, subcategory TEXT, feed_category TEXT,
    gender TEXT, color TEXT, size TEXT, material TEXT,
    on_sale INTEGER, network TEXT, updated_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_cat ON products(category);
  CREATE INDEX IF NOT EXISTS idx_sub ON products(subcategory);
  CREATE INDEX IF NOT EXISTS idx_gender ON products(gender);
  CREATE INDEX IF NOT EXISTS idx_brand ON products(brand);
  CREATE INDEX IF NOT EXISTS idx_sale ON products(on_sale);
  CREATE INDEX IF NOT EXISTS idx_upd ON products(updated_at);
`);

const upsert = db.prepare(`
  INSERT INTO products (id,name,description,brand,brand_logo,advertiser,price,price_old,currency,
    image_url,images,url,category,subcategory,feed_category,gender,color,size,material,on_sale,network,updated_at)
  VALUES (@id,@name,@description,@brand,@brand_logo,@advertiser,@price,@price_old,@currency,
    @image_url,@images,@url,@category,@subcategory,@feed_category,@gender,@color,@size,@material,@on_sale,@network,@updated_at)
  ON CONFLICT(id) DO UPDATE SET
    name=@name,price=@price,price_old=@price_old,image_url=@image_url,images=@images,url=@url,
    category=@category,subcategory=@subcategory,brand_logo=@brand_logo,on_sale=@on_sale,updated_at=@updated_at
`);

async function init() { /* tables already created above */ }

async function upsertMany(products, runStamp) {
  const tx = db.transaction((items) => {
    for (const p of items) upsert.run({
      id: p.id, name: p.name, description: p.description || '', brand: p.brand || '',
      brand_logo: p.brand_logo || '', advertiser: p.advertiser_name || '', price: p.price || 0,
      price_old: p.price_old, currency: p.currency || 'EUR', image_url: p.image_url || '',
      images: JSON.stringify(p.images || []), url: p.url || '', category: p.category || 'women',
      subcategory: p.subcategory || '', feed_category: p.feed_category || '', gender: p.gender || 'unisex',
      color: p.color || '', size: p.size || '', material: p.material || '', on_sale: p.on_sale ? 1 : 0,
      network: p.network || 'admitad', updated_at: runStamp,
    });
  });
  tx(products);
}

async function pruneOld(runStamp) {
  return db.prepare('DELETE FROM products WHERE updated_at < ?').run(runStamp).changes;
}

async function query({ category, subcategory, gender, brand, onSale, minprice, maxprice, q, sort, limit = 24, page = 1 } = {}) {
  const where = []; const params = {};
  if (category)    { where.push('category = @category'); params.category = category; }
  if (subcategory) { where.push('subcategory = @subcategory'); params.subcategory = subcategory; }
  if (gender)      { where.push('gender = @gender'); params.gender = gender; }
  if (brand)       { where.push('brand = @brand'); params.brand = brand; }
  if (onSale)      { where.push('on_sale = 1'); }
  if (minprice != null) { where.push('price >= @minprice'); params.minprice = minprice; }
  if (maxprice != null) { where.push('price <= @maxprice'); params.maxprice = maxprice; }
  if (q)           { where.push('(name LIKE @q OR brand LIKE @q)'); params.q = `%${q}%`; }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  let order = 'updated_at DESC';
  if (sort === 'price_asc') order = 'price ASC';
  else if (sort === 'price_desc') order = 'price DESC';
  else if (sort === 'sale') order = 'on_sale DESC, price ASC';
  else if (sort === 'discount') order = 'on_sale DESC, (CASE WHEN price_old > 0 THEN (price_old - price) / price_old ELSE 0 END) DESC';
  const lim = Math.min(parseInt(limit) || 24, 100);
  const off = ((parseInt(page) || 1) - 1) * lim;
  const total = db.prepare(`SELECT COUNT(*) n FROM products ${w}`).get(params).n;
  const rows = db.prepare(`SELECT * FROM products ${w} ORDER BY ${order} LIMIT ${lim} OFFSET ${off}`).all(params);
  return { total, page: parseInt(page) || 1, products: rows.map(r => ({ ...r, images: safe(r.images), on_sale: !!r.on_sale })) };
}

async function distinctBrands() {
  return db.prepare("SELECT DISTINCT brand FROM products WHERE brand <> '' ORDER BY brand").all().map(r => r.brand);
}
async function setBrandLogo(brand, logo) {
  db.prepare('UPDATE products SET brand_logo = ? WHERE brand = ?').run(logo, brand);
}
async function stats() {
  const total = db.prepare('SELECT COUNT(*) n FROM products').get().n;
  const byCategory = db.prepare('SELECT category, COUNT(*) n FROM products GROUP BY category').all();
  const brands = db.prepare("SELECT COUNT(DISTINCT brand) n FROM products WHERE brand<>''").get().n;
  return { total, byCategory, brands };
}
function safe(s){ try { return JSON.parse(s); } catch { return []; } }

module.exports = { init, upsertMany, pruneOld, query, distinctBrands, setBrandLogo, stats };
