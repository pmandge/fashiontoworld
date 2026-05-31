# Adding More Affiliate Networks — Simple Guide

Your site already supports **multiple affiliate networks at once**. They all
feed into one combined list of fashion deals and products. Visitors never see
which network a deal came from — it just works.

---

## Networks ready to plug in

| Network | Status | What you add |
|---------|--------|--------------|
| **Admitad** | ✅ Built-in | 3 keys (already in your setup) |
| **Awin** | 🔌 Ready | `AWIN_API_TOKEN`, `AWIN_PUBLISHER_ID` |
| **CJ (Commission Junction)** | 🔌 Ready | `CJ_API_TOKEN`, `CJ_WEBSITE_ID` |
| **Rakuten** | 🔌 Ready | `RAKUTEN_API_TOKEN` |
| Any other | ➕ Easy to add | ~15 lines of code (template provided) |

"Ready" = the slot exists; you just paste your keys to switch it on.

---

## How to turn on a network (e.g. Awin)

1. Sign up as a publisher with the network and get your API key.
2. In your hosting dashboard (Netlify or DigitalOcean), open
   **Environment variables**.
3. Add the network's keys, for example:
   - `AWIN_API_TOKEN` = your token
   - `AWIN_PUBLISHER_ID` = your publisher id
4. Redeploy (or just restart). That network now feeds the site automatically.

That's the whole process. No code editing needed for the built-in networks.

---

## Does it update automatically? — YES

You do **not** trigger anything manually. The site runs an **automatic sync**:

- On startup, and then **every 2 hours**, it re-pulls fresh coupons and
  products from *every* enabled network.
- Results are merged, filtered to fashion-only, de-duplicated (so the same
  Zara code from two networks shows once), and cached.
- Visitors are served the cached data instantly, so pages stay fast.

If you ever want a different refresh interval, change `SYNC_INTERVAL_MS`
in `backend/sync.js` (default: 2 hours).

---

## Adding a brand-new network not in the list

Open `backend/services/aggregator.js` and copy the Awin template. Each
adapter just needs to return data in the standard shape:

```js
function myNetworkAdapter() {
  return {
    name: 'mynetwork',
    enabled: !!process.env.MYNETWORK_TOKEN,
    async getCoupons() {
      // call the network's API, return an array of:
      // { id, name, advertiser_name, promocode, url, categories, network }
    },
    async getProducts() { return []; },
  };
}
```

Then add it to the `this.adapters = [ ... ]` list. It auto-joins the feed
when its token is present.

---

## Why one combined feed is better

- **More coverage** — different networks carry different brands. Together you
  get far more fashion deals than any single network.
- **Best price wins** — when the same brand runs offers on two networks, you
  can surface the better one.
- **Resilience** — if one network's API is down, the others keep the site full.
