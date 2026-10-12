import { clientEntry, css, link, on, type Handle, type SerializableProps } from 'remix/ui'
import { animateEntrance, animateExit, animateLayout, spring } from 'remix/ui/animation'
import input from 'remix/ui/input'

import { prefersReducedMotion } from './motion.ts'

interface AlbumSearchProps extends SerializableProps {
  /** The route URL comes from the server so the browser never hardcodes it. */
  searchHref: string
}

interface SearchResult {
  slug: string
  href: string
  title: string
  artist: string
  year: number
}

export const AlbumSearch = clientEntry(
  import.meta.url,
  function AlbumSearch(handle: Handle<AlbumSearchProps>) {
    let error: string | undefined
    let loading = false
    let query = ''
    let results: SearchResult[] = []

    return () => (
      <div mix={searchStyle}>
        <label htmlFor={handle.id}>Search the shelf</label>
        <input
          id={handle.id}
          type="search"
          placeholder="Try “blue”"
          mix={[
            input({ size: 'lg' }),
            // The second argument aborts when this handler runs again or the
            // element is removed, so a slow response for an old query can never
            // replace newer results.
            on('input', async (event, signal) => {
              query = event.currentTarget.value
              error = undefined
              loading = query !== ''
              handle.update()

              if (query === '') {
                results = []
                handle.update()
                return
              }

              let url = new URL(handle.props.searchHref, window.location.href)
              url.searchParams.set('query', query)

              try {
                let response = await fetch(url, {
                  headers: { Accept: 'application/json' },
                  signal,
                })
                if (!response.ok) {
                  throw new Error(`Search failed with status ${response.status}`)
                }

                let payload = (await response.json()) as { albums: SearchResult[] }
                if (signal.aborted) return

                results = payload.albums
                loading = false
                handle.update()
              } catch (caught) {
                if (signal.aborted) return
                error = caught instanceof Error ? caught.message : 'Search failed'
                loading = false
                handle.update()
              }
            }),
          ]}
        />

        {error ? (
          <p role="alert" mix={errorStyle}>
            {error}
          </p>
        ) : null}
        {loading ? <p mix={statusStyle}>Searching…</p> : null}
        {!loading && query !== '' && results.length === 0 && !error ? (
          <p mix={statusStyle}>No albums match “{query}”.</p>
        ) : null}

        <ul mix={resultListStyle}>
          {results.map((album) => (
            // `link(...)` makes the whole row behave like a link, including
            // role, keyboard activation, and client navigation.
            <li key={album.slug} mix={[link(album.href), ...resultMotion()]}>
              <strong>{album.title}</strong>
              <span>
                {album.artist}, {album.year}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  },
)

// These mixins drive the Web Animations API, which a CSS reduced-motion media
// query cannot switch off, so the preference is read here on every render.
function resultMotion() {
  let animate = typeof window !== 'undefined' && !prefersReducedMotion()

  return [
    animateEntrance(animate && { opacity: 0, transform: 'translateY(-4px)', ...spring('snappy') }),
    animateExit(animate && { opacity: 0, transform: 'translateY(4px)', ...spring('snappy') }),
    animateLayout(animate && { ...spring('bouncy'), size: false }),
  ]
}

const searchStyle = css({
  display: 'grid',
  gap: '8px',
  '& label': { fontWeight: 800 },
})

const statusStyle = css({ color: 'var(--shelf-muted)', margin: 0 })
const errorStyle = css({ color: 'var(--shelf-danger)', fontWeight: 700, margin: 0 })

const resultListStyle = css({
  display: 'grid',
  gap: '8px',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  '& li': {
    background: 'var(--shelf-surface)',
    border: '1px solid var(--shelf-line)',
    borderRadius: 'var(--shelf-radius-sm)',
    cursor: 'pointer',
    display: 'grid',
    gap: '2px',
    padding: '10px 12px',
  },
  '& li:hover, & li:focus-visible': { borderColor: 'var(--shelf-link)' },
  '& span': { color: 'var(--shelf-muted)' },
})
