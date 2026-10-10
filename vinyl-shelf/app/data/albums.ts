import type { Database } from 'remix/data-table'

import { albums, type AlbumRow } from './schema.ts'
import { findUserByEmail, seedUsersIfEmpty, shelfOwnerEmail } from './users.ts'

export type Album = AlbumRow

export interface CreateAlbumInput {
  title: string
  artist: string
  year: number
  genre: string
  notes: string
}

// `revision` is omitted so the column default starts every seed at 1.
const seedAlbums: Omit<Album, 'id' | 'revision' | 'owner_id' | 'cover_key'>[] = [
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

export async function createAlbum(
  db: Database,
  ownerId: number,
  input: CreateAlbumInput,
  coverKey: string | null = null,
) {
  // The slug is chosen by reading the rows that already exist, so the read and
  // the insert have to commit together. Two creates with the same title would
  // otherwise both pick the same suffix and one would hit the unique index.
  return db.transaction(async (tx) => {
    let slug = await uniqueSlug(tx, input.title)
    return tx.create(
      albums,
      { slug, ...input, owner_id: ownerId, ...(coverKey ? { cover_key: coverKey } : {}) },
      { returnRow: true },
    )
  })
}

export function canManageAlbum(album: Album, userId: number) {
  return album.owner_id === userId
}

export type UpdateAlbumResult =
  /** `replacedCoverKey` is the file the caller should now remove, if any. */
  | { ok: true; album: Album; replacedCoverKey: string | null }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'forbidden' }
  /** `album` is the row as it stands now, so the form can show what it lost. */
  | { ok: false; reason: 'conflict'; album: Album }

/**
 * Applies an edit only when the actor owns the album and the form was built
 * from its current revision. Reading the row and writing the new one must
 * commit together, or two submissions could both pass the checks.
 */
export async function updateAlbum(
  db: Database,
  actorId: number,
  slug: string,
  expectedRevision: number,
  input: CreateAlbumInput,
  /** A newly stored cover. `null` keeps the current one. */
  coverKey: string | null = null,
): Promise<UpdateAlbumResult> {
  return db.transaction(async (tx) => {
    let album = await getAlbum(tx, slug)
    if (!album) return { ok: false, reason: 'not-found' }
    // Checked here as well as in the controller: the write is the last place
    // every caller passes through.
    if (!canManageAlbum(album, actorId)) return { ok: false, reason: 'forbidden' }
    if (album.revision !== expectedRevision) return { ok: false, reason: 'conflict', album }

    let updated = await tx.update(albums, album.id, {
      ...input,
      ...(coverKey ? { cover_key: coverKey } : {}),
      revision: album.revision + 1,
    })
    return { ok: true, album: updated, replacedCoverKey: coverKey ? album.cover_key : null }
  })
}

export type DeleteAlbumResult =
  | { ok: true; coverKey: string | null }
  | { ok: false; reason: 'not-found' | 'forbidden' }

export async function deleteAlbum(
  db: Database,
  actorId: number,
  slug: string,
): Promise<DeleteAlbumResult> {
  return db.transaction(async (tx) => {
    let album = await getAlbum(tx, slug)
    if (!album) return { ok: false, reason: 'not-found' }
    if (!canManageAlbum(album, actorId)) return { ok: false, reason: 'forbidden' }

    await tx.delete(albums, album.id)
    return { ok: true, coverKey: album.cover_key }
  })
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

export async function seedShelf(db: Database) {
  await seedUsersIfEmpty(db)
  let owner = await findUserByEmail(db, shelfOwnerEmail)
  if (!owner) return

  if ((await db.count(albums)) === 0) {
    // Inserted in reverse so the id-descending list shows the seeds in their
    // curated order while later form submissions still land on top.
    await db.createMany(
      albums,
      [...seedAlbums].reverse().map((album) => ({ ...album, owner_id: owner.id })),
    )
  }

  // A database created before chapter 10 has albums with no owner, which no
  // one could ever edit again.
  await db.exec('update albums set owner_id = ? where owner_id is null', [owner.id])
}

export async function resetAlbumsForTest(db: Database) {
  await db.exec('delete from albums')
  await db.exec("delete from sqlite_sequence where name = 'albums'")
  await seedShelf(db)
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
