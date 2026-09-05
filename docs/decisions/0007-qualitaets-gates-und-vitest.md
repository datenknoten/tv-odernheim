---
status: accepted
date: 2026-09-04
---

# Qualitäts-Gates im Deploy-Workflow, Vitest als Test-Runner

## Context and Problem Statement

Datums-, Uhrzeit- und iCal-Logik sind Berechnungen mit Zeitzonen-Randfällen, die
`astro check` nicht abdeckt (`888d537`). Zugleich soll fehlerhafter Code nicht
auf GitHub Pages landen. Wie wird die Logik geprüft und wo greift die Prüfung?

## Considered Options

* Vitest
* Der Node-Test-Runner (`node:test`)

## Decision Outcome

Gewählt: **Vitest**, eingehängt als vorletztes Gate im Deploy-Workflow.

`888d537` begründet die Wahl damit, dass Vite- und Astro-Auflösung samt
esbuild-Transform ohnehin im Projekt stecken — Module, die Typen aus
`astro:content` importieren, brauchen so keine zusätzliche Konfiguration. Es
existiert bewusst keine `vitest.config.*`; die Voreinstellungen genügen,
`npm test` ist `vitest run`.

Getestet wird ausschließlich reine Logik plus die echten Keystatic-Validatoren:

| Datei | Gegenstand |
|---|---|
| `src/lib/time.test.ts` | beide Uhrzeit-Muster, `normalizeTime`, `parseTime` |
| `src/lib/events.test.ts` | `formatEventDateTime`, `eventDateTimeAttribute` |
| `src/lib/ical.test.ts` | `eventDateLines` (UTC, Ganztags-Fallback, kein TZID), `escapeText`, `foldLine` |
| `keystatic.config.test.ts` | Keystatic-Feldvalidierung: Uhrzeit, Anhänge, Vorstandsfoto |

Die Gate-Kette in `.github/workflows/deploy.yml` lautet `npm ci` →
`npm run ci` (Biome) → `npm run check` (`astro check`) → `npm test` →
`npm run build:static`. `3ceca9c` platziert die Tests bewusst nach dem
Typecheck und vor dem Build, „damit ein Fehlschlag den Deploy nach GitHub Pages
stoppt, bevor gebaut wird".

Die Node-Version kommt aus `mise.toml` (`node = "26.1.0"`) über
`jdx/mise-action@v4` statt aus einer im Workflow gepflegten Zahl (`89d3229`);
Auslöser war eine `EBADENGINE`-Warnung, weil Vitest 5 mindestens Node 22.12
verlangt. Weil `mise-action` kein npm-Caching mitbringt, cacht der Workflow
`~/.npm` selbst, geschlüsselt über `package-lock.json`.

_Diese ADR wurde aus der Git-Historie nachgetragen (`888d537`, `3ceca9c`, `89d3229`)._

### Consequences

* Gut, weil Zeitzonen-Regressionen vor dem Deploy auffallen.
* Gut, weil die Node-Version nur an einer Stelle im Repository steht — lokal und
  in CI dieselbe.
* Schlecht, weil die Gates nur im Pages-Pfad greifen: Netlify baut mit
  `npm run build` ohne Biome, Typecheck und Tests
  (siehe [ADR-0001](0001-dual-deploy-statisch-und-ssr.md)). Ein Fehler, der nur
  den SSR-Zweig betrifft, wird von CI nicht bemerkt.
* Schlecht, weil `NODE_VERSION` in `netlify.toml` die Zahl aus `mise.toml`
  händisch dupliziert.
* Astro-Komponenten und Seiten sind nicht getestet; die Testauswahl ist
  bewusst auf `src/lib/` und die CMS-Validierung beschränkt.
