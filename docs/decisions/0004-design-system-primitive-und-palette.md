---
status: accepted
date: 2026-07-19
---

# Design-System: drei Primitive, Styleguide-Seite, Palette auf Schwarz und Rot

## Context and Problem Statement

Die Seitenvorlagen wiederholten dieselben Tailwind-Klassenketten. `7eda3aa`
beschreibt den Ausgangszustand: der Call-to-Action-Button war „a copy-pasted
Tailwind string in 11 places across 8 files", und die Palette trug „an off-brand
blue (`--color-secondary`) baked into every button/link hover". Wie werden
wiederkehrende UI-Bausteine und die Farbpalette festgeschrieben, damit neue
Seiten nicht wieder abweichen?

## Considered Options

* Benannte Astro-Komponenten als Primitive plus eine Styleguide-Seite
* Komponentenklassen per `@apply` in `src/styles/global.css` (`.btn`, `.btn-primary`)
* Variantenbibliothek (CVA, `tailwind-variants`) hinter einer Komponente
* Weiter kopierte Klassenketten pro Seite

Die Form „Astro-Komponente" war eine Umsetzungsentscheidung im damaligen Commit
und ist nicht diskutiert worden (Auskunft des Betreibers, 2026-09-05). Die
Abwägung ist unten nachgetragen, damit sie beim nächsten Zweifel nicht wieder
bei Null beginnt.

## Decision Outcome

Gewählt: **drei Primitive plus eine Styleguide-Seite als Vertrag.**

* `src/components/Button.astro` (`7eda3aa`) — Varianten `primary`, `accent`,
  `outline`, `link`; Größen `sm`, `md`; `class` wird gemerged, nicht ersetzt.
* `src/components/SectionHeading.astro` (`7eda3aa`) — Überschriftenblock auf
  `h2`-Ebene.
* `src/components/Hero.astro` (`7f1a3fe`) — Seitenkopf auf `h1`-Ebene, im Commit
  als „the page-level (h1) counterpart to SectionHeading (h2)" beschrieben.
  Später erweitert um einen `media`-Slot für den zweispaltigen Kopf
  (`1cad7cc`) und einen `eyebrow`-Slot für reiche Metadaten (`99a85b1`).
  Übernommen auf Kurse, Verein und Aktuelles in `8df17b7`.
* `src/pages/styleguide.astro` (`/styleguide`) zeigt alle Varianten und
  formuliert die Regel im Klartext: „Neue Seiten setzen ausschließlich diese
  Primitive ein."

Alles andere in `src/components/` (Nav, Breadcrumbs, FeedCard, EventCard,
AnnouncementCard, StatusBadge, Attachments) ist seitenspezifischer Baustein,
kein Primitiv.

Die Palette besteht aus drei CSS-first-Tokens in `src/styles/global.css`
(`@theme`): `--color-primary #000000`, `--color-secondary #b91c1c`,
`--color-accent #e53e3e`. Schwarz und Rot sind die Vereinsfarben des TV
Odernheim; die gesamte Vereins-CI außerhalb der Website baut darauf auf
(Auskunft des Betreibers, 2026-09-05). `7eda3aa` zeigte `--color-secondary`
vorher auf das Blau `#2c5282` — markenfremd; der Styleguide fasst die Regel als
„Kein Blau." zusammen. Eine `tailwind.config.*` existiert nicht — Tailwind 4
wird ausschließlich über CSS konfiguriert.

Für gerenderte Markdoc-Inhalte kommt `@tailwindcss/typography` hinzu
(`0e4f181`), markenangepasst über `--tw-prose-links` und `--tw-prose-headings`.
Der Commit hält fest, dass die `prose`-Klassen davor wirkungslos waren: das
Plugin war nie registriert, „so preflight stripped list markers and paragraph
margins".

_Diese ADR wurde aus der Git-Historie nachgetragen (`7eda3aa`, `7f1a3fe`, `1cad7cc`, `99a85b1`)._

### Consequences

* Gut, weil Änderungen an Buttons oder Seitenköpfen an einer Stelle passieren.
* Gut, weil `/styleguide` die Regel selbst dokumentiert und Abweichungen sofort
  sichtbar macht.
