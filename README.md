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

## Sicherheit

### Offene Dependabot-Alerts (Stand 2026-09-04)

Sechs als *high* eingestufte Alerts sind **bewusst offen**. Sie hängen alle an
einem Strang: `@astrojs/netlify` zieht Netlifys lokale Dev-Tooling-Kette mit,
und deren transitive Pakete sind betroffen.

| # | Paket | Problem | Fix upstream |
|---|-------|---------|--------------|
| 142 | `toml@3.0.0` | Uncontrolled Recursion | 4.2.0 |
| 141 | `toml@3.0.0` | Prototype Pollution via `__proto__` | 4.1.2 |
| 134 | `extract-zip@2.0.1` | Symlink Path Traversal | keiner |
| 129 | `image-size@2.0.2` | DoS im ICNS-Parser | keiner |
| 128 | `image-size@2.0.2` | DoS in JXL-/HEIF-Parsern | keiner |
| 113 | `sharp@0.34.5` (via `ipx`) | libvips-CVEs | 0.35.0 |

Warum nicht relevant:

- **Kein verwundbares Paket liegt im deployten SSR-Bundle.** Geprüft am echten
  Netlify-Build: `image-size`, `extract-zip`, `ipx`, `@netlify/dev`,
  `@netlify/dev-utils`, `toml` und `sharp` sind unter
  `.netlify/v1/functions/ssr/node_modules/` sämtlich nicht vorhanden. Es sind
  Build- und Dev-Server-Abhängigkeiten.
- **Der Static-Zweig lädt den Adapter gar nicht** (`ASTRO_USE_NETLIFY_ADAPTER`
  ungesetzt) und liefert vorgenerierte Bilder — dort läuft kein Parser.
- **Unser `sharp` ist 0.35.4**, also über der Patch-Grenze. Verwundbar ist nur
  die verschachtelte 0.34.5 aus `ipx`.
- **Der `/_image`-Endpunkt ist nicht angreifbar.** Er ist im SSR-Bundle
  deployed, und Astros vendorierte `image-size`-Kopie enthält die betroffenen
  Parser (`icns.js`, `heif.js`, `jxl.js`). Fremde Bytes erreichen sie aber
  nicht: ohne konfigurierte `image.domains`/`remotePatterns` antwortet der
  Endpunkt auf jede fremde Quelle mit 403, lokale Pfade müssen same-origin
  sein. Verifiziert mit `href=https://evil.example/payload.icns`,
  `…/x.heif` und `//evil.example/x.jxl` — dreimal 403. Einen Upload hat die
  Seite nicht; der Keystatic-Admin verlangt GitHub-OAuth.

> **`npm audit fix --force` hier nicht ausführen.** `npm audit` nennt als Fix
> `@astrojs/netlify@6.4.1` — ein Downgrade um zwei Majors gegenüber dem
> installierten 8.2.5, das laut Registry `latest` ist. Das würde den
> Netlify-Zweig samt Keystatic-Admin zerlegen. Ein echtes Update existiert
> nicht: bei `extract-zip` und `image-size` ist upstream kein Patch verfügbar.

Neu bewerten, sobald `@astrojs/netlify` seine Netlify-Dev-Kette anhebt oder ein
Alert ein Paket betrifft, das tatsächlich im Bundle landet. Prüfbefehl:

```bash
ASTRO_USE_NETLIFY_ADAPTER=true npm run build
ls .netlify/v1/functions/ssr/node_modules/   # verwundbares Paket dabei?
```

## Lizenz

Urheberrechtlich geschützt. Alle Rechte vorbehalten.
