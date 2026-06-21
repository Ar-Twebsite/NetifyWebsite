#!/usr/bin/env python3
"""One-time de-bundler: turns the 3MB single-file index.html export into a
normal static site (body HTML, css/site.css, js/site.js, fonts/*.woff2).

Reads the ORIGINAL bundled file (passed as argv[1], default: index.original.html)
so it can be re-run. Writes extracted parts under the repo root + tools/_body.html.
"""
import re, json, base64, gzip, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "index.original.html")
html = open(SRC, "r", encoding="utf-8", errors="replace").read()

def grab(tag):
    m = re.search(r'<script type="%s">(.*?)</script>' % re.escape(tag), html, re.S)
    return m.group(1).strip() if m else None

manifest = json.loads(grab("__bundler/manifest"))
template = json.loads(grab("__bundler/template"))

def decode(uuid):
    e = manifest[uuid]
    raw = base64.b64decode(e["data"])
    if e.get("compressed"):
        raw = gzip.decompress(raw)
    return raw

def full(pref):
    for k in manifest:
        if k.startswith(pref):
            return k
    raise KeyError(pref)

os.makedirs(os.path.join(ROOT, "fonts"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "css"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "js"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "tools"), exist_ok=True)

# ---- 1. Collect all <style> blocks from the template -----------------------
styles = re.findall(r"<style[^>]*>(.*?)</style>", template, re.S)
css = "\n".join(styles)

# ---- 2. Keep only latin / latin-ext @font-face; self-host their woff2 -------
KEEP = ("U+0000-00FF", "U+0100-02BA")  # latin, latin-ext signatures
written_fonts = {}

def repl_fontface(m):
    block = m.group(0)
    rng = re.search(r"unicode-range:\s*([^;]+);", block)
    keep = rng and any(sig in rng.group(1) for sig in KEEP)
    if not keep:
        return ""  # drop vietnamese/cyrillic/greek subsets we'll never serve
    def repl_src(sm):
        uuid = sm.group(1)
        if uuid not in written_fonts:
            fname = "font-%s.woff2" % uuid[:8]
            with open(os.path.join(ROOT, "fonts", fname), "wb") as f:
                f.write(decode(uuid))
            written_fonts[uuid] = fname
        return 'src: url("/fonts/%s")' % written_fonts[uuid]
    return re.sub(r'src:\s*url\("([0-9a-f-]{36})"\)', repl_src, block)

css = re.sub(r"@font-face\s*\{.*?\}", repl_fontface, css, flags=re.S)
css = re.sub(r"\n{3,}", "\n\n", css).strip() + "\n"
open(os.path.join(ROOT, "css", "site.css"), "w", encoding="utf-8").write(css)

# ---- 3. Extract the real site script (site-v5.js) --------------------------
site_js = decode(full("0a258777")).decode("utf-8")
open(os.path.join(ROOT, "js", "site.js"), "w", encoding="utf-8").write(site_js)

# ---- 4. Extract the <body> and clean it ------------------------------------
body = re.search(r"<body[^>]*>(.*)</body>", template, re.S).group(1)
body = re.sub(r"<script\b[^>]*>.*?</script>", "", body, flags=re.S)   # drop all bundled scripts
body = re.sub(r'\s*<div id="tweaks-root">\s*</div>', "", body)
body = re.sub(r'\s+data-screen-label="[^"]*"', "", body)
body = re.sub(r'\s+data-omelette-[a-z-]+="[^"]*"', "", body)
body = re.sub(r"\n{3,}", "\n\n", body).strip()
open(os.path.join(ROOT, "tools", "_body.html"), "w", encoding="utf-8").write(body)

# also expose the <body ...> opening tag attributes
body_open = re.search(r"<body([^>]*)>", template).group(1).strip()

print("CSS bytes:        ", len(css))
print("site.js bytes:    ", len(site_js))
print("fonts written:    ", len(written_fonts))
print("body bytes:       ", len(body))
print("body open attrs:  ", body_open)
print("script selectors in site.js referencing hero-h:",
      sorted(set(re.findall(r"hero-h-[a-z]+", site_js))))
print("site.js asset-uuid refs:",
      sorted(set(re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}", site_js))) or "none")
