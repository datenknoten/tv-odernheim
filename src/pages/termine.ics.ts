import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { DateTime } from "luxon";

const PAST_CUTOFF_DAYS = 90;
const PRODID = "-//TV Odernheim//Termine//DE";

function escapeText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/\n/g, "\\n")
		.replace(/,/g, "\\,")
		.replace(/;/g, "\\;");
}

function foldLine(line: string): string {
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

function formatDate(iso: string): string {
	return iso.replace(/-/g, "");
}

function addDay(iso: string): string {
	return DateTime.fromISO(iso, { zone: "Europe/Berlin" }).plus({ days: 1 }).toFormat("yyyyMMdd");
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;
const DEFAULT_EVENT_DURATION_HOURS = 2;

function parseTime(time: string | undefined): { hour: number; minute: number } | null {
	const match = time?.trim().match(TIME_PATTERN);
	if (!match) return null;
	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (hour > 23 || minute > 59) return null;
	return { hour, minute };
}

const statusMap = {
	geplant: "CONFIRMED",
	verschoben: "TENTATIVE",
	abgesagt: "CANCELLED",
} as const;

export const GET: APIRoute = async ({ site }) => {
	const events = await getCollection("events");
	const today = DateTime.now().setZone("Europe/Berlin").startOf("day");
	const cutoff = today.minus({ days: PAST_CUTOFF_DAYS });

	const filtered = events.filter((e) => {
		const endIso = e.data.endDate ?? e.data.date;
		const end = DateTime.fromISO(endIso, { zone: "Europe/Berlin" });
		return end >= cutoff;
	});

	filtered.sort((a, b) => a.data.date.localeCompare(b.data.date));

	const dtstamp = DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'");
	const origin = site ? site.origin : "https://www.tv-odernheim.de";

	const lines: string[] = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		`PRODID:${PRODID}`,
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"X-WR-CALNAME:TV Odernheim – Termine",
		"X-WR-TIMEZONE:Europe/Berlin",
	];

	for (const event of filtered) {
		const startIso = event.data.date;
		const endIso = event.data.endDate ?? event.data.date;
		const status = statusMap[event.data.status];
		const url = event.data.link ?? `${origin}/termine/${event.id}`;

		lines.push("BEGIN:VEVENT");
		lines.push(`UID:${event.id}@tv-odernheim.de`);
		lines.push(`DTSTAMP:${dtstamp}`);

		// Einzeltermine mit Uhrzeit werden als zeitgebundene Ereignisse exportiert,
		// mehrtägige oder zeitlose Termine bleiben ganztägig.
		const time = parseTime(event.data.time);
		if (time && startIso === endIso) {
			const start = DateTime.fromISO(startIso, { zone: "Europe/Berlin" }).set({
				hour: time.hour,
				minute: time.minute,
			});
			const end = start.plus({ hours: DEFAULT_EVENT_DURATION_HOURS });
			const fmt = "yyyyMMdd'T'HHmmss";
			lines.push(`DTSTART;TZID=Europe/Berlin:${start.toFormat(fmt)}`);
			lines.push(`DTEND;TZID=Europe/Berlin:${end.toFormat(fmt)}`);
		} else {
			lines.push(`DTSTART;VALUE=DATE:${formatDate(startIso)}`);
			lines.push(`DTEND;VALUE=DATE:${addDay(endIso)}`);
		}
		lines.push(foldLine(`SUMMARY:${escapeText(event.data.title)}`));
		if (event.data.description) {
			lines.push(foldLine(`DESCRIPTION:${escapeText(event.data.description)}`));
		}
		if (event.data.location) {
			lines.push(foldLine(`LOCATION:${escapeText(event.data.location)}`));
		}
		lines.push(`STATUS:${status}`);
		lines.push(`URL:${url}`);
		lines.push("END:VEVENT");
	}

	lines.push("END:VCALENDAR");

	const body = lines.join("\r\n");

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "text/calendar; charset=utf-8",
			"Content-Disposition": 'inline; filename="tv-odernheim-termine.ics"',
		},
	});
};
