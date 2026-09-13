import type { Handle, RemixNode } from 'remix/ui'
import { css } from 'remix/ui'

import { AlbumCreateForm } from '../assets/album-create-form.tsx'
import { AlbumPreview } from '../assets/album-preview.tsx'
import { AlbumSearch } from '../assets/album-search.tsx'
import { QueuePanel } from '../assets/queue-panel.tsx'
import type { Album } from '../data/albums.ts'
import type { AlbumFieldErrors, AlbumFormValues } from '../data/validation.ts'
import { routes } from '../routes.ts'
import { Document } from './document.tsx'

const emptyValues: AlbumFormValues = {
  title: '',
  artist: '',
  year: '',
  genre: '',
  notes: '',
}

export function HomePage(handle: Handle<{ albums: Album[] }>) {
  return () => {
    let { albums } = handle.props
    let featured = albums[0]

    return (
      <AppShell
        title="Vinyl Shelf | Start Here"
        description="A Remix 3 practice app for routing, request handling, and server-rendered UI."
        activePath="/"
        albumCount={albums.length}
      >
        <section mix={heroStyle}>
          <div>
            <p mix={eyebrowStyle}>Start Here</p>
            <h1 mix={titleStyle}>Vinyl Shelf</h1>
            <p mix={leadStyle}>
              A tiny Remix practice app for learning the route contract, request handlers,
              server-rendered UI, form actions, and selective hydration.
            </p>
            <div mix={actionRowStyle}>
              <a href={routes.albums.index.href()} mix={primaryLinkStyle}>
                Browse albums
              </a>
              <a href="https://guides.remix.run/rendering-ui/" mix={plainLinkStyle}>
                Original guide
              </a>
            </div>
          </div>
          {featured ? (
            <AlbumPreview title={featured.title} artist={featured.artist} year={featured.year} />
          ) : null}
        </section>

        <section mix={sectionStyle}>
          <div mix={sectionHeaderStyle}>
            <div>
              <p mix={eyebrowStyle}>Chapter checkpoints</p>
              <h2 mix={headingStyle}>What this page demonstrates</h2>
            </div>
            <a href={routes.apiAlbums.href()} mix={plainLinkStyle}>
              JSON route
            </a>
          </div>
          <div mix={checkpointGridStyle}>
            <Checkpoint title="Request" body="The controller receives a Web Request for each route." />
            <Checkpoint title="Controller" body="Actions translate URLs and form submissions into Responses." />
            <Checkpoint title="Rendering UI" body="Pages are rendered on the server before any browser JavaScript runs." />
            <Checkpoint title="Hydration" body="Only the album preview button hydrates for browser interactivity." />
          </div>
        </section>

        <section mix={sectionStyle}>
          <div mix={sectionHeaderStyle}>
            <div>
              <p mix={eyebrowStyle}>Seed data</p>
              <h2 mix={headingStyle}>Recent shelf entries</h2>
            </div>
            <a href={routes.feed.href()} mix={plainLinkStyle}>
              HTML feed
            </a>
          </div>
          <AlbumGrid albums={albums.slice(0, 3)} />
        </section>
      </AppShell>
    )
  }
}

export function AlbumsPage(
  handle: Handle<{
    albums: Album[]
    errors?: AlbumFieldErrors
    values?: AlbumFormValues
  }>,
) {
  return () => {
    let { albums, errors = {}, values = emptyValues } = handle.props

    return (
      <AppShell
        title="Albums | Vinyl Shelf"
        description="Every album on the shelf, with a native form action for adding one more."
        activePath="/albums"
        albumCount={albums.length}
      >
        <section mix={sectionStyle}>
          <div mix={sectionHeaderStyle}>
            <div>
              <p mix={eyebrowStyle}>First form action</p>
              <h1 mix={titleStyle}>Albums</h1>
            </div>
            <a href={routes.apiAlbums.href()} mix={plainLinkStyle}>
              View JSON
            </a>
          </div>
        </section>

        {/* Hydrated islands. Everything around them stays server-only. */}
        <section mix={islandGridStyle}>
          <div mix={panelStyle}>
            <AlbumSearch searchHref={routes.apiAlbums.href()} />
          </div>
          <QueuePanel albums={albums.map((album) => ({ slug: album.slug, title: album.title }))} />
        </section>

        <section mix={splitStyle}>
          <div mix={panelStyle}>
            <h2 mix={headingStyle}>Add album</h2>
            <AlbumCreateForm
              actionHref={routes.albums.create.href()}
              values={values}
              errors={errors}
            />
          </div>

          <AlbumGrid albums={albums} />
        </section>
      </AppShell>
    )
  }
}

