---
status: accepted
date: 2026-09-04
---

# Keystatic-Uploads: Slug-Verzeichnisse, Bilder unter src/assets, Anhänge unter public/files

## Context and Problem Statement

Die Redaktion soll Bilder und Dateien im Admin hochladen können, statt sie an
den Programmierern vorbei zu committen und von Hand zu verlinken (`7937ca4`).
Keystatic hängt an `directory` und `publicPath` selbst den Slug des Eintrags an
(`getSrcPrefix`) — die Pfade müssen also zu dieser Konvention passen. Und Astros
Bildservice optimiert nur Dateien unter `src/`: Bilder aus `public/` gingen
unverändert durch, die `format`- und `quality`-Angaben an den Aufrufstellen
waren wirkungslos (`055dd59`). Wo landen Uploads?

## Considered Options

* Bilder unter `src/assets/<collection>/<slug>/`, Anhänge unter `public/files/<collection>/`
* Alles unter `public/images/…` (Ausgangszustand, keine Bildoptimierung)

## Decision Outcome

Gewählt: **getrennte Ablage nach Zweck**, beide der Keystatic-Slug-Konvention
folgend.

* **Bilder** — `directory: src/assets/{courses,board,announcements}`,
  `publicPath: "../../assets/<collection>/"`. Auf der Platte entsteht
  `src/assets/<collection>/<slug>/image.<ext>` bzw. `photo.<ext>`, im
  Frontmatter steht der relative Pfad. Die drei Collections nutzen im
  Content-Schema die Funktionsform mit `image()`, sodass Astro `srcset` und
  Formatumwandlung übernimmt (`055dd59`). Global gilt
  `image: { layout: "constrained" }`.
* **Anhänge** — `directory: public/files/<collection>`,
  `publicPath: /files/<collection>/`; Keystatic schreibt
  `/files/events/<slug>/attachments/0/file.pdf`. Anhänge sollen unverändert
  ausgeliefert werden, deshalb `public/` (`7937ca4`).
* Weil Keystatic die Dateinamen außerhalb der Editor-Felder aus dem
  Feldschlüssel ableitet, trägt jeder Anhang zusätzlich ein `label` für die
  Anzeige (`keystatic.config.ts`), und `Attachments.astro` slugifiziert das
  `download`-Attribut.
* Das Vorstands-Platzhalterbild `src/assets/board/silhouette-neutral.jpg` liegt
  bewusst **ohne** Slug-Verzeichnis, damit ein Upload es nicht überschreiben
  kann (`bae10b3`).

Nicht alles wanderte mit: `public/images/{heros,events,news,disibodenberglauf}`
bleibt in `public/`, weil der Hero-Pfad gleichzeitig die `og:image`-URL ist und
Markdoc-Bilder mit absolutem Pfad von Astro ohnehin nicht optimiert werden
(`055dd59`).

_Diese ADR wurde aus der Git-Historie nachgetragen (`ca3ff46`, `bae10b3`, `7937ca4`, `055dd59`)._

### Consequences

* Gut, weil die Redaktion Fotos und Dateien selbst pflegen kann, ohne Git zu
  benutzen.
* Gut, weil Content-Bilder tatsächlich optimiert ausgeliefert werden —
  `055dd59` misst auf `/kurse/` 1774 KB rohes JPEG gegen 723 KB WebP bei 1×.
* Schlecht, weil die Konvention stillschweigend zerbricht: liegt ein Bild
  falsch, gibt es keinen Fehler, sondern ein unoptimiertes oder fehlendes Bild.
  `keystatic.config.test.ts` prüft deshalb `directory` und Feldart der
  Upload-Felder.
* Schlecht, weil zwei Ablageorte gelten und die Regel „Bilder nach `src/`,
  Downloads nach `public/`" gewusst werden muss.
* `responsiveStyles` bleibt aus, weil Astros ungeschichtete
  `:where()`-Regeln gegen Tailwinds Cascade-Layer verlieren; jede Aufrufstelle
  setzt ihr eigenes `sizes`.
