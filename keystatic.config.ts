import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: 'datenknoten/tv-odernheim',
  },
  collections: {
    courses: collection({
      label: 'Kurse',
      slugField: 'title',
      path: 'src/content/courses/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Titel' } }),
        description: fields.text({ label: 'Beschreibung', multiline: true }),
        schedule: fields.text({ label: 'Zeiten' }),
        location: fields.text({ label: 'Ort' }),
        instructor: fields.text({ label: 'Übungsleiter/in' }),
        image: fields.text({ label: 'Bild-Pfad' }),
        category: fields.select({
          label: 'Kategorie',
          options: [
            { label: 'Kinderturnen', value: 'Kinderturnen' },
            {
              label: 'Gymnastik, Fitness, Gesundheit, Kurse',
              value: 'Gymnastik, Fitness, Gesundheit, Kurse',
            },
            { label: 'Sportarten', value: 'Sportarten' },
          ],
          defaultValue: 'Kinderturnen',
        }),
      },
    }),
    news: collection({
      label: 'Neuigkeiten',
      slugField: 'title',
      path: 'src/content/news/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Titel' } }),
        description: fields.text({ label: 'Beschreibung', multiline: true }),
        date: fields.date({ label: 'Datum' }),
      },
    }),
    board: collection({
      label: 'Vorstand',
      slugField: 'name',
      path: 'src/content/board/*',
      format: { contentField: 'content' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        position: fields.text({ label: 'Position' }),
        photo: fields.text({ label: 'Foto-Schlüssel' }),
        sortierung: fields.integer({ label: 'Sortierung' }),
      },
    }),
  },
});
