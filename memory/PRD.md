# PRD — am-jeanjean.com (refonte statique)

## Problème / Objectif
Reprendre un export Claude Design (9 pages en langage de template maison `<x-dc>` + logique `class extends DCLogic`, rendu au runtime par `support.js` via React+Babel depuis unpkg) et le convertir en **site de production statique pur** pour remplacer le WordPress de am-jeanjean.com. Contrainte absolue : **rendu visuellement identique** aux `.dc.html` d'origine (toute divergence = bug). Aucun redesign, aucun texte/couleur/police modifié.

## Décisions utilisateur (juin 2026)
- Outillage : « le plus fiable pour un rendu 100% identique » → réutilisation fidèle du compilateur DC.
- WebP : oui (à générer).
- Formulaire de contact : `mailto:` uniquement → anne-marie.jeanjean5@orange.fr.
- Périmètre : les 9 pages d'un coup. **/stephane-bernard NON inclus** (retiré à la demande).

## Architecture réalisée
- **Pas de backend / pas de DB / pas d'auth.** Site 100% statique.
- Compilateur DC réimplémenté fidèlement depuis `support.js` dans `/app/site/dccore.js` (parse/expr/encode/compile/pseudo/logic/component). Aucun Babel (jamais nécessaire : pas de x-import JSX).
- **Build** (`/app/site/build.mjs`, Node + jsdom + React 18.3.1 UMD + react-dom-server-legacy) : SSR/pré-rendu de chaque route → HTML injecté dans `#dc-root`.
- **Runtime** (`/app/site/boot.js`) : `hydrateRoot` avec React auto-hébergé + `dccore.js` ; template & logique embarqués en base64 (`#dc-template`, `#dc-logic`).
- Fonts auto-hébergées woff2 (latin+latin-ext, display:swap, preload) — 0 requête Google.
- `style-hover` → vraies règles `:hover` générées dans une feuille (`#dc-pseudo`) + injectées au runtime (comportement identique à l'original).
- Médias locaux copiés (`/media/AAAA/MM/`) ; audio Poésie et l'image manquante rapatriés ; 1 photo Unsplash du slideshow accueil auto-hébergée.
- SEO par page : `<title>`, meta description, canonical, Open Graph, Twitter, JSON-LD ; `lang="fr"`.
- Accessibilité : règle globale `prefers-reduced-motion`.
- Serveur statique `/app/frontend/static-server.js` (port 3000) : URLs propres + redirection 301 sans-slash → avec-slash.

## Routes (slugs historiques, slash final)
/ , /poesie/ , /livres/ , /expositions/ , /revue-textuerre/ , /la-saveur-du-vent/ , /tardigradeeditions/ , /actualites/ , /contact/

## État (validé le 2026-06)
- 9 pages rendues, identiques, hydratées sans erreur console ni mismatch (testing agent ~95%, seul bug = image Unsplash cassée → corrigé).
- Contrôles OK : 0 `i0.wp.com`, 0 `wp-content`, 0 `fonts.googleapis`, 0 `fonts.gstatic`, 0 `unpkg`, 0 lien `.dc.html`. Images AMJ = 180 (+1 photo stock accueil + 11 audio auto-hébergés).
- Interactivité OK : bascule thème (persistée `amj-theme`), menu mobile (`aria-expanded`), dropdown Créations, données ACTU/SDV, modal Livres, lecteur audio (mp3 locaux), formulaire → mailto.

## Backlog / P1-P2
- **WebP `<picture>` + srcset + width/height** : NON livré (reporté). Générer les variantes selon MEDIA-MANIFEST.tsv et les servir de façon compatible hydratation.
- Vérifs Lighthouse/contrastes AA thème sombre à mesurer et affiner.
- Piège focus clavier complet du menu mobile (focus trap + Échap) à renforcer.
- Comparaison capture-par-capture mobile 390px (l'outil de capture force une largeur desktop).
