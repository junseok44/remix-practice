import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'

import type { ShelfStats } from '../data/albums.ts'

/**
 * The region a frame streams into. It renders without the Document shell
 * because the surrounding page already owns <html>, <head>, and the nav.
 */
export function ShelfStatsRegion(handle: Handle<{ stats: ShelfStats }>) {
  return () => {
    let { albumCount, genreCount, latestYear } = handle.props.stats

    return (
      <section aria-label="Shelf stats" mix={regionStyle}>
        <p mix={eyebrowStyle}>Shelf stats</p>
        <dl mix={listStyle}>
          <div>
            <dt>Albums</dt>
            <dd>{albumCount}</dd>
          </div>
          <div>
            <dt>Genres</dt>
            <dd>{genreCount}</dd>
          </div>
          <div>
            <dt>Newest year</dt>
            <dd>{latestYear ?? 'None yet'}</dd>
          </div>
        </dl>
      </section>
    )
  }
}

const regionStyle = css({
  background: 'var(--shelf-surface)',
  border: '1px solid var(--shelf-line)',
  borderRadius: 'var(--shelf-radius)',
  display: 'grid',
  gap: '12px',
  padding: '18px',
})

const eyebrowStyle = css({
  color: 'var(--shelf-accent)',
  fontSize: '0.78rem',
  fontWeight: 800,
  letterSpacing: '0.04em',
  margin: 0,
  textTransform: 'uppercase',
})

const listStyle = css({
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  margin: 0,
  '& div': { borderTop: '1px solid var(--shelf-line)', paddingTop: '10px' },
  '& dt': { color: 'var(--shelf-muted)' },
  '& dd': { fontWeight: 800, margin: '4px 0 0' },
})
