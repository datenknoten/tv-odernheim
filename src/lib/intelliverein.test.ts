import { describe, expect, it } from "vitest";
import {
  courseInstructor,
  formatAgeRange,
  formatAvailability,
  formatCourseRange,
  htmlToParagraphs,
  mapCourse,
  type RawCourse,
  selectVisibleCourses,
} from "./intelliverein";

// Gekuerzter, sonst unveraenderter Satz aus cevkurs/publickurslist.
const RAW: RawCourse = {
  Id: 163,
  KursNr: "12b_26",
  Bezeichnung: "Aufbaukurs Schwimmen",
  Beschreibung:
    "<div>Kinder, die das &#34;Seepferdchen&#34; schon erreicht haben, bauen hier ihr K&#246;nnen weiter aus.</div><div>Mindestalter 6 Jahre</div><div><br></div>",
  Zeitangabe: "18:00 -18:45 Uhr",
  Wochentag: "Dienstag",
  Beginn: "2026-08-25T18:00:00",
  Ende: "2026-12-15T00:00:00",
  Kursgebuehr: 130,
  KursgebuehrMitglieder: 100,
  Ermaessigung: "Mitglied",
  Kurseinheiten: "12",
  MinAlter: null,
  MaxAlter: 16,
  MinTeilnehmer: 6,
  MaxTeilnehmer: 7,
  AnzahlTeilnehmer: 6,
  AnzahlWarteliste: 0,
  Warteliste: 1,
  Vereinsintern: 0,
  Status: 2,
  StatusDisplay: "Anmeldung geschlossen",
  CevKursKategorieIdDisplay: "Schwimmen",
  CevOrtIdDisplay:
    "Schulschwimmbad Paul-Schneider-Gymnasium - Präses-Held-Str. 1, 55590 Meisenheim",
  KursLeiter: " Biehl, Anke (Mitg.Nr.: 1148)",
  KursLeiterOeffentlich: "",
  LinkAgb: "https://tv-odernheim.intelliverein.de/cms/iwebs/download.aspx?id=35970#",
  URLBeschreibung: "",
};

function raw(overrides: Partial<RawCourse> = {}): RawCourse {
  return { ...RAW, ...overrides };
}

describe("htmlToParagraphs", () => {
  it("macht aus div-Zeilen Absaetze und loest Entities auf", () => {
    expect(htmlToParagraphs(RAW.Beschreibung)).toEqual([
      'Kinder, die das "Seepferdchen" schon erreicht haben, bauen hier ihr Können weiter aus.',
      "Mindestalter 6 Jahre",
    ]);
  });

  it("entfernt Markup, statt es durchzureichen", () => {
    expect(htmlToParagraphs('<p>Hallo <a href="x" onclick="evil()">Welt</a></p>')).toEqual([
      "Hallo Welt",
    ]);
  });

  it("trennt bei br und verwirft leere Zeilen", () => {
    expect(htmlToParagraphs("Eins<br>&nbsp;<br />Zwei")).toEqual(["Eins", "Zwei"]);
  });

  it("liefert fuer leere Beschreibungen nichts", () => {
    expect(htmlToParagraphs(null)).toEqual([]);
    expect(htmlToParagraphs("<div></div>")).toEqual([]);
  });
});

describe("courseInstructor", () => {
  it("entfernt die Mitgliedsnummer aus dem internen Feld", () => {
    expect(courseInstructor(RAW)).toBe("Biehl, Anke");
  });

  it("bevorzugt die freigegebene Schreibweise", () => {
    expect(courseInstructor(raw({ KursLeiterOeffentlich: "Anke B." }))).toBe("Anke B.");
  });

  it("bleibt leer, wenn keine Leitung gepflegt ist", () => {
    expect(courseInstructor(raw({ KursLeiter: null, KursLeiterOeffentlich: null }))).toBe("");
  });
});

describe("mapCourse", () => {
  it("trennt Sportstaette und Anschrift", () => {
    const course = mapCourse(RAW);
    expect(course.location).toBe("Schulschwimmbad Paul-Schneider-Gymnasium");
    expect(course.locationAddress).toBe("Präses-Held-Str. 1, 55590 Meisenheim");
  });

  it("rechnet freie Plaetze aus Hoechstzahl und Anmeldungen", () => {
    expect(mapCourse(RAW).freePlaces).toBe(1);
    expect(mapCourse(raw({ AnzahlTeilnehmer: 9 })).freePlaces).toBe(0);
    expect(mapCourse(raw({ MaxTeilnehmer: null })).freePlaces).toBeNull();
  });

  it("oeffnet die Anmeldung nur bei Status 1", () => {
    expect(mapCourse(RAW).registrationOpen).toBe(false);
    expect(mapCourse(raw({ Status: 1 })).registrationOpen).toBe(true);
  });

  it("meldet Warteliste nur bei offener Anmeldung und vollem Kurs", () => {
    expect(mapCourse(raw({ Status: 1, AnzahlTeilnehmer: 7 })).waitlist).toBe(true);
    expect(mapCourse(raw({ Status: 1, AnzahlTeilnehmer: 7, Warteliste: 0 })).waitlist).toBe(false);
    expect(mapCourse(raw({ Status: 2, AnzahlTeilnehmer: 7 })).waitlist).toBe(false);
  });

  it("verlinkt die Buchung im Portal mit der Kurs-Id", () => {
    expect(mapCourse(RAW).bookingUrl).toBe(
      "https://tv-odernheim.intelliverein.de/intellionline?route=kursbuchung&filter=%7B%22Id%22%3A%22163%22%7D&skiperr=true",
    );
  });

  it("nimmt nur echte Links, keine Platzhalter", () => {
    expect(mapCourse(RAW).infoUrl).toBeNull();
    expect(mapCourse(raw({ URLBeschreibung: "siehe Aushang" })).infoUrl).toBeNull();
    expect(mapCourse(raw({ URLBeschreibung: "https://example.org/kurs" })).infoUrl).toBe(
      "https://example.org/kurs",
    );
  });

  it("kuerzt Zeitstempel auf ISO-Datum", () => {
    const course = mapCourse(RAW);
    expect([course.start, course.end]).toEqual(["2026-08-25", "2026-12-15"]);
  });
});

