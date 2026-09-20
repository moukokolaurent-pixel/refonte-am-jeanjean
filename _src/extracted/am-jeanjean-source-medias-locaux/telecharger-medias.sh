#!/usr/bin/env bash
# Rapatrie les 180 médias de am-jeanjean.com dans ./media/AAAA/MM/
# Usage : bash telecharger-medias.sh
# Reprend là où il s'est arrêté si on le relance (les fichiers déjà présents sont sautés).

set -uo pipefail
LIST="media-urls.txt"
DEST="media"
FAIL="media-echecs.txt"
BASE="https://am-jeanjean.com/wp-content/uploads/"
MIROIR="https://i0.wp.com/am-jeanjean.com/wp-content/uploads/"

[ -f "$LIST" ] || { echo "Fichier $LIST introuvable — lance le script depuis le dossier du site."; exit 1; }
command -v curl >/dev/null || { echo "curl est requis."; exit 1; }

: > "$FAIL"
ok=0; ko=0; saut=0
total=$(grep -c . "$LIST")

while IFS= read -r url; do
  [ -z "$url" ] && continue
  rel="${url#$BASE}"
  out="$DEST/$rel"
  mkdir -p "$(dirname "$out")"

  if [ -s "$out" ]; then saut=$((saut+1)); continue; fi

  if curl -fsSL --retry 3 --retry-delay 2 --max-time 60 -o "$out" "$url"; then
    ok=$((ok+1))
  elif curl -fsSL --retry 2 --retry-delay 2 --max-time 60 -o "$out" "${MIROIR}${rel}"; then
    ok=$((ok+1))
  else
    rm -f "$out"
    echo "$url" >> "$FAIL"
    ko=$((ko+1))
  fi
  printf "\r%d téléchargés / %d déjà présents / %d échecs   " "$ok" "$saut" "$ko"
done < "$LIST"
printf "\n\n"

# ---- contrôles ----
presents=$(find "$DEST" -type f | wc -l | tr -d ' ')
echo "Attendus : $total"
echo "Présents : $presents"

echo
echo "Fichiers suspects (moins de 1 ko — souvent une page d'erreur enregistrée à la place de l'image) :"
find "$DEST" -type f -size -1k -print | sed 's/^/  /' || true

if command -v file >/dev/null; then
  echo
  echo "Fichiers qui ne sont pas des images :"
  find "$DEST" -type f -print0 | while IFS= read -r -d '' f; do
    t=$(file -b --mime-type "$f")
    case "$t" in image/*) ;; *) echo "  $f  ($t)";; esac
  done
fi

echo
if [ -s "$FAIL" ]; then
  echo "ÉCHECS à traiter à la main, listés dans $FAIL :"
  sed 's/^/  /' "$FAIL"
else
  echo "Aucun échec. Le dossier media/ est complet."
  rm -f "$FAIL"
fi
