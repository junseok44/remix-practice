import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { assetServer } from '../assets.ts'
import { createAlbum, deleteAlbum, getAlbum, listAlbums } from '../data/albums.ts'
import { validateCreateAlbum } from '../data/validation.ts'
import { routes } from '../routes.ts'
import { AlbumDetailPage, AlbumsPage, HomePage, NotFoundPage } from '../ui/vinyl-shelf.tsx'

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
    albums(context) {
      return context.render(<AlbumsPage albums={listAlbums()} />)
    },
    async albumsAction(context) {
      let formData = await context.request.formData()
      let result = validateCreateAlbum(formData)

      if (!result.ok) {
        return context.render(
          <AlbumsPage albums={listAlbums()} errors={result.errors} values={result.values} />,
          { status: 400 },
        )
      }

      let album = createAlbum(result.value)
      return redirect(routes.album.href({ slug: album.slug }), 303)
    },
    album(context) {
      let album = getAlbum(context.params.slug)
      if (!album) {
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }

      return context.render(<AlbumDetailPage album={album} />)
    },
    albumDelete(context) {
      let deleted = deleteAlbum(context.params.slug)
      if (!deleted) {
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }

      return redirect(routes.albums.href(), 303)
    },
    apiAlbums() {
      return new Response(JSON.stringify({ albums: listAlbums() }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    },
  },
})
