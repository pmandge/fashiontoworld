/**
 * ============================================================
 * FashionToWorld — Shared Category Mapping
 * ============================================================
 * Maps feed products into site categories/subcategories.
 *
 * Reality of our feeds: many items arrive with an EMPTY feed
 * category, so we infer from the product NAME (+ description for
 * gender) and fall back to a STORE default when there's no signal.
 *
 * SUBCATEGORY MAPPING IS CATEGORY-SCOPED: a product only ever
 * receives a subcategory valid for its category (SUBCATS_BY_CAT),
 * so a shoe can never become "Trousers", a bag can never become
 * "Heels", etc. — by construction, for every category, for every
 * store that ever imports. Word boundaries are hardened so brand
 * names / feature words (e.g. "Pantanetti", "Cap Toe") don't
 * collide with subcategory keywords.
 * ============================================================
 */

const CATEGORY_RULES = [
  { cat: 'shoes',       kw: ['shoe','sneaker','boot','heel','sandal','loafer','espadrille','mule','uggs','ballet flat','slides','flip flop','moccasin','trainers','pumps','slipper','slippers','clogs','derby','oxford','brogue'] },
  { cat: 'bags',        kw: ['handbag','bag','clutch','backpack','tote','purse','wallet','briefcase','satchel','messenger','belt bag','mini bag','travel bag','pouch','cosmetic bag','cosmetic case','vanity case','makeup bag','pochette','hobo','crossbody','shoulder bag','bucket bag','flap bag','birkin','baguette bag','saddle bag','top handle'] },
  { cat: 'jewellery',   kw: ['ring','necklace','earring','bracelet','brooch','jewel','pendant','keyring','anklet','cufflink'] },
  { cat: 'watches',     kw: ['watch','wristwatch','smartwatch','chronograph','timepiece'] },
  { cat: 'accessories', kw: ['belt','scarf','scarves','glove','hat','cap','beanie','sunglass','sunglasses','eyewear','eyeglass','reading glasses','tie','umbrella','hair accessor','bow tie','pocket square','bucket hat','bowler'] },
  { cat: 'kids',        kw: ['baby','babies','kids','child','children','toddler','infant','animal clothing'] },
  { cat: 'beauty',      kw: ['fragrance','perfume','parfum','cologne','eau de','makeup','lipstick','mascara','foundation','concealer','eyeshadow','eyeliner','skincare','serum','moisturiser','moisturizer','cleanser','shampoo','conditioner','nail polish','nail lacquer'] },
];

const CLOTHING_HINT = ['dress','jean','trouser','pant','skirt','top','blouse','shirt','jacket','coat','blazer','sweater','hoodie','sweatshirt','cardigan','jumper','knit','t-shirt','tee','legging','short','suit','vest','poncho','bodysuit','lingerie','bra','panties','underwear','swimwear','swimsuit','bikini','pajama','nightgown','jumpsuit','co-ord','tracksuit','turtleneck','polo','parka','bomber','windbreaker','trench','fur','sheepskin','down jacket','raincoat','tights','socks','stockings','cape','gown','kimono','tunic','kaftan','overalls','dungarees'];

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

// Non-fashion homeware/drinkware that some stores list — excluded from the catalogue.
const NON_FASHION_RE = /(?:wine|whisk(?:e)?y|cognac|champagne|crystal|water|shot|cocktail|beer)\s+glass|set of[^.]*glass|glass(?:es)?\s+\d+\s*pcs|\b(?:decanter|tumbler|goblet|carafe)\b|(?:aroma|reed)\s+diffuser|scented candle|(?:interior|home|textile|room)\s+perfum|perfum\w*\s+(?:spray\s+)?for home|spray for home|home fragrance|perfume for textile|perfume for home|perfumed home|home spray|home diffuser|room fragrance|\b(?:vase|cushion|duvet|bedding|tableware|dinnerware|cutlery|cookware|candlestick|incense|figurine|ashtray|coaster|placemat)\b/i;

// Adult toys / intimacy products — excluded from a fashion catalogue.
const ADULT_RE = /\b(?:vibrator|dildo|butt[\s-]?plug|anal|sex\s*toys?|adult\s+(?:toy|toys|product|products|novelt\w+|dvd|video)|sexual\s+wellness|masturbat\w*|fleshlight|cock\s*ring|strapon|strap-on|bdsm|nipple\s+clamp|ball\s+gag|gag\s+ball|lubricant|lube|condoms?|prostate|g[\s-]?spot|clitoral|clitoris|erotica?|aphrodisiac|dominatrix|penis|(?:wand|personal|intimate|clitoral)\s+massager|pleasure\s+(?:toy|wand|ring|bead))s?\b/i;

