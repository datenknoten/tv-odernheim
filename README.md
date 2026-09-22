# TV Odernheim Website

Offizielle Website des Turnverein Odernheim 1890 e.V.

Stack: [Astro](https://astro.build) 7 · [Tailwind CSS 4](https://tailwindcss.com) (CSS-first, keine
`tailwind.config.*`) · [Keystatic CMS](https://keystatic.com) · [Markdoc](https://markdoc.dev) ·
[Leaflet](https://leafletjs.com) · [Vitest](https://vitest.dev)

## Architektur

Dual-Deploy aus demselben Branch, umgeschaltet über `ASTRO_USE_NETLIFY_ADAPTER`
([ADR-0001](docs/decisions/0001-dual-deploy-statisch-und-ssr.md)):

- **GitHub Pages** — statischer Build (`build:static`). Die öffentliche Website, ohne CMS.
- **Netlify** — Server-Build (`build`). Existiert allein für den Keystatic-Admin unter
  `/keystatic` mit GitHub-OAuth. Die Collection-Routen (`aktuelles`, `news/[slug]`,
  `termine/[slug]`, `termine/archiv`, `mitmachen/[slug]`) tragen `prerender = true` und werden
  auch dort statisch ausgeliefert.

## Inhalte

Content liegt als `.mdoc` (Markdoc) in `src/content/<collection>/`. Dateiname = Slug =
`entry.id`. Jede Collection ist zweimal deklariert: als Zod-Schema in `src/content.config.ts`
(Build-Vertrag) und als Formular in `keystatic.config.ts` (Redaktions-Vertrag) —
[ADR-0002](docs/decisions/0002-content-modell-markdoc-glob-loader.md).

| Collection | Zweck | Pflichtfelder |
|------------|-------|---------------|
| `news/` | Nachrichten mit Datum | `title`, `date` |
| `events/` | Termine (Kalender) | `title`, `date`, `status` (geplant/verschoben/abgesagt) |
| `courses/` | Laufende Übungsstunden (buchbare Kurse kommen aus IntelliVerein) | `title`, `category` |
| `board/` | Vorstand | `name`, `sortierung` |
| `announcements/` | Immergrüne Blöcke für Startseite und `/mitmachen` | `title`, `category`, `sortierung` |

Optionale Textfelder können im Frontmatter komplett fehlen — Keystatic entfernt leere Werte.
Uhrzeiten sind optional und müssen `HH:MM` sein; ohne Uhrzeit gilt ein Termin überall als
ganztägig ([ADR-0005](docs/decisions/0005-uhrzeit-als-optionales-hhmm-feld.md)).

Öffentliche Flächen:

- `/` — gemischter Feed aus News und Terminen (6 Einträge) plus drei Announcements.
- `/aktuelles/[...page]` — Nachrichten paginiert (6 pro Seite); kommende Termine nur auf Seite 1.
- `/termine/[slug]`, `/termine/archiv` — Termin-Detail und vergangene Termine. Eine
  `/termine`-Übersicht gibt es nicht mehr, die Detail-URLs bleiben gültig.
- `/termine.ics` — Kalender-Abo: alle Termine der letzten 90 Tage und der Zukunft, Zeiten in UTC
  ([ADR-0006](docs/decisions/0006-ical-export-in-utc.md)).
- `/kurse` — Übungsstunden aus `courses/` und die buchbaren Kurse aus dem
  Kursportal (siehe [Kursportal](#kursportal-intelliverein)).
- `/news/[slug]`, `/verein`, `/mitmachen`, `/mitmachen/[slug]`, `/disibodenberglauf`,
  `/impressum`, `/datenschutz`, `/styleguide`.

## Redaktion

Der Keystatic-Admin läuft unter `/keystatic` im Netlify-Zweig, Oberfläche auf `de-DE`. Mit
`KEYSTATIC_STORAGE_KIND=github` schreibt er Branches mit Prefix `keystatic/` im Repository
`datenknoten/tv-odernheim`; lokal (`local`) schreibt er direkt ins Dateisystem. Der Regelfall
ist der gehostete Admin über GitHub; lokal arbeitet nur die technische Betreuung.

Uploads folgen Keystatics Slug-Konvention
([ADR-0008](docs/decisions/0008-keystatic-uploads-slug-konvention.md)):

- Bilder → `src/assets/<collection>/<slug>/image|photo.<ext>` (gehen durch Astros Bildservice).
- Anhänge → `public/files/<collection>/<slug>/attachments/<i>/file.<ext>` (unverändert ausgeliefert).
- `src/assets/board/silhouette-neutral.jpg` ist der Platzhalter für fehlende Vorstandsfotos und
  liegt bewusst ohne Slug-Verzeichnis.

## Setup

Node 26.1.0 und aube 2.2.17, festgelegt in `mise.toml` ([mise](https://mise.jdx.dev),
[aube](https://aube.jdx.dev)); Astro 7 verlangt mindestens Node 22.12.

```bash
mise install               # Node 26 + aube
cp .env.example .env       # lokale Defaults
aube install
aubr dev                   # http://localhost:4321
```

## Scripts

| Befehl                | Aktion |
|-----------------------|--------|
| `aubr dev`            | Dev-Server |
| `aubr build`          | Production-Build (mit Adapter aus ENV) |
| `aubr build:static`   | Reiner Static-Build (für GitHub Pages) |
| `aubr preview`        | Lokale Vorschau |
| `aubr check`          | `astro check` (TypeScript / Astro) |
| `aube test`           | `vitest run` |
| `aubr lint`           | Biome lint |
| `aubr format`         | Biome format `--write` |
| `aubr ci`             | Biome CI-Modus (no writes) |
| `aubr cache-tiles`    | OSM-Kacheln für die Streckenkarte nachladen |

`aubr` = `aube run`; installiert fehlende oder veraltete Abhängigkeiten vorher automatisch.
Einmal-Tools: `aubx <pkg>`.

Biome läuft mit `preset: "all"` und begründeten Ausnahmen in `biome.json`; formatiert wird mit
Leerzeichen, Einrücktiefe 2, Zeilenlänge 100. CSS, Markdown, Markdoc und Astro-Templates
formatiert Biome nicht — dafür greift `.editorconfig`.

## Umgebungsvariablen

Siehe `.env.example`. Vom Projektcode gelesen:

- `ASTRO_USE_NETLIFY_ADAPTER` — `true` für Netlify SSR, sonst Static (`astro.config.mjs`)
- `KEYSTATIC_STORAGE_KIND` — `local` (Dateisystem) oder `github` (Branch-PRs) (`keystatic.config.ts`)

Von `@keystatic/core` bzw. `@keystatic/astro` zur Laufzeit gelesen, nur für den
Netlify-Zweig mit `github`-Storage nötig: `KEYSTATIC_GITHUB_CLIENT_ID`,
`KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`
(nach GitHub-App-Setup). Diese vier stehen nicht in `netlify.toml`, sondern als
Umgebungsvariablen in der Netlify-UI.

## Tests

`aube test` (`vitest run`, keine Konfigurationsdatei). Getestet wird reine Logik plus die echten
Keystatic-Feldvalidatoren: `src/lib/time.test.ts`, `src/lib/events.test.ts`,
`src/lib/ical.test.ts`, `src/lib/intelliverein.test.ts`, `keystatic.config.test.ts`
([ADR-0007](docs/decisions/0007-qualitaets-gates-und-vitest.md)).

## Design und UI-Konventionen

Drei Primitive in `src/components/`: `Button.astro`, `SectionHeading.astro` (h2) und
`Hero.astro` (h1, mit `media`- und `eyebrow`-Slot). Neue Seiten setzen ausschließlich diese
Primitive ein; `/styleguide` zeigt alle Varianten — ein internes Werkzeug, absichtlich nicht
aus der Navigation verlinkt
([ADR-0004](docs/decisions/0004-design-system-primitive-und-palette.md)).

Farben und Schrift sind Tokens in `src/styles/global.css`: `--color-primary` (Schwarz),
`--color-secondary` (dunkles Rot), `--color-accent` (Rot) — kein Blau. `--font-sans` zeigt auf
`--font-inter`; Inter kommt über die Astro Fonts API von der eigenen Domain, ohne Fontpaket und
ohne Google-Request ([ADR-0009](docs/decisions/0009-schriften-ueber-astro-fonts-api.md)).
Gerenderte Markdoc-Inhalte nutzen `@tailwindcss/typography` mit Marken-Overrides.

## Karte und Kacheln

`/disibodenberglauf` ist eine handgeschriebene Seite ohne Collection. Ihre Daten sind fünf
GPX-Dateien in `public/disibodenberglauf/`, gerendert mit Leaflet auf lokal gecachten
OSM-Rasterkacheln in `public/tiles/` (144 PNG, ca. 2,2 MB, Zoom 13–17, im Repository
eingecheckt) — [ADR-0003](docs/decisions/0003-selbstgehostete-karte-und-osm-kacheln.md).

Die GPX-Dateien ergeben 5,0 km (`strecke.gpx`, Hauptlauf), 2,0 km (Jugend), 1,1 km und 0,5 km
(Kinder) sowie 0,1 km (Bambini). Die Karte zeigt für den Hauptlauf also die 5-km-Runde; der Tab
ist mit „5 / 10 km" beschriftet, weil beide Wettbewerbe angeboten werden. Eine eigene
10-km-Spur liegt nicht im Repository.

Nach dem Hinzufügen oder Ändern einer GPX-Datei `aubr cache-tiles` laufen lassen; nur
fehlende Kacheln werden geladen. Die OSM-Tile-Usage-Policy erlaubt das nur als „minor use":
kein Massen-Download, ein Request pro Sekunde, identifizierender User-Agent. Zoomstufen oder
Ausschnitt nicht ohne Anbieterwechsel ausweiten — Details im Kopf von `scripts/cache-tiles.mjs`.

## Kursportal (IntelliVerein)

Buchbare Kurse — Schwimmkurse, Ferienangebote, Lehrgänge — werden in
IntelliVerein (`tv-odernheim.intelliverein.de`) gepflegt, nicht in Keystatic.
`/kurse` holt sie zur Bauzeit über die öffentliche API des Kursmoduls
(`src/lib/intelliverein.ts`, `POST /intellionline/backend/api/cevkurs/publickurslist`)
und rendert sie mit `src/components/BookableCourseCard.astro`
([ADR-0012](docs/decisions/0012-kurse-live-aus-intelliverein.md)).

Die Endpunkte sind ungeschützt; **Zugangsdaten werden nicht gebraucht und
gehören auch nicht in die CI**. Der Server liefert die im Portal unter
`/intellionline/kursliste` sichtbaren Kurse; `selectVisibleCourses` zeigt davon
nur die mit **offener Anmeldung** — ein Kurs mit geschlossener Anmeldung ist
für Besucher eine Sackgasse und verschwindet von der Seite. Angezeigt werden
Laufzeit, Termin, Ort, Leitung, Alter, Gebühr und freie Plätze; die Anmeldung
selbst läuft über den Buchungs-Deeplink ins Portal.

Die Sektion steht **unter** den Übungsstunden: das Dauerangebot des Vereins ist
die Hauptsache der Seite, die buchbaren Kurse sind der Zusatz.

Ist die API nicht erreichbar, bricht der Build nicht ab: die Seite
protokolliert eine Warnung und zeigt statt der Liste den Verweis auf die
Portal-Kursliste. Weil die Daten so frisch sind wie der letzte Build, baut der
Deploy-Workflow zusätzlich alle zwölf Stunden.

Nicht dasselbe wie `courses/`: dort stehen die laufenden Übungsstunden ohne
Anmeldung und ohne Gebühr.

## Deployment

- **Push auf `main`**, `workflow_dispatch` oder der `schedule` alle zwölf
  Stunden (02:40 und 14:40 UTC, für die Kursliste) →
  `.github/workflows/deploy.yml`: Node und aube
  aus `mise.toml`, dann `aube ci` → `aube run --no-install ci` (Biome) → `… check` → `… test`
  → `… build:static` → GitHub Pages. Ein Fehlschlag stoppt den Deploy vor dem Build.
- **Netlify** baut mit `npm run build` (`netlify.toml`: `NODE_VERSION=26.1.0`,
  `ASTRO_USE_NETLIFY_ADAPTER=true`, `KEYSTATIC_STORAGE_KIND=github`) und hostet die
  SSR-Variante; Netlify installiert weiter mit npm aus `package-lock.json`, das aube in-place
  pflegt. Dort laufen weder Lint noch Typecheck noch Tests. Deploy Previews und
  Branch-Deploys erben dieselbe Konfiguration. Produktions-Branch ist `main` — diese eine
  Einstellung ist bei Netlify nur in der UI setzbar, nicht in `netlify.toml`.

## Sicherheit

### Content Security Policy

Nur der statische Build liefert eine CSP, als `<meta http-equiv>` pro Seite (Astro
`security.csp` in `astro.config.mjs`). Direktiven: `default-src 'self'`, `img-src 'self' data:`,
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, dazu `'unsafe-inline'` **nur** für
Style-Attribute. Die beiden Lockerungen gehen auf Leaflet zurück. Der Netlify-Zweig samt
Keystatic-Admin liefert weder Meta-Tag noch Header
([ADR-0010](docs/decisions/0010-csp-nur-im-statischen-zweig.md)).

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

Lokal prüft `aube audit`.

> **`npm audit fix --force` hier nicht ausführen.** `npm audit` nennt als Fix
> `@astrojs/netlify@6.4.1` — ein Downgrade um zwei Majors gegenüber dem
> installierten 8.2.5, das laut Registry `latest` ist. Das würde den
> Netlify-Zweig samt Keystatic-Admin zerlegen. Ein echtes Update existiert
> nicht: bei `extract-zip` und `image-size` ist upstream kein Patch verfügbar.

Neu bewerten, sobald `@astrojs/netlify` seine Netlify-Dev-Kette anhebt oder ein
Alert ein Paket betrifft, das tatsächlich im Bundle landet. Prüfbefehl:

```bash
ASTRO_USE_NETLIFY_ADAPTER=true aubr build
ls .netlify/v1/functions/ssr/node_modules/   # verwundbares Paket dabei?
```

## Entscheidungen

Architekturentscheidungen liegen als ADRs in [`docs/decisions/`](docs/decisions/README.md)
(MADR-Format). Sie erklären das Warum hinter Dual-Deploy, Content-Modell, Karte, Design-System,
Uhrzeit- und iCal-Behandlung, Uploads, Schriften, CSP und den CI-Gates.

## Lizenz

Urheberrechtlich geschützt. Alle Rechte vorbehalten.
