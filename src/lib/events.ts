import type { CollectionEntry } from "astro:content";
import { DateTime } from "luxon";
import { normalizeTime } from "./time";

type EventEntry = CollectionEntry<"events">;

export function partitionEvents(entries: EventEntry[]): {
	upcoming: EventEntry[];
	past: EventEntry[];
} {
	const today = DateTime.now().setZone("Europe/Berlin").startOf("day");
	const upcoming: EventEntry[] = [];
	const past: EventEntry[] = [];
	for (const e of entries) {
		const cutoff = e.data.endDate ?? e.data.date;
		const day = DateTime.fromISO(cutoff, { zone: "Europe/Berlin" });
		if (day >= today) upcoming.push(e);
		else past.push(e);
	}
	upcoming.sort((a, b) => a.data.date.localeCompare(b.data.date));
	past.sort((a, b) => b.data.date.localeCompare(a.data.date));
	return { upcoming, past };
}

export function isPastEvent(entry: EventEntry): boolean {
	const today = DateTime.now().setZone("Europe/Berlin").startOf("day");
	const cutoff = entry.data.endDate ?? entry.data.date;
	const day = DateTime.fromISO(cutoff, { zone: "Europe/Berlin" });
	return day < today;
}

/** Datum plus Uhrzeit, falls gesetzt – z. B. "31.07.2026, 18:00 Uhr". */
export function formatEventDateTime(entry: EventEntry): string {
	const label = formatEventDate(entry);
	const time = normalizeTime(entry.data.time);
	return time ? `${label}, ${time} Uhr` : label;
}

/** Maschinenlesbarer Wert für das datetime-Attribut von <time>. */
export function eventDateTimeAttribute(entry: EventEntry): string {
	const time = normalizeTime(entry.data.time);
	return time ? `${entry.data.date}T${time}` : entry.data.date;
}

export function formatEventDate(entry: EventEntry): string {
	const start = DateTime.fromISO(entry.data.date, { zone: "Europe/Berlin" }).setLocale("de");
	if (!entry.data.endDate || entry.data.endDate === entry.data.date) {
		return start.toFormat("dd.MM.yyyy");
	}
	const end = DateTime.fromISO(entry.data.endDate, { zone: "Europe/Berlin" }).setLocale("de");
	if (start.hasSame(end, "month") && start.hasSame(end, "year")) {
		return `${start.toFormat("dd.")}–${end.toFormat("dd.MM.yyyy")}`;
	}
	return `${start.toFormat("dd.MM.")}–${end.toFormat("dd.MM.yyyy")}`;
}
