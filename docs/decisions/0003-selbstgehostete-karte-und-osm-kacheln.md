---
status: accepted
date: 2026-05-19
---

# Selbstgehostete GPX-Route und lokal gecachte OSM-Kacheln statt eingebetteter Kartendienste

## Context and Problem Statement

Die Seite `/disibodenberglauf/` soll die Laufstrecken zeigen. Eine eingebettete
Karte eines Kartendienstes würde bei jedem Seitenaufruf Anfragen an Dritte
auslösen. Zugleich verbietet die OSM-Tile-Usage-Policy Massen-Downloads von
`tile.openstreetmap.org`. Wie wird eine bedien- und zoombare Karte
ausgeliefert, ohne zur Laufzeit externe Anfragen zu stellen?

## Considered Options

* Externe Links auf Outdooractive und Komoot (`8f5ca00`, `d442c7e`)
* Selbstgehostete GPX-Datei, gerendert als Inline-SVG (`a8390d0`), optional mit
  Terrain-Hillshade als PNG (`5312f7d`)
* Leaflet mit lokal gecachten OSM-Rasterkacheln aus `public/tiles/` (`9b590f1`)

## Decision Outcome

Gewählt: **Leaflet mit lokal gecachten OSM-Kacheln**, GPX-Dateien aus dem
eigenen `public/`-Verzeichnis.

Die drei Optionen sind tatsächlich hintereinander gebaut worden. Belegte
Begründungen, wörtlich aus den Commits:

* `a8390d0`: „Vendors the 5-km strecke as public/disibodenberglauf/strecke.gpx so
  the file is shipped from our own domain (no third-party request)." und „The
  map renders entirely from local DOM — no map tiles, no tracking, no JS
  required."
* `9b590f1`: „The static SVG was charming but flat. Switching the route view to a
  real slippy map (Leaflet) so visitors can pan/zoom, while keeping the
  no-external-requests property by serving OSM raster tiles from public/tiles/."

Die externen Links auf Outdooractive und Komoot blieben als Buttons erhalten;
`a8390d0` nennt sich selbst ausdrücklich eine „third option".

Aktueller Aufbau:

* `scripts/cache-tiles.mjs` (`npm run cache-tiles`) liest die fünf GPX-Dateien
  in `public/disibodenberglauf/`, bildet zwei Bounding-Boxen und lädt
  `https://tile.openstreetmap.org/{z}/{x}/{y}.png` nach
  `public/tiles/{z}/{x}/{y}.png`: Zoom 13–16 über die gepolsterte Gesamt-Box,
  Zoom 17 nur über die engen Kinderrunden. Vorhandene Dateien werden
  übersprungen, zwischen Downloads liegen 1100 ms, der User-Agent identifiziert
  den Verein.
* Die Kacheln sind im Repository eingecheckt, nicht im Build erzeugt: 144 PNG,
  ca. 2,2 MB — 6 (z13), 12 (z14), 28 (z15), 78 (z16), 20 (z17). Nachgezählt am
  2026-09-05, `npm run cache-tiles` meldet dafür `downloaded=0 skipped=144`.
* Die fünf GPX-Dateien ergeben 5,04 km (Hauptlauf), 2,01 km (Jugend), 1,12 km
  und 0,46 km (Kinder) sowie 0,12 km (Bambini) — gemessen am 2026-09-05 aus den
  Trackpoints. `a8390d0` („the 5-km strecke") ist damit richtig; der Tab-Text
  „5 / 10 km" nennt die beiden angebotenen Wettbewerbe, eine eigene 10-km-Spur
  liegt nicht im Repository.
* `src/pages/disibodenberglauf.astro` liest die GPX-Dateien zur Build-Zeit und
  rendert clientseitig `L.tileLayer("/tiles/{z}/{x}/{y}.png")` mit
  `minZoom: 13`, `maxZoom: 17`.
* Attribution steht doppelt: im Leaflet-Control und in der `<figcaption>`, die
  gerendert lautet „Kartenkacheln © OpenStreetMap-Mitwirkende – lokal gehostet,
  keine externen Anfragen zur Laufzeit."

Die Zoom-Grenzen sind eine Policy-Entscheidung, nicht Geschmack. `d197dff`
begründet die asymmetrische Polsterung (0,003° / 0,025°) mit den grauen
Rändern auf Desktop-Breiten und rechnet vor: „Tile count grows from 22 to ~125,
still well within OSM's "minor use" limit." Zoom 17 gilt nur für die kurzen
Runden; der Kommentar in `scripts/cache-tiles.mjs` begründet das: „the wide main
route at z17 would be ~250 tiles and push past the OSM "minor use" policy,
whereas the loops add only 20."

_Diese ADR wurde aus der Git-Historie nachgetragen (`a8390d0`, `9b590f1`, `d197dff`, `cc0dbf6`)._

### Consequences

* Gut, weil zur Laufzeit keine Anfrage an einen Kartendienst geht — nachprüfbar
  im Netzwerk-Tab.
* Gut, weil die Strecken zusätzlich als GPX zum Download bereitstehen
  (`disibodenberglauf-2026-<variante>.gpx`).
* Schlecht, weil der Kachel-Cache Handarbeit ist: neue oder geänderte
  GPX-Dateien brauchen einen erneuten `npm run cache-tiles`, sonst bleiben
  Bereiche grau.
* Schlecht, weil Binärdateien im Repository liegen und mit jedem Klon geladen
  werden.
* Schlecht, weil die Kacheln nicht altern können: es gibt keinen Mechanismus,
  der veraltete Kacheln erneuert.
* Zwangsfolge in der CSP: Leaflet setzt für nicht ladbare Kacheln ein
  1×1-GIF als `data:`-URL und schreibt Inline-Transforms auf Panes und Marker.
  Beides musste erlaubt werden (siehe [ADR-0010](0010-csp-nur-im-statischen-zweig.md)).
* Der Terrain-Hillshade aus `5312f7d` ist mit dem Wechsel auf Leaflet gelöscht
  worden, weil die Reliefschattierung optisch nicht überzeugte (Auskunft des
  Betreibers, 2026-09-05).

## More Information

Die Policy steht als Kommentar im Kopf von `scripts/cache-tiles.mjs`, samt der
dort genannten Ausweichmöglichkeiten (Stadia Maps, MapTiler, OpenFreeMap oder
eigener Tileserver). Neu bewerten, sobald mehr Zoomstufen oder ein größerer
Ausschnitt gebraucht werden — dann ist ein Anbieterwechsel fällig, kein
größerer Download.
