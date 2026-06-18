# Bristol Print

Éditeur web de feuilles Bristol (format A5, 148×210 mm) avec zones d'écriture repositionnables, mise en forme riche et impression navigateur.

## Fonctionnalités

- Zones d'écriture sur lignes Bristol (double-clic ou Entrée pour créer)
- Déplacement et redimensionnement des zones
- Formatage : gras, italique, souligné, code, listes, couleurs, surlignage
- Multi-feuilles (jusqu'à 30) avec overflow automatique vers la feuille suivante
- Zoom : Ctrl/Cmd + molette
- Impression via le navigateur (`window.print()`)

## Prérequis

- [Node.js](https://nodejs.org/) 20+
- [Vite+](https://viteplus.dev/) (`vp` CLI)

## Commandes

```sh
vp install    # dépendances
vp dev        # serveur de développement
vp test       # tests unitaires
vp build      # build production
npm run check # vérification TypeScript (svelte-check)
npm run lint  # Prettier + ESLint
npm run format
```

## Modèle de données

- `SheetData` : `{ id: string, zones: WriteZone[] }`
- `WriteZone` : `{ id, lineIndex, leftCm, widthCm, lineCount, content }` (HTML sanitisé)

## Architecture `src/lib/`

```
bristol/     # dimensions et lignes du papier
sheet/       # gestion multi-feuilles (workbook)
zone/        # géométrie, placement, interaction des zones
overflow/    # débordement texte inter-feuilles
editor/      # HTML, couleurs, formatage, sanitisation
viewport/    # zoom pan
state/       # feuille active, clavier centralisé
components/
  bristol/   # BristolSheet, WriteZone
  format/    # SelectionFormatPill, IconStack
  ui/        # shadcn (Button)
```

## Limites connues

- Pas de persistance : un rechargement efface le contenu
- Maximum 30 feuilles par document
- Impression dépend du moteur du navigateur

## Stack

Svelte 5 (runes), SvelteKit, Tailwind v4, shadcn-svelte, Vitest, adapter-static

## Licence

Projet privé — usage personnel.
