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

export interface ShelfStats {
  albumCount: number
  genreCount: number
  latestYear: number | undefined
}

export function listAlbums() {
  return albums.map((album) => ({ ...album }))
}

export function getShelfStats(): ShelfStats {
  // Genres are compared case-insensitively so 'Rock' and 'rock' do not count
  // as two.
  let genres = new Set(albums.map((album) => album.genre.toLowerCase()))

  return {
    albumCount: albums.length,
    genreCount: genres.size,
    // An empty shelf has no newest year. `Math.max()` of nothing is -Infinity,
    // which would render as a real answer.
    latestYear: albums.length === 0 ? undefined : Math.max(...albums.map((album) => album.year)),
  }
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

/**
 * Albums that share a genre word or a decade with the given album. The list
 * lives behind its own GET route, so the detail page can stream it in a frame
 * and reload it without re-rendering the rest of the page.
 */
export function getRecommendations(album: Album) {
  let genreWords = album.genre.toLowerCase().split(/\s+/)
  let decade = Math.floor(album.year / 10)

  let others = albums.filter((candidate) => candidate.slug !== album.slug)
  let related = others.filter((candidate) => {
    let candidateGenre = candidate.genre.toLowerCase()
    let sharesGenre = genreWords.some((word) => candidateGenre.includes(word))
    let sharesDecade = Math.floor(candidate.year / 10) === decade
    return sharesGenre || sharesDecade
  })

  // A small shelf rarely has true matches, so fall back to the newest entries
  // instead of rendering an empty region.
  let picks = related.length > 0 ? related : others

  return picks.slice(0, 3).map((candidate) => ({ ...candidate }))
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
