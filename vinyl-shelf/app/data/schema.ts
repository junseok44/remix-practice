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
    // Bumped on every update so an edit form can say which version it was
    // built from. Two people editing the same album no longer overwrite each
    // other silently.
    revision: c.integer().notNull().default(1),
    // Who may edit or delete this album. Signing in proves who a request comes
    // from; this column decides what that person may change.
    owner_id: c.integer(),
    // A FileStorage key the app generated, never the uploaded filename.
    cover_key: c.text(),
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
    if (typeof value.slug === 'string' && value.slug === '') {
      issues.push({ message: 'slug must not be empty', path: ['slug'] })
    }

    return issues.length > 0 ? { issues } : { value }
  },
})

export type AlbumRow = TableRow<typeof albums>

export const users = table({
  name: 'users',
  columns: {
    id: c.integer().primaryKey().autoIncrement(),
    email: c.text().notNull().unique(),
    name: c.text().notNull(),
    password_hash: c.text().notNull(),
  },
  beforeWrite({ value }) {
    // Login compares emails exactly, so they are stored in one canonical form.
    if (typeof value.email !== 'string') return { value }
    return { value: { ...value, email: value.email.trim().toLowerCase() } }
  },
})

export type UserRow = TableRow<typeof users>
