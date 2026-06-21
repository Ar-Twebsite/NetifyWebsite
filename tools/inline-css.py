#!/usr/bin/env python3
"""Inline css/site.css into the landing pages, between the css:inline markers.

Why: an external <link rel="stylesheet"> is render-blocking — the browser
can't paint until it has fetched and parsed the sheet. On mobile that costs
~1.4 s of first paint. Inlining the (small, ~8 KB gzipped) stylesheet removes
that round-trip entirely, with no flash of unstyled content.

css/site.css stays the single source of truth: privacy.html and terms.html
still link it normally, and the high-traffic landing pages inline a copy.
Re-run this whenever you edit css/site.css so the copies stay in sync:

    python tools/inline-css.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = (ROOT / "css" / "site.css").read_text(encoding="utf-8").strip()
TARGETS = ["index.html", "it/index.html"]

START = "<!-- css:inline:start -->"
END = "<!-- css:inline:end -->"
PATTERN = re.compile(re.escape(START) + r".*?" + re.escape(END), re.DOTALL)
BLOCK = f"{START}\n<style>\n{CSS}\n</style>\n{END}"

for rel in TARGETS:
    path = ROOT / rel
    html = path.read_text(encoding="utf-8")
    if START not in html or END not in html:
        print(f"!! {rel}: css:inline markers not found — skipped")
        continue
    # lambda replacement so backslashes / group refs in CSS aren't interpreted
    new = PATTERN.sub(lambda _: BLOCK, html)
    if new != html:
        path.write_text(new, encoding="utf-8")
        print(f"✓ {rel}: inlined {len(CSS):,} bytes of CSS")
    else:
        print(f"= {rel}: already up to date")
