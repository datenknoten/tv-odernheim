import { describe, expect, it } from "vitest";
import { escapeText, eventDateLines, foldLine } from "./ical";

describe("eventDateLines ohne Uhrzeit", () => {
  it("exportiert einen Einzeltermin ganztaegig mit exklusivem DTEND", () => {
    expect(eventDateLines("2026-07-31", "2026-07-31")).toEqual([
      "DTSTART;VALUE=DATE:20260731",
      "DTEND;VALUE=DATE:20260801",
    ]);
  });

  it("exportiert einen mehrtaegigen Termin ganztaegig", () => {
    expect(eventDateLines("2026-07-31", "2026-08-02")).toEqual([
      "DTSTART;VALUE=DATE:20260731",
      "DTEND;VALUE=DATE:20260803",
    ]);
  });

  it("faellt bei ungueltiger Uhrzeit auf ganztaegig zurueck", () => {
    expect(eventDateLines("2026-07-31", "2026-07-31", "25:99")).toEqual([
      "DTSTART;VALUE=DATE:20260731",
      "DTEND;VALUE=DATE:20260801",
    ]);
  });
});

describe("eventDateLines mit Uhrzeit", () => {
  it("exportiert Sommerzeit-Termine in UTC (MESZ = UTC+2) mit Standarddauer", () => {
    expect(eventDateLines("2026-07-31", "2026-07-31", "18:00")).toEqual([
      "DTSTART:20260731T160000Z",
      "DTEND:20260731T180000Z",
    ]);
  });

  it("exportiert Winterzeit-Termine in UTC (MEZ = UTC+1)", () => {
    expect(eventDateLines("2026-01-10", "2026-01-10", "18:00")).toEqual([
      "DTSTART:20260110T170000Z",
      "DTEND:20260110T190000Z",
    ]);
  });

  it("behaelt die Uhrzeit bei mehrtaegigen Terminen und endet nach dem letzten Tag", () => {
    expect(eventDateLines("2026-07-31", "2026-08-02", "18:00")).toEqual([
      "DTSTART:20260731T160000Z",
      "DTEND:20260802T220000Z",
    ]);
  });

  // TZID ohne mitgeliefertes VTIMEZONE ist nicht RFC-5545-konform.
  it("verwendet kein TZID", () => {
    const lines = [
      ...eventDateLines("2026-07-31", "2026-07-31", "18:00"),
      ...eventDateLines("2026-07-31", "2026-08-02", "18:00"),
    ];
    expect(lines.join("\r\n")).not.toContain("TZID");
  });
});

describe("escapeText", () => {
  it("maskiert Sonderzeichen von iCalendar-Textwerten", () => {
    expect(escapeText("Turnhalle, Halle; A\\B\nZeile2")).toBe(
      // biome-ignore lint/security/noSecrets: Erwartungswert der Maskierung, die Backslash-Folgen sehen nur wie ein Token aus.
      "Turnhalle\\, Halle\\; A\\\\B\\nZeile2",
    );
  });
});

describe("foldLine", () => {
  it("laesst kurze Zeilen unveraendert", () => {
    expect(foldLine("SUMMARY:kurz")).toBe("SUMMARY:kurz");
  });

  it("faltet lange Zeilen mit CRLF und fuehrendem Leerzeichen", () => {
    const line = `SUMMARY:${"a".repeat(160)}`;
    const folded = foldLine(line);
    const segments = folded.split("\r\n ");
    expect(segments.length).toBe(3);
    expect(segments.every((segment) => segment.length <= 75)).toBe(true);
    expect(segments.join("")).toBe(line);
  });
});