// Unambiguous garment words. If any appears, the product is clothing even if
// it also contains a shoe/bag/jewellery substring.
const STRONG_CLOTHING_RE = /\b(jeans|chinos?|trousers?|leggings?|joggers?|sweatpants?|tracksuits?|t-?shirts?|shirts?|sweatshirts?|hoodies?|sweaters?|jumpers?|cardigans?|knitwear|pullovers?|blouses?|blazers?|waistcoats?|jumpsuits?|rompers?|dungarees?|overalls?|jackets?|coats?|skirts?|\bshorts\b|gowns?|nightgowns?|pyjamas?|pajamas?)\b/i;

// Unambiguous bag words. If any appears, the product is a bag even if it also
// contains a shoe substring (e.g. "Coach Derby Tote" — derby is a shoe word).
const STRONG_BAG_RE = /\b(handbag|tote bag|tote|clutch|backpack|rucksack|satchel|briefcase|messenger bag|crossbody|cross-body|shoulder bag|bucket bag|hobo bag|duffle|duffel|holdall|weekender|pochette|birkin|baguette bag)\b/i;

// Perfume / fragrance -> beauty (checked before jewellery brand words).
const PERFUME_RE = /\b(perfume|fragrances?|cologne|after\s?shave|eau de (parfum|toilette|cologne)|\bparfum\b|body mist|body spray)\b/i;
// Watches -> own category, but NOT watch accessories (straps/winders/cases).
const WATCH_RE = /\b(watch|watches|wristwatch|smartwatch|chronograph|timepiece)\b/i;
const WATCH_ACCESSORY_RE = /watch\s?(strap|band|winder|case|box|holder|stand|charger|cable|tool|pin|link)/i;

function mapCategory(typeText, genderText, genderHint, advertiser) {
  const n = (typeText || '').toLowerCase();
  if (NON_FASHION_RE.test(n)) return 'excluded';
  if (ADULT_RE.test(`${typeText || ''} ${genderText || ''}`)) return 'excluded';
  const byCat = {}; CATEGORY_RULES.forEach(r => { byCat[r.cat] = r.kw; });
  const hit = (kw) => kw && kw.some(k => n.includes(k));
  function genderCat() {
    let g = detectGender(`${typeText || ''} ${genderText || ''}`, genderHint);
    if (!g) g = storeGender(advertiser);
    return g === 'men' ? 'men' : 'women';
  }
  if (hit(byCat.kids)) return 'kids';
  if (STRONG_CLOTHING_RE.test(n)) return genderCat();
  if (PERFUME_RE.test(n)) return 'beauty';
  // Strong bag words win over shoe substrings, so "Coach Derby Tote" (derby is a
  // shoe word) classifies as a bag, not a shoe.
  if (STRONG_BAG_RE.test(n)) return 'bags';
  if (hit(byCat.shoes)) return 'shoes';
  if (hit(byCat.bags)) return 'bags';
  if (WATCH_RE.test(n) && !WATCH_ACCESSORY_RE.test(n)) return 'watches';
  if (hit(byCat.jewellery)) return 'jewellery';
  if (CLOTHING_HINT.some(k => n.includes(k))) return genderCat();
  if (hit(byCat.accessories)) return 'accessories';
  if (hit(byCat.beauty)) return 'beauty';
  return genderCat();
}

/* ============================================================================
 * SUBCATEGORY MAPPING — grouped by parent category.
 * A product only matches subcategory rules belonging to its own category, so
 * cross-category leakage is structurally impossible (a shoe cannot become
 * "Trousers", a bag cannot become "Heels"). Hardened word boundaries prevent
 * brand/feature collisions: \bcap\b (not "Cap Toe"), \bpants?\b (not
 * "Pantanetti"), \bring\b (not "earring"). Unmatched -> '' (shows under "All").
 * ========================================================================== */
