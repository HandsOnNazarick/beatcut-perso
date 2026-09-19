# BeatCut Perso

Clone perso de BeatCut — pour transformer mes sons en vidéos TikTok/Reels/Shorts calées sur le beat.

## Fonctionnalités

- **Drop audio** → BPM auto-détecté (override possible)
- **Sélection film** → recherche TMDB (clé API perso, stockée en local)
- **Banque de clips** → Pexels (libres de droits) + upload de tes propres rushs
- **Beat-sync** → coupes calées sur le tempo (1 cut par 2 beats par défaut)
- **Export 9:16** → MP4 prêt TikTok via ffmpeg.wasm (dans le navigateur)

## Stack

- React 18 + Vite
- `wavesurfer.js` pour la waveform
- `web-audio-beat-detector` pour le BPM
- `@ffmpeg/ffmpeg` (wasm) pour l'export
- TMDB API pour la recherche de films

## Install & dev

```bash
npm install
npm run dev
```

Le site s'ouvre sur `http://localhost:5173/beatcut-perso/`

## Build & deploy GitHub Pages

```bash
npm run build
npm run deploy
```

## Workflow utilisateur

1. **Upload ton son** (MP3/WAV/M4A)
2. **BPM détecté** automatiquement, override possible
3. **Choisis ton film** (recherche TMDB, clé API requise)
4. **Sélectionne tes clips** depuis la banque par défaut OU upload tes rushs
5. **Configure l'export** (durée, format, watermark)
6. **Génère la vidéo** → téléchargement MP4

## Configuration TMDB

1. Crée un compte sur [themoviedb.org](https://www.themoviedb.org/signup)
2. Demande une clé API : [Paramètres > API](https://www.themoviedb.org/settings/api)
3. Saisis-la dans l'interface (stockée en `localStorage`, jamais envoyée ailleurs)

## Notes

- **100% local** : tes sons ne quittent jamais ton navigateur
- **ffmpeg.wasm** : traitement dans le navigateur, peut être lent sur des machines modestes
- **Watermark custom** : ajoute ton pseudo @ aux vidéos exportées
- **Usage perso uniquement** : pas de SaaS, pas de cloud obligatoire
