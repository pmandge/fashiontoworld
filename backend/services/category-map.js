/**
 * ============================================================
 * FashionToWorld — Shared Category Mapping
 * ============================================================
 * Used by EVERY aggregator parser so products from Admitad, Awin,
 * CJ, etc. all map into the same site categories/subcategories.
 * Keep this aggregator-agnostic.
 * ============================================================
 */

const CATEGORY_RULES = [
  { cat: 'shoes',       kw: ['shoe','sneaker','boot','heel','sandal','loafer','espadrille','mule','uggs','ballet flat','slides','flip flop','moccasin','trainers','pumps'] },
  { cat: 'bags',        kw: ['bag','clutch','backpack','tote','purse','wallet','briefcase','satchel','messenger','belt bag','mini bag','travel bag'] },
  { cat: 'jewellery',   kw: ['ring','necklace','earring','bracelet','brooch','jewel','watch','pendant','keyring'] },
  { cat: 'accessories', kw: ['belt','scarf','scarves','glove','hat','cap','beanie','sunglass','glasses','tie','umbrella','hair accessor','bow tie','pocket square','bucket hat','bowler','cases'] },
  { cat: 'beauty',      kw: ['fragrance','perfume','parfum','cosmetic','beauty','candle'] },
  { cat: 'kids',        kw: ['baby','babies','kids','child','animal clothing'] },
];

const CLOTHING_HINT = ['dress','jean','trouser','pant','skirt','top','blouse','shirt','jacket','coat','blazer','sweater','hoodie','sweatshirt','cardigan','jumper','knit','t-shirt','tee','legging','short','suit','vest','poncho','bodysuit','lingerie','bra','panties','underwear','swimwear','swimsuit','bikini','pajama','nightgown','jumpsuit','co-ord','tracksuit','turtleneck','polo','parka','bomber','windbreaker','trench','fur','sheepskin','down jacket','raincoat','tights','socks','stockings'];

// Detect men's items even when the feed gender field is missing, by
// scanning the category/name text for clear masculine signals.
const MEN_SIGNALS = /\b(men|men's|mens|man's|male|gentlemen|guys|boys?|boy's)\b/i;
const WOMEN_SIGNALS = /\b(women|women's|womens|woman's|female|ladies|lady's|girls?|girl's)\b/i;

function detectGender(text, feedGender) {
  const g = (feedGender || '').toLowerCase();
  if (g === 'male' || g === 'men' || g === 'm') return 'men';
  if (g === 'female' || g === 'women' || g === 'w' || g === 'f') return 'women';
  const t = text || '';
  // Women signals take priority if both appear (e.g. "men's & women's")
  if (WOMEN_SIGNALS.test(t)) return 'women';
  if (MEN_SIGNALS.test(t)) return 'men';
  return '';
}

function mapCategory(categoryName, genderHint, genderText) {
  const n = (categoryName || '').toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.kw.some(k => n.includes(k))) return rule.cat;
  }
  // Detect gender from the explicit gender field, the category text,
  // and any extra text (e.g. the product name) passed in.
  const g = detectGender(`${categoryName || ''} ${genderText || ''}`, genderHint);
  if (CLOTHING_HINT.some(k => n.includes(k))) {
    return g === 'men' ? 'men' : 'women';
  }
  return g === 'men' ? 'men' : 'women';
}