const SHOE_SUBCATS = [
  [/sneaker|trainer/i, 'Sneakers'],
  [/ankle boot|chelsea boot|combat boot|western boot|over the knee|\bboots?\b|booties|bootie/i, 'Boots'],
  [/\bugg/i, 'Boots'],
  [/\bheel|pump/i, 'Heels'],
  [/sandal/i, 'Sandals'],
  [/espadrille/i, 'Espadrilles'],
  [/\bmule|slides|flip ?flop/i, 'Mules & Slides'],
  [/slipper/i, 'Slippers'],
  [/loafer|moccasin|derby|oxford|brogue|monk strap|lace ?up|dress shoe/i, 'Loafers'],
  [/ballet ?flat|\bflats?\b/i, 'Flats'],
];
const BAG_SUBCATS = [
  [/clutch/i, 'Clutches'],
  [/backpack|rucksack/i, 'Backpacks'],
  [/tote/i, 'Totes'],
  [/shoulder bag/i, 'Shoulder Bags'],
  [/cross ?body|mini bag|belt bag/i, 'Mini Bags'],
  [/wallet|purse|card ?holder/i, 'Wallets'],
  [/messenger|briefcase|satchel/i, 'Work Bags'],
  [/travel bag|suitcase|duffle|duffel|holdall|weekender/i, 'Travel Bags'],
  [/hand ?bag|\bbag\b|pochette|hobo|baguette/i, 'Shoulder Bags'],
];
const JEWELLERY_SUBCATS = [
  [/earring/i, 'Earrings'],
  [/necklace|pendant/i, 'Necklaces'],
  [/bracelet|anklet|bangle/i, 'Bracelets'],
  [/brooch/i, 'Brooches'],
  [/\bring\b|\brings\b/i, 'Rings'],
  [/cufflink/i, 'Cufflinks'],
];
const WATCH_SUBCATS = [
  [/watch|chronograph|timepiece/i, 'Watches'],
];

// Watches subdivide by WEARER (the reliable signal in watch feeds), not by a
// product-type word. Uses the name first, then the feed gender field.
const WATCH_MEN_RE = /\b(men|man|mens|gents|gentlemen|male)s?\b/i;
const WATCH_WOMEN_RE = /\b(women|woman|womens|ladies|lady|female)s?\b/i;
function watchSubcategory(text, genderField) {
  const n = text || '';
  if (WATCH_WOMEN_RE.test(n)) return "Women's Watches";
  if (WATCH_MEN_RE.test(n)) return "Men's Watches";
  const g = (genderField || '').toLowerCase();
  if (g === 'women' || g === 'female' || g === 'w' || g === 'f') return "Women's Watches";
  if (g === 'men' || g === 'male' || g === 'm') return "Men's Watches";
  return 'Unisex Watches';
}
const ACCESSORY_SUBCATS = [
  [/sunglass|eyewear|eyeglass/i, 'Sunglasses'],
  [/scarf|scarves|shawl|pashmina/i, 'Scarves'],
  [/\bbelt\b|belts/i, 'Belts'],
  [/\bhat\b|\bcap\b|beanie|bucket hat|bowler|fedora|baseball cap|\bcaps\b/i, 'Hats & Caps'],
  [/glove/i, 'Gloves'],
  [/bow ?tie|neck ?tie|\bties?\b/i, 'Ties'],
  [/\bsocks?\b/i, 'Socks'],
  [/tights|stocking|hosiery/i, 'Hosiery'],
  [/umbrella/i, 'Umbrellas'],
];
const BEAUTY_SUBCATS = [
  [/fragrance|perfume|parfum|cologne|eau de/i, 'Fragrance'],
  [/lipstick|mascara|foundation|eyeshadow|makeup|palette|blush|concealer|eyeliner/i, 'Makeup'],
  [/skincare|serum|moisturi|cleanser|lotion|\bcream\b/i, 'Skincare'],
  [/shampoo|conditioner|hair ?care/i, 'Haircare'],
];
// Clothing subcats — shared BASE (men + women + kids). Order matters: more
// specific garments are matched before generic ones. "dress shirt" must hit
// Shirts (not Dresses), so shirt/blouse rules come before the dress rule and
// the dress rule explicitly excludes "dress shirt"/"address".
const CLOTHING_BASE = [
  [/hoodie|sweatshirt/i, 'Hoodies & Sweatshirts'],
  [/dress shirt/i, 'Shirts'],
  [/blouse/i, 'Tops & Blouses'],
  [/t-?shirt|\btee\b|tank top/i, 'T-Shirts'],
  [/polo/i, 'Polos'],
  [/shirt/i, 'Shirts'],
  [/sweater|knit|pullover|jumper|cardigan/i, 'Knitwear & Sweaters'],
  [/blazer/i, 'Blazers'],
  [/coat|trench/i, 'Coats'],
  [/jacket|bomber|parka|windbreaker|gilet/i, 'Jackets'],
  [/jean/i, 'Jeans'],
  [/trouser|\bpants?\b|chino/i, 'Trousers & Pants'],
  [/\bshorts?\b/i, 'Shorts'],
  [/jumpsuit|romper|playsuit/i, 'Jumpsuits & Rompers'],
  [/\bsuit\b|tuxedo/i, 'Suits'],
  [/waistcoat|\bvest\b/i, 'Waistcoats'],
  [/panties|brief|underpant|boxer/i, 'Underwear'],
  [/swimsuit|bikini|swim ?wear|swim ?suit|swim ?trunk/i, 'Swimwear'],
  [/pajama|pyjama|nightgown|nightwear|sleepwear/i, 'Sleepwear'],
];
// Women-only additions (not shown for men).
const WOMEN_ONLY = [
  [/(?<!a)(?<!ad)dress(?:es)?/i, 'Dresses'],
  [/skirt/i, 'Skirts'],
  [/legging/i, 'Leggings'],
  [/\bbra\b|bras|lingerie|bodysuit|corset|camisole/i, 'Lingerie'],
  [/^tops|^top$/i, 'Tops & Blouses'],
];
const WOMEN_SUBCATS = WOMEN_ONLY.concat(CLOTHING_BASE);  // women: dress/skirt/etc. first
const MEN_SUBCATS = CLOTHING_BASE;                        // men: no dress/skirt/lingerie/legging
const KIDS_SUBCATS = CLOTHING_BASE.concat([[/(?<!a)(?<!ad)dress(?:es)?/i, 'Dresses']]);

