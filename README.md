# TV Odernheim Website

Offizielle Website des Turnverein Odernheim 1890 e.V.

Stack: [Astro](https://astro.build) · [Tailwind CSS 4](https://tailwindcss.com) · [Keystatic CMS](https://keystatic.com) · [Markdoc](https://markdoc.dev)

## Architektur

Dual-Deploy:

- **GitHub Pages** — statischer Build (`build:static`). Öffentliche Website ohne CMS.
- **Netlify** — Server-Build (`build`). Hostet Keystatic-Admin unter `/keystatic` mit GitHub-OAuth.

Content liegt in `src/content/` als `.mdoc` Dateien (Markdoc):

- `news/` — Nachrichten
- `courses/` — Kurse
- `board/` — Vorstand

## Setup

```bash
cp .env.example .env       # lokale Defaults
npm install
npm run dev                # http://localhost:4321
```

## Scripts

| Befehl                | Aktion |
|-----------------------|--------|
| `npm run dev`         | Dev-Server |
| `npm run build`       | Production-Build (mit Adapter aus ENV) |
| `npm run build:static`| Reiner Static-Build (für GitHub Pages) |
| `npm run preview`     | Lokale Vorschau |
| `npm run check`       | `astro check` (TypeScript / Astro) |
| `npm run lint`        | Biome lint |
| `npm run format`      | Biome format `--write` |
| `npm run ci`          | Biome CI-Modus (no writes) |

## Umgebungsvariablen

Siehe `.env.example`.

- `ASTRO_USE_NETLIFY_ADAPTER` — `true` für Netlify SSR, sonst Static
- `KEYSTATIC_STORAGE_KIND` — `local` (Dateisystem) oder `github` (Branch-PRs)
- `KEYSTATIC_GITHUB_CLIENT_ID` / `_SECRET` / `KEYSTATIC_SECRET` / `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` — nach GitHub App Setup

## Deployment

- **Push auf `main`** → GitHub Actions baut statisch und deployt zu GitHub Pages.
- **Netlify** zieht denselben Branch, baut mit Adapter und hostet die SSR-Variante.

## Lizenz

Urheberrechtlich geschützt. Alle Rechte vorbehalten.
