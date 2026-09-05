---
status: accepted
date: 2026-09-04
---

# Content Security Policy nur im statischen Zweig, ausgeliefert als Meta-Tag

## Context and Problem Statement

Die öffentliche Website hatte keine Content Security Policy. Astro kann eine
erzeugen, im statischen Modus als `<meta http-equiv="content-security-policy">`
pro Seite, inklusive Hashes für gebündelte Skripte und Inline-Styles. Der
Netlify-Zweig existiert dagegen allein für den Keystatic-Admin, dessen
CSP-Anforderungen nicht dokumentiert sind. Wofür gilt die Policy?

## Considered Options

* CSP nur im statischen Build, per Meta-Tag (Astro `security.csp`)
* CSP zusätzlich für den Netlify-Zweig
* CSP als HTTP-Header (`public/_headers` bzw. `[[headers]]` in `netlify.toml`)

## Decision Outcome

Gewählt: **CSP nur im statischen Zweig**, geliefert als Meta-Tag.

Direktiven in `astro.config.mjs`:

```
default-src 'self'
img-src 'self' data:
object-src 'none'
base-uri 'self'
form-action 'self'
```

plus `styleDirective.resources: ["'self'", { resource: "'unsafe-inline'", kind: "attribute" }]`.

Alle drei Abwägungen stehen als Kommentar in der Datei:

* **Nur statisch** — „Nur der statische Zweig: der Keystatic-Admin im
  Netlify-Zweig ist unter CSP undokumentiert und dient ausschliesslich der
  Redaktion."
* **`data:` bei `img-src`** — „data: fuer Leaflets emptyImageUrl — ein 1x1-GIF,
  das es als src fuer nicht ladbare Kacheln einsetzt." Ohne die Erlaubnis meldet
  die Konsole beim Zoomen einen Verstoß pro betroffener Kachel.
* **`style-src-attr` statt `unsafe-inline`** — „Gesetzte resources ersetzen
  Astros Defaults, deshalb 'self' explizit. style-src-attr deckt die
  Inline-Transforms, die Leaflet zur Laufzeit auf Panes und Marker schreibt; ein
  pauschales 'unsafe-inline' in style-src wuerde Astro dazu bringen, alle
  Style-Hashes zu unterdruecken."

Beide Leaflet-Ausnahmen sind Folge von
[ADR-0003](0003-selbstgehostete-karte-und-osm-kacheln.md).

_Diese ADR wurde aus der Git-Historie nachgetragen (`8273da1`)._

### Consequences

* Gut, weil die öffentliche Website ohne Serverkonfiguration eine CSP mitbringt
  — auf GitHub Pages sind eigene Header nicht setzbar.
* Gut, weil Astro Skripte, Inline-Styles und das Fonts-API-CSS selbst hasht;
  `unsafe-inline` bleibt auf Style-Attribute beschränkt.
* Schlecht, weil der Netlify-Ursprung samt Keystatic-Admin **gar keine** CSP hat
  — `8273da1` sagt das ausdrücklich: „Der Netlify-Zweig liefert weiterhin weder
  Meta noch Header." Es gibt kein `public/_headers` und keinen
  `[[headers]]`-Block. Weil die Redaktion regulär über den gehosteten Admin
  arbeitet (siehe [ADR-0001](0001-dual-deploy-statisch-und-ssr.md)), ist das der
  Ursprung mit den höchsten Rechten — er hat Schreibzugriff auf das Repository
  über GitHub-OAuth — und gleichzeitig der ohne CSP. Nachziehen ließe sich das
  über `[[headers]]` in `netlify.toml`, sobald die CSP-Anforderungen des Admins
  bekannt sind.
* Schlecht, weil ein Meta-Tag schwächer ist als ein Header: es greift erst beim
  Parsen des Dokuments und kann `frame-ancestors` nicht durchsetzen.
* Jedes neue Skript oder eingebettete Fremdinhalt-Ziel muss die Direktiven
  erweitern, sonst bricht es still im Browser.
