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
		date: z.string(),
	}),
});

export const collections = {
	courses,
	news,
};
