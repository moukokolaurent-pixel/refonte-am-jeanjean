# Refonte site Anne-Marie Jeanjean

Maquette statique de la refonte du site **am-jeanjean.com** — poète, plasticienne, éditrice (Tardigradéditions, revue Textuerre).

## Consultation

Site en ligne : voir le lien GitHub Pages dans la description du dépôt.

## Pages

| Page | Fichier |
|---|---|
| Accueil | `index.html` |
| Livres | `livres.html` |
| Poésie visuelle et sonore | `poesie.html` |
| Expositions | `expositions.html` |
| Tardigradéditions | `tardigradeditions.html` |
| Revue Textuerre | `revue-textuerre.html` |
| La saveur du vent | `la-saveur-du-vent.html` |
| Actualités | `actualites.html` |
| Contact | `contact.html` |

## Technique

- HTML statique, aucun build. Le runtime `support.js` monte les templates `<x-dc>` côté client (React 18 via unpkg).
- Design system dans `_ds/classical-…/` (styles.css + tokens).
- Données de contenu externalisées : `actualites-data.js`, `saveur-data-1.js`, `saveur-data-2.js`.
- Les visuels sont servis depuis le CDN WordPress du site actuel (`i0.wp.com/am-jeanjean.com/...`).
- `.nojekyll` est requis : sans lui, GitHub Pages ignorerait le dossier `_ds/`.

## Développement local

```bash
python -m http.server 8099
```

Puis ouvrir http://localhost:8099
