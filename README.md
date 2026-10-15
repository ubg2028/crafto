# Posty – Aesthetic Poster Maker (Astro)

Original single-file HTML ka Astro version. Features, IDs, classes aur JS logic same hain.

## Run

```bash
npm install
npm run dev      # local
npm run build    # production build -> dist/
```

## Structure

- `src/layouts/Layout.astro` – head, meta, PWA tags, CDN libs (Tailwind, html2canvas, Cropper, Font Awesome, Google Fonts)
- `src/components/` – UserSetupModal, MainNav, Feed, InstallBanner, EditorModal, FloatingButtons, QualityPopup, BottomNav
- `src/scripts/poster.js` – poori original JS logic (feed, editor, cropper, PWA, export). Inline `onclick` handlers ke liye functions `window` par expose hain
- `src/styles/global.css` – original CSS
- `.github/workflows/deploy.yml` – GitHub Pages deploy

## Gallery images

`src/scripts/poster.js` me `MY_GALLERY_IMAGES` array me apni image links daalein.

## GitHub Pages

`astro.config.mjs` me `site` aur `base` uncomment karke apna username/repo daalein, phir `main` branch par push karein.
