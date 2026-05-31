# Managing FashionToWorld — Simple Guide (no coding)

This explains, in plain language, how to publish your site, keep it updated,
and add affiliate networks — without being technical.

---

## PART 1 — The easiest way to publish & manage

For a non-technical owner, the simplest setup is **Netlify connected to GitHub**.
It sounds technical but it's a one-time, 20-minute setup, and afterwards
updating your site is as easy as editing a file in your web browser.

### One-time setup
1. Create a free account at **github.com**.
2. Create a free account at **netlify.com** and click **"Add new site →
   Import from GitHub"**.
3. Upload your `fashiontoworld` folder to GitHub (GitHub's website has an
   **"uploading an existing file"** button — just drag the folder in).
4. In Netlify, pick that GitHub repository and click **Deploy**.
5. Add your affiliate keys under **Site settings → Environment variables**.

Done. Your site is live with a free address and free SSL padlock.

### Why this is the easy option
After setup, whenever you want to change something, you edit the file on
**github.com** directly in the browser, click **Commit**, and Netlify
**automatically republishes within a minute**. No software to install, no
command line, nothing technical.

> Prefer the absolute simplest (but more manual) option? You can keep using
> **app.netlify.com/drop** and drag the folder each time you make a change.
> The GitHub way is better only because updates become one-click.

### When you're ready for DigitalOcean
DigitalOcean App Platform works the same way: connect the GitHub repo, add
your environment variables, deploy. It costs about $5/month and is a great
choice once traffic grows. The same GitHub repo works for both — you can
switch hosts anytime.

---

## PART 2 — Updating content that is NOT from the affiliate feeds

Your product and deal listings update automatically from the affiliate
networks. But text like your headline, banners, and section titles is yours
to control. All of it lives in ONE file:

### `public/js/site-content.js`

Open it (on GitHub, click the file then the pencil ✏️ icon). You'll see
plain text in quotes, for example:

```
title_line2: "Best Fashion",
```

Change the words inside the quotes, keep the quotes and comma, click
**Commit**. Within a minute the site shows your new text. That's it.

From this one file you can change:
- The hero headline, subtitle, and buttons
- The announcement bar at the very top (set it to "" to hide it)
- All section titles ("Find Your Style", "Trending This Week", etc.)
- The footer tagline and your social media links
- The stat numbers (200+ Brands, etc.)

### Updating blog articles
Blog posts are individual files in the `pages/` folder (e.g.
`blog-trends-2025.html`). To edit an article's words, open that file and edit
the text. To add a new article, copy an existing one, rename it, and change
the content. (Happy to add a guide for this when you want to start blogging
regularly.)

---

## PART 3 — Adding affiliate networks (fully dynamic)

You can run **many networks at once** — they all feed one combined,
fashion-only list of deals. Adding one is just pasting keys:

### To switch on a network
1. Sign up as a publisher (Awin, CJ, Rakuten, Impact, etc.) and get its
   API keys.
2. In Netlify (or DigitalOcean) → **Environment variables**, add that
   network's keys. The required key names for each network are listed in
   `backend/config/networks.js`.
3. Redeploy. The network turns on automatically.

### Networks ready out of the box
| Network | Keys to add |
|---------|-------------|
| Admitad | `ADMITAD_CLIENT_ID`, `ADMITAD_CLIENT_SECRET`, `ADMITAD_WEBSITE_ID` |
| Awin | `AWIN_API_TOKEN`, `AWIN_PUBLISHER_ID` |
| CJ | `CJ_API_TOKEN`, `CJ_WEBSITE_ID` |
| Rakuten | `RAKUTEN_API_TOKEN`, `RAKUTEN_CLIENT_ID`, `RAKUTEN_CLIENT_SECRET` |
| Impact | `IMPACT_ACCOUNT_SID`, `IMPACT_AUTH_TOKEN` |

### Adding a network not on the list
Open `backend/config/networks.js`, copy the `TEMPLATE` block at the bottom,
rename it, and fill in the network's API URL and field names (their docs tell
you these). It then joins the feed automatically. No other code to touch.

---

## PART 4 — Does the data update automatically?

**Yes — completely automatic.** You never press a button.

- On startup and then **every 2 hours**, the site pulls fresh coupons and
  products from every connected network.
- It merges them, keeps **only fashion**, removes duplicates, and caches the
  result so pages stay fast.
- To change how often it refreshes, edit `SYNC_INTERVAL_MS` in
  `backend/sync.js`.

---

## Quick reference: what updates how

| Content | How it updates |
|---------|----------------|
| Products & deals | Automatic, every 2 hours from affiliate networks |
| Headlines, banners, section text | You edit `site-content.js` (1 min) |
| Blog articles | You edit files in `pages/` |
| Categories & menus | Already complete; edit `categories.js` to change |
| Adding a network | Paste API keys in hosting settings |
