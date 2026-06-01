/**
 * ============================================================
 * FashionToWorld — Currency Conversion
 * ============================================================
 * Converts product/coupon prices into the visitor's local currency
 * using live exchange rates (refreshed daily, cached in memory).
 *
 * Source: open.er-api.com (free, no API key needed). If it's
 * unavailable, we fall back to showing the original currency
 * (never a wrong number).
 *
 * Country → currency mapping lives in geo detection already; this
 * service just does the math: amount * rate, rounded nicely.
 * ============================================================
 */

const https = require('https');

let rates = null;          // { USD:1, EUR:0.92, AED:3.67, ... } base USD
let ratesAt = 0;
const RATE_TTL = 24 * 60 * 60 * 1000; // refresh daily
const BASE = 'USD';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function ensureRates() {
  if (rates && Date.now() - ratesAt < RATE_TTL) return rates;
  try {
    const data = await fetchJson(`https://open.er-api.com/v6/latest/${BASE}`);
    if (data && data.rates) {
      rates = data.rates;
      ratesAt = Date.now();
      console.log('[Currency] Rates refreshed (base USD)');
    }
  } catch (e) {
    console.warn('[Currency] Rate fetch failed, using last/none:', e.message);
  }
  return rates;
}

// Currency symbols for nice display
const SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: '﷼', INR: '₹',
  AUD: 'A$', CAD: 'C$', BRL: 'R$', JPY: '¥', CNY: '¥', RUB: '₽',
  KWD: 'KD', QAR: 'QR', TRY: '₺', SGD: 'S$', CHF: 'CHF',
};

function symbolFor(cur) { return SYMBOLS[cur] || (cur + ' '); }

/**
 * Convert an amount from one currency to another.
 * Returns { amount, currency, symbol, formatted } or null if not possible.
 */
async function convert(amount, fromCurrency, toCurrency) {
  if (!amount || !toCurrency || fromCurrency === toCurrency) {
    return { amount, currency: fromCurrency, symbol: symbolFor(fromCurrency), formatted: format(amount, fromCurrency) };
  }
  const r = await ensureRates();
  if (!r || !r[fromCurrency] || !r[toCurrency]) {
    // can't convert reliably → keep original (never show a wrong number)
    return { amount, currency: fromCurrency, symbol: symbolFor(fromCurrency), formatted: format(amount, fromCurrency) };
  }
  // rates are per-USD; convert via USD
  const usd = amount / r[fromCurrency];
  const converted = usd * r[toCurrency];
  const rounded = Math.round(converted * 100) / 100;
  return { amount: rounded, currency: toCurrency, symbol: symbolFor(toCurrency), formatted: format(rounded, toCurrency) };
}

function format(amount, currency) {
  if (amount == null) return '';
  const sym = symbolFor(currency);
  const n = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return sym + n;
}

module.exports = { convert, ensureRates, symbolFor, format };
