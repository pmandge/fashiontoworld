/**
 * ============================================================
 * FashionToWorld — Worldwide-Shipping Store Allow-List
 * ============================================================
 * Only stores listed here are shown on the site, because your
 * positioning is "stores that ship worldwide."
 *
 * HOW IT WORKS
 *  - Both PRODUCTS and COUPONS are filtered against this list.
 *  - Matching is case-insensitive and by "contains", so
 *    "ChicMe" matches the advertiser "ChicMe WW".
 *  - Add or remove stores freely as you vet them.
 *
 * You can also override via the env var WORLDWIDE_STORES
 * (comma-separated), which is handy on the server without editing code.
 *
 * SET WORLDWIDE_ONLY=false to temporarily show ALL stores (e.g. testing).
 * ============================================================
 */

// Default allow-list — your known worldwide-shipping fashion stores.
// (Edit freely. These are matched loosely against advertiser names.)
const DEFAULT_WORLDWIDE = [
  'ChicMe',
  'Symbol',          // Symbol Fashion
  'Italo',           // Italo Jewelry
  'Noracora',
  'Stylewe',
  'Justfashionnow',
  'Wayrates',
  'Glasseslit',
  'The Luxury Closet',
  'Drippy Custom',
  'AliExpress',
  'Alibaba',
  'Hacoo',
  'The Deal',
  'Watches Of USA',
  // add more vetted worldwide stores here...
];

function getWorldwideStores() {
  const env = process.env.WORLDWIDE_STORES;
  if (env) return env.split(',').map(s => s.trim()).filter(Boolean);
  return DEFAULT_WORLDWIDE;
}

function isWorldwideEnabled() {
  return process.env.WORLDWIDE_ONLY !== 'false';
}

// Does this advertiser/store name match the worldwide allow-list?
function shipsWorldwide(advertiserName) {
  if (!isWorldwideEnabled()) return true; // filter off → allow all
  const name = (advertiserName || '').toLowerCase();
  if (!name) return false;
  return getWorldwideStores().some(store => name.includes(store.toLowerCase()));
}

module.exports = { shipsWorldwide, getWorldwideStores, isWorldwideEnabled };
