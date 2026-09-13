import { createController } from 'remix/router'

import { assetServer } from '../assets.ts'
import { getShelfStats, listAlbums } from '../data/albums.ts'
import { routes } from '../routes.ts'
import { HomePage } from '../ui/vinyl-shelf.tsx'
import { renderAlbumFeed } from './feed.ts'
import { ShelfStatsRegion } from './shelf-stats.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (
        (await assetServer.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
      )
    },
    home(context) {
      return context.render(<HomePage albums={listAlbums()} />)
    },
    stats(context) {
      return context.render(<ShelfStatsRegion stats={getShelfStats()} />)
    },
    feed() {
      return renderAlbumFeed(listAlbums())
    },
    apiAlbums(context) {
      let query = context.url.searchParams.get('query')?.trim().toLowerCase() ?? ''
      let albums = listAlbums()
        .filter(
          (album) =>
            query === '' ||
            album.title.toLowerCase().includes(query) ||
            album.artist.toLowerCase().includes(query) ||
            album.genre.toLowerCase().includes(query),
        )
        // The server owns URL construction, so browser code never rebuilds it.
        .map((album) => ({ ...album, href: routes.albums.show.href({ slug: album.slug }) }))

      return new Response(JSON.stringify({ albums, query, requestId: context.requestId }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    },
  },
})
