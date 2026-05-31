# Hosting & Admitad Verification — Simple Guide

## Part 1 — Which host? Use Netlify

For an easy, no-IT-skills start, use **Netlify** (free).

Why Netlify over the others:
- Drag-and-drop publishing (no command line)
- Free hosting, free SSL padlock, free custom domain
- Runs your affiliate data engine too
- You can move to DigitalOcean later if you ever want — same files

DigitalOcean is great but slightly more technical; start simple, upgrade later.

---

## Part 2 — Get your real domain working FIRST

Admitad verifies your **real domain** (fashiontoworld.co), so connect it
before verifying.

1. Deploy your site to Netlify (drag the folder onto app.netlify.com/drop,
   or connect GitHub).
2. In Netlify: **Domain management → Add a domain →** type
   `fashiontoworld.co`.
3. Netlify shows DNS records. Paste them at your domain registrar's DNS page.
4. Wait 10–60 minutes. The padlock (SSL) turns on automatically.
5. Confirm `https://fashiontoworld.co` loads your site.

---

## Part 3 — Verify ownership with Admitad (meta tag method)

1. In Admitad, when adding/verifying your website, choose the
   **meta tag** (HTML tag) verification method.
2. Admitad gives you a line that looks like:
   ```
   <meta name="admitad-verification" content="a1b2c3d4e5..." />
   ```
   Copy that whole line.
3. Open your site's `index.html` file. Near the top you'll find:
   ```
   <!-- PASTE_ADMITAD_META_TAG_HERE -->
   ```
4. Replace that line with the meta tag Admitad gave you.
5. Re-publish:
   - **Drag-drop method:** drop the updated folder on Netlify again.
   - **GitHub method:** commit the change; Netlify republishes automatically.
6. Back in Admitad, click **Verify / Check**. It reads your homepage,
   finds the tag, and confirms ownership.

> Tip: After publishing, you can confirm the tag is live by visiting your
> site, right-clicking → "View Page Source," and searching (Ctrl+F) for
> "admitad". If you see it, Admitad will too.

---

## Part 4 — Other verification methods (if you prefer)

Admitad sometimes also offers:
- **HTML file upload** — they give you a file (e.g. `admitad_xxx.html`) to
  place in your site's main folder. With Netlify, just add that file next to
  `index.html` and re-publish, then it's reachable at
  `fashiontoworld.co/admitad_xxx.html`.
- **DNS record** — you add a TXT record at your domain registrar. Works too,
  but the meta tag is usually the simplest.

The meta tag method (Part 3) is recommended for you.

---

## Quick order of operations

1. Deploy to Netlify
2. Connect fashiontoworld.co + wait for SSL
3. Paste Admitad meta tag into index.html → re-publish
4. Click Verify in Admitad
5. Add your API credentials (environment variables)
6. Join fashion advertiser programs in Admitad
7. Open /pages/api-status.html to confirm data is flowing
