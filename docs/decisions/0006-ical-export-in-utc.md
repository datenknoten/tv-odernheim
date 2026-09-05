---
status: accepted
date: 2026-09-04
---

# iCal-Export in UTC statt mit TZID-Referenz

## Context and Problem Statement

`/termine.ics` schrieb Startzeiten als `DTSTART;TZID=Europe/Berlin:…`, ohne dem
Kalender eine `VTIMEZONE`-Komponente mitzugeben. Das verstößt gegen RFC 5545
§3.2.19; strenge Parser (Outlook) lehnen es ab, und `X-WR-TIMEZONE` ist nur ein
Google-Herstellerfeld. Zusätzlich verlor der Export bei mehrtägigen Terminen die
Uhrzeit, obwohl die Website sie anzeigte. Wie werden Zeitzonen RFC-konform
exportiert?

## Considered Options

* Zeiten nach UTC umrechnen (`DTSTART:20260731T160000Z`)
* Eine eigene `VTIMEZONE`-Komponente mit DST-Regeln schreiben und pflegen

## Decision Outcome

Gewählt: **UTC.** Die Begründung steht in der Commit-Nachricht von `422de6f`:
„Statt eine VTIMEZONE mit DST-Regeln selbst zu schreiben und zu pflegen, gehen
zeitgebundene Termine jetzt in UTC raus – Luxon rechnet MEZ/MESZ korrekt um, und
der Wert ist ohne Zusatzkomponente eindeutig." Der Docblock von `eventDateLines`
in `src/lib/ical.ts` hält den RFC-Bezug fest: `TZID=Europe/Berlin` ohne
mitgeliefertes VTIMEZONE ist nicht RFC-5545-konform (Abschnitt 3.2.19), und
Clients wie Outlook lösen die Zone dann nicht zuverlässig auf.

`422de6f` zog dabei die reinen Funktionen aus der Route in `src/lib/ical.ts`,
damit sie ohne Astro-Laufzeit testbar sind, und behob zwei Fehler:

1. `TZID` ohne `VTIMEZONE` → jetzt UTC-Zeitstempel mit `Z`-Suffix.
2. Mehrtägige Termine mit Uhrzeit wurden als ganztägig exportiert → sie
   beginnen jetzt zur angegebenen Zeit und enden nach dem letzten Tag.

Außerdem verschwand aus der Route eine zweite, eigene Uhrzeit-Regex
(`/^(\d{1,2}):(\d{2})$/`), die Werte akzeptierte, die das Content-Schema
ablehnt — die Regel gilt jetzt nur noch aus `src/lib/time.ts`
(siehe [ADR-0005](0005-uhrzeit-als-optionales-hhmm-feld.md)).

Ohne Uhrzeit bleibt es beim ganztägigen Eintrag mit exklusivem `DTEND`.
Eintägige Termine mit Uhrzeit erhalten `DEFAULT_EVENT_DURATION_HOURS` = 2, weil
es kein Endzeit-Feld gibt.

_Diese ADR wurde aus der Git-Historie nachgetragen (`422de6f`)._

### Consequences

* Gut, weil der Kalender ohne Zusatzkomponente RFC-konform ist und in strengen
  Parsern funktioniert.
* Gut, weil `src/lib/ical.test.ts` MEZ- und MESZ-Umrechnung, den
  Ganztags-Fallback und explizit „enthält kein TZID" prüft.
* Neutral, weil Kalender die UTC-Zeit lokal zurückrechnen — Anwender sehen
  weiterhin die Berliner Zeit.
* Schlecht, weil die exportierte Zeitzone nicht mehr im Feed steht: verschiebt
  ein Termin sich über eine DST-Grenze, muss die Umrechnung erneut laufen (sie
  passiert bei jedem Build, ist also unkritisch).
