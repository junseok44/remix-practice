import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'

import type { Album } from '../../data/albums.ts'
import { routes } from '../../routes.ts'
import { AppShell } from '../../ui/vinyl-shelf.tsx'

export function GenreListPage(
  handle: Handle<{ genres: Array<{ name: string; count: number }> }>,
) {
  return () => (
    <AppShell title="Genres | Vinyl Shelf" activePath="/genres">
      <section mix={panelStyle}>
        <p mix={eyebrowStyle}>Route composition</p>
        <h1 mix={titleStyle}>Genres</h1>
        <p>This route area owns its own relative patterns and lives beside its controller.</p>
        <ul mix={listStyle}>
          {handle.props.genres.map((genre) => (
            <li key={genre.name}>
              <a href={routes.genres.show.href({ genre: genre.name })}>
                {genre.name} ({genre.count})
              </a>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  )
}

export function GenrePage(handle: Handle<{ genre: string; albums: Album[] }>) {
  return () => {
    let { genre, albums } = handle.props

    return (
      <AppShell title={`${genre} | Vinyl Shelf`} activePath="/genres">
        <section mix={panelStyle}>
          <p mix={eyebrowStyle}>Genre</p>
          <h1 mix={titleStyle}>{genre}</h1>
          <ul mix={listStyle}>
            {albums.map((album) => (
              <li key={album.slug}>
                <a href={routes.albums.show.href({ slug: album.slug })}>
                  {album.title} — {album.artist} ({album.year})
                </a>
              </li>
            ))}
          </ul>
          <a href={routes.genres.index.href()}>Back to genres</a>
        </section>
      </AppShell>
    )
  }
}

export function GenreNotFoundPage(handle: Handle<{ genre: string }>) {
  return () => (
    <AppShell title="Genre not found | Vinyl Shelf" activePath="/genres">
      <section mix={panelStyle}>
        <p mix={eyebrowStyle}>404 response</p>
        <h1 mix={titleStyle}>Genre not found</h1>
        <p>No album belongs to the genre "{handle.props.genre}".</p>
        <a href={routes.genres.index.href()}>Back to genres</a>
      </section>
    </AppShell>
  )
}

const panelStyle = css({
  background: '#ffffff',
  border: '1px solid #d9dee4',
  borderRadius: '12px',
  display: 'grid',
  gap: '12px',
  padding: '24px',
})

const eyebrowStyle = css({
  color: '#1f6f54',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  margin: 0,
  textTransform: 'uppercase',
})

const titleStyle = css({
  fontSize: '30px',
  lineHeight: 1.15,
  margin: 0,
})

const listStyle = css({
  display: 'grid',
  gap: '8px',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  '& a': {
    color: '#295b70',
    fontWeight: 600,
  },
})
