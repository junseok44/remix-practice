import { column as c, table, type TableRow } from 'remix/data-table'

/**
 * Runtime table metadata for the app. The column modifiers mirror the SQL in
 * db/migrations, but the migrations own the actual DDL — editing this file
 * never changes the database.
 */
export const albums = table({
  name: 'albums',
  columns: {
    id: c.integer().primaryKey().autoIncrement(),
    slug: c.text().notNull().unique(),
    title: c.text().notNull(),
    artist: c.text().notNull(),
    year: c.integer().notNull(),
    genre: c.text().notNull(),
    notes: c.text().notNull(),
    rating: c.integer().nullable(),
  },
  // Persistence invariants run for every caller, not just the album form.
  // Request validation may be skipped by a future code path; this cannot.
  beforeWrite({ value }) {
    let next = { ...value }
    for (let key of ['slug', 'title', 'artist', 'genre', 'notes'] as const) {
      let field = next[key]
      if (typeof field === 'string') next[key] = field.trim()
    }
    return { value: next }
  },
  validate({ value }) {
    let issues = []

    if (typeof value.year === 'number' && (!Number.isInteger(value.year) || value.year < 1900 || value.year > 2100)) {
      issues.push({ message: 'year must be an integer between 1900 and 2100', path: ['year'] })
    }
    if (value.rating != null && !(Number.isInteger(value.rating) && value.rating >= 1 && value.rating <= 5)) {
      issues.push({ message: 'rating must be an integer between 1 and 5', path: ['rating'] })
    }
    if (typeof value.slug === 'string' && value.slug === '') {
      issues.push({ message: 'slug must not be empty', path: ['slug'] })
    }

    return issues.length > 0 ? { issues } : { value }
  },
})

export type AlbumRow = TableRow<typeof albums>
