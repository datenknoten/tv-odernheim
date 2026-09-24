import { DateTime } from "luxon";

const ZONE = "Europe/Berlin";

/**
 * Die Korrektur-Hinweisbox ist eine befristete Einblendung: Sie soll einmalig
 * auf den Meldeweg stossen, nicht dauerhaft ueber jeder Seite stehen. Deshalb
 * laeuft sie einen Monat nach ihrem Startdatum ab.
 */
export const CORRECTION_NOTICE_MONTHS = 1;

/**
 * Sichtbar ab dem Starttag (einschliesslich) bis zum Ablauftag
 * (ausschliesslich), gerechnet in Europe/Berlin. Ein ungueltiges Startdatum
 * blendet die Box aus, statt sie unbefristet stehen zu lassen.
 *
 * Der statische Zweig wertet das zur Bauzeit aus; der Deploy-Workflow baut alle
 * zwoelf Stunden neu, die Box verschwindet also spaetestens einen halben Tag
 * nach Ablauf aus der ausgelieferten Seite.
 */
export function isCorrectionNoticeVisible(
  startIso: string,
  now: DateTime = DateTime.now(),
): boolean {
  const start = DateTime.fromISO(startIso, { zone: ZONE }).startOf("day");
  if (!start.isValid) {
    return false;
  }
  const today = now.setZone(ZONE).startOf("day");
  return today >= start && today < start.plus({ months: CORRECTION_NOTICE_MONTHS });
}
