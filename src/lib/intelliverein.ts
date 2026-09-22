// Kursmodul von IntelliVerein (IntelliOnline), Instanz des TV Odernheim.
//
// Die Kursbuchung ist die Angular-App unter /intellionline; ihr Backend bietet
// oeffentliche Endpunkte ohne Anmeldung an, die die Kursliste unter
// /intellionline/kursliste bedienen: `cevkurs/publickurslist` (hier genutzt),
// `cevkurstage/publickurstageforkurs`, `cevkurskategorie/publickeyvalue`,
// `cevort/publickeyvalue`. Zugangsdaten sind nicht noetig und waeren falsch —
// der Build laeuft in GitHub Actions, ein Verwaltungs-Login gehoert nicht in
// die CI. Der Server filtert selbst auf das oeffentlich Sichtbare
// (Freigabedatum, nicht vereinsintern); die Liste ist dieselbe wie im Portal.
//
// Der Backend-Pfad steht in /intellionline/assets/env-config.json
// ("baseBackendUrl") und ist hier fest verdrahtet: ein Wechsel zoege ohnehin
// eine Anpassung des Mappings nach sich.

import { DateTime } from "luxon";

/** Portal-Host der Vereinsverwaltung. */
export const INTELLIVEREIN_ORIGIN = "https://tv-odernheim.intelliverein.de";

/** Oeffentliche Kursliste im Portal. */
export const INTELLIVEREIN_COURSE_LIST_URL = `${INTELLIVEREIN_ORIGIN}/intellionline/kursliste`;

/** Nutzerportal: Konto anlegen, Passwort fuer Mitglieder anfordern. */
export const INTELLIVEREIN_PORTAL_URL = `${INTELLIVEREIN_ORIGIN}/intellionline/login`;

const API_BASE = `${INTELLIVEREIN_ORIGIN}/intellionline/backend/api`;

// Status aus dem Kursmodul; andere Werte zeigt `statusLabel` unveraendert an.
const STATUS_REGISTRATION_OPEN = 1;

const ENTITY = /&(#x?[0-9a-f]+|[a-z]+);/gi;
const LINE_BREAK_TAG = /<br\s*\/?>/gi;
const BLOCK_END_TAG = /<\/(?:div|p|li|tr|h[1-6])>/gi;
const LIST_ITEM_TAG = /<li[^>]*>/gi;
const ANY_TAG = /<[^>]*>/g;
const WHITESPACE = /\s+/g;
const MEMBER_NUMBER = /\s*\(\s*Mitg\.?\s*Nr\.?\s*:[^)]*\)/gi;
const HTTP_URL = /^https?:\/\//i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Rohsatz aus `publickurslist`; nur die ausgewerteten Felder. */
export interface RawCourse {
  Id: number;
  KursNr: string | null;
  Bezeichnung: string | null;
  /** HTML aus dem Rich-Text-Feld der Verwaltung. */
  Beschreibung: string | null;
  /** Freitext, z. B. "18:00 -18:45 Uhr". */
  Zeitangabe: string | null;
  Wochentag: string | null;
  /** Lokale Zeit ohne Zone, z. B. "2026-08-25T18:00:00". */
  Beginn: string | null;
  Ende: string | null;
  Kursgebuehr: number | null;
  KursgebuehrMitglieder: number | null;
  /** Beschriftung des ermaessigten Preises, z. B. "Mitglied". */
  Ermaessigung: string | null;
  Kurseinheiten: string | null;
  MinAlter: number | null;
  MaxAlter: number | null;
  MinTeilnehmer: number | null;
  MaxTeilnehmer: number | null;
  AnzahlTeilnehmer: number | null;
  AnzahlWarteliste: number | null;
  /** 1 = Warteliste vorhanden. */
  Warteliste: number | null;
  /** 1 = nicht oeffentlich. */
  Vereinsintern: number | null;
  Status: number | null;
  StatusDisplay: string | null;
  CevKursKategorieIdDisplay: string | null;
  /** "Name - Strasse, PLZ Ort". */
  CevOrtIdDisplay: string | null;
  /** Internes Feld, enthaelt die Mitgliedsnummer. */
  KursLeiter: string | null;
  /** Freigegebene Schreibweise; hat Vorrang. */
  KursLeiterOeffentlich: string | null;
  LinkAgb: string | null;
  URLBeschreibung: string | null;
}

