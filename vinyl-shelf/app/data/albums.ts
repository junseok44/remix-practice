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

export function listAlbums() {
  return albums.map((album) => ({ ...album }))
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

export function deleteAlbum(slug: string) {
  let index = albums.findIndex((item) => item.slug === slug)
  if (index === -1) return false

  albums.splice(index, 1)
  return true
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
