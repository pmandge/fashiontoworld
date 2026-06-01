/**
 * ============================================================
 * FashionToWorld — Product Database (Postgres or SQLite)
 * ============================================================
 * Recommended for 150k+ products: PostgreSQL (managed on
 * DigitalOcean). Set DATABASE_URL to use it. If DATABASE_URL is
 * not set, falls back to local SQLite (fine for testing / small).
 *
 *   PostgreSQL:  DATABASE_URL=postgres://user:pass@host:port/db
 *   SQLite:      leave DATABASE_URL unset
 *
 * Same query API either way, so the rest of the app doesn't care.
 * ============================================================
 */
const USE_PG = !!process.env.DATABASE_URL;
let impl;
if (USE_PG) {
  impl = require('./product-db-postgres');
  console.log('[ProductDB] Using PostgreSQL');
} else {
  impl = require('./product-db-sqlite');
  console.log('[ProductDB] Using SQLite (set DATABASE_URL for PostgreSQL)');
}
module.exports = impl;
