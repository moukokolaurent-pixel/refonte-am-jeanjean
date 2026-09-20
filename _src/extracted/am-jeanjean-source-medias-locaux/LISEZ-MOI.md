# Paquet source — refonte am-jeanjean.com

Version du ZIP Claude Design **avec toutes les références d'images rendues locales**. Il reste une étape à faire avant de le confier à Emergent : télécharger les 180 fichiers médias.

## Ce qui a changé par rapport au ZIP d'origine

| | Avant | Maintenant |
|---|---|---|
| Références d'images | 233 appels vers `i0.wp.com` (CDN du WordPress à remplacer) | 233 chemins locaux `/media/AAAA/MM/fichier.jpg` |
| Constante de base | `const W = "https://i0.wp.com/am-jeanjean.com/wp-content/uploads/"` dans 2 pages | `const W = "/media/"` |
| Paramètres Photon `?w=…&ssl=1` | présents | supprimés (largeurs conservées dans `MEDIA-MANIFEST.tsv`) |
| `uploads/` (5 variantes de logo non référencées) et `.thumbnail` | présents | supprimés |

Contrôle passé : **0 occurrence de `i0.wp.com` ou de `wp-content`** dans les 9 pages. Les deux logos (`logo-amj-blanc.png`, `logo-amj-noir.png`) étaient déjà locaux et n'ont pas bougé.

## Étape à faire : télécharger les médias

Depuis ce dossier :

```bash
bash telecharger-medias.sh
```

Sous Windows, dans PowerShell :

```powershell
.\telecharger-medias.ps1
```

Le script crée `media/AAAA/MM/…`, saute les fichiers déjà présents (il est relançable), tente `am-jeanjean.com` puis bascule sur `i0.wp.com` en secours, et termine par trois contrôles : nombre de fichiers, fichiers de moins de 1 ko, fichiers qui ne sont pas des images. Les URLs en échec sont listées dans `media-echecs.txt`.

**À faire pendant que le WordPress est encore en ligne.** Une fois le domaine basculé, les fichiers ne sont plus servis.

Attendu en sortie : `Attendus : 180` et `Présents : 180`, aucun échec.

## Fichiers de ce paquet

| Fichier | Rôle |
|---|---|
| `*.dc.html` (9) | les pages, références d'images réécrites |
| `support.js` | runtime Claude Design — **à supprimer** lors de la conversion React (il charge React + Babel depuis unpkg) |
| `header.js` | script du header sticky, à réintégrer dans le composant de header |
| `actualites-data.js` | données de `/actualites/` (`window.ACTU`) |
| `saveur-data-1.js`, `saveur-data-2.js` | données de `/la-saveur-du-vent/` (`window.SDV`, **à charger dans cet ordre**) |
| `_ds/classical-*/styles.css` | tokens CSS à conserver comme feuille globale |
| `_ds/classical-*/_ds_bundle.js` + `_ds_manifest.json` + `_adherence.oxlintrc.json` + `readme.md` | ne déclarent aucun composant — supprimables |
| `logo-amj-blanc.png`, `logo-amj-noir.png` | logos, utilisés tels quels |
| `media-urls.txt` | les 180 URLs sources |
| `MEDIA-MANIFEST.tsv` | par fichier : chemin local, URL source, largeurs d'affichage demandées par le design, origine de la référence (markup ou données) |
| `telecharger-medias.sh` / `.ps1` | le script de rapatriement |

## À quoi sert `MEDIA-MANIFEST.tsv`

Les anciennes URLs portaient des paramètres `?w=600`, `?w=900`, `?w=1600` : c'est Photon qui redimensionnait à la volée. En auto-hébergé, ces variantes doivent être générées au build. La colonne `largeurs_affichage_demandees` donne, pour chaque image, les largeurs réellement demandées par le design — c'est la consigne de génération des variantes WebP, et ça évite de servir un original de 3000 px dans une vignette.

Un `-` dans cette colonne signifie que l'image vient d'un fichier de données, sans largeur explicite : à dimensionner d'après son contexte d'affichage.
