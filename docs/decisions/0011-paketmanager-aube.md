---
status: accepted
date: 2026-09-20
---

# Paketmanager aube, npm-Lockfile bleibt

## Context and Problem Statement

Lokal war `npm install` ein Handgriff vor jedem Script: wer nach einem Pull
`npm run dev` startete, bekam entweder veraltete Abhängigkeiten oder eine
Fehlermeldung. Zugleich laufen die Lifecycle-Skripte der Abhängigkeiten bei npm
ungeprüft mit, und jeder Klon lädt dieselben Pakete erneut herunter.

[aube](https://aube.jdx.dev) löst genau diese drei Punkte: `aubr <script>`
(= `aube run`) installiert fehlende oder veraltete Abhängigkeiten vorher
automatisch, Pakete liegen in einem projektübergreifenden Store
(`~/.local/share/aube/store/v1`) und werden von dort in ein isoliertes
`node_modules/.aube` verlinkt, und Build-Skripte von Abhängigkeiten laufen nur
nach Freigabe (`allowBuilds`, plus eine eingebaute Trusted-Liste).

Die Einschränkung kommt von der zweiten Deploy-Strecke: Netlify baut den
SSR-Zweig für den Keystatic-Admin
([ADR-0001](0001-dual-deploy-statisch-und-ssr.md)) und erkennt den Paketmanager
allein am Lockfile — npm, pnpm, yarn oder bun. aube kennt Netlify nicht. Die
Frage war also nicht, ob aube lokal und in GitHub Actions installiert, sondern
welches Lockfile im Repository liegt.

## Considered Options

* `package-lock.json` als einziges Lockfile behalten; aube schreibt es in-place,
  Netlify installiert weiter mit npm.
* `aube import` nach `aube-lock.yaml`; den Netlify-Install per
  `NPM_FLAGS="--version"` neutralisieren und aube im Build-Command selbst
  nachinstallieren.

## Decision Outcome

Gewählt: **`package-lock.json` bleibt das einzige Lockfile.**

Der Ausschlag gab die Prüfbarkeit. Option 1 lässt sich lokal beweisen: nach
`aube install` ist `package-lock.json` unverändert (kein Diff, auch nicht an
Formatierung oder Reihenfolge), und ein `npm ci --ignore-scripts` auf einer
Kopie von `package.json` + `package-lock.json` in einem Temp-Verzeichnis läuft
durch (1036 Pakete, Exit 0). Damit ist der Netlify-Pfad ohne Deploy-Preview
abgesichert.

Option 2 hätte den Netlify-Build auf einen Umweg gestellt, der sich nur auf
Netlify selbst testen lässt — ein fehlgeschlagener Install dort nimmt den
Keystatic-Admin mit, und `NPM_FLAGS="--version"` ist ein Trick, der bei jeder
Änderung an Netlifys Build-Image neu bewertet werden müsste. Verworfen.

Versionen stehen in `mise.toml` (`node = "26.1.0"`, `aube = "2.2.17"`).
Absichtlich kein `packageManager`- oder `devEngines`-Feld in `package.json`: es
bleibt eine Versionsquelle, so wie bisher für Node
([ADR-0007](0007-qualitaets-gates-und-vitest.md)). Netlify liest Node weiter aus
`NODE_VERSION` in `netlify.toml`.

`aube-workspace.yaml` ist eingecheckt. Darin nur `trustPolicyExclude`, keine
`allowBuilds`: `aube ignored-builds` meldet nichts, aubes eingebaute
Trusted-Liste deckt die Build-Skripte dieses Projekts (u. a. `sharp`, `esbuild`)
ab. Die zwei Ausnahmen betreffen beide Netlify-Pakete, deren Releases keine
Provenance-Attestation mehr tragen, während eine frühere Version eine hatte —
aubes Default `trustPolicy: no-downgrade` bricht deswegen ab:

| Eintrag | Befund |
|---|---|
| `@netlify/edge-bundler` | ohne Version, Bestand aus der ersten aube-Nutzung |
| `@netlify/serverless-functions-api@2.18.0` | Publisher `netlify-bot` unverändert über alle 43 `2.x`-Releases, Registry-Signaturen vorhanden, Provenance fehlt der ganzen `2.x`-Reihe — Release-Prozess-Drift, kein Einzelfall. Version gepinnt, damit ein Update erneut geprüft wird. |

In `.github/workflows/deploy.yml` installiert `jdx/mise-action@v4` jetzt Node und
aube, `aube ci` ersetzt `npm ci`, und die vier Gates laufen als
`aube run --no-install <script>` — der Install-Check wäre direkt nach `aube ci`
nur Wartezeit. Gecacht wird `~/.local/share/aube/store` statt `~/.npm`,
geschlüsselt über `package-lock.json`.

### Consequences

* Gut, weil Scripts nie mehr auf veralteten Abhängigkeiten laufen: `aubr`
  installiert vorher.
* Gut, weil Lifecycle-Skripte von Abhängigkeiten eine Freigabe brauchen und
  Pakete ohne Trust-Evidenz den Install anhalten, statt still zu installieren.
* Gut, weil der Netlify-Zweig unangetastet bleibt und mit `npm ci` lokal
  nachprüfbar ist.
* Schlecht, weil zwei Installer auf einem Lockfile arbeiten. Fällt der
  npm-Gegentest je aus, ist der Ausweg `git checkout package-lock.json` plus
  `aube install --frozen-lockfile`; Abhängigkeitsänderungen liefen dann über
  `npm install --package-lock-only`, danach `aube install --frozen-lockfile`.
* Schlecht, weil `NODE_VERSION` in `netlify.toml` die Zahl aus `mise.toml`
  weiter händisch dupliziert — daran ändert aube nichts.
* Stolperstelle beim Setup: mise braucht mindestens `2026.9.11`. Ältere Versionen
  tragen eine eingebackene aqua-Registry, die aube noch unter `jdx/aube` führt,
  während die Releases seit dem Repository-Transfer aus `aubepkg/aube` kommen;
  `mise install` bricht dann in der Attestation-Prüfung ab
  (`expected 'jdx/aube/.github/workflows/release.yml'`). Kurzfristiger Ausweg
  ohne Abschalten der Prüfung: `MISE_AQUA_BAKED_REGISTRY=0 mise install`.