/** Ein Kurs, aufbereitet fuer die Website. */
export interface Course {
  id: number;
  /** Kursnummer der Verwaltung, z. B. "12b_26". */
  kursNr: string;
  title: string;
  /** Beschreibung als Absaetze, HTML entfernt. */
  description: string[];
  category: string;
  /** Name der Sportstaette ohne Anschrift. */
  location: string;
  locationAddress: string;
  /** Kursleitung ohne Mitgliedsnummer; leer, wenn nicht gepflegt. */
  instructor: string;
  weekday: string;
  time: string;
  /** ISO-Datum des ersten bzw. letzten Termins. */
  start: string;
  end: string;
  units: number | null;
  /** Gebuehren in Euro. */
  fee: number | null;
  memberFee: number | null;
  /** Beschriftung der Ermaessigung, z. B. "Mitglied". */
  memberFeeLabel: string;
  minAge: number | null;
  maxAge: number | null;
  /** Freie Plaetze; null, wenn keine Hoechstzahl gepflegt ist. */
  freePlaces: number | null;
  /** Kurs voll, Anmeldung aber offen -> Warteliste. */
  waitlist: boolean;
  /** Nur buchbare Kurse stehen auf der Website; siehe selectVisibleCourses. */
  registrationOpen: boolean;
  /** Direktlink in die Buchung des Portals. */
  bookingUrl: string;
  termsUrl: string | null;
  infoUrl: string | null;
}

/**
 * Wandelt das HTML der Kursbeschreibung in Absaetze. Die Verwaltung liefert
 * `<div>`-Zeilen und `<br>`; alles andere wird verworfen, damit kein Markup
 * aus dem Backend auf der Seite landet.
 */
export function htmlToParagraphs(html: string | null): string[] {
  if (!html) {
    return [];
  }
  const text = html
    .replace(LINE_BREAK_TAG, "\n")
    .replace(BLOCK_END_TAG, "\n")
    .replace(LIST_ITEM_TAG, "\n")
    .replace(ANY_TAG, "")
    .replace(ENTITY, (match, entity: string) => {
      if (!entity.startsWith("#")) {
        return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
      }
      const hex = entity.startsWith("#x") || entity.startsWith("#X");
      const codePoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint > 0 ? String.fromCodePoint(codePoint) : match;
    });
  return text
    .split("\n")
    .map((line) => line.replace(WHITESPACE, " ").trim())
    .filter((line) => line.length > 0);
}

/**
 * Kursleitung fuer die Website: die freigegebene Schreibweise, sonst das
 * interne Feld ohne Mitgliedsnummer — die gehoert nicht ins offene Netz.
 */
export function courseInstructor(raw: RawCourse): string {
  const published = raw.KursLeiterOeffentlich?.trim();
  if (published) {
    return published;
  }
  return (raw.KursLeiter ?? "").replace(MEMBER_NUMBER, "").replace(WHITESPACE, " ").trim();
}

/** Link in die Kursbuchung des Portals, wie ihn das Portal selbst erzeugt. */
export function bookingUrl(id: number): string {
  const filter = encodeURIComponent(JSON.stringify({ Id: String(id) }));
  return `${INTELLIVEREIN_ORIGIN}/intellionline?route=kursbuchung&filter=${filter}&skiperr=true`;
}

function externalUrl(value: string | null): string | null {
  const url = value?.trim();
  return url && HTTP_URL.test(url) ? url : null;
}

/** "Turnhalle Odernheim - Turnhallstr. 6, 55571 Odernheim" -> Name + Anschrift. */
function splitPlace(display: string | null): { name: string; address: string } {
  const place = (display ?? "").trim();
  const separator = place.indexOf(" - ");
  if (separator < 0) {
    return { name: place, address: "" };
  }
  return { name: place.slice(0, separator).trim(), address: place.slice(separator + 3).trim() };
}

export function mapCourse(raw: RawCourse): Course {
  const place = splitPlace(raw.CevOrtIdDisplay);
  const max = raw.MaxTeilnehmer;
  const taken = raw.AnzahlTeilnehmer ?? 0;
  const freePlaces = typeof max === "number" && max > 0 ? Math.max(0, max - taken) : null;
  const registrationOpen = raw.Status === STATUS_REGISTRATION_OPEN;
  const units = Number.parseInt(raw.Kurseinheiten ?? "", 10);

  return {
    id: raw.Id,
    kursNr: raw.KursNr?.trim() ?? "",
    title: raw.Bezeichnung?.trim() ?? "",
    description: htmlToParagraphs(raw.Beschreibung),
    category: raw.CevKursKategorieIdDisplay?.trim() ?? "",
    location: place.name,
    locationAddress: place.address,
    instructor: courseInstructor(raw),
    weekday: raw.Wochentag?.trim() ?? "",
    time: raw.Zeitangabe?.trim().replace(WHITESPACE, " ") ?? "",
    start: raw.Beginn?.slice(0, 10) ?? "",
    end: raw.Ende?.slice(0, 10) ?? "",
    units: Number.isFinite(units) ? units : null,
    fee: raw.Kursgebuehr,
    memberFee: raw.KursgebuehrMitglieder,
    memberFeeLabel: raw.Ermaessigung?.trim() || "Mitglied",
    minAge: raw.MinAlter,
    maxAge: raw.MaxAlter,
    freePlaces,
    waitlist: registrationOpen && freePlaces === 0 && raw.Warteliste === 1,
    registrationOpen,
    bookingUrl: bookingUrl(raw.Id),
    termsUrl: externalUrl(raw.LinkAgb),
    infoUrl: externalUrl(raw.URLBeschreibung),
  };
}

