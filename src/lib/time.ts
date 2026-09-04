// Uhrzeiten werden an drei Stellen geprueft: Content-Schema (Build), Keystatic
// (Admin-Eingabe) und iCal-Export. Muster und Parser liegen deshalb hier – ohne
// Import von "astro:content", damit auch keystatic.config.ts sie nutzen kann.

/** Uhrzeit im Format HH:MM (00:00 bis 23:59). */
export const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

// Keystatic prueft `validation.pattern` auch bei leeren optionalen Feldern
// (validateText testet den Leerstring), deshalb braucht das Admin-Muster den
// Leerwert als gueltige Alternative – sonst laesst sich kein Termin ohne
// Uhrzeit speichern.
/** Wie TIME_PATTERN, erlaubt zusaetzlich den Leerwert. */
export const OPTIONAL_TIME_PATTERN = /^(?:([01]?\d|2[0-3]):[0-5]\d)?$/;

/** Trimmt eine Uhrzeit; leere Angaben gelten als "keine Uhrzeit". */
export function normalizeTime(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Zerlegt eine gueltige HH:MM-Angabe; ungueltige oder fehlende Werte -> null. */
export function parseTime(value: string | undefined): { hour: number; minute: number } | null {
  const time = normalizeTime(value);
  if (!time || !TIME_PATTERN.test(time)) return null;
  const [hour, minute] = time.split(":");
  return { hour: Number(hour), minute: Number(minute) };
}
