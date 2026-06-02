/**
 * ============================================================
 * FashionToWorld — Shared Category Mapping
 * ============================================================
 * Maps feed products into site categories/subcategories.
 *
 * Reality of our feeds: many items arrive with an EMPTY feed
 * category, so we infer from the product NAME (+ description for
 * gender) and fall back to a STORE default when there's no signal.
 * ============================================================
 */

const CATEGORY_RULES = [
  { cat: 'shoes',       kw: ['shoe','sneaker','boot','heel','sandal','loafer','espadrille','mule','uggs','ballet flat','slides','flip flop','moccasin','trainers','pumps'] },
  { cat: 'bags',        kw: ['handbag','bag','clutch','backpack','tote','purse','wallet','briefcase','satchel','messenger','belt bag','mini bag','travel bag'] },
  { cat: 'jewellery',   kw: ['ring','necklace','earring','bracelet','brooch','jewel','watch','pendant','keyring','anklet','cufflink'] },
  { cat: 'accessories', kw: ['belt','scarf','scarves','glove','hat','cap','beanie','sunglass','glasses','tie','umbrella','hair accessor','bow tie','pocket square','bucket hat','bowler','cases'] },
  { cat: 'beauty',      kw: ['fragrance','perfume','parfum','cologne','eau de','cosmetic','beauty','makeup','lipstick','mascara','foundation','concealer','eyeshadow','eyeliner','blush','skincare','serum','moisturiser','moisturizer','cleanser','shampoo','conditioner','lotion','nail polish','nail lacquer','palette','candle'] },
  { cat: 'kids',        kw: ['baby','babies','kids','child','children','toddler','infant','animal clothing'] },
];

const CLOTHING_HINT = ['dress','jean','trouser','pant','skirt','top','blouse','shirt','jacket','coat','blazer','sweater','hoodie','sweatshirt','cardigan','jumper','knit','t-shirt','tee','legging','short','suit','vest','poncho','bodysuit','lingerie','bra','panties','underwear','swimwear','swimsuit','bikini','pajama','nightgown','jumpsuit','co-ord','tracksuit','turtleneck','polo','parka','bomber','windbreaker','trench','fur','sheepskin','down jacket','raincoat','tights','socks','stockings'];

