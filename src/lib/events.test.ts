import { describe, expect, it } from "vitest";
import { eventDateTimeAttribute, formatEventDateTime } from "./events";

type EventEntry = Parameters<typeof formatEventDateTime>[0];

function event(data: { date: string; endDate?: string; time?: string }): EventEntry {
  return { data } as unknown as EventEntry;
}

describe("formatEventDateTime", () => {
  it("zeigt nur das Datum, wenn keine Uhrzeit gesetzt ist", () => {
    expect(formatEventDateTime(event({ date: "2026-07-31" }))).toBe("31.07.2026");
  });

  it("haengt die Uhrzeit an einen Einzeltermin an", () => {
    expect(formatEventDateTime(event({ date: "2026-07-31", time: "18:00" }))).toBe(
      "31.07.2026, 18:00 Uhr",
    );
  });

  // Der iCal-Export uebernimmt die Uhrzeit auch bei mehrtaegigen Terminen,
  // deshalb darf die UI sie hier ebenfalls zeigen.
  it("haengt die Uhrzeit an einen mehrtaegigen Termin an", () => {
    expect(
      formatEventDateTime(event({ date: "2026-07-31", endDate: "2026-08-02", time: "18:00" })),
    ).toBe("31.07.–02.08.2026, 18:00 Uhr");
  });

  it("ignoriert leere Uhrzeiten", () => {
    expect(formatEventDateTime(event({ date: "2026-07-31", time: "  " }))).toBe("31.07.2026");
  });
});

describe("eventDateTimeAttribute", () => {
  it("liefert nur das Datum ohne Uhrzeit", () => {
    expect(eventDateTimeAttribute(event({ date: "2026-07-31" }))).toBe("2026-07-31");
  });

  it("liefert Datum und Uhrzeit als ISO-Wert", () => {
    expect(eventDateTimeAttribute(event({ date: "2026-07-31", time: "18:00" }))).toBe(
      "2026-07-31T18:00",
    );
  });
});
