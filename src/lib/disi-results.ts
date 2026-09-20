// Ergebnisse des Disibodenberglaufs: eine JSON-Datei je Austragung unter
// src/data/disibodenberglauf-ergebnisse/, erzeugt von scripts/fetch-disi-results.mjs.
// Die Dateien sind handgepflegte Datenstaende (wie die GPX-Strecken), deshalb
// keine Content-Collection.

export interface DisiTimeColumn {
  /** Schluessel in `DisiResult.zeiten`. */
  key: string;
  /** Spaltenueberschrift, z. B. "Netto" oder "Zeit". */
  label: string;
}

export interface DisiResult {
  platz: number;
  startnr: number;
  name: string;
  jg: number;
  verein: string;
  /** Zeiten nach `DisiTimeColumn.key`; je Austragung unterschiedlich. */
  zeiten: Record<string, string>;
}

export interface DisiAgeGroup {
  name: string;
  /** Nur gesetzt, wenn die Quellliste zusaetzlich nach Geschlecht gruppiert. */
  sex?: string;
  results: DisiResult[];
}

export interface DisiContest {
  name: string;
  ageGroups: DisiAgeGroup[];
}

export interface DisiYear {
  year: number;
  eventName: string;
  /** ISO-Datum der Austragung. */
  eventDate: string;
  sourceUrl: string;
  timeColumns: DisiTimeColumn[];
  contests: DisiContest[];
}

export interface DisiContestWithSlug extends DisiContest {
  slug: string;
}

const UMLAUTS: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

/** URL-Segment fuer einen Wettbewerb, z. B. "10.000 m" -> "10-000-m". */
export function contestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUTS[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Anzahl der Ergebnisse eines Wettbewerbs. */
export function contestFinishers(contest: DisiContest): number {
  return contest.ageGroups.reduce((sum, group) => sum + group.results.length, 0);
}

/** Anzahl der Ergebnisse ueber alle Wettbewerbe einer Austragung. */
export function finisherCount(contests: DisiContest[]): number {
  return contests.reduce((sum, contest) => sum + contestFinishers(contest), 0);
}

/**
 * Ergaenzt die Wettbewerbe um ihr URL-Segment. Kollidierende Slugs wuerden
 * stillschweigend eine Seite ueberschreiben, deshalb bricht der Build ab.
 */
export function contestsWithSlugs(contests: DisiContest[]): DisiContestWithSlug[] {
  const seen = new Set<string>();
  return contests.map((contest) => {
    const slug = contestSlug(contest.name);
    if (seen.has(slug)) {
      throw new Error(`Doppelter Wettbewerbs-Slug "${slug}" (${contest.name})`);
    }
    seen.add(slug);
    return { ...contest, slug };
  });
}

/** ISO-Datum als deutsches Datum, z. B. "2026-09-19" -> "19.09.2026". */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

const modules = import.meta.glob<DisiYear>("../data/disibodenberglauf-ergebnisse/*.json", {
  eager: true,
  import: "default",
});

/** Alle Austragungen, neueste zuerst. */
export const resultYears: DisiYear[] = Object.values(modules).sort((a, b) => b.year - a.year);

/** Austragung eines Jahres; fehlt sie, bricht der Build ab. */
export function findYear(year: number): DisiYear {
  const found = resultYears.find((entry) => entry.year === year);
  if (!found) {
    throw new Error(`Keine Ergebnisse für ${year} vorhanden`);
  }
  return found;
}
