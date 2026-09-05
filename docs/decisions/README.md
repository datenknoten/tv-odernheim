# Architekturentscheidungen

Entscheidungen im [MADR](https://adr.github.io/madr/)-Format, eine Datei pro
Entscheidung, Dateiname `NNNN-kurztitel.md`.

Alle Einträge bis einschließlich 0010 wurden am 2026-09-05 aus der Git-Historie
nachgetragen (`3fd3f36..HEAD`). Die Begründungen stammen aus Commit-Nachrichten
und Code-Kommentaren; wo dort nichts stand, ist die Auskunft des Betreibers als
solche gekennzeichnet und datiert. Erfundene Rationale gibt es nicht — offene
Fragen würden als `TODO`-Kommentar im Dokument stehen; derzeit ist keine offen.

| # | Entscheidung | Datum | Status |
|---|---|---|---|
| [0001](0001-dual-deploy-statisch-und-ssr.md) | Dual-Deploy: statisch auf GitHub Pages, Netlify-SSR nur für den Keystatic-Admin | 2026-02-13 | accepted |
| [0002](0002-content-modell-markdoc-glob-loader.md) | Inhalte als Markdoc-Dateien über den Glob-Loader, Schema doppelt deklariert | 2026-05-13 | accepted |
| [0003](0003-selbstgehostete-karte-und-osm-kacheln.md) | Selbstgehostete GPX-Route und lokal gecachte OSM-Kacheln | 2026-05-19 | accepted |
| [0004](0004-design-system-primitive-und-palette.md) | Design-System: drei Primitive, Styleguide-Seite, Palette Schwarz/Rot | 2026-07-19 | accepted |
| [0005](0005-uhrzeit-als-optionales-hhmm-feld.md) | Uhrzeit als optionales HH:MM-Feld mit geteiltem Muster | 2026-09-04 | accepted |
| [0006](0006-ical-export-in-utc.md) | iCal-Export in UTC statt mit TZID-Referenz | 2026-09-04 | accepted |
| [0007](0007-qualitaets-gates-und-vitest.md) | Qualitäts-Gates im Deploy-Workflow, Vitest als Test-Runner | 2026-09-04 | accepted |
| [0008](0008-keystatic-uploads-slug-konvention.md) | Keystatic-Uploads: Slug-Verzeichnisse, `src/assets` vs. `public/files` | 2026-09-04 | accepted |
| [0009](0009-schriften-ueber-astro-fonts-api.md) | Schriftauslieferung über die Astro Fonts API | 2026-09-04 | accepted |
| [0010](0010-csp-nur-im-statischen-zweig.md) | CSP nur im statischen Zweig, als Meta-Tag | 2026-09-04 | accepted |

Neue Entscheidung: nächste freie Nummer nehmen, `status: accepted` mit dem Datum
der Umsetzung, und diese Tabelle ergänzen. Eine Entscheidung wird nicht
umgeschrieben — sie wird durch eine neue ersetzt, wobei die alte den Status
`status: superseded by [ADR-NNNN](NNNN-titel.md)` bekommt — als Literal, mit echter Nummer und
echtem Dateinamen.
