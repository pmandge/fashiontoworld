import io, sys

path = 'backend/services/parsers/generic-csv.js'
s = io.open(path, encoding='utf-8').read()

# We replace the body of the rl.on('line', ...) handler so that lines are
# buffered until their quote count is balanced (handles fields containing
# embedded newlines, e.g. LuxeFashion size-guide descriptions).

old = """      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      rl.on('line', (line) => {
        if (!header) {
          header = splitCsvLine(line, delim).map(h => h.trim().replace(/^"|"$/g, ''));
          header.forEach((h, i) => { idx[h] = i; });
          return;
        }
        const f = splitCsvLine(line, delim);
        const get = (key) => { const col = cols[key]; return col != null && idx[col] != null ? (f[idx[col]] || '').trim() : ''; };
        const name = get('name');
        const url = get('url');
        if (!name || !url) return;
        // Prefer the merchant's direct, full-resolution image; fall back to the
        // network's proxied thumbnail only if the merchant didn't supply one.
        const image = get('image_url') || get('image_url_alt');
        onRaw({
          id: get('id') || String(count),
          name, description: get('description'),
          brand: get('brand'),
          price: get('price'), price_old: get('price_old'),
          currency: get('currency') || opts.currency || 'EUR',
          images: image ? [image] : [],
          url,
          advertiser: get('advertiser'),
          feed_category: get('category'),
          gender: get('gender'), color: get('color'), size: get('size'),
        });
        count++;
        if (opts.max && count >= opts.max) { rl.close(); res.destroy(); }
      });"""

new = """      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      // CSV fields may contain newlines inside quoted values (e.g. multi-line
      // size guides). readline splits on every newline, so we buffer raw lines
      // until the running quote count is balanced (even) before treating the
      // accumulated text as one complete logical CSV row.
      let pending = '';
      function quoteCount(str) { let n = 0; for (let i = 0; i < str.length; i++) { if (str[i] === '"') n++; } return n; }
      function handleRow(rowText) {
        if (!header) {
          header = splitCsvLine(rowText, delim).map(h => h.trim().replace(/^"|"$/g, ''));
          header.forEach((h, i) => { idx[h] = i; });
          return;
        }
        const f = splitCsvLine(rowText, delim);
        const get = (key) => { const col = cols[key]; return col != null && idx[col] != null ? (f[idx[col]] || '').trim() : ''; };
        const name = get('name');
        const url = get('url');
        if (!name || !url) return;
        // Prefer the merchant's direct, full-resolution image; fall back to the
        // network's proxied thumbnail only if the merchant didn't supply one.
        const image = get('image_url') || get('image_url_alt');
        onRaw({
          id: get('id') || String(count),
          name, description: get('description'),
          brand: get('brand'),
          price: get('price'), price_old: get('price_old'),
          currency: get('currency') || opts.currency || 'EUR',
          images: image ? [image] : [],
          url,
          advertiser: get('advertiser'),
          feed_category: get('category'),
          gender: get('gender'), color: get('color'), size: get('size'),
        });
        count++;
        if (opts.max && count >= opts.max) { rl.close(); res.destroy(); }
      }
      rl.on('line', (line) => {
        pending = pending ? (pending + '\\n' + line) : line;
        // Odd number of quotes => we're inside a quoted field that contains a
        // newline; keep buffering until quotes balance.
        if (quoteCount(pending) % 2 !== 0) return;
        const rowText = pending;
        pending = '';
        handleRow(rowText);
      });"""

if s.count(old) != 1:
    print('ABORT: handler block not matched exactly, found', s.count(old))
    sys.exit(1)

s = s.replace(old, new)
io.open(path, 'w', encoding='utf-8').write(s)
print('OK: generic-csv now buffers multi-line quoted CSV rows')
