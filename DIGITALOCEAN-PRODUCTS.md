# Real Products on DigitalOcean — Step-by-Step Guide

Your site can now import **real products** from Admitad product feeds
(Symbol Fashion ~76k, Italo Jewelry ~2k, and more as they populate).

Because product feeds are large, this part runs on a small **DigitalOcean**
server with a built-in database. Cost: about **$6/month**.

This guide gets you from zero to live products. Take it one step at a time.

---

## What you'll end up with

- A small always-on server running your backend (`backend/server.js`)
- A SQLite database storing all imported products (no separate DB to manage)
- A daily automatic import from your Admitad feeds
- Your existing product sections filled with real items

Your **Netlify site stays as-is** for the pages + coupons. The DigitalOcean
server only handles the heavy product feeds. (Later we point your product
sections at the DigitalOcean server's address.)

---

## COST BREAKDOWN (honest, for 150k+ products)

| Item | Cost |
|------|------|
| DigitalOcean Droplet (2GB RAM) | ~$12/month |
| Managed PostgreSQL (basic) | ~$15/month |
| **Total** | **~$27/month** |

PostgreSQL is recommended at 150k+ products: it handles the daily import +
many visitors browsing at once far more reliably than a file database, and
"managed" means DigitalOcean handles backups & updates for you.

> Want to start cheaper? Leave DATABASE_URL unset and it uses SQLite on the
> droplet (~$12/mo total). You can switch to PostgreSQL later by just adding
> the DATABASE_URL — no code changes.

---

## PART 1 — Create the DigitalOcean droplet

1. Sign up at **digitalocean.com** (they often have free credit for new users).
2. Click **Create → Droplets**.
3. Choose:
   - **Region:** closest to your audience (e.g. Frankfurt or Bangalore for UAE)
   - **Image:** Ubuntu (latest LTS)
   - **Droplet type:** Basic
   - **CPU:** Regular, **$12/mo** (2GB RAM) — needed to parse large feeds
   - **Authentication:** Password (simplest) — set a strong root password
4. Click **Create Droplet**. Note the **IP address** it gives you.

### Also create a managed PostgreSQL database
1. DigitalOcean → **Create → Databases**.
2. Choose **PostgreSQL**, the basic plan (~$15/mo), same region as your droplet.
3. Once created, open it → **Connection details** → copy the **connection string**
   (looks like `postgresql://user:pass@host:25060/db?sslmode=require`).
   You'll paste this as `DATABASE_URL` in Part 3.

---

## PART 2 — Get the code onto the droplet

The easiest no-fuss way is to pull from your GitHub repo.

1. In DigitalOcean, open your droplet → **Console** (browser-based terminal —
   no software to install).
2. Log in as `root` with the password you set.
3. Run these commands one block at a time (copy/paste):

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git build-essential

# Get your code
git clone https://github.com/pmandge/fashiontoworld.git
cd fashiontoworld

# Install dependencies
npm install
```

> If your repo is private, GitHub will ask for a username + a personal access
> token. I can walk you through making one if needed.

---

## PART 3 — Add your feed URLs + credentials

1. Create an environment file:

```bash
nano .env
```

2. Paste this (replace with your real values), then save (Ctrl+O, Enter, Ctrl+X):

```
PORT=8080
ADMITAD_CLIENT_ID=your_client_id
ADMITAD_CLIENT_SECRET=your_client_secret
ADMITAD_WEBSITE_ID=2947468
ADMITAD_BASE64_HEADER=your_base64_header

# PostgreSQL connection string from DigitalOcean (recommended for 150k+)
DATABASE_URL=postgresql://user:pass@host:25060/db?sslmode=require

# Optional: a logo.dev token for higher brand-logo hit rate (otherwise uses free fallback)
# LOGO_API_TOKEN=your_token

# Product feeds: advertiser|XML_URL  (comma-separated for multiple)
PRODUCT_FEEDS=Symbol Fashion|https://export.admitad.com/.../export_adv_products/?user=...&code=...&format=xml,Italo Jewelry|https://export.admitad.com/.../?...&format=xml
```

> Get each feed's XML URL from Admitad → program → Product Feeds →
> "Download feeds in XML" (for ad space "Fashion to World").

---

## PART 4 — Start the server

```bash
# Install a process manager so it runs 24/7 and restarts on reboot
npm install -g pm2

# Start the backend
pm2 start backend/server.js --name fashiontoworld
pm2 save
pm2 startup   # follow the printed instruction to enable auto-start
```

The product sync runs automatically ~8 seconds after start, then daily.
To import immediately, you can also visit:
`http://YOUR_DROPLET_IP:8080/api/products/sync-now`

Check progress:
`http://YOUR_DROPLET_IP:8080/api/products/status`
(shows total products imported + per-category counts)

---

## PART 5 — Point your website at the server (unified: coupons + products)

Your DigitalOcean server now serves BOTH coupons and products. To switch the
website over from Netlify to DigitalOcean, you change **one line**.

### Step 1 — Give the server an HTTPS web address (required)
Your site is `https://`, so the API must be `https://` too (browsers block
mixed http/https). The clean way is a subdomain:

1. In your DNS (Netlify DNS, since your domain uses it), add an **A record**:
   - Name: `api`
   - Value: your droplet's IP address
   This makes `api.fashiontoworld.co` point to your server.
2. On the droplet, install Caddy (gives automatic free HTTPS):
   ```bash
   apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
   apt update && apt install -y caddy
   ```
3. Tell Caddy to forward your subdomain to the app (port 8080):
   ```bash
   echo 'api.fashiontoworld.co {
     reverse_proxy localhost:8080
   }' > /etc/caddy/Caddyfile
   systemctl restart caddy
   ```
   Caddy fetches a free SSL certificate automatically. Test:
   `https://api.fashiontoworld.co/health`

### Step 2 — Point the website at it
1. Edit `public/js/api-config.js` (on GitHub, in your browser):
   ```js
   window.API_BASE = 'https://api.fashiontoworld.co';
   ```
2. Commit. Netlify redeploys your front-end. Now coupons AND products both
   load from your DigitalOcean server.

### Step 3 — (Optional) retire the Netlify function
Once everything works via DigitalOcean, the Netlify `api.js` function is no
longer used by the site. You can leave it (harmless) or remove it later.

> Rollback is easy: set `window.API_BASE = ''` to instantly go back to the
> Netlify function if anything's off.

---

## Quick health checks

| URL | What it shows |
|-----|---------------|
| `http://IP:8080/health` | Server is up |
| `http://IP:8080/api/products/status` | How many products imported |
| `http://IP:8080/api/admitad/products?category=women&limit=5` | Sample women's products |

---

## If something goes wrong

- `pm2 logs fashiontoworld` — shows what the server is doing / any errors
- `pm2 restart fashiontoworld` — restart after changing `.env`
- Feed import is slow the first time (76k products) — give it a few minutes;
  check `/api/products/status` to watch the count climb.

When you reach any step that looks different or errors out, copy the message
and I'll tell you exactly what to do.
