import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'

import { AlbumEditForm } from '../../../assets/album-edit-form.tsx'
import type { Album } from '../../../data/albums.ts'
import type { AlbumFieldErrors, AlbumFormValues } from '../../../data/validation.ts'
import { routes } from '../../../routes.ts'
import { Document } from '../../../ui/document.tsx'

export function AlbumEditPage(
  handle: Handle<{
    album: Album
    errors?: AlbumFieldErrors
    values?: AlbumFormValues
  }>,
) {
  return () => {
    let { album, errors = {}, values } = handle.props
    let formValues: AlbumFormValues = values ?? {
      title: album.title,
      artist: album.artist,
      year: String(album.year),
      genre: album.genre,
      notes: album.notes,
      rating: album.rating == null ? '' : String(album.rating),
    }

    return (
      <Document
        title={`Edit ${album.title} | Vinyl Shelf`}
        description={`Edit the shelf entry for ${album.title}.`}
      >
        <main mix={pageStyle}>
          <nav mix={crumbStyle}>
            <a href={routes.albums.index.href()}>Albums</a>
            <span>/</span>
            <a href={routes.albums.show.href({ slug: album.slug })}>{album.title}</a>
          </nav>

          <section mix={panelStyle}>
            <p mix={eyebrowStyle}>Interactivity</p>
            <h1>Edit album</h1>
            <p mix={leadStyle}>
              The page stays server-only. Just the form hydrates, so it can add pending state and
              inline errors on top of the same route action a plain browser submission uses.
            </p>

            <AlbumEditForm
              actionHref={routes.albums.edit.action.href({ slug: album.slug })}
              values={formValues}
              errors={errors}
            />
          </section>
        </main>
      </Document>
    )
  }
}

const pageStyle = css({
  background: 'var(--shelf-bg)',
  color: 'var(--shelf-ink)',
  fontFamily: 'var(--shelf-font)',
  minHeight: '100vh',
  padding: 'calc(var(--shelf-page) * 2) var(--shelf-page)',
})

const crumbStyle = css({
  display: 'flex',
  gap: '8px',
  margin: '0 auto 18px',
  maxWidth: '720px',
  '& a': { color: 'var(--shelf-link)', fontWeight: 800, textDecoration: 'none' },
})

const panelStyle = css({
  background: 'var(--shelf-surface)',
  border: '1px solid var(--shelf-line)',
  borderRadius: 'var(--shelf-radius)',
  display: 'grid',
  gap: '16px',
  margin: '0 auto',
  maxWidth: '720px',
  padding: '24px',
})

const eyebrowStyle = css({
  color: 'var(--shelf-accent)',
  fontSize: '0.78rem',
  fontWeight: 800,
  letterSpacing: '0.04em',
  margin: 0,
  textTransform: 'uppercase',
})

const leadStyle = css({ color: 'var(--shelf-muted)', lineHeight: 1.7, margin: 0 })