/**
 * Was auf der Website steht: nur Kurse, deren Anmeldung offen ist. Ein Kurs
 * mit geschlossener Anmeldung ist fuer Besucher eine Sackgasse — er gehoert in
 * die Kursliste des Portals, nicht auf die Seite. Dazu: keine vereinsinternen
 * Kurse, nichts, was vor `today` (ISO-Datum) geendet hat. Der Server filtert
 * Freigabe und Sichtbarkeit bereits, doppelt haelt hier besser.
 * Sortiert nach Beginn, dann Kursnummer.
 */
export function selectVisibleCourses(raw: RawCourse[], today: string): Course[] {
  return raw
    .filter((entry) => entry.Vereinsintern !== 1 && (entry.Ende?.slice(0, 10) ?? "") >= today)
    .map(mapCourse)
    .filter((course) => course.registrationOpen)
    .sort((a, b) => a.start.localeCompare(b.start) || a.kursNr.localeCompare(b.kursNr));
}

/**
 * Holt die oeffentliche Kursliste. Wirft bei HTTP- und Formatfehlern; der
 * Aufrufer entscheidet, ob der Build scheitert oder die Seite ohne Kursliste
 * auskommt.
 */
export async function fetchCourses(
  options: { signal?: AbortSignal; today?: string } = {},
): Promise<Course[]> {
  const response = await fetch(`${API_BASE}/cevkurs/publickurslist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    // Derselbe Filter, den die Portalseite schickt: erste Seite, keine Suche.
    body: JSON.stringify({ PageSize: 200, PageIndex: 0, Quicksearch: "", ForPublic: true }),
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`IntelliVerein: publickurslist antwortete mit ${response.status}`);
  }
  const payload = (await response.json()) as { Entries?: RawCourse[] };
  if (!Array.isArray(payload.Entries)) {
    throw new Error("IntelliVerein: publickurslist ohne Entries-Liste");
  }
  const today = options.today ?? DateTime.now().setZone("Europe/Berlin").toISODate() ?? "";
  return selectVisibleCourses(payload.Entries, today);
}

const EURO = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

/** Gebuehr als "130,00 €"; ohne Wert leer. */
export function formatFee(value: number | null): string {
  return typeof value === "number" ? EURO.format(value) : "";
}

/** Zeitraum als "25.08. – 15.12.2026", einzelner Tag als "28.11.2026". */
export function formatCourseRange(course: Course): string {
  const start = DateTime.fromISO(course.start, { zone: "Europe/Berlin" }).setLocale("de");
  const end = DateTime.fromISO(course.end, { zone: "Europe/Berlin" }).setLocale("de");
  if (!start.isValid) {
    return "";
  }
  if (!end.isValid || start.hasSame(end, "day")) {
    return start.toFormat("dd.MM.yyyy");
  }
  return start.hasSame(end, "year")
    ? `${start.toFormat("dd.MM.")} – ${end.toFormat("dd.MM.yyyy")}`
    : `${start.toFormat("dd.MM.yyyy")} – ${end.toFormat("dd.MM.yyyy")}`;
}

/** Alter als "6 – 16 Jahre", "ab 16 Jahren", "bis 14 Jahre" oder leer. */
export function formatAgeRange(course: Course): string {
  const min = course.minAge;
  const max = course.maxAge;
  if (min !== null && max !== null) {
    return `${min} – ${max} Jahre`;
  }
  if (min !== null) {
    return `ab ${min} Jahren`;
  }
  return max === null ? "" : `bis ${max} Jahre`;
}

/** Verfuegbarkeit fuer die Kurskarte; die Anmeldung ist immer offen. */
export function formatAvailability(course: Course): string {
  if (course.freePlaces === null) {
    return "Anmeldung möglich";
  }
  if (course.freePlaces === 0) {
    return course.waitlist ? "Ausgebucht – Warteliste" : "Ausgebucht";
  }
  return course.freePlaces === 1 ? "Noch 1 freier Platz" : `Noch ${course.freePlaces} freie Plätze`;
}