const SUBCATS_BY_CAT = {
  shoes: SHOE_SUBCATS,
  bags: BAG_SUBCATS,
  jewellery: JEWELLERY_SUBCATS,
  watches: WATCH_SUBCATS,
  accessories: ACCESSORY_SUBCATS,
  beauty: BEAUTY_SUBCATS,
  women: WOMEN_SUBCATS,
  men: MEN_SUBCATS,
  kids: KIDS_SUBCATS,
};

// category-scoped: only matches subcategories valid for the given category.
function mapSubcategory(text, category, genderField) {
  const n = (text || '');
  if (category === 'watches') return watchSubcategory(n, genderField);
  const rules = SUBCATS_BY_CAT[category];
  if (!rules) return '';
  for (const [re, label] of rules) {
    if (re.test(n)) return label;
  }
  return '';
}

// Standard product shape every parser must emit
var STORE_ALIASES = {
  'watch home awin first': 'Watch Home',
  'shenzhen shibao jewelry co., ltd.': 'SilverBene',
  'shenzhen shibao jewelry co.,ltd.': 'SilverBene',
};
function aliasStore(n) { var k = (n || '').toLowerCase().trim(); return STORE_ALIASES[k] || n; }

function buildProduct(raw, opts) {
  const catName = raw.feed_category || '';
  const name = raw.name || '';
  const desc = raw.description || '';
  const typeText = `${catName} ${name}`;          // clean signal for product type + subcategory
  const detectedGender = detectGender(`${typeText} ${desc}`, raw.gender) || storeGender(opts.advertiser);
  const category = mapCategory(typeText, desc, raw.gender, opts.advertiser);
  return {
    id: `${opts.network}-${opts.advertiser || 'feed'}-${raw.id}`,
    name: name.trim(),
    description: desc.trim(),
    brand: (raw.brand || '').trim(),
    advertiser_name: aliasStore(raw.advertiser || opts.advertiser || raw.brand || ''),
    price: parseFloat(raw.price) || 0,
    price_old: raw.price_old ? parseFloat(raw.price_old) : null,
    currency: (raw.currency || 'EUR').trim(),
    image_url: (raw.images && raw.images[0]) || raw.image_url || '',
    images: raw.images || (raw.image_url ? [raw.image_url] : []),
    url: (raw.url || '').trim(),
    affiliate_url: (raw.url || '').trim(),
    category: category,
    subcategory: mapSubcategory(typeText, category, detectedGender || raw.gender),
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