export function AlbumDetailPage(handle: Handle<{ album: Album }>) {
  return () => {
    let { album } = handle.props

    return (
      <AppShell
        title={`${album.title} | Vinyl Shelf`}
        description={`${album.title} by ${album.artist}, a ${album.genre} record from ${album.year}.`}
        activePath="/albums"
      >
        <article mix={detailStyle}>
          <p mix={eyebrowStyle}>Route params</p>
          <h1 mix={titleStyle}>{album.title}</h1>
          <p mix={leadStyle}>
            {album.artist} made this {album.genre} record in {album.year}.
          </p>
          <p>{album.notes}</p>
          <dl mix={detailsGridStyle}>
            <div>
              <dt>URL param</dt>
              <dd>{album.slug}</dd>
            </div>
            <div>
              <dt>Response</dt>
              <dd>HTML 200</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>server data</dd>
            </div>
          </dl>
          <div mix={actionRowStyle}>
            <a href={routes.albums.edit.index.href({ slug: album.slug })} mix={primaryLinkStyle}>
              Edit album
            </a>
            <a href={routes.albums.index.href()} mix={plainLinkStyle}>
              Back to albums
            </a>
            <form method="post" action={routes.albums.destroy.href({ slug: album.slug })}>
              <input type="hidden" name="_method" value="DELETE" />
              <button type="submit" mix={dangerButtonStyle}>
                Delete album
              </button>
            </form>
          </div>
        </article>
      </AppShell>
    )
  }
}

export function NotFoundPage(handle: Handle<{ slug: string }>) {
  return () => (
    <AppShell title="Album not found | Vinyl Shelf" activePath="/albums">
      <section mix={panelStyle}>
        <p mix={eyebrowStyle}>404 response</p>
        <h1 mix={titleStyle}>Album not found</h1>
        <p mix={leadStyle}>No album exists for the route param "{handle.props.slug}".</p>
        <a href={routes.albums.index.href()} mix={primaryLinkStyle}>
          Back to albums
        </a>
      </section>
    </AppShell>
  )
}

/**
 * The value descendants need without threading it through every intermediate
 * component. The provider component is the context key, so
 * `handle.context.get(AppShell)` stays typed.
 */
interface ShellContext {
  activePath: string
  albumCount: number | undefined
}

export function AppShell(
  handle: Handle<
    {
      children?: RemixNode
      title: string
      description?: string
      activePath: string
      albumCount?: number
    },
    ShellContext
  >,
) {
  handle.context.set({
    activePath: handle.props.activePath,
    albumCount: handle.props.albumCount,
  })

  return () => {
    let { children, title, description } = handle.props

    return (
      <Document title={title} description={description}>
        <div mix={shellStyle}>
          <PrimaryNav />
          <main mix={mainStyle}>{children}</main>
        </div>
      </Document>
    )
  }
}

function PrimaryNav(handle: Handle) {
  let shell = handle.context.get(AppShell)

  return () => (
    <nav aria-label="Primary" mix={navStyle}>
      <strong>Vinyl Shelf</strong>
      <a href={routes.home.href()} aria-current={shell.activePath === '/' ? 'page' : undefined}>
        Start
      </a>
      <a
        href={routes.albums.index.href()}
        aria-current={shell.activePath === '/albums' ? 'page' : undefined}
      >
        Albums
      </a>
      <a href={routes.apiAlbums.href()}>API</a>
      {shell.albumCount === undefined ? null : (
        <span mix={navCountStyle}>{shell.albumCount} albums</span>
      )}
    </nav>
  )
}

function AlbumGrid(handle: Handle<{ albums: Album[] }>) {
  return () => (
    <div mix={albumGridStyle}>
      {handle.props.albums.map((album) => (
        <article key={album.slug} mix={cardStyle}>
          <p mix={metaStyle}>
            {album.genre} / {album.year}
          </p>
          <h3>{album.title}</h3>
          <p>{album.artist}</p>
          <a href={routes.albums.show.href({ slug: album.slug })}>Open detail</a>
        </article>
      ))}
    </div>
  )
}

function Checkpoint(handle: Handle<{ title: string; body: string }>) {
  return () => (
    <article mix={cardStyle}>
      <h3>{handle.props.title}</h3>
      <p>{handle.props.body}</p>
    </article>
  )
}

const shellStyle = css({
  minHeight: '100vh',
  background: 'var(--shelf-bg)',
  color: 'var(--shelf-ink)',
  fontFamily: 'var(--shelf-font)',
})

