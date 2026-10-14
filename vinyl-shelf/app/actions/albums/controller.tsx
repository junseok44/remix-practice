import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import {
  canManageAlbum,
  createAlbum,
  deleteAlbum,
  getAlbum,
  getRecommendations,
  listAlbums,
  transferAlbum,
} from '../../data/albums.ts'
import { validateCreateAlbum } from '../../data/validation.ts'
import { requireUser } from '../../middleware/auth.ts'
import { flashNotice, takeNotice } from '../../middleware/session.ts'
import { routes } from '../../routes.ts'
import { AlbumDetailPage, AlbumsPage, ForbiddenPage, NotFoundPage } from '../../ui/vinyl-shelf.tsx'
import { AlbumRecommendations } from './recommendations.tsx'

export default createController(routes.albums, {
  actions: {
    async index(context) {
      return context.render(
        <AlbumsPage albums={await listAlbums(context.db)} notice={takeNotice(context.session)} />,
      )
    },
    create: {
      middleware: [requireUser()],
      async handler(context) {
        // requireUser() already answered anonymous requests; this narrows the type,
        // which beta.5 does not carry through action middleware inside a controller.
        if (!context.auth.ok) return new Response('Unauthorized', { status: 401 })
        let user = context.auth.identity
        let result = validateCreateAlbum(context.formData)

        if (!result.ok) {
          return context.render(
            <AlbumsPage
              albums={await listAlbums(context.db)}
              errors={result.errors}
              values={result.values}
            />,
            { status: 400 },
          )
        }

        let album = await createAlbum(context.db, user.id, result.value)
        flashNotice(context.session, `Added ${album.title}.`)
        return redirect(routes.albums.show.href({ slug: album.slug }), 303)
      },
    },
    async show(context) {
      let album = await getAlbum(context.db, context.params.slug)
      if (!album) {
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }

      let user = context.auth.ok ? context.auth.identity : null
      return context.render(
        <AlbumDetailPage
          album={album}
          canManage={user ? canManageAlbum(album, user.id) : false}
          notice={takeNotice(context.session)}
        />,
      )
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
    destroy: {
      middleware: [requireUser()],
      async handler(context) {
        if (!context.auth.ok) return new Response('Unauthorized', { status: 401 })
        let outcome = await deleteAlbum(context.db, context.auth.identity.id, context.params.slug)

        if (!outcome.ok && outcome.reason === 'not-found') {
          return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
        }
        if (!outcome.ok) {
          return context.render(<ForbiddenPage slug={context.params.slug} />, { status: 403 })
        }

        flashNotice(context.session, 'Album deleted.')
        return redirect(routes.albums.index.href(), 303)
      },
    },
    transfer: {
      middleware: [requireUser()],
      async handler(context) {
        if (!context.auth.ok) return new Response('Unauthorized', { status: 401 })
        let field = context.formData.get('email')
        let email = typeof field === 'string' ? field.trim() : ''
        let outcome = await transferAlbum(
          context.db,
          context.auth.identity.id,
          context.params.slug,
          email,
        )

        if (outcome.ok) {
          flashNotice(context.session, `Transferred ${outcome.album.title} to ${outcome.recipient.name}.`)
          return redirect(routes.albums.show.href({ slug: outcome.album.slug }), 303)
        }

        if (outcome.reason === 'not-found') {
          return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
        }
        if (outcome.reason === 'forbidden') {
          return context.render(<ForbiddenPage slug={context.params.slug} />, { status: 403 })
        }

        let album = await getAlbum(context.db, context.params.slug)
        if (!album) {
          return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
        }

        return context.render(
          <AlbumDetailPage
            album={album}
            canManage
            transfer={{
              email,
              error:
                outcome.reason === 'already-owner'
                  ? 'You already own this album.'
                  : 'No account uses that email.',
            }}
          />,
          { status: 400 },
        )
      },
    },
  },
})
