import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { DateTime } from "luxon";
import { escapeText, eventDateLines, foldLine } from "../lib/ical";

const PAST_CUTOFF_DAYS = 90;
const PRODID = "-//TV Odernheim//Termine//DE";

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

		lines.push(...eventDateLines(startIso, endIso, event.data.time));
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