const navStyle = css({
  alignItems: 'center',
  background: 'var(--shelf-shell)',
  color: 'var(--shelf-ink-inverse)',
  display: 'flex',
  gap: '20px',
  minHeight: '64px',
  padding: '0 28px',
  '& a': {
    color: 'var(--shelf-ink-inverse)',
    opacity: 0.75,
    textDecoration: 'none',
  },
  '& a[aria-current="page"]': {
    fontWeight: 800,
    opacity: 1,
  },
  '@media (max-width: 640px)': {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: '10px',
    padding: '18px 20px',
  },
})

const navCountStyle = css({
  marginLeft: 'auto',
  opacity: 0.6,
  '@media (max-width: 640px)': { marginLeft: 0 },
})

const mainStyle = css({
  display: 'grid',
  gap: '24px',
  margin: '0 auto',
  maxWidth: '1120px',
  padding: 'calc(var(--shelf-page) * 2) var(--shelf-page) 56px',
})

const heroStyle = css({
  alignItems: 'center',
  background: 'var(--shelf-surface)',
  border: '1px solid var(--shelf-line)',
  borderRadius: 'var(--shelf-radius)',
  display: 'grid',
  gap: '28px',
  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, 0.8fr)',
  padding: '28px',
  '@media (max-width: 820px)': { gridTemplateColumns: '1fr' },
})

const sectionStyle = css({ display: 'grid', gap: '16px' })
const sectionHeaderStyle = css({
  alignItems: 'center',
  display: 'flex',
  gap: '16px',
  justifyContent: 'space-between',
  '@media (max-width: 640px)': { alignItems: 'flex-start', flexDirection: 'column' },
})
const eyebrowStyle = css({
  color: 'var(--shelf-accent)',
  fontSize: '0.78rem',
  fontWeight: 800,
  letterSpacing: '0.04em',
  margin: 0,
  textTransform: 'uppercase',
})
const titleStyle = css({ fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 1.02, margin: '6px 0 0' })
const headingStyle = css({ fontSize: '1.25rem', margin: 0 })
const leadStyle = css({
  color: 'var(--shelf-muted)',
  lineHeight: 1.7,
  margin: '14px 0 0',
  maxWidth: '68ch',
})
const actionRowStyle = css({ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' })
const primaryLinkStyle = css({
  background: 'var(--shelf-accent)',
  borderRadius: 'var(--shelf-radius)',
  color: 'var(--shelf-ink-inverse)',
  display: 'inline-flex',
  fontWeight: 800,
  padding: '10px 14px',
  textDecoration: 'none',
})
const plainLinkStyle = css({
  color: 'var(--shelf-link)',
  fontWeight: 800,
  textDecoration: 'none',
})
const checkpointGridStyle = css({
  display: 'grid',
  gap: '16px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
})
const albumGridStyle = css({
  display: 'grid',
  gap: '16px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
})
const cardStyle = css({
  background: 'var(--shelf-surface)',
  border: '1px solid var(--shelf-line)',
  borderRadius: 'var(--shelf-radius)',
  display: 'grid',
  gap: '10px',
  padding: '18px',
  '& h3, & p': { margin: 0 },
  '& p': { color: 'var(--shelf-muted)' },
  '& a': { color: 'var(--shelf-link)', fontWeight: 800, textDecoration: 'none' },
})
const metaStyle = css({
  color: 'var(--shelf-accent) !important',
  fontSize: '0.82rem',
  fontWeight: 800,
})
const islandGridStyle = css({
  alignItems: 'start',
  display: 'grid',
  gap: '18px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
})
const splitStyle = css({
  alignItems: 'start',
  display: 'grid',
  gap: '18px',
  gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
  '@media (max-width: 860px)': { gridTemplateColumns: '1fr' },
})
const panelStyle = css({
  background: 'var(--shelf-surface)',
  border: '1px solid var(--shelf-line)',
  borderRadius: 'var(--shelf-radius)',
  display: 'grid',
  gap: '14px',
  padding: '20px',
})
const dangerButtonStyle = css({
  background: 'var(--shelf-danger)',
  border: 0,
  borderRadius: 'var(--shelf-radius)',
  color: 'var(--shelf-ink-inverse)',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  padding: '10px 14px',
})
const detailStyle = css({
  background: 'var(--shelf-surface)',
  border: '1px solid var(--shelf-line)',
  borderRadius: 'var(--shelf-radius)',
  display: 'grid',
  gap: '18px',
  padding: '28px',
  '& p': { lineHeight: 1.7 },
})
const detailsGridStyle = css({
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  margin: 0,
  '& div': { borderTop: '1px solid var(--shelf-line)', paddingTop: '12px' },
  '& dt': { color: 'var(--shelf-muted)' },
  '& dd': { fontWeight: 800, margin: '4px 0 0' },
})
