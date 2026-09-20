#!/usr/bin/env python3
"""Download Google Fonts woff2 (latin + latin-ext) and emit a self-hosted fonts.css.
No fonts.googleapis.com / fonts.gstatic.com request remains in production."""
import os, re, urllib.request, ssl, hashlib

OUT_DIR = "/app/site/dist/assets/fonts"
CSS_OUT = "/app/site/dist/assets/fonts.css"
os.makedirs(OUT_DIR, exist_ok=True)
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}

FAMILIES = [
    "Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400",
    "Rubik+Distressed",
    "Tangerine:wght@400;700",
    "Lora:ital,wght@0,400;0,500;0,600;1,400",
]
KEEP_SUBSETS = {"latin", "latin-ext"}

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
        return r.read()

blocks = []
for fam in FAMILIES:
    url = f"https://fonts.googleapis.com/css2?family={fam}&display=swap"
    css = fetch(url).decode("utf-8")
    # Google emits a /* subset */ comment line before each @font-face
    parts = re.split(r"/\*\s*([\w-]+)\s*\*/", css)
    # parts: [pre, subset1, block1, subset2, block2, ...]
    i = 1
    while i < len(parts) - 1:
        subset = parts[i].strip()
        block = parts[i + 1]
        i += 2
        if subset not in KEEP_SUBSETS:
            continue
        m = re.search(r"url\((https://[^)]+\.woff2)\)", block)
        if not m:
            continue
        woff_url = m.group(1)
        fam_name = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        weight = re.search(r"font-weight:\s*(\d+)", block)
        weight = weight.group(1) if weight else "400"
        style = "italic" if "font-style: italic" in block else "normal"
        fn = f"{fam_name.replace(' ', '')}-{weight}-{style}-{subset}.woff2"
        data = fetch(woff_url)
        with open(os.path.join(OUT_DIR, fn), "wb") as f:
            f.write(data)
        # rewrite url to local, keep unicode-range
        newblock = block.replace(woff_url, f"/assets/fonts/{fn}")
        blocks.append(newblock.strip())
        print("font", fn, len(data))

with open(CSS_OUT, "w", encoding="utf-8") as f:
    f.write("/* Self-hosted fonts (latin + latin-ext). No third-party font requests. */\n")
    f.write("\n".join("@font-face {\n" + b.split("{",1)[1] if b.startswith("@font-face") else b for b in blocks))
print("wrote", CSS_OUT, "blocks:", len(blocks))
