# FashionToWorld — Simple Deploy Guide (no coding needed)

Your domain: **fashiontoworld.co**

---

## ⚡ FASTEST WAY TO SEE IT LIVE (2 minutes, free)

1. Unzip `fashiontoworld.zip` on your computer.
2. Go to **app.netlify.com/drop**
3. Drag the **`fashiontoworld` folder** onto the page.
4. Done — Netlify gives you a live link instantly (e.g. `random-name.netlify.app`).

> At this stage the site shows sample fashion products/deals so you can
> check the design. To show REAL Admitad deals, do Step B below.

---

## 🅱️ TURN ON REAL ADMITAD DEALS

1. After dropping the site, create a free Netlify account (it offers to save your site).
2. In Netlify, open your site → **Site configuration → Environment variables → Add**.
3. Add these three (get them from your Admitad publisher dashboard):
   - `ADMITAD_CLIENT_ID`
   - `ADMITAD_CLIENT_SECRET`
   - `ADMITAD_WEBSITE_ID`
4. Click **Deploys → Trigger deploy → Deploy site**.
5. Real fashion-only coupons and products now load automatically.

---

## 🌐 CONNECT YOUR DOMAIN (fashiontoworld.co)

1. In Netlify: **Domain management → Add a domain** → type `fashiontoworld.co`.
2. Netlify shows 2–4 DNS records (or nameservers).
3. Log in to wherever you bought the domain → DNS settings → paste those in.
4. Wait 10–60 min. SSL (the padlock) turns on automatically and free.

---

## ✅ WHAT'S ALREADY HANDLED

- **Fashion only** — coupons/deals are filtered to fashion stores; electronics,
  travel, food, finance, etc. are blocked automatically.
- **Product clicks** — go through your Admitad tracked link straight to the
  real store (Zara, ASOS, Namshi…), so you earn commission.
- **Auto language by country** — visitors are detected by IP and shown the
  right language + currency (UAE → Arabic + AED, etc.).
- **Mobile friendly** — fully responsive.
- **Fast** — served from Netlify's global CDN with asset caching.

---

## 💸 HOSTING RECOMMENDATION (fast + cheap)

| Option | Speed | Cost | Best for |
|--------|-------|------|----------|
| **Netlify (recommended)** | Very fast (global CDN) | **Free** to start | Everything — site + Admitad engine in one place |
| Cloudflare Pages | Very fast | Free | Alternative to Netlify |
| Vercel | Very fast | Free tier | Alternative to Netlify |
| DigitalOcean | Fast | ~$6/mo | If you outgrow free tiers |

**Recommendation:** Stay on **Netlify's free tier**. It includes the global
CDN (fast for your worldwide audience), free SSL, your custom domain, and
125,000 free serverless calls/month — plenty to run the Admitad engine.
You only need to pay anything once you get very high traffic.