const SUBCATEGORY_RULES = [
  [/sneaker|trainer/i, 'Sneakers'], [/ankle boot|western boot|over the knee|^boots/i, 'Boots'],
  [/heel|pump/i, 'Heels'], [/sandal/i, 'Sandals'], [/loafer|moccasin/i, 'Loafers'],
  [/ballet flat|flat/i, 'Flats'], [/espadrille/i, 'Espadrilles'], [/mule|slides|flip flop/i, 'Mules & Slides'],
  [/ugg/i, 'Boots'], [/slipper/i, 'Slippers'],
  [/clutch/i, 'Clutches'], [/backpack/i, 'Backpacks'], [/tote/i, 'Totes'],
  [/shoulder bag/i, 'Shoulder Bags'], [/mini bag|belt bag/i, 'Mini Bags'],
  [/wallet|purse/i, 'Wallets'], [/messenger|briefcase|satchel/i, 'Work Bags'], [/travel bag|suitcase/i, 'Travel Bags'],
  [/earring/i, 'Earrings'], [/necklace/i, 'Necklaces'], [/bracelet/i, 'Bracelets'],
  [/brooch/i, 'Brooches'], [/watch/i, 'Watches'], [/\bring\b|rings/i, 'Rings'],
  [/sunglass/i, 'Sunglasses'], [/scarf|scarves/i, 'Scarves'], [/belt$|^belts/i, 'Belts'],
  [/hat|cap|beanie|bucket|bowler/i, 'Hats & Caps'], [/glove/i, 'Gloves'], [/bow tie|\bties?\b/i, 'Ties'],
  [/hoodie|sweatshirt/i, 'Hoodies & Sweatshirts'],
  [/dress/i, 'Dresses'], [/jean/i, 'Jeans'], [/trouser|pant|chino/i, 'Trousers & Pants'],
  [/skirt/i, 'Skirts'], [/blouse/i, 'Tops & Blouses'], [/^tops|^top$/i, 'Tops & Blouses'],
  [/t-shirt|tee/i, 'T-Shirts'], [/shirt/i, 'Shirts'],
  [/sweater|knit|pullover|jumper|cardigan/i, 'Knitwear & Sweaters'], [/blazer/i, 'Blazers'],
  [/coat|trench/i, 'Coats'], [/jacket|bomber|parka|windbreaker/i, 'Jackets'],
  [/legging/i, 'Leggings'], [/short/i, 'Shorts'], [/jumpsuit|romper/i, 'Jumpsuits & Rompers'],
  [/bra$|bras/i, 'Bras'], [/panties|brief|underpant/i, 'Underwear'], [/swimsuit|bikini|swim/i, 'Swimwear'],
  [/fragrance|perfume|parfum/i, 'Fragrance'], [/candle/i, 'Home Fragrance'],
];

function mapSubcategory(categoryName) {
  const n = (categoryName || '');
  for (const [re, label] of SUBCATEGORY_RULES) {
    if (re.test(n)) return label;
  }
  return '';
}

// Standard product shape every parser must emit
function buildProduct(raw, opts) {
  const gender = (raw.gender || '').toLowerCase();
  const catName = raw.feed_category || '';
  const genderText = `${catName} ${raw.name || ''}`;
  const detectedGender = detectGender(genderText, gender);
  return {
    id: `${opts.network}-${opts.advertiser || 'feed'}-${raw.id}`,
    name: (raw.name || '').trim(),
    description: (raw.description || '').trim(),
    brand: (raw.brand || '').trim(),
    advertiser_name: opts.advertiser || raw.brand || '',
    price: parseFloat(raw.price) || 0,
    price_old: raw.price_old ? parseFloat(raw.price_old) : null,
    currency: (raw.currency || 'EUR').trim(),
    image_url: (raw.images && raw.images[0]) || raw.image_url || '',
    images: raw.images || (raw.image_url ? [raw.image_url] : []),
    url: (raw.url || '').trim(),
    affiliate_url: (raw.url || '').trim(),
    category: mapCategory(catName || raw.name, gender, raw.name),
    subcategory: mapSubcategory(catName || raw.name),
    feed_category: catName,
    gender: detectedGender || 'unisex',
    color: (raw.color || '').trim(),
    size: (raw.size || '').trim(),
    material: (raw.material || '').trim(),
    on_sale: !!raw.on_sale || (raw.price_old && parseFloat(raw.price_old) > parseFloat(raw.price)),
    network: opts.network || 'admitad',
  };
}

module.exports = { mapCategory, mapSubcategory, buildProduct };
