import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { DateTime } from "luxon";

const toIsoDate = (val: string | Date): string =>
	val instanceof Date ? DateTime.fromJSDate(val, { zone: "utc" }).toFormat("yyyy-MM-dd") : val;

const dateString = z.union([z.string(), z.date()]).transform(toIsoDate);
const optionalDateString = z
	.union([z.string(), z.date()])
	.optional()
	.transform((val) => (val === undefined ? undefined : toIsoDate(val)));

// Keystatic entfernt leere Textfelder beim Speichern aus dem Frontmatter,
// deshalb duerfen optionale Textfelder fehlen und werden auf "" normalisiert.
const optionalText = z.string().optional().default("");

// Uhrzeit im Format HH:MM (z. B. "18:00"). Leere Werte gelten als "keine
// Uhrzeit"; ungültige Angaben werden früh abgelehnt, damit UI-Anzeige und
// iCal-Export konsistent bleiben.
export const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;
const optionalTimeString = z
	.string()
	.optional()
	.transform((val) => {
		const trimmed = val?.trim();
		return trimmed ? trimmed : undefined;
	})
	.refine((val) => val === undefined || TIME_PATTERN.test(val), {
		message: "Uhrzeit muss im Format HH:MM angegeben werden (z. B. 18:00).",
	});

const courses = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/courses" }),
	schema: z.object({
		title: z.string(),
		description: optionalText,
		schedule: optionalText,
		location: optionalText,
		instructor: optionalText,
		image: z.string().optional(),
		category: z.enum(["Kinderturnen", "Gymnastik, Fitness, Gesundheit, Kurse", "Sportarten"]),
	}),
});

const news = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/news" }),
	schema: z.object({
		title: z.string(),
		description: optionalText,
		date: dateString,
	}),
});

const board = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/board" }),
	schema: z.object({
		name: z.string(),
		position: optionalText,
		photo: optionalText,
		sortierung: z.number(),
		email: z.string().email().optional(),
	}),
});

const announcements = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/announcements" }),
	schema: z.object({
		title: z.string(),
		description: optionalText,
		image: z.string().optional(),
		category: z.enum(["Mitmachen", "Angebot", "Hinweis"]),
		sortierung: z.number(),
		ctaLabel: z.string().optional(),
		ctaUrl: z.string().optional(),
	}),
});

const events = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/events" }),
	schema: z.object({
		title: z.string(),
		description: optionalText,
		date: dateString,
		time: optionalTimeString,
		endDate: optionalDateString,
		location: z.string().optional(),
		status: z.enum(["geplant", "verschoben", "abgesagt"]),
		originalDate: optionalDateString,
		link: z.string().url().optional(),
	}),
});

export const collections = {
	courses,
	news,
	board,
	announcements,
	events,
};
