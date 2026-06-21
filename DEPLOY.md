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
