import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { isCorrectionNoticeVisible } from "./correction-notice";

const at = (iso: string) => DateTime.fromISO(iso, { zone: "Europe/Berlin" });

describe("isCorrectionNoticeVisible", () => {
  it("zeigt die Box am Starttag", () => {
    expect(isCorrectionNoticeVisible("2026-09-23", at("2026-09-23T00:01"))).toBe(true);
  });

  it("zeigt die Box am letzten Tag vor Ablauf", () => {
    expect(isCorrectionNoticeVisible("2026-09-23", at("2026-10-22T23:59"))).toBe(true);
  });

  it("blendet die Box einen Monat nach dem Start aus", () => {
    expect(isCorrectionNoticeVisible("2026-09-23", at("2026-10-23T00:00"))).toBe(false);
  });

  it("bleibt danach dauerhaft ausgeblendet", () => {
    expect(isCorrectionNoticeVisible("2026-09-23", at("2027-03-01T12:00"))).toBe(false);
  });

  // Monatsarithmetik, keine 30 Tage: ein Start am 31. endet am letzten Tag des
  // Folgemonats.
  it("rechnet mit Kalendermonaten, nicht mit fester Tageszahl", () => {
    expect(isCorrectionNoticeVisible("2026-01-31", at("2026-02-28T12:00"))).toBe(false);
    expect(isCorrectionNoticeVisible("2026-01-31", at("2026-02-27T12:00"))).toBe(true);
  });

  it("zeigt die Box vor ihrem Startdatum nicht", () => {
    expect(isCorrectionNoticeVisible("2026-09-23", at("2026-09-22T23:59"))).toBe(false);
  });

  it("blendet die Box bei ungueltigem Startdatum aus", () => {
    expect(isCorrectionNoticeVisible("", at("2026-09-23T12:00"))).toBe(false);
    expect(isCorrectionNoticeVisible("irgendwann", at("2026-09-23T12:00"))).toBe(false);
  });
});