// Gender signals scanned in the product name + description.
const MEN_SIGNALS   = /\b(men|men'?s|man'?s|male|gentlemen|menswear|guys|boys?|boy'?s)\b/i;
const WOMEN_SIGNALS = /\b(women|women'?s|woman'?s|female|ladies|lady'?s|womenswear|girls?|girl'?s|maternity|bridal)\b/i;

// Stores that are clearly single-gender — used as the fallback when the
// name/description carry no gender signal at all.
const STORE_GENDER = [
  ['wayrates', 'men'],
  ['noracora', 'women'], ['stylewe', 'women'], ['justfashionnow', 'women'], ['chicme', 'women'],
];
function storeGender(advertiser) {
  const a = (advertiser || '').toLowerCase();
  for (const [k, g] of STORE_GENDER) { if (a.includes(k)) return g; }
  return '';
}

function detectGender(text, feedGender) {
  const g = (feedGender || '').toLowerCase();
  if (g === 'male' || g === 'men' || g === 'm') return 'men';
  if (g === 'female' || g === 'women' || g === 'w' || g === 'f') return 'women';
  const t = text || '';
  if (WOMEN_SIGNALS.test(t)) return 'women'; // women takes priority if both appear
  if (MEN_SIGNALS.test(t)) return 'men';
  return '';
}

// typeText: name (+ feed category) — clean signal for product TYPE.
// genderText: extra text (description) — only used for gender.
function mapCategory(typeText, genderText, genderHint, advertiser) {
  const n = (typeText || '').toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.kw.some(k => n.includes(k))) return rule.cat;
  }
  let g = detectGender(`${typeText || ''} ${genderText || ''}`, genderHint);
  if (!g) g = storeGender(advertiser);   // store fallback when no signal anywhere
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
  [/earring/i, 'Earrings'], [/necklace/i, 'Necklaces'], [/bracelet/i, 'Bracelets'], [/anklet/i, 'Bracelets'],
  [/brooch/i, 'Brooches'], [/watch/i, 'Watches'], [/\bring\b|rings/i, 'Rings'],
  [/sunglass/i, 'Sunglasses'], [/scarf|scarves/i, 'Scarves'], [/belt$|^belts|\bbelt\b/i, 'Belts'],
  [/hat|cap|beanie|bucket|bowler/i, 'Hats & Caps'], [/glove/i, 'Gloves'], [/bow tie|\bties?\b|necktie/i, 'Ties'],
  [/fragrance|perfume|parfum|cologne|eau de/i, 'Fragrance'], [/lipstick|mascara|foundation|eyeshadow|makeup|palette|blush|concealer/i, 'Makeup'],
  [/skincare|serum|moisturi|cleanser|lotion/i, 'Skincare'],
  [/hoodie|sweatshirt/i, 'Hoodies & Sweatshirts'],
  [/dress/i, 'Dresses'], [/jean/i, 'Jeans'], [/trouser|pant|chino/i, 'Trousers & Pants'],
  [/skirt/i, 'Skirts'], [/blouse/i, 'Tops & Blouses'], [/^tops|^top$/i, 'Tops & Blouses'],
  [/t-shirt|tee/i, 'T-Shirts'], [/polo/i, 'Polos'], [/shirt/i, 'Shirts'],
  [/sweater|knit|pullover|jumper|cardigan/i, 'Knitwear & Sweaters'], [/blazer/i, 'Blazers'],
  [/coat|trench/i, 'Coats'], [/jacket|bomber|parka|windbreaker/i, 'Jackets'],
  [/legging/i, 'Leggings'], [/short/i, 'Shorts'], [/jumpsuit|romper/i, 'Jumpsuits & Rompers'],
  [/\bsuit\b|tuxedo/i, 'Suits'], [/waistcoat|\bvest\b/i, 'Waistcoats'],
  [/bra$|bras|lingerie|bodysuit/i, 'Lingerie'], [/panties|brief|underpant|boxer/i, 'Underwear'],
  [/swimsuit|bikini|swim/i, 'Swimwear'], [/pajama|nightgown|nightwear|sleepwear/i, 'Sleepwear'],
  [/\bsock\b|socks/i, 'Socks'], [/tights|stocking|hosiery/i, 'Hosiery'],
];

function mapSubcategory(text) {
  const n = (text || '');
  for (const [re, label] of SUBCATEGORY_RULES) {
    if (re.test(n)) return label;
  }
  return '';
}

// Standard product shape every parser must emit
function buildProduct(raw, opts) {
  const catName = raw.feed_category || '';
  const name = raw.name || '';
  const desc = raw.description || '';
  const typeText = `${catName} ${name}`;          // clean signal for product type + subcategory
  const detectedGender = detectGender(`${typeText} ${desc}`, raw.gender) || storeGender(opts.advertiser);
  return {
    id: `${opts.network}-${opts.advertiser || 'feed'}-${raw.id}`,
    name: name.trim(),
    description: desc.trim(),
    brand: (raw.brand || '').trim(),
    advertiser_name: opts.advertiser || raw.brand || '',
    price: parseFloat(raw.price) || 0,
    price_old: raw.price_old ? parseFloat(raw.price_old) : null,
    currency: (raw.currency || 'EUR').trim(),
    image_url: (raw.images && raw.images[0]) || raw.image_url || '',
    images: raw.images || (raw.image_url ? [raw.image_url] : []),
    url: (raw.url || '').trim(),
    affiliate_url: (raw.url || '').trim(),
    category: mapCategory(typeText, desc, raw.gender, opts.advertiser),
    subcategory: mapSubcategory(typeText),
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
