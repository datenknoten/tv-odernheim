import { describe, expect, it } from "vitest";
import { normalizeTime, OPTIONAL_TIME_PATTERN, parseTime, TIME_PATTERN } from "./time";

const VALID = ["00:00", "9:30", "09:30", "18:00", "23:59"];
const INVALID = ["24:00", "18:60", "18:00 Uhr", "1800", "18:0", "abc", "18:00,", " 18:00"];

describe("TIME_PATTERN", () => {
  it.each(VALID)("akzeptiert %s", (value) => {
    expect(TIME_PATTERN.test(value)).toBe(true);
  });

  it.each(INVALID)("lehnt %s ab", (value) => {
    expect(TIME_PATTERN.test(value)).toBe(false);
  });

  it("lehnt den Leerwert ab", () => {
    expect(TIME_PATTERN.test("")).toBe(false);
  });
});

describe("OPTIONAL_TIME_PATTERN", () => {
  // Keystatic prueft das Muster auch bei leeren optionalen Feldern – ohne
  // Leerwert-Alternative liesse sich kein Termin ohne Uhrzeit speichern.
  it("akzeptiert den Leerwert", () => {
    expect(OPTIONAL_TIME_PATTERN.test("")).toBe(true);
  });

  it.each(VALID)("akzeptiert %s", (value) => {
    expect(OPTIONAL_TIME_PATTERN.test(value)).toBe(true);
  });

  it.each(INVALID)("lehnt %s ab", (value) => {
    expect(OPTIONAL_TIME_PATTERN.test(value)).toBe(false);
  });
});

describe("normalizeTime", () => {
  it("trimmt Umgebungs-Whitespace", () => {
    expect(normalizeTime("  18:00 ")).toBe("18:00");
  });

  it.each([undefined, "", "   "])("liefert undefined fuer %o", (value) => {
    expect(normalizeTime(value)).toBeUndefined();
  });
});

describe("parseTime", () => {
  it("zerlegt Stunden und Minuten", () => {
    expect(parseTime("18:05")).toEqual({ hour: 18, minute: 5 });
  });

  it("akzeptiert einstellige Stunden", () => {
    expect(parseTime("9:30")).toEqual({ hour: 9, minute: 30 });
  });

  it("trimmt vor dem Parsen", () => {
    expect(parseTime(" 07:15 ")).toEqual({ hour: 7, minute: 15 });
  });

  it.each([undefined, "", "25:99", "18:00 Uhr", "1800"])("liefert null fuer %o", (value) => {
    expect(parseTime(value)).toBeNull();
  });
});
