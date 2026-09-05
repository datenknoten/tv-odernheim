---
status: accepted
date: 2026-02-13
---

# Dual-Deploy: statische Website auf GitHub Pages, Netlify-SSR nur für den Keystatic-Admin

## Context and Problem Statement

Die Redaktion braucht eine Browser-Oberfläche zum Pflegen der Inhalte. Keystatic
liefert die als React-Anwendung mit serverseitigen OAuth-Routen — GitHub Pages
kann aber nur statische Dateien ausliefern. Wie kommt der Verein zu einem CMS,
ohne die öffentliche Website von einem Server abhängig zu machen?

## Considered Options

* Zwei Deploys aus einem Repository: statischer Build auf GitHub Pages, Server-Build auf Netlify
* Nur Netlify-SSR für alles
* Nur lokaler Keystatic-Admin, kein gehosteter Admin

Die dritte Variante ist verworfen, weil sie Expertise voraussetzt, die in einem
Verein nicht vorhanden ist: Repository klonen, Node in passender Version
bereitstellen, Dev-Server starten, committen und pushen. Wer das kann, arbeitet
auch heute lokal — das trifft auf die technische Betreuung zu, nicht auf die
Redaktion, die die Web-Oberfläche braucht (Auskunft des Betreibers, 2026-09-05).

## Decision Outcome

Gewählt: **zwei Deploys aus demselben Branch**, umgeschaltet über eine einzige
Umgebungsvariable. `0138da5` formuliert es so: „The public site remains fully
static on GitHub Pages, while the admin UI is hosted on Netlify using Keystatic's
GitHub mode with PR-based workflow (branchPrefix)."

Mechanik:

* `astro.config.mjs` liest `ASTRO_USE_NETLIFY_ADAPTER`. Ist der Wert `"true"`,
  gilt `output: "server"` plus `netlify()`-Adapter, und die Integrationen
  `react()` und `keystatic()` werden geladen. Sonst `output: "static"` ohne diese
  drei.
* `netlify.toml` setzt für den Server-Zweig `ASTRO_USE_NETLIFY_ADAPTER=true`,
  `KEYSTATIC_STORAGE_KIND=github` und `NODE_VERSION=26.1.0`.
* `.github/workflows/deploy.yml` baut mit `npm run build:static`, das
  `ASTRO_USE_NETLIFY_ADAPTER=false KEYSTATIC_STORAGE_KIND=local` erzwingt.
* Die fünf Collection-Routen (`aktuelles/[...page]`, `news/[slug]`,
  `termine/[slug]`, `termine/archiv`, `mitmachen/[slug]`) tragen
  `export const prerender = true` (`d4e4cde`, `e759937`), damit auch der
  SSR-Build sie statisch ausliefert. Die übrigen Seiten werden im Netlify-Zweig
  serverseitig gerendert.

Der Kommentar in `astro.config.mjs` hält den Zweck des Netlify-Zweigs fest: er
„dient ausschliesslich der Redaktion".

_Diese ADR wurde aus der Git-Historie nachgetragen (`0138da5`)._

### Consequences

* Gut, weil die öffentliche Website statisch bleibt: keine Server-Kosten, keine
  Laufzeit-Abhängigkeit für Besucher.
* Gut, weil die Redaktion über Keystatics GitHub-Modus arbeitet und Änderungen
  als Branches mit Prefix `keystatic/` entstehen (`keystatic.config.ts`). Das
  ist der Regelfall: die Redaktion nutzt den gehosteten Admin, nur eine Person
  arbeitet zusätzlich lokal (Auskunft des Betreibers, 2026-09-05).
* Schlecht, weil zwei Build-Varianten gepflegt werden müssen und nur der
  Pages-Pfad Qualitäts-Gates hat (siehe [ADR-0007](0007-qualitaets-gates-und-vitest.md)):
  Netlify baut ohne Biome, `astro check` und Tests.
* Schlecht, weil sicherheitsrelevante Konfiguration auseinanderläuft: die CSP
  gilt nur im statischen Zweig (siehe [ADR-0010](0010-csp-nur-im-statischen-zweig.md)).
  Da die Redaktion täglich im Netlify-Zweig arbeitet, ist das kein Randfall.
* Schlecht, weil `keystatic.config.ts` auch im Browser ausgewertet wird und
  deshalb ein Vite-`define` für `process.env.KEYSTATIC_STORAGE_KIND` braucht
  (`26f0758`) — ohne das bricht die Hydration des Admins mit
  „process is not defined".

## More Information

`netlify.toml` beschreibt Build-Befehl, Publish-Verzeichnis, Umgebung und
Node-Version des SSR-Zweigs; Deploy Previews und Branch-Deploys erben sie. Nicht
dort abbildbar ist die Auswahl des Produktions-Branches (`main`) — das ist laut
Netlify-Dokumentation eine reine UI-Einstellung; ebenso liegen die OAuth-Secrets
bewusst nur in der Netlify-UI. Neu bewerten, falls
Keystatic je einen Storage-Modus ohne serverseitige OAuth-Routen bekommt — dann
könnte der Netlify-Zweig entfallen.
