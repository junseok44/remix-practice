export interface Album {
  slug: string
  title: string
  artist: string
  year: number
  genre: string
  notes: string
}

export interface CreateAlbumInput {
  title: string
  artist: string
  year: number
  genre: string
  notes: string
}

const seedAlbums: Album[] = [
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

let albums: Album[] = seedAlbums.map((album) => ({ ...album }))

export type AlbumSort = 'title' | 'year'

export function listAlbums(sort?: AlbumSort) {
  let listed = albums.map((album) => ({ ...album }))

  if (sort === 'title') return listed.sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'year') return listed.sort((a, b) => a.year - b.year)
  return listed
}

/**
 * An unrecognized `?sort=` value falls back to the default order instead of
 * erroring: the query string is a view preference, not submitted form data, so
 * a stale or hand-edited URL should still render the list.
 */
export function parseAlbumSort(value: string | null): AlbumSort | undefined {
  return value === 'title' || value === 'year' ? value : undefined
}

export function getAlbum(slug: string) {
  let album = albums.find((item) => item.slug === slug)
  return album ? { ...album } : undefined
}

export function createAlbum(input: CreateAlbumInput) {
  let slug = uniqueSlug(input.title)
  let album: Album = { slug, ...input }
  albums.unshift(album)
  return { ...album }
}

export function updateAlbum(slug: string, input: CreateAlbumInput) {
  let album = albums.find((item) => item.slug === slug)
  if (!album) return undefined

  Object.assign(album, input)
  return { ...album }
}

export function deleteAlbum(slug: string) {
  let before = albums.length
  albums = albums.filter((album) => album.slug !== slug)
  return albums.length < before
}

export function resetAlbumsForTest() {
  albums = seedAlbums.map((album) => ({ ...album }))
}

function uniqueSlug(title: string) {
  let base = slugify(title) || 'album'
  let slug = base
  let next = 2

  while (albums.some((album) => album.slug === slug)) {
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
