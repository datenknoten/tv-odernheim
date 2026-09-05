---
status: accepted
date: 2026-09-04
---

# Schriftauslieferung über die Astro Fonts API

## Context and Problem Statement

Inter wurde zweimal falsch ausgeliefert: erst als `<link>` auf
`fonts.googleapis.com` — ein Drittanbieter-Request, der laut `2273c34` „a
DSGVO sore point and was not disclosed in the Datenschutz page" war —, danach
als Paket `@fontsource-variable/inter`, dessen Token aber nie griff: der
gesetzte `--font-family-sans` ist in Tailwind 4 kein Namespace (`--font-*` ist
es), die mitgelieferte woff2 wurde also geladen und nie benutzt. Wie kommt die
Schrift von der eigenen Domain und wirkt dabei tatsächlich?

## Considered Options

* Astro Fonts API mit `fontProviders.fontsource()`
* `@fontsource-variable/inter` behalten und nur den Token-Namen korrigieren
* Google Fonts per `<link>` (bereits in `2273c34` verworfen)

## Decision Outcome

Gewählt: **Astro Fonts API.** `2e08cdf` entfernte die Abhängigkeit
`@fontsource-variable/inter` samt Import aus `Layout.astro` und deklariert die
Schrift in `astro.config.mjs`:

```js
fonts: [{
  provider: fontProviders.fontsource(),
  name: "Inter",
  cssVariable: "--font-inter",
  weights: ["100 900"],
  styles: ["normal"],
  subsets: ["latin", "latin-ext"],
  fallbacks: ["system-ui", "sans-serif"],
}]
```

`<Font cssVariable="--font-inter" preload />` im `<head>` erzeugt `@font-face`
und Preload-Link; in `src/styles/global.css` verbindet
`@theme inline { --font-sans: var(--font-inter); }` die Schrift mit Tailwind —
`inline` ist nötig, weil der Wert eine Variable referenziert. Es gibt weder ein
eigenes `@font-face` noch eine Fontdatei im Repository; die woff2-Dateien sind
Build-Ergebnis.

Belegte Details: `latin-ext`, weil „latin nur U+0000–00FF abdeckt und Namen im
Content darüber hinausgehen können"; `styles: ["normal"]`, weil „die Seite kein
Italic nutzt".

Der Commit entschied sich ausdrücklich gegen die kleinere Reparatur (nur den
Token-Namen richtigstellen).

_Diese ADR wurde aus der Git-Historie nachgetragen (`2e08cdf`)._

### Consequences

* Gut, weil die Schrift von der eigenen Domain kommt — kein Request an
  Google, keine Angabe in der Datenschutzerklärung nötig.
* Gut, weil Astro Subsetting, `@font-face` und Preload erzeugt und die Dateien
  gehasht ausliefert.
* Gut, weil kein Fontpaket mehr als Abhängigkeit gepflegt wird.
* Schlecht, weil die Auslieferung nun von einer Astro-Funktion abhängt, die
  ihre Dateien zur Build-Zeit vom Fontsource-Provider holt: ohne Netz beim Build
  keine Schrift.
* Wichtig fürs Weiterarbeiten: `--font-sans` wird über Tailwinds Preflight zur
  Standardschrift. Es braucht keine `font-sans`-Klasse, und eine eigene
  `font-family`-Deklaration im Layout wäre ein Rückschritt (sie wurde in
  `2e08cdf` entfernt).
