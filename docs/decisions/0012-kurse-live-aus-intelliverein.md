---
status: accepted
date: 2026-09-22
---

# Buchbare Kurse zur Bauzeit aus der IntelliVerein-API

## Context and Problem Statement

Die Kursverwaltung des Vereins läuft in IntelliVerein (IntelliOnline) unter
`tv-odernheim.intelliverein.de`; dort werden Schwimmkurse, Ferienangebote und
Lehrgänge angelegt, freigegeben und gebucht. Auf der Website standen sie
überhaupt nicht — nur der Hinweis „Anmeldung nur noch über das Nutzerportal"
(Announcement `kursanmeldung-system`). Wer wissen wollte, welcher Kurs gerade
buchbar ist, musste das Portal öffnen.

Die 32 Einträge der Collection `courses/` sind etwas anderes: laufende
Übungsstunden ohne Anmeldung, ohne Gebühr, ohne Laufzeit. Sie in derselben
Liste zu führen hieße, zwei verschiedene Dinge gleich aussehen zu lassen.

Wie kommen die buchbaren Kurse auf die Website, und woher?

## Considered Options

* Kursliste zur Bauzeit über die öffentliche API des Kursmoduls holen
* Kurse redaktionell in Keystatic doppelt pflegen
* Authentifizierter API-Zugriff mit Vereinslogin (Zugangsdaten als CI-Secret)
* Die Portal-Kursliste als `<iframe>` einbetten

## Decision Outcome

Gewählt: **öffentliche API zur Bauzeit**, Client in `src/lib/intelliverein.ts`,
Anzeige in `/kurse`.

Das Angular-Frontend des Portals bedient seine eigene öffentliche Kursliste
(`/intellionline/kursliste`) über ungeschützte Endpunkte des Backends unter
`/intellionline/backend/api` — gefunden im Bundle der App, Basis-Pfad aus
`assets/env-config.json`:

| Endpunkt | Inhalt |
|---|---|
| `POST cevkurs/publickurslist` | freigegebene Kurse (hier genutzt) |
| `POST cevkurstage/publickurstageforkurs` | Einzeltermine eines Kurses |
| `POST cevkurskategorie/publickeyvalue` | Kategorien |
| `POST cevort/publickeyvalue` | Sportstätten |

Damit entfällt der Grund für Zugangsdaten. Ein Verwaltungslogin als
GitHub-Actions-Secret wäre die Vollmacht über Mitglieder- und Beitragsdaten für
eine Liste, die der Server ohnehin jedem Besucher herausgibt — das Risiko steht
in keinem Verhältnis. Redaktionelle Doppelpflege wurde verworfen, weil Status
(„Anmeldung geschlossen") und freie Plätze sich täglich ändern und in Keystatic
sofort veralten. Ein `<iframe>` wurde verworfen, weil er die CSP des statischen
Zweigs (`default-src 'self'`, [ADR-0010](0010-csp-nur-im-statischen-zweig.md))
aufbrechen würde und die fremde Oberfläche mitsamt eigenem Layout einblendet.

Gezeigt werden nur Kurse mit **offener Anmeldung**: ein geschlossener Kurs ist
für Besucher eine Sackgasse, er gehört in die Kursliste des Portals, nicht auf
die Website. Der Server filtert bereits auf das öffentlich Sichtbare
(Freigabedatum, vereinsintern); `selectVisibleCourses` prüft dieselben
Kriterien noch einmal, weil sie nirgends zugesichert sind. Zwei Felder werden
bewusst nicht durchgereicht: `Beschreibung` kommt als HTML aus der Verwaltung
und wird zu Textabsätzen abgeräumt, statt es als `set:html` zu rendern;
`KursLeiter` enthält die Mitgliedsnummer (`"Biehl, Anke (Mitg.Nr.: 1148)"`) — angezeigt wird
`KursLeiterOeffentlich`, sonst das Feld ohne Nummer.

Der Abruf läuft im Frontmatter von `src/pages/kurse.astro`, also zur Bauzeit im
statischen Zweig. Schlägt er fehl, fängt die Seite den Fehler, protokolliert ihn
und zeigt statt der Liste den Verweis auf die Portal-Kursliste — ein Ausfall der
Vereinsverwaltung darf den Deploy der übrigen Website nicht aufhalten.

Weil die Daten damit so alt sind wie der letzte Build, baut
`.github/workflows/deploy.yml` zusätzlich alle zwölf Stunden (`schedule`,
02:40 und 14:40 UTC). Häufiger wäre möglich, kostet aber Actions-Minuten für
einen vollständigen Build samt Bildpipeline; zwölf Stunden ist der Kompromiss
zwischen Aktualität und Laufzeit.

### Consequences

* Gut, weil die Kurse ohne Doppelpflege auf der Website stehen: Freigabe in der
  Verwaltung genügt, spätestens einen halben Tag später ist der Kurs online.
* Gut, weil kein Geheimnis existiert, das in der CI liegen oder rotieren müsste.
* Gut, weil freie Plätze aus der Quelle kommen und nicht geschätzt sind, und
  weil die Seite keinen Kurs anbietet, den niemand mehr buchen kann.
* Neutral, weil die Anmeldung weiterhin im Portal stattfindet — die Karte
  verlinkt den Buchungs-Deeplink, den das Portal selbst erzeugt.
* Schlecht, weil die API undokumentiert und nicht zugesichert ist: ändert
  IntelliVerein Endpunkt oder Feldnamen, fällt `/kurse` auf den Portal-Verweis
  zurück. Das Mapping ist deshalb in `src/lib/intelliverein.test.ts` an einem
  echten Antwortsatz festgehalten.
* Schlecht, weil zwischen zwei Builds bis zu zwölf Stunden liegen: ein gerade
  geschlossener Kurs steht bis zum nächsten Build noch auf der Seite, ein
  frisch freigegebener fehlt noch.
