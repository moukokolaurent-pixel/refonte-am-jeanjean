#!/usr/bin/env python3
"""Fetch the one missing image + self-host the 11 audio files, into the source media tree."""
import os, urllib.request, ssl

SRC = "/app/_src/extracted/am-jeanjean-source-medias-locaux/media"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0"}

def get(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print("skip", dest); return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
            data = r.read()
        with open(dest, "wb") as f:
            f.write(data)
        print("ok", len(data), dest)
        return True
    except Exception as e:
        print("FAIL", url, e); return False

# 1) missing image (download script failed on the ° char)
get("https://i0.wp.com/am-jeanjean.com/wp-content/uploads/2023/12/nuire-n%C2%B0-11.jpg",
    os.path.join(SRC, "2023/12/nuire-n°-11.jpg"))

# 2) audio files referenced by Poesie player
AUDIO = [
    "2023/08/comme-une-image-biblique-extrait.mp3",
    "2023/08/dans-quel-voyage-extrait.mp3",
    "2023/08/de-toujours1.mp3",
    "2023/08/de-toujours2.mp3",
    "2023/08/la-lettre.mp3",
    "2023/08/lang-de.mp3",
    "2023/08/liste-de-mariage.mp3",
    "2023/08/miss-dracula.mp3",
    "2023/08/ptit-guerres.mp3",
    "2023/08/walzer.mp3",
    "2023/08/yabasta.mp3",
]
for rel in AUDIO:
    get("https://am-jeanjean.com/wp-content/uploads/" + rel, os.path.join(SRC, rel))

print("images:", sum(1 for _ in __import__('glob').glob(SRC+'/**/*.jpg', recursive=True)) )
