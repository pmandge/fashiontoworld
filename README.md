# FashionToWorld — Setup & Deployment Guide

## Stack
- **Frontend**: Vanilla HTML/CSS/JS (no build step needed)
- **Backend**: Node.js + Express (Admitad API proxy)
- **Hosting**: DigitalOcean, Vercel, or any Node host
- **Affiliate**: Admitad Publisher Network

---

## Step 1: Register Domain

1. Go to **Namecheap.com** or **GoDaddy.com**
2. Search for `fashiontoworld.co` (may be taken — check `fashionworld.co`, `fashionworld.store`, `thefashiontoworld.co`)
3. Purchase for ~$10–15/year
4. Point nameservers to your hosting provider after Step 3

---

## Step 2: Set Up Admitad Account

1. Go to [admitad.com/en/publishers/](https://www.admitad.com/en/publishers/)
2. Register as a **Publisher**
3. Add your website (use your domain, even if not live yet)
4. Navigate to: **Profile → API Settings → Create Application**
5. Set scope: `advcampaigns coupons feeds products deeplink_generator statistics`
6. Copy your **Client ID** and **Client Secret**
7. Note your **Website ID** from the dashboard URL

---

## Step 3: Host on DigitalOcean (Recommended — $6/mo)

### Option A: App Platform (Easiest)
```bash
# 1. Push code to GitHub
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/yourusername/fashionworld.git
git push -u origin main

# 2. Go to cloud.digitalocean.com → App Platform → Create App
# 3. Connect your GitHub repo
# 4. Set environment variables (from .env.example)
# 5. Deploy — DigitalOcean handles SSL + domain automatically
```

### Option B: Droplet (More control — $6/mo)
```bash
# Create Ubuntu 22.04 droplet, then SSH in:
ssh root@YOUR_SERVER_IP

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Upload your code (or git clone)
git clone https://github.com/yourusername/fashionworld.git
cd fashionworld

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env  # Fill in your Admitad credentials

# Start with PM2
pm2 start backend/server.js --name fashionworld
pm2 startup  # Auto-restart on reboot
pm2 save

# Install Nginx + SSL
sudo apt install nginx certbot python3-certbot-nginx -y
# Configure Nginx to proxy port 3000
# Run: sudo certbot --nginx -d fashiontoworld.co -d www.fashiontoworld.co
```

### Option C: Vercel (Free tier, frontend only)
> Note: For Vercel, the backend/server.js needs to be converted to Vercel serverless functions.
> Use DigitalOcean for the full stack.

---

## Step 4: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
ADMITAD_CLIENT_ID=abc123xyz
ADMITAD_CLIENT_SECRET=supersecretkey
ADMITAD_WEBSITE_ID=123456
PORT=3000
```

---

## Step 5: Verify API Connection

```bash
npm start
# Open http://localhost:3000/health
# Should return: {"status":"ok"}

# Test products endpoint:
curl http://localhost:3000/api/admitad/products?limit=5
```

---

## Step 6: Apply for Brand Programs

After your site is live, apply to top fashion advertisers in Admitad:

| Brand | Commission | Notes |
|-------|-----------|-------|
| ASOS | 5–8% | Fast approval |
| H&M | 6–9% | Global program |
| Farfetch | 6–10% | Luxury |
| Net-a-Porter | 7–12% | Apply manually |
| Zara | 5–7% | Via Admitad ES |
| Mango | 7–10% | Global |

---

## File Structure

```
fashionworld/
├── index.html              ← Homepage
├── pages/
│   ├── women.html          ← Women's category
│   ├── men.html            ← Men's category
│   ├── brands.html         ← Brands directory
│   ├── deals.html          ← Deals & coupons
│   ├── blog.html           ← Style blog
│   ├── about.html
│   ├── privacy.html
│   └── affiliate-disclosure.html
├── public/
│   ├── css/
│   │   ├── main.css        ← Global styles
│   │   └── home.css        ← Homepage styles
│   └── js/
│       ├── admitad-api.js  ← API integration + rendering
│       └── main.js         ← Navigation, utilities
├── backend/
│   └── server.js           ← Express API proxy + datafeed sync
├── package.json
├── .env.example
└── README.md
```

---

## Autopilot Datafeed Sync

The backend automatically syncs products from Admitad every **2 hours**:
- Pre-warms cache for all 6 main categories
- Refreshes coupon/deal listings
- Token auto-refreshes before expiry

To monitor:
```bash
pm2 logs fashionworld
```

---

## SEO Checklist

- [ ] Submit sitemap to Google Search Console
- [ ] Add `fashiontoworld.co` to Admitad dashboard
- [ ] Set up Google Analytics
- [ ] Add Open Graph meta tags (done in HTML)
- [ ] Create robots.txt
- [ ] Enable gzip on Nginx
