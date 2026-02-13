import { config, fields, collection } from '@keystatic/core';

const storageKind = (process.env.KEYSTATIC_STORAGE_KIND || 'local') as 'local' | 'github';

export default config({
  storage: storageKind === 'github'
    ? { kind: 'github', repo: { owner: 'datenknoten', name: 'tv-odernheim' }, branchPrefix: 'keystatic/' }
    : { kind: 'local' },
  ui: {
    brand: { name: 'TV Odernheim' },
    navigation: {
      Nachrichten: ['news'],
      Kurse: ['courses'],
      Vorstand: ['board'],
    },
  },
  collections: {
    news: collection({
      label: 'Nachrichten',
      slugField: 'title',
      path: 'src/content/news/*',
      format: { contentField: 'content' },
      columns: ['title', 'date'],
      schema: {
        title: fields.slug({ name: { label: 'Titel' } }),
        description: fields.text({ label: 'Beschreibung', multiline: true }),
        date: fields.date({ label: 'Datum' }),
        content: fields.markdoc({ label: 'Inhalt' }),
      },
    }),
    courses: collection({
      label: 'Kurse',
      slugField: 'title',
      path: 'src/content/courses/*',
      format: { contentField: 'content' },
      columns: ['title', 'category'],
      schema: {
        title: fields.slug({ name: { label: 'Titel' } }),
        description: fields.text({ label: 'Beschreibung', multiline: true }),
        schedule: fields.text({ label: 'Zeiten' }),
        location: fields.text({ label: 'Ort' }),
        instructor: fields.text({ label: 'Trainer/in' }),
        image: fields.image({
          label: 'Bild',
          directory: 'public/images',
          publicPath: '/images/',
        }),
        category: fields.select({
          label: 'Kategorie',
          options: [
            { label: 'Kinderturnen', value: 'Kinderturnen' },
            { label: 'Gymnastik, Fitness, Gesundheit, Kurse', value: 'Gymnastik, Fitness, Gesundheit, Kurse' },
            { label: 'Sportarten', value: 'Sportarten' },
          ],
          defaultValue: 'Sportarten',
        }),
        content: fields.markdoc({ label: 'Inhalt' }),
      },
    }),
    board: collection({
      label: 'Vorstand',
      slugField: 'name',
      path: 'src/content/board/*',
      columns: ['name', 'position', 'sortierung'],
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        position: fields.text({ label: 'Position' }),
        photo: fields.text({ label: 'Foto-Schluessel' }),
        sortierung: fields.integer({ label: 'Sortierung' }),
      },
    }),
  },
});
