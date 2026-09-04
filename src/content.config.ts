import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { DateTime } from "luxon";
import { normalizeTime, TIME_PATTERN } from "./lib/time";

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
const optionalTimeString = z
  .string()
  .optional()
  .transform((val) => normalizeTime(val))
  .refine((val) => val === undefined || TIME_PATTERN.test(val), {
    error: "Uhrzeit muss im Format HH:MM angegeben werden (z. B. 18:00).",
  });

// Anhänge kommen als Liste aus Keystatic; der Pfad zeigt auf public/files/,
// die Beschriftung ist optional und faellt in der Anzeige auf den Dateinamen
// zurueck. Ohne Anhaenge laesst Keystatic das Feld im Frontmatter weg.
const attachmentList = z
  .array(z.object({ file: z.string(), label: optionalText }))
  .optional()
  .default([]);

const courses = defineCollection({
  loader: glob({ pattern: "**/*.mdoc", base: "./src/content/courses" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: optionalText,
      schedule: optionalText,
      location: optionalText,
      instructor: optionalText,
      image: image().optional(),
      category: z.enum(["Kinderturnen", "Gymnastik, Fitness, Gesundheit, Kurse", "Sportarten"]),
    }),
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.mdoc", base: "./src/content/news" }),
  schema: z.object({
    title: z.string(),
    description: optionalText,
    date: dateString,
    attachments: attachmentList,
  }),
});

const board = defineCollection({
  loader: glob({ pattern: "**/*.mdoc", base: "./src/content/board" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      position: optionalText,
      // Keystatic laesst das Bildfeld bei leerer Auswahl ganz weg; ein fehlender
      // Key ergibt undefined, worauf verein.astro die Silhouette einsetzt.
      photo: image().optional(),
      sortierung: z.number(),
      email: z.email().optional(),
    }),
});

const announcements = defineCollection({
  loader: glob({ pattern: "**/*.mdoc", base: "./src/content/announcements" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: optionalText,
      image: image().optional(),
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
    link: z.url().optional(),
    attachments: attachmentList,
  }),
});

export const collections = {
  courses,
  news,
  board,
  announcements,
  events,
};
