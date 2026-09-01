import type { Handle, RemixNode } from 'remix/ui'
import { css } from 'remix/ui'

import { AlbumPreview } from '../assets/album-preview.tsx'
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
      <AppShell title="Vinyl Shelf | Start Here" activePath="/">
        <section mix={heroStyle}>
          <div>
            <p mix={eyebrowStyle}>Start Here</p>
            <h1 mix={titleStyle}>Vinyl Shelf</h1>
            <p mix={leadStyle}>
              A tiny Remix practice app for learning the route contract, request handlers,
              server-rendered UI, form actions, and selective hydration.
            </p>
            <div mix={actionRowStyle}>
              <a href={routes.albums.href()} mix={primaryLinkStyle}>
                Browse albums
              </a>
              <a href="https://guides.remix.run/start-here/" mix={plainLinkStyle}>
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
      <AppShell title="Albums | Vinyl Shelf" activePath="/albums">
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

        <section mix={splitStyle}>
          <form method="post" action={routes.albumsAction.href()} mix={panelStyle}>
            <h2 mix={headingStyle}>Add album</h2>
            <TextField name="title" label="Title" value={values.title} error={errors.title} />
            <TextField name="artist" label="Artist" value={values.artist} error={errors.artist} />
            <TextField name="year" label="Year" value={values.year} error={errors.year} />
            <TextField name="genre" label="Genre" value={values.genre} error={errors.genre} />
            <label mix={fieldStyle}>
              <span>Notes</span>
              <textarea name="notes" rows={4} defaultValue={values.notes} />
              {errors.notes ? <small mix={errorStyle}>{errors.notes}</small> : null}
            </label>
            <button type="submit" mix={buttonStyle}>
              Add album
            </button>
          </form>

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
      <AppShell title={`${album.title} | Vinyl Shelf`} activePath="/albums">
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
          <form method="post" action={routes.albumDelete.href({ slug: album.slug })}>
            <button type="submit" mix={buttonStyle}>
              Delete album
            </button>
          </form>
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
        <a href={routes.albums.href()} mix={primaryLinkStyle}>
          Back to albums
        </a>
      </section>
    </AppShell>
  )
}

function AppShell(
  handle: Handle<{
    children?: RemixNode
    title: string
    activePath: string
  }>,
) {
  return () => {
    let { children, title, activePath } = handle.props

    return (
      <Document title={title}>
        <div mix={shellStyle}>
          <nav aria-label="Primary" mix={navStyle}>
            <strong>Vinyl Shelf</strong>
            <a href={routes.home.href()} aria-current={activePath === '/' ? 'page' : undefined}>
              Start
            </a>
            <a
              href={routes.albums.href()}
              aria-current={activePath === '/albums' ? 'page' : undefined}
            >
              Albums
            </a>
            <a href={routes.apiAlbums.href()}>API</a>
          </nav>
          <main mix={mainStyle}>{children}</main>
        </div>
      </Document>
    )
  }
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
          <a href={routes.album.href({ slug: album.slug })}>Open detail</a>
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

function TextField(
  handle: Handle<{
    name: keyof AlbumFormValues
    label: string
    value?: string
    error?: string
  }>,
) {
  return () => {
    let { name, label, value = '', error } = handle.props

    return (
      <label mix={fieldStyle}>
        <span>{label}</span>
        <input name={name} defaultValue={value} />
        {error ? <small mix={errorStyle}>{error}</small> : null}
      </label>
    )
  }
}

const shellStyle = css({
  minHeight: '100vh',
  background: '#f4f1eb',
  color: '#1f2933',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
})

const navStyle = css({
  alignItems: 'center',
  background: '#172126',
  color: '#ffffff',
  display: 'flex',
  gap: '20px',
  minHeight: '64px',
  padding: '0 28px',
  '& a': {
    color: '#ffffff',
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

const mainStyle = css({
  display: 'grid',
  gap: '24px',
  margin: '0 auto',
  maxWidth: '1120px',
  padding: '32px 24px 56px',
})

const heroStyle = css({
  alignItems: 'center',
  background: '#ffffff',
  border: '1px solid #d8d0c3',
  borderRadius: '8px',
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
  color: '#1f6f54',
  fontSize: '0.78rem',
  fontWeight: 800,
  letterSpacing: '0.04em',
  margin: 0,
  textTransform: 'uppercase',
})
const titleStyle = css({ fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 1.02, margin: '6px 0 0' })
const headingStyle = css({ fontSize: '1.25rem', margin: 0 })
const leadStyle = css({ color: '#52616f', lineHeight: 1.7, margin: '14px 0 0', maxWidth: '68ch' })
const actionRowStyle = css({ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' })
const primaryLinkStyle = css({
  background: '#1f6f54',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-flex',
  fontWeight: 800,
  padding: '10px 14px',
  textDecoration: 'none',
})
const plainLinkStyle = css({ color: '#295b70', fontWeight: 800, textDecoration: 'none' })
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
  background: '#ffffff',
  border: '1px solid #d8d0c3',
  borderRadius: '8px',
  display: 'grid',
  gap: '10px',
  padding: '18px',
  '& h3, & p': { margin: 0 },
  '& p': { color: '#52616f' },
  '& a': { color: '#295b70', fontWeight: 800, textDecoration: 'none' },
})
const metaStyle = css({ color: '#1f6f54 !important', fontSize: '0.82rem', fontWeight: 800 })
const splitStyle = css({
  alignItems: 'start',
  display: 'grid',
  gap: '18px',
  gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
  '@media (max-width: 860px)': { gridTemplateColumns: '1fr' },
})
const panelStyle = css({
  background: '#ffffff',
  border: '1px solid #d8d0c3',
  borderRadius: '8px',
  display: 'grid',
  gap: '14px',
  padding: '20px',
})
const fieldStyle = css({
  display: 'grid',
  gap: '6px',
  '& span': { fontWeight: 800 },
  '& input, & textarea': {
    border: '1px solid #b9c2ca',
    borderRadius: '6px',
    font: 'inherit',
    padding: '10px 12px',
  },
})
const buttonStyle = css({
  background: '#172126',
  border: 0,
  borderRadius: '8px',
  color: '#ffffff',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  padding: '11px 14px',
})
const errorStyle = css({ color: '#a11d28', fontWeight: 700 })
const detailStyle = css({
  background: '#ffffff',
  border: '1px solid #d8d0c3',
  borderRadius: '8px',
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
  '& div': { borderTop: '1px solid #d8d0c3', paddingTop: '12px' },
  '& dt': { color: '#52616f' },
  '& dd': { fontWeight: 800, margin: '4px 0 0' },
})
