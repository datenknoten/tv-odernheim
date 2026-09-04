import { collection, config, fields } from "@keystatic/core";
import { OPTIONAL_TIME_PATTERN } from "./src/lib/time";

type StorageKind = "local" | "github";

const storageKind = (process.env.KEYSTATIC_STORAGE_KIND || "local") as StorageKind;

// Anhänge landen unter public/files/<collection>/ und werden damit unverändert
// ausgeliefert. Den Dateinamen leitet Keystatic außerhalb der Editor-Felder aus
// dem Feldschlüssel ab, deshalb hält `label` die Bezeichnung für die Anzeige.
const attachmentsField = (collection: string) =>
	fields.array(
		fields.object({
			file: fields.file({
				label: "Datei",
				directory: `public/files/${collection}`,
				publicPath: `/files/${collection}/`,
				validation: { isRequired: true },
			}),
			label: fields.text({ label: "Beschriftung", validation: { isRequired: false } }),
		}),
		{
			label: "Anhänge",
			description: "Dateien zum Herunterladen, z. B. Ausschreibung oder Anmeldeformular.",
			itemLabel: (props) =>
				props.fields.label.value.trim() || props.fields.file.value?.filename || "Datei",
		},
	);

export default config({
	storage:
		storageKind === "github"
			? {
					kind: "github",
					repo: { owner: "datenknoten", name: "tv-odernheim" },
					branchPrefix: "keystatic/",
				}
			: { kind: "local" },
	ui: {
		brand: { name: "TV Odernheim" },
		navigation: {
			Nachrichten: ["news"],
			Termine: ["events"],
			Mitmachen: ["announcements"],
			Kurse: ["courses"],
			Vorstand: ["board"],
		},
	},
	collections: {
		news: collection({
			label: "Nachrichten",
			slugField: "title",
			path: "src/content/news/*",
			format: { contentField: "content" },
			columns: ["title", "date"],
			schema: {
				title: fields.slug({ name: { label: "Titel" } }),
				description: fields.text({ label: "Beschreibung", multiline: true }),
				date: fields.date({ label: "Datum" }),
				attachments: attachmentsField("news"),
				content: fields.markdoc({ label: "Inhalt" }),
			},
		}),
		courses: collection({
			label: "Kurse",
			slugField: "title",
			path: "src/content/courses/*",
			format: { contentField: "content" },
			columns: ["title", "category"],
			schema: {
				title: fields.slug({ name: { label: "Titel" } }),
				description: fields.text({ label: "Beschreibung", multiline: true }),
				schedule: fields.text({ label: "Zeiten" }),
				location: fields.text({ label: "Ort" }),
				instructor: fields.text({ label: "Trainer/in" }),
				image: fields.image({
					label: "Bild",
					directory: "public/images/courses",
					publicPath: "/images/courses/",
					validation: { isRequired: false },
				}),
				category: fields.select({
					label: "Kategorie",
					options: [
						{ label: "Kinderturnen", value: "Kinderturnen" },
						{
							label: "Gymnastik, Fitness, Gesundheit, Kurse",
							value: "Gymnastik, Fitness, Gesundheit, Kurse",
						},
						{ label: "Sportarten", value: "Sportarten" },
					],
					defaultValue: "Sportarten",
				}),
				content: fields.markdoc({ label: "Inhalt" }),
			},
		}),
		board: collection({
			label: "Vorstand",
			slugField: "name",
			path: "src/content/board/*",
			format: { contentField: "content" },
			columns: ["name", "position", "sortierung"],
			schema: {
				name: fields.slug({ name: { label: "Name" } }),
				position: fields.text({ label: "Position" }),
				photo: fields.image({
					label: "Foto",
					directory: "public/images/board",
					publicPath: "/images/board/",
					validation: { isRequired: false },
				}),
				sortierung: fields.integer({ label: "Sortierung" }),
				email: fields.text({ label: "E-Mail", validation: { isRequired: false } }),
				content: fields.markdoc({ label: "Inhalt" }),
			},
		}),
		events: collection({
			label: "Termine",
			slugField: "title",
			path: "src/content/events/*",
			format: { contentField: "content" },
			columns: ["title", "date", "status"],
			schema: {
				title: fields.slug({ name: { label: "Titel" } }),
				description: fields.text({ label: "Beschreibung", multiline: true }),
				date: fields.date({ label: "Datum" }),
				time: fields.text({
					label: "Uhrzeit",
					description:
						"Optional, Format HH:MM (z. B. 18:00). Einzeltermine werden im Kalender-Export mit zwei Stunden Dauer eingetragen.",
					validation: {
						isRequired: false,
						pattern: {
							regex: OPTIONAL_TIME_PATTERN,
							message: "Bitte im Format HH:MM angeben (z. B. 18:00) oder leer lassen.",
						},
					},
				}),
				endDate: fields.date({ label: "Enddatum", validation: { isRequired: false } }),
				location: fields.text({ label: "Ort", validation: { isRequired: false } }),
				status: fields.select({
					label: "Status",
					options: [
						{ label: "Geplant", value: "geplant" },
						{ label: "Verschoben", value: "verschoben" },
						{ label: "Abgesagt", value: "abgesagt" },
					],
					defaultValue: "geplant",
				}),
				originalDate: fields.date({
					label: "Ursprüngliches Datum (bei Verschiebung)",
					validation: { isRequired: false },
				}),
				link: fields.url({ label: "Link", validation: { isRequired: false } }),
				attachments: attachmentsField("events"),
				content: fields.markdoc({ label: "Inhalt" }),
			},
		}),
		announcements: collection({
			label: "Mitmachen & Hinweise",
			slugField: "title",
			path: "src/content/announcements/*",
			format: { contentField: "content" },
			columns: ["title", "category", "sortierung"],
			schema: {
				title: fields.slug({ name: { label: "Titel" } }),
				description: fields.text({ label: "Beschreibung", multiline: true }),
				image: fields.image({
					label: "Bild",
					directory: "public/images/announcements",
					publicPath: "/images/announcements/",
					validation: { isRequired: false },
				}),
				category: fields.select({
					label: "Kategorie",
					options: [
						{ label: "Mitmachen", value: "Mitmachen" },
						{ label: "Angebot", value: "Angebot" },
						{ label: "Hinweis", value: "Hinweis" },
					],
					defaultValue: "Hinweis",
				}),
				sortierung: fields.integer({ label: "Sortierung", defaultValue: 100 }),
				ctaLabel: fields.text({ label: "CTA-Beschriftung", validation: { isRequired: false } }),
				ctaUrl: fields.text({ label: "CTA-Link", validation: { isRequired: false } }),
				content: fields.markdoc({ label: "Inhalt" }),
			},
		}),
	},
});
