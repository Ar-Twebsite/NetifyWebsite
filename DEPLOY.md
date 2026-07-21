# Deploying Netify (GitHub Pages + Aruba domain)

The site is a plain static site (HTML/CSS/JS). No build step.

## 1. Publish on GitHub Pages
1. Commit & push these files to the default branch (`main`).
2. GitHub repo → **Settings → Pages**:
   - **Source:** Deploy from a branch → `main` / `/ (root)`.
   - **Custom domain:** `netifytraining.com` (the `CNAME` file already sets this).
   - Tick **Enforce HTTPS** (after DNS resolves; may take an hour for the cert).

## 2. DNS at Aruba (panel → your domain → DNS records)
Point the apex domain and `www` at GitHub Pages.

**Apex `netifytraining.com` — four A records:**
```
A   @   185.199.108.153
A   @   185.199.109.153
A   @   185.199.110.153
A   @   185.199.111.153
```
Optional IPv6 (AAAA), same `@`:
```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

**`www` subdomain — CNAME:**
```
CNAME   www   ar-twebsite.github.io.
```
> Remove any pre-existing Aruba "parking" A record / redirect for `@` first.
> DNS can take from minutes up to 24h to propagate.

## 3. Verify after it's live
- `https://netifytraining.com/` and `/it/` load, HTTPS padlock present.
- Paste the URL into **LinkedIn Post Inspector**, **Facebook Sharing Debugger**, and WhatsApp/Slack → the 1200×630 card + title + description appear. (If LinkedIn cached an old empty preview, the Inspector forces a re-scrape.)
- **Google Rich Results Test** on both URLs → FAQ structured data detected.
- Submit `https://netifytraining.com/sitemap.xml` in **Google Search Console**.

## Before publishing — confirm these claims are true (marked TODO in the HTML)
- Trust strip + FAQ say **"GDPR-aligned · EU-based"** and **"we don't train public models on your files."** Adjust the wording in `index.html` / `it/index.html` if your actual setup differs.
- The **"By the numbers"** band uses honest qualitative claims. When you have a verified pilot metric (e.g. completion rate, cost saved), add the 4th tile shown in the commented example.
- The pilot line still reads **"leading learning platforms"** — swap in real (cleared) customer names/logos when you can.

## Regenerating assets (optional)
- Icons + OG card: re-run the Pillow/fontTools script logic in `tools/` (needs `pip install Pillow fonttools brotli`).
- The original single-file export lives in git history (commit `e1b6095`); `tools/extract.py` can re-derive `css/`, `js/`, `fonts/` from it.

## Performance (mobile)
- **Editing the CSS:** `css/site.css` is the single source of truth. The landing
  pages (`index.html`, `it/index.html`) inline a copy of it to avoid a
  render-blocking stylesheet request. After any change to `css/site.css`, re-run:
  ```
  python tools/inline-css.py
  ```
  This restamps the CSS between the `<!-- css:inline:start/end -->` markers.
  `privacy.html` / `terms.html` still link the external sheet, so it stays loaded.
- **three.js (hero particles)** is loaded on demand by `js/site.js` and skipped on
  data-saver / slow (2g/3g) connections. The hero degrades to its static texture.
- **Cache lifetimes (the "Use efficient cache lifetimes" Lighthouse audit):**
  GitHub Pages serves every file with a fixed `Cache-Control: max-age=600` (10 min)
  and **does not let you change it** — so this audit can't be fully cleared while
  hosting on Pages. The fix is to front the site with a CDN that controls headers:
  put **Cloudflare** (free plan) in front of the domain and add a cache rule giving
  the hashed `/fonts/`, `/css/`, `/js/`, `/assets/` paths a long `max-age`
  (e.g. 1 year) — they're content-hashed/stable so that's safe. Cloudflare Pages or
  Netlify (via `_headers`) would achieve the same if you ever migrate off Pages.
