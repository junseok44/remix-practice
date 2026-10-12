import type { Database } from 'remix/data-table'

import { albums, type AlbumRow } from './schema.ts'

export type Album = AlbumRow

export interface CreateAlbumInput {
  title: string
  artist: string
  year: number
  genre: string
  notes: string
  rating: number | null
}

// Seeds predate ratings and are inserted without one, so they stay unrated.
const seedAlbums: Omit<Album, 'id' | 'rating'>[] = [
  {
    slug: 'kind-of-blue',
    title: 'Kind of Blue',
    artist: 'Miles Davis',
    year: 1959,
    genre: 'Modal jazz',
    notes: 'Use this detail page to practice route params and explicit 404 handling.',
  },
  {
    slug: 'rumours',
    title: 'Rumours',
    artist: 'Fleetwood Mac',
    year: 1977,
    genre: 'Rock',
    notes: 'A seeded album keeps the first server-rendered list easy to inspect.',
  },
  {
    slug: 'miseducation',
    title: 'The Miseducation of Lauryn Hill',
    artist: 'Lauryn Hill',
    year: 1998,
    genre: 'Neo soul',
    notes: 'The JSON route returns this same server-owned data without page UI.',
  },
]

export function listAlbums(db: Database) {
  // Newest first: form-created albums get higher ids than the seeds.
  return db.findMany(albums, { orderBy: ['id', 'desc'] })
}

export function getAlbum(db: Database, slug: string) {
  return db.findOne(albums, { where: { slug } })
}

export async function createAlbum(db: Database, input: CreateAlbumInput) {
  // The slug is chosen by reading the rows that already exist, so the read and
  // the insert have to commit together. Two creates with the same title would
  // otherwise both pick the same suffix and one would hit the unique index.
  return db.transaction(async (tx) => {
    let slug = await uniqueSlug(tx, input.title)
    return tx.create(albums, { slug, ...input }, { returnRow: true })
  })
}

export async function updateAlbum(db: Database, slug: string, input: CreateAlbumInput) {
  let album = await getAlbum(db, slug)
  if (!album) return null

  return db.update(albums, album.id, input)
}

export async function deleteAlbum(db: Database, slug: string) {
  let album = await getAlbum(db, slug)
  if (!album) return false

  return db.delete(albums, album.id)
}

/**
 * Albums that share a genre word or a decade with the given album. The list
 * lives behind its own GET route, so the detail page can stream it in a frame
 * and reload it without re-rendering the rest of the page.
 */
export async function getRecommendations(db: Database, album: Album) {
  let genreWords = album.genre.toLowerCase().split(/\s+/)
  let decade = Math.floor(album.year / 10)

  let others = (await listAlbums(db)).filter((candidate) => candidate.slug !== album.slug)
  let related = others.filter((candidate) => {
    let candidateGenre = candidate.genre.toLowerCase()
    let sharesGenre = genreWords.some((word) => candidateGenre.includes(word))
    let sharesDecade = Math.floor(candidate.year / 10) === decade
    return sharesGenre || sharesDecade
  })

  // A small shelf rarely has true matches, so fall back to the newest entries
  // instead of rendering an empty region.
  let picks = related.length > 0 ? related : others

  return picks.slice(0, 3)
}

export async function seedAlbumsIfEmpty(db: Database) {
  let existing = await db.count(albums)
  if (existing > 0) return

  // Inserted in reverse so the id-descending list shows the seeds in their
  // curated order while later form submissions still land on top.
  await db.createMany(albums, [...seedAlbums].reverse())
}

export async function resetAlbumsForTest(db: Database) {
  await db.exec('delete from albums')
  await db.exec("delete from sqlite_sequence where name = 'albums'")
  await seedAlbumsIfEmpty(db)
}

async function uniqueSlug(db: Database, title: string) {
  let base = slugify(title) || 'album'
  let slug = base
  let next = 2

  while (await getAlbum(db, slug)) {
    slug = `${base}-${next}`
    next++
  }

  return slug
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
