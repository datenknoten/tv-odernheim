---
status: accepted
date: 2026-09-04
---

# Uhrzeit als optionales HH:MM-Feld mit geteiltem Muster

## Context and Problem Statement

Termine haben manchmal eine Uhrzeit und manchmal nicht. Die Regel „HH:MM oder
leer" muss an drei Stellen gelten: im Content-Schema (Build), in der
Keystatic-Feldvalidierung (Redaktion) und im iCal-Export. Die erste Fassung
validierte gar nicht (`845b947`), die zweite strikt an beiden Stellen
(`bd29fb5`) — und machte damit **jedes** Speichern eines Termins unmöglich. Wie
wird die Regel einmal definiert und überall korrekt angewandt?

## Considered Options

* Ein gemeinsames Modul mit zwei Mustern: strikt fürs Schema, leer-tolerant für den Admin
* Ein einziges striktes Muster an beiden Stellen (`bd29fb5`, funktioniert nicht)
* Feld im Admin als `isRequired` markieren

## Decision Outcome

Gewählt: **ein Modul `src/lib/time.ts` mit zwei Mustern.**

* `TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/` — Content-Schema, strikt.
* `OPTIONAL_TIME_PATTERN = /^(?:([01]?\d|2[0-3]):[0-5]\d)?$/` — Keystatic,
  leerer Wert erlaubt.
* Dazu `normalizeTime` (trimmt, leer → `undefined`) und `parseTime`
  (→ `{ hour, minute }` oder `null`).

Der Grund für zwei Muster ist ein Keystatic-Detail: `validateText` wendet
`validation.pattern` unbedingt an, auch auf den leeren String;
`isRequired: false` setzt lediglich `min: 0`. Mit dem strikten Muster im Admin
scheiterte deshalb jeder Speichervorgang (`dcbdc8d`).

`src/lib/time.ts` importiert bewusst nichts aus `astro:content`, damit
`keystatic.config.ts` — das außerhalb der Astro-Laufzeit ausgewertet wird — das
Modul importieren kann. Der Datei-Kommentar hält das fest.

Die Anzeige liegt ebenfalls an einer Stelle: `formatEventDateTime()` und
`eventDateTimeAttribute()` in `src/lib/events.ts` liefern
„31.07.2026, 18:00 Uhr" und `2026-07-31T18:00` für das `datetime`-Attribut,
genutzt von `EventCard`, `FeedCard` und `/termine/[slug]` (`4a5991c`).
`formatEventTime()` wurde dabei gelöscht, nicht als Alias behalten.

Fehlt die Uhrzeit, gilt der Termin überall als ganztägig — in der Anzeige und im
iCal-Export (siehe [ADR-0006](0006-ical-export-in-utc.md)).

_Diese ADR wurde aus der Git-Historie nachgetragen (`dcbdc8d`, `4a5991c`)._

### Consequences

* Gut, weil ungültige Uhrzeiten den Build brechen („Uhrzeit muss im Format
  HH:MM angegeben werden (z. B. 18:00).") statt still falsch zu rendern.
* Gut, weil `keystatic.config.test.ts` die echten Keystatic-Validatoren aufruft
  und die Leer-Falle damit dauerhaft abgedeckt ist.
* Gut, weil `src/lib/time.test.ts` beide Muster gegen Tabellen prüft.
* Schlecht, weil die Regel formal zweimal existiert und beim Ändern beide
  Muster angepasst werden müssen.
* Schlecht, weil ein Endzeit-Feld fehlt: eintägige Termine mit Uhrzeit bekommen
  im Export eine pauschale Dauer von zwei Stunden.
