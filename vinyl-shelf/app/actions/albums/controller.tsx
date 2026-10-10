import { createController } from 'remix/router'
import { createFileResponse } from 'remix/response/file'
import { redirect } from 'remix/response/redirect'

import {
  canManageAlbum,
  createAlbum,
  deleteAlbum,
  getAlbum,
  getRecommendations,
  listAlbums,
} from '../../data/albums.ts'
import { coverExtension, getCover, readCover, removeCover, saveCover } from '../../data/covers.ts'
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
        let cover = await readCover(context.formData.get('cover'))

        if (!result.ok || !cover.ok) {
          return context.render(
            <AlbumsPage
              albums={await listAlbums(context.db)}
              errors={{
                ...(result.ok ? {} : result.errors),
                ...(cover.ok ? {} : { cover: cover.error }),
              }}
              values={result.values}
            />,
            { status: 400 },
          )
        }

        // Stored only after every check passed, so a rejected form leaves no file behind.
        let coverKey = cover.file ? await saveCover(cover.file) : null
        let album
        try {
          album = await createAlbum(context.db, user.id, result.value, coverKey)
        } catch (error) {
          await removeCover(coverKey)
          throw error
        }

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
    async cover(context) {
      let album = await getAlbum(context.db, context.params.slug)
      let file = album?.cover_key ? await getCover(album.cover_key) : null
      if (!album || !file) return new Response('No cover', { status: 404 })

      // no-cache + the default weak ETag: the browser keeps the image but asks
      // each time, and gets a 304 until the cover is replaced.
      let response = await createFileResponse(file, context.request, { cacheControl: 'no-cache' })
      // The type was sniffed on upload; this stops the browser guessing another.
      response.headers.set('X-Content-Type-Options', 'nosniff')

      if (context.url.searchParams.has('download')) {
        // A name built from the slug, never the uploaded filename.
        let filename = `${album.slug}-cover.${coverExtension(file.type)}`
        response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
      }

      return response
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

        // After the row is gone: a failed removal leaves an orphan file, never
        // an album pointing at a missing one.
        await removeCover(outcome.coverKey)
        flashNotice(context.session, 'Album deleted.')
        return redirect(routes.albums.index.href(), 303)
      },
    },
  },
})
