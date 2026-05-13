import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const courses = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/courses" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		schedule: z.string(),
		location: z.string(),
		instructor: z.string(),
		image: z.string(),
		category: z.enum(["Kinderturnen", "Gymnastik, Fitness, Gesundheit, Kurse", "Sportarten"]),
	}),
});

const news = defineCollection({
	loader: glob({ pattern: "**/*.mdoc", base: "./src/content/news" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z
			.union([z.string(), z.date()])
			.transform((val) => (val instanceof Date ? val.toISOString().split("T")[0] : val)),
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

export const collections = {
	courses,
	news,
	board,
};