* Schlecht, weil die Regel nicht erzwungen wird: kein Lint-Rule verhindert
  wieder handgeschriebene Klassenketten.
* `/styleguide` ist absichtlich nicht aus der Navigation verlinkt: die Seite ist
  ein internes Werkzeug für die Entwicklung, kein Inhalt für Besucher.
* `StatusBadge` nutzt weiterhin Tailwinds Standard-Gelb/-Rot statt der
  Marken-Tokens; dafür gibt es keine belegte Begründung.

## Pros and Cons of the Options

### Astro-Komponenten (gewählt)

* Gut, weil die Varianten typisiert sind: `type Variant = "primary" | "accent" |
  "outline" | "link"` in `Button.astro`. Ein falscher Wert ist ein Fehler in
  `npm run check` und damit im CI-Gate — ein vertippter Klassenname wäre still.
* Gut, weil sie mehr kapseln als Klassen: `Button` entscheidet über das Element
  (`<a>`), schaltet bei `variant="link"` Rundung und Padding strukturell ab und
  gibt `...rest` (inkl. `aria-*`, `rel`, `target`) weiter. `Hero` hat die Slots
  `media` und `eyebrow` und prüft sie mit `Astro.slots.has()`. Beides ist mit
  einer CSS-Klasse nicht ausdrückbar.
* Gut, weil keine Laufzeit und kein Paket dazukommt: Astro rendert zur Bauzeit,
  es gibt kein zusätzliches Client-JS und keine weitere Abhängigkeit — bei der
  Dependabot-Lage dieses Projekts ein realer Vorteil.
* Gut, weil die Utilities als Literale im Markup stehen und Tailwinds Scanner
  und IntelliSense sie sehen.
* Schlecht, weil sie nur in `.astro`/JSX verfügbar sind. In Markdoc-Inhalten
  lässt sich kein `<Button>` setzen; das ginge nur über freigegebene
  Markdoc-Tags (siehe [ADR-0002](0002-content-modell-markdoc-glob-loader.md)).
* Schlecht, weil `class` vom Aufrufer nur angehängt, nicht konfliktfrei
  gemerged wird. Bei gleicher Eigenschaft entscheidet die Reihenfolge im
  Stylesheet, nicht die im Attribut: im gebauten CSS steht `.px-2` vor `.px-6`,
  ein `<Button class="px-2">` würde also gegen das eigene `px-6` verlieren.
  Aktuell übergibt keine Aufrufstelle solche Overrides, die Falle ist latent.

### `@apply`-Komponentenklassen

* Gut, weil global ohne Import nutzbar, auch auf HTML, das nicht aus einer
  Astro-Komponente kommt.
* Schlecht, weil Klassennamen nichts prüfen: `class="btn-primry"` bleibt
  unbemerkt, und es gibt kein `lsp references` über die Nutzung.
* Schlecht, weil Stil und Markup wieder auseinanderfallen — die Struktur
  (Element, Slots, Zustände) müsste trotzdem jede Seite selbst schreiben.
* Schlecht, weil das Zusammenspiel mit Tailwinds Cascade-Layern eine eigene
  Fehlerquelle ist; dieses Projekt hat das bereits an anderer Stelle erlebt
  (Astros `responsiveStyles` bleibt deshalb aus, siehe
  [ADR-0008](0008-keystatic-uploads-slug-konvention.md)).

### Variantenbibliothek (CVA / `tailwind-variants`)

* Gut, weil Varianten deklarativ als Matrix entstehen und `tailwind-merge`
  genau das Konflikt-Problem löst, das oben als latente Falle steht.
* Schlecht, weil zwei Abhängigkeiten für vier Varianten und zwei Größen
  hinzukommen — der Nutzen setzt bei deutlich mehr Kombinationen ein.
* Neutral, weil sie die Astro-Komponente nicht ersetzt, sondern nur deren
  Klassenlogik: Element, Slots und `...rest` bräuchte es weiterhin.

Fazit für später: Wenn Klassen-Overrides tatsächlich weh tun, ist `tailwind-merge`
in `Button.astro` der kleine, lokale Schritt — kein Wechsel des Modells.
