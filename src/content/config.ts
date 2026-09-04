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

const courses = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/courses" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		schedule: z.string(),
		location: z.string(),
		instructor: z.string(),
		image: z.string().optional(),
		category: z.enum(["Kinderturnen", "Gymnastik, Fitness, Gesundheit, Kurse", "Sportarten"]),
	}),
});

const news = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/news" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: dateString,
	}),
});

const board = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/board" }),
	schema: z.object({
		name: z.string(),
		position: z.string(),
		photo: z.string(),
		sortierung: z.number(),
		email: z.string().email().optional(),
	}),
});

const announcements = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/announcements" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
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
		description: z.string(),
		date: dateString,
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
