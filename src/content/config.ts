import { defineCollection, z } from "astro:content";

const courses = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		description: z.string(),
		schedule: z.string(),
		location: z.string(),
		instructor: z.string(),
		image: z.string(),
		category: z.enum([
			"Kinderturnen",
			"Gymnastik, Fitness, Gesundheit, Kurse",
			"Sportarten",
		]),
	}),
});

const news = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.union([z.string(), z.date()]).transform((val) =>
			val instanceof Date ? val.toISOString().split("T")[0] : val,
		),
	}),
});

const board = defineCollection({
	type: "content",
	schema: z.object({
		name: z.string(),
		position: z.string(),
		photo: z.string(),
		sortierung: z.number(),
	}),
});

export const collections = {
	courses,
	news,
	board,
};
