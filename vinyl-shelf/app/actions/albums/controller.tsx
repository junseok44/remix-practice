import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { createAlbum, deleteAlbum, getAlbum, getRecommendations, listAlbums } from '../../data/albums.ts'
import { validateCreateAlbum, validateDeleteAlbum } from '../../data/validation.ts'
import { routes } from '../../routes.ts'
import { AlbumDetailPage, AlbumsPage, NotFoundPage } from '../../ui/vinyl-shelf.tsx'
import { AlbumRecommendations } from './recommendations.tsx'

export default createController(routes.albums, {
  actions: {
    async index(context) {
      return context.render(<AlbumsPage albums={await listAlbums(context.db)} />)
    },
    async create(context) {
      let result = validateCreateAlbum(context.formData)

      if (!result.ok) {
        return context.render(
          <AlbumsPage albums={await listAlbums(context.db)} errors={result.errors} values={result.values} />,
          { status: 400 },
        )
      }

      let album = await createAlbum(context.db, result.value)
      return redirect(routes.albums.show.href({ slug: album.slug }), 303)
    },
    async show(context) {
      let album = await getAlbum(context.db, context.params.slug)
      if (!album) {
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }

      return context.render(<AlbumDetailPage album={album} />)
    },
    async recommendations(context) {
      let album = await getAlbum(context.db, context.params.slug)
      if (!album) {
        // The region response stays small: the frame resolver turns it into
        // bounded HTML instead of replacing the surrounding page.
        return new Response('Album not found', { status: 404 })
      }

      return context.render(
        <AlbumRecommendations
          album={album}
          recommendations={await getRecommendations(context.db, album)}
        />,
      )
    },
    async destroy(context) {
      let { intent, revision } = validateDeleteAlbum(context.formData)
      let outcome = await deleteAlbum(
        context.db,
        context.params.slug,
        intent === 'delete-anyway' ? null : revision,
      )

      if (!outcome.ok && outcome.reason === 'not-found') {
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }

      if (!outcome.ok) {
        // The detail page comes back as it stands now, so what changed is the
        // page itself; the notice says how many saves landed in between.
        return context.render(
          <AlbumDetailPage album={outcome.album} deleteConflict={{ seenRevision: revision }} />,
          { status: 409 },
        )
      }

      return redirect(routes.albums.index.href(), 303)
    },
  },
})
