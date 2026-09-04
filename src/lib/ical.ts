import { DateTime } from "luxon";
import { parseTime } from "./time";

const ZONE = "Europe/Berlin";
const UTC_FORMAT = "yyyyMMdd'T'HHmmss'Z'";

// Termine haben kein Endzeit-Feld, Kalender brauchen aber eine Dauer.
// Einzeltermine mit Uhrzeit werden deshalb mit dieser Dauer exportiert.
export const DEFAULT_EVENT_DURATION_HOURS = 2;

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = rest.slice(75);
  }
  out.push(rest);
  return out.join("\r\n ");
}

/**
 * DTSTART/DTEND eines Termins.
 *
 * Ohne Uhrzeit bleibt der Termin ganztaegig. Mit Uhrzeit wird er zeitgebunden
 * exportiert – in UTC, weil `TZID=Europe/Berlin` ohne mitgeliefertes
 * VTIMEZONE nicht RFC-5545-konform ist (Abschnitt 3.2.19) und Clients wie
 * Outlook die Zone dann nicht zuverlaessig auflösen. Mehrtaegige Termine
 * starten zur angegebenen Uhrzeit und enden nach dem letzten Tag, damit die
 * Uhrzeit in UI und Export nie auseinanderlaeuft.
 */
export function eventDateLines(startIso: string, endIso: string, time?: string): string[] {
  const parsed = parseTime(time);
  if (!parsed) {
    const end = DateTime.fromISO(endIso, { zone: ZONE }).plus({ days: 1 });
    return [
      `DTSTART;VALUE=DATE:${startIso.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${end.toFormat("yyyyMMdd")}`,
    ];
  }
  const start = DateTime.fromISO(startIso, { zone: ZONE }).set({
    hour: parsed.hour,
    minute: parsed.minute,
  });
  const end =
    startIso === endIso
      ? start.plus({ hours: DEFAULT_EVENT_DURATION_HOURS })
      : DateTime.fromISO(endIso, { zone: ZONE }).plus({ days: 1 }).startOf("day");
  return [
    `DTSTART:${start.toUTC().toFormat(UTC_FORMAT)}`,
    `DTEND:${end.toUTC().toFormat(UTC_FORMAT)}`,
  ];
}
