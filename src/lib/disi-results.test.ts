import { describe, expect, it } from "vitest";
import {
  contestFinishers,
  contestSlug,
  contestsWithSlugs,
  type DisiContest,
  finisherCount,
  formatIsoDate,
} from "./disi-results";

function contest(name: string, groupSizes: number[]): DisiContest {
  return {
    name,
    ageGroups: groupSizes.map((size, index) => ({
      name: `AK ${index}`,
      results: Array.from({ length: size }, (_, i) => ({
        platz: i + 1,
        startnr: 100 + i,
        name: `Person ${i}`,
        jg: 2000,
        verein: "TV Odernheim",
        zeiten: { netto: "00:48" },
      })),
    })),
  };
}

describe("contestSlug", () => {
  it("ersetzt Punkte und Leerzeichen", () => {
    expect(contestSlug("10.000 m")).toBe("10-000-m");
  });

  it("ersetzt Schraegstriche in Wettbewerbsnamen", () => {
    expect(contestSlug("5000 m Walking/Nordic Walking")).toBe("5000-m-walking-nordic-walking");
    expect(contestSlug("1000 m W/M 8-11")).toBe("1000-m-w-m-8-11");
  });

  it("schreibt Umlaute aus", () => {
    expect(contestSlug("Männer Über 40 groß")).toBe("maenner-ueber-40-gross");
  });
});

describe("contestsWithSlugs", () => {
  it("ergaenzt je Wettbewerb ein URL-Segment", () => {
    expect(contestsWithSlugs([contest("200 m Bambini", [2])]).map((c) => c.slug)).toEqual([
      "200-m-bambini",
    ]);
  });

  // Zwei Wettbewerbe mit gleichem Slug wuerden dieselbe Seite erzeugen und
  // einer davon waere im Build nicht mehr erreichbar.
  it("bricht bei kollidierenden Slugs ab", () => {
    expect(() => contestsWithSlugs([contest("5000 m", [1]), contest("5000  m", [1])])).toThrow(
      "Doppelter Wettbewerbs-Slug",
    );
  });
});

describe("finisherCount", () => {
  it("zaehlt die Ergebnisse eines Wettbewerbs ueber alle Altersklassen", () => {
    expect(contestFinishers(contest("5000 m", [3, 2]))).toBe(5);
  });

  it("zaehlt die Ergebnisse aller Wettbewerbe", () => {
    expect(finisherCount([contest("5000 m", [3, 2]), contest("10.000 m", [4])])).toBe(9);
  });

  it("liefert 0 ohne Wettbewerbe", () => {
    expect(finisherCount([])).toBe(0);
  });
});

describe("formatIsoDate", () => {
  it("dreht ein ISO-Datum auf deutsche Schreibweise", () => {
    expect(formatIsoDate("2026-09-19")).toBe("19.09.2026");
  });
});