describe("selectVisibleCourses", () => {
  it("laesst vereinsinterne und abgelaufene Kurse weg", () => {
    const courses = selectVisibleCourses(
      [
        raw({ Id: 1, KursNr: "01", Status: 1, Vereinsintern: 1 }),
        raw({ Id: 2, KursNr: "02", Status: 1, Ende: "2026-09-21T00:00:00" }),
        raw({ Id: 3, KursNr: "03", Status: 1, Ende: "2026-09-22T00:00:00" }),
      ],
      "2026-09-22",
    );
    expect(courses.map((course) => course.id)).toEqual([3]);
  });

  it("zeigt nur Kurse mit offener Anmeldung", () => {
    const courses = selectVisibleCourses(
      [
        raw({ Id: 1, KursNr: "01", Status: 2 }),
        raw({ Id: 2, KursNr: "02", Status: 1 }),
        raw({ Id: 3, KursNr: "03", Status: 0 }),
      ],
      "2026-09-22",
    );
    expect(courses.map((course) => course.id)).toEqual([2]);
  });

  it("sortiert nach Beginn, bei gleichem Beginn nach Kursnummer", () => {
    const courses = selectVisibleCourses(
      [
        raw({ Id: 1, KursNr: "12b_26", Status: 1, Beginn: "2026-08-25T17:15:00" }),
        raw({ Id: 2, KursNr: "14_26", Status: 1, Beginn: "2026-11-28T09:00:00" }),
        raw({ Id: 3, KursNr: "12a_26", Status: 1, Beginn: "2026-08-25T18:00:00" }),
      ],
      "2026-09-22",
    );
    expect(courses.map((course) => course.kursNr)).toEqual(["12a_26", "12b_26", "14_26"]);
  });
});

describe("Anzeigetexte", () => {
  it("zeigt den Zeitraum ohne doppeltes Jahr", () => {
    expect(formatCourseRange(mapCourse(RAW))).toBe("25.08. – 15.12.2026");
  });

  it("zeigt eintaegige Kurse als einzelnes Datum", () => {
    const course = mapCourse(raw({ Beginn: "2026-11-28T09:00:00", Ende: "2026-11-28T00:00:00" }));
    expect(formatCourseRange(course)).toBe("28.11.2026");
  });

  it("nennt das Jahr zweimal, wenn der Kurs es ueberschreitet", () => {
    const course = mapCourse(raw({ Beginn: "2026-11-28T09:00:00", Ende: "2027-02-01T00:00:00" }));
    expect(formatCourseRange(course)).toBe("28.11.2026 – 01.02.2027");
  });

  it("formuliert offene Altersgrenzen", () => {
    expect(formatAgeRange(mapCourse(RAW))).toBe("bis 16 Jahre");
    expect(formatAgeRange(mapCourse(raw({ MinAlter: 6 })))).toBe("6 – 16 Jahre");
    expect(formatAgeRange(mapCourse(raw({ MinAlter: 16, MaxAlter: null })))).toBe("ab 16 Jahren");
    expect(formatAgeRange(mapCourse(raw({ MinAlter: null, MaxAlter: null })))).toBe("");
  });

  it("sagt, wie viele Plaetze noch frei sind", () => {
    expect(formatAvailability(mapCourse(raw({ Status: 1 })))).toBe("Noch 1 freier Platz");
    expect(formatAvailability(mapCourse(raw({ Status: 1, AnzahlTeilnehmer: 4 })))).toBe(
      "Noch 3 freie Plätze",
    );
    expect(formatAvailability(mapCourse(raw({ Status: 1, MaxTeilnehmer: null })))).toBe(
      "Anmeldung möglich",
    );
    expect(formatAvailability(mapCourse(raw({ Status: 1, AnzahlTeilnehmer: 7 })))).toBe(
      "Ausgebucht – Warteliste",
    );
    expect(
      formatAvailability(mapCourse(raw({ Status: 1, AnzahlTeilnehmer: 7, Warteliste: 0 }))),
    ).toBe("Ausgebucht");
  });
});
