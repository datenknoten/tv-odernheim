---
status: accepted
date: 2026-05-13
---

# Inhalte als Markdoc-Dateien über den Glob-Loader, Schema doppelt deklariert

## Context and Problem Statement

Die Inhalte liegen als Dateien im Repository (`src/content/<collection>/*.mdoc`)
und werden von zwei Seiten gelesen: Astro braucht sie typisiert zum Bauen,
Keystatic braucht Formulare zum Bearbeiten. Astros ursprüngliche
`defineCollection({ type: "content" })`-Form war zudem als deprecated markiert.
Wie wird das Content-Modell deklariert, ohne dass die zwei Seiten auseinander
laufen?

## Considered Options

* Glob-Loader (`glob({ pattern: "**/*.mdoc", base: … })`) plus separate Keystatic-Formulare
* Weiter mit `type: "content"`

## Decision Outcome

Gewählt: **Glob-Loader**, mit bewusst doppelter Deklaration jeder Collection.

* `src/content.config.ts` hält den Build-Vertrag als Zod-Schema — fünf
  Collections: `courses`, `news`, `board`, `announcements`, `events`.
* `keystatic.config.ts` hält den Redaktions-Vertrag: deutsche Labels,
  `slugField`, `format: { contentField: "content" }`, `fields.markdoc` als Körper.
* Dateiname = Slug = `entry.id`. Der Wechsel auf den Glob-Loader tauschte
  `.slug` gegen `.id` und `entry.render()` gegen das Top-Level `render(entry)`
  (`2428021`).
* Geteilte Regeln liegen in `src/lib/`, nicht in einer der beiden Configs —
  `src/lib/time.ts` importiert deshalb bewusst nichts aus `astro:content`
  (siehe [ADR-0005](0005-uhrzeit-als-optionales-hhmm-feld.md)).

`620d530` trennte dabei die Inhaltsarten: `events` für datierte
Kalendereinträge, `announcements` für die immergrünen Blöcke — „to give the
homepage's evergreen blocks and dated calendar items proper homes, separate from
the news collection that requires a publish date".

Optionale Textfelder sind im Schema als „kann fehlen" modelliert, nicht als
`isRequired` im Admin: Keystatic entfernt leere Werte aus dem Frontmatter, was
den Build mit `InvalidContentEntryDataError` abbrach (`d637c99`). Die im Commit
genannte Alternative — Felder im Admin verpflichtend machen — hätte die
Redaktion zu Pflichtangaben gezwungen, die inhaltlich nicht immer existieren.

_Diese ADR wurde aus der Git-Historie nachgetragen (`2428021`, `620d530`, `d637c99`)._

### Consequences

* Gut, weil das Frontmatter zur Build-Zeit validiert wird: falsche Werte
  brechen den Build, nicht die Seite.
* Gut, weil Redaktions- und Programmier-Sicht getrennt versioniert sind und die
  Keystatic-Feldvalidierung in `keystatic.config.test.ts` direkt testbar ist.
* Schlecht, weil jedes neue Feld an zwei Stellen nachgezogen werden muss.
  Vergessene Nachträge fallen erst beim Speichern oder Bauen auf.

## More Information

### Markdoc als Dateiformat: geerbt, nicht abgewogen

Markdoc kam mit dem initialen Keystatic-Commit (`0138da5`, der die Dateien von
`.md` auf `.mdoc` umbenannte) und wurde nie gegen MDX abgewogen (Auskunft des
Betreibers, 2026-09-05). Es ist damit eine geerbte Vorgabe, keine Entscheidung.

Der Unterschied, falls die Frage wieder aufkommt:

* **Markdoc** (Stripe) ist Markdown plus `{% tag %}`-Syntax und parst zu einem
  JSON-Baum. Inhalte enthalten keinen Code: es gibt keine `import`s, keine
  Ausdrücke, und Tags wirken nur, wenn sie in einer `markdoc.config.*`
  freigegeben sind. Eine Inhaltsdatei kann den Build nicht mit Syntaxfehlern in
  Fremdcode brechen.
* **MDX** ist Markdown plus JSX. Die Datei *ist* ein Modul: sie darf importieren,
  JavaScript auswerten und Komponenten einbinden. Mächtiger, aber jede
  Inhaltsdatei wird Teil des Modulgraphen — mit Build-Fehlern, die für die
  Redaktion nicht lesbar sind, und mit Code-Ausführung aus der Redaktionsfläche.
* Keystatic unterstützt beides mit demselben Editor: `fields.markdoc()` und
  `fields.mdx()` unterscheiden sich nur in der Serialisierung
  (`node_modules/@keystatic/core/…/form/fields/markdoc/index.d.ts` exportiert
  `markdoc` und `mdx`). Die Wahl ist also nicht durch das CMS erzwungen.

Für dieses Projekt kostet die Einschränkung derzeit nichts: keine der 72
Inhaltsdateien nutzt Markdoc-Tags (`{%` kommt in `src/content/` nicht vor), eine
`markdoc.config.*` existiert nicht. Der Inhalt ist reine Prosa mit Frontmatter,
alles Gestaltende steckt in den Astro-Komponenten. Ein Wechsel auf MDX wäre also
nur interessant, wenn die Redaktion Bausteine mitten im Text platzieren soll —
und selbst dann sind Markdoc-Tags plus `markdoc.config.*` der kleinere Schritt,
weil sie eine Whitelist behalten statt beliebigen Code zuzulassen.
