/**
 * ============================================================
 * FashionToWorld — Full Fashion Category Taxonomy
 * ============================================================
 * Top-level categories build the nav + mobile menu + homepage tiles.
 * Every leaf maps onto an Admitad product-feed query (`q`).
 * ============================================================
 */

const FASHION_TAXONOMY = {

  women: {
    label: 'Women', slug: 'women', icon: 'ti-dress',
    subcategories: {
      clothing: { label: 'Clothing', items: ['Dresses', 'Tops & Blouses', 'T-Shirts', 'Knitwear & Sweaters', 'Jeans', 'Trousers & Pants', 'Skirts', 'Shorts', 'Jumpsuits & Rompers', 'Suits & Tailoring', 'Loungewear', 'Co-ord Sets'] },
      outerwear: { label: 'Outerwear', items: ['Coats', 'Jackets', 'Blazers', 'Trench Coats', 'Puffer Jackets', 'Leather Jackets', 'Cardigans', 'Capes & Ponchos'] },
      lingerie: { label: 'Lingerie & Sleepwear', items: ['Bras', 'Underwear', 'Shapewear', 'Sleepwear', 'Robes', 'Hosiery'] },
      activewear: { label: 'Activewear', items: ['Leggings', 'Sports Bras', 'Workout Tops', 'Tracksuits', 'Yoga Wear', 'Running Gear', 'Gym Shorts'] },
      swimwear: { label: 'Swimwear', items: ['Bikinis', 'One-Piece', 'Cover-Ups', 'Beachwear'] },
      maternity: { label: 'Maternity', items: ['Maternity Dresses', 'Maternity Tops', 'Maternity Jeans', 'Nursing Wear'] },
    },
  },

  men: {
    label: 'Men', slug: 'men', icon: 'ti-shirt',
    subcategories: {
      clothing: { label: 'Clothing', items: ['T-Shirts', 'Shirts', 'Polo Shirts', 'Sweaters & Knitwear', 'Hoodies & Sweatshirts', 'Jeans', 'Trousers & Chinos', 'Shorts', 'Suits', 'Blazers', 'Loungewear', 'Co-ords'] },
      outerwear: { label: 'Outerwear', items: ['Coats', 'Jackets', 'Bomber Jackets', 'Leather Jackets', 'Puffer Jackets', 'Parkas', 'Gilets'] },
      activewear: { label: 'Activewear', items: ['Gym Tops', 'Joggers', 'Shorts', 'Tracksuits', 'Running Gear', 'Compression Wear'] },
      underwear: { label: 'Underwear & Socks', items: ['Boxers', 'Briefs', 'Undershirts', 'Socks', 'Loungewear'] },
      grooming: { label: 'Grooming', items: ['Fragrance', 'Skincare', 'Hair Care', 'Shaving'] },
    },
  },

  kids: {
    label: 'Kids', slug: 'kids', icon: 'ti-mood-kid',
    subcategories: {
      girls: { label: 'Girls', items: ['Dresses', 'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'] },
      boys: { label: 'Boys', items: ['T-Shirts', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'] },
      baby: { label: 'Baby (0-24m)', items: ['Bodysuits', 'Rompers', 'Sets', 'Sleepwear', 'Outerwear', 'Baby Shoes'] },
      toddler: { label: 'Toddler', items: ['Tops', 'Bottoms', 'Sets', 'Dresses', 'Shoes'] },
      school: { label: 'School Uniform', items: ['Shirts', 'Trousers', 'Skirts', 'Blazers', 'School Shoes', 'Backpacks'] },
    },
  },

  shoes: {
    label: 'Shoes', slug: 'shoes', icon: 'ti-shoe',
    subcategories: {
      women_shoes: { label: "Women's Shoes", items: ['Heels', 'Flats', 'Sandals', 'Ballet Flats', 'Sneakers', 'Boots', 'Ankle Boots', 'Knee-High Boots', 'Loafers', 'Mules', 'Wedges', 'Espadrilles', 'Slippers'] },
      men_shoes: { label: "Men's Shoes", items: ['Sneakers', 'Dress Shoes', 'Oxfords', 'Brogues', 'Boots', 'Chelsea Boots', 'Loafers', 'Sandals', 'Slides', 'Trainers', 'Boat Shoes'] },
      athletic: { label: 'Sneakers & Athletic', items: ['Running Shoes', 'Training Shoes', 'Basketball Shoes', 'Lifestyle Sneakers', 'Skate Shoes', 'Hiking Boots', 'Football Boots'] },
      kids_shoes: { label: "Kids' Shoes", items: ['Trainers', 'School Shoes', 'Sandals', 'Boots', 'Baby Shoes'] },
    },
  },

  bags: {
    label: 'Bags', slug: 'bags', icon: 'ti-briefcase',
    subcategories: {
      women_bags: { label: "Women's Bags", items: ['Handbags', 'Tote Bags', 'Crossbody Bags', 'Shoulder Bags', 'Clutches', 'Bucket Bags', 'Mini Bags', 'Satchels', 'Hobo Bags', 'Evening Bags'] },
      men_bags: { label: "Men's Bags", items: ['Messenger Bags', 'Briefcases', 'Backpacks', 'Holdalls', 'Crossbody Bags', 'Pouches'] },
      backpacks: { label: 'Backpacks', items: ['Everyday Backpacks', 'Laptop Backpacks', 'Mini Backpacks', 'Designer Backpacks'] },
      travel: { label: 'Travel & Luggage', items: ['Suitcases', 'Cabin Bags', 'Duffel Bags', 'Weekend Bags', 'Travel Accessories'] },
      wallets: { label: 'Wallets & Purses', items: ['Card Holders', 'Coin Purses', "Women's Wallets", "Men's Wallets", 'Travel Wallets'] },
    },
  },

  jewellery: {
    label: 'Jewellery & Watches', slug: 'jewellery', icon: 'ti-diamond',
    subcategories: {
      jewellery: { label: 'Jewellery', items: ['Necklaces', 'Earrings', 'Rings', 'Bracelets', 'Anklets', 'Brooches', 'Charms', 'Pendants', 'Body Jewellery'] },
      fine: { label: 'Fine Jewellery', items: ['Gold Jewellery', 'Diamond Jewellery', 'Gemstone', 'Pearl', 'Engagement Rings', 'Wedding Bands'] },
      womens_watches: { label: "Women's Watches", items: ['Analog', 'Dress Watches', 'Sport Watches', 'Luxury Watches', 'Bracelet Watches'] },
      mens_watches: { label: "Men's Watches", items: ['Analog', 'Chronograph', 'Diver Watches', 'Dress Watches', 'Luxury Watches'] },
      smartwatches: { label: 'Smartwatches', items: ['Fitness Trackers', 'Smart Watches', 'Hybrid Watches'] },
      watch_acc: { label: 'Watch Accessories', items: ['Watch Straps', 'Watch Boxes', 'Watch Winders'] },
    },
  },

  accessories: {
    label: 'Accessories', slug: 'accessories', icon: 'ti-sunglasses',
    subcategories: {
      eyewear: { label: 'Sunglasses & Eyewear', items: ['Sunglasses', 'Optical Frames', 'Blue-Light Glasses', 'Reading Glasses'] },
      belts: { label: 'Belts', items: ["Women's Belts", "Men's Belts", 'Leather Belts', 'Statement Belts'] },
      scarves: { label: 'Scarves & Wraps', items: ['Silk Scarves', 'Winter Scarves', 'Shawls', 'Bandanas'] },
      hats: { label: 'Hats & Caps', items: ['Beanies', 'Caps', 'Bucket Hats', 'Sun Hats', 'Fedoras', 'Berets'] },
      hair: { label: 'Hair Accessories', items: ['Clips', 'Headbands', 'Scrunchies', 'Hair Ties', 'Claw Clips'] },
      gloves: { label: 'Gloves & Winter', items: ['Leather Gloves', 'Knit Gloves', 'Touchscreen Gloves'] },
      formal: { label: 'Ties & Formal', items: ['Ties', 'Bow Ties', 'Pocket Squares', 'Cufflinks', 'Tie Clips', 'Suspenders'] },
      tech: { label: 'Tech Accessories', items: ['Phone Cases', 'AirPod Cases', 'Laptop Sleeves', 'Tech Pouches'] },
      other: { label: 'Other', items: ['Keychains', 'Umbrellas', 'Face Masks', 'Tights & Socks'] },
    },
  },

  beauty: {
    label: 'Beauty', slug: 'beauty', icon: 'ti-sparkles',
    subcategories: {
      makeup: { label: 'Makeup', items: ['Face', 'Eyes', 'Lips', 'Brows', 'Makeup Sets', 'Tools & Brushes'] },
      skincare: { label: 'Skincare', items: ['Cleansers', 'Moisturizers', 'Serums', 'Masks', 'Sunscreen', 'Eye Care'] },
      fragrance: { label: 'Fragrance', items: ["Women's Perfume", "Men's Cologne", 'Unisex', 'Gift Sets', 'Body Mists'] },
      haircare: { label: 'Hair Care', items: ['Shampoo', 'Conditioner', 'Treatments', 'Styling', 'Tools'] },
      nails: { label: 'Nails', items: ['Polish', 'Nail Care', 'Press-Ons', 'Tools'] },
    },
  },

};

function flattenTaxonomy(tax) {
  tax = tax || FASHION_TAXONOMY;
  const out = [];
  for (const topKey in tax) {
    const top = tax[topKey];
    for (const subKey in top.subcategories) {
      const sub = top.subcategories[subKey];
      sub.items.forEach(function (item) {
        out.push({
          top: top.label, topSlug: top.slug,
          group: sub.label, groupSlug: subKey,
          item: item,
          slug: top.slug + '/' + subKey + '/' + item.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          q: top.label + ' ' + item,
        });
      });
    }
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FASHION_TAXONOMY: FASHION_TAXONOMY, flattenTaxonomy: flattenTaxonomy };
}
if (typeof window !== 'undefined') {
  window.FASHION_TAXONOMY = FASHION_TAXONOMY;
  window.flattenTaxonomy = flattenTaxonomy;

  /* ---- Live product count in the nav search box (every page) ----
     Replaces the hardcoded "169,000+" with the real current total so the
     search box is always accurate, not stale. */
  (function () {
    var base = window.API_BASE || '';
    fetch(base + '/api/products/status').then(function (r) { return r.json(); }).then(function (d) {
      if (!d) return;
      var tot = d.total || 0;
      if (tot) {
        document.querySelectorAll('.nav-search input').forEach(function (i) {
          i.placeholder = 'Search ' + tot.toLocaleString() + '+ products\u2026';
        });
        document.querySelectorAll('.js-prodcount').forEach(function (e) { e.textContent = tot.toLocaleString(); });
      }
      if (d.brands) document.querySelectorAll('.js-brandcount').forEach(function (e) { e.textContent = d.brands.toLocaleString(); });
    }).catch(function () {});
  })();
}
