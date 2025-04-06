import { defineCollection, z } from 'astro:content';

const courses = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    schedule: z.string(),
    location: z.string(),
    instructor: z.string(),
    image: z.string(),
    category: z.enum(['Kinderturnen', 'Gymnastik, Fitness, Gesundheit, Kurse', 'Sportarten']),
  }),
});

export const collections = {
  courses,
}; 