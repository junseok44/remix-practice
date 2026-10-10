import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { canManageAlbum, getAlbum, updateAlbum } from '../../../data/albums.ts'
import { readCover, removeCover, saveCover } from '../../../data/covers.ts'
import { validateEditAlbum } from '../../../data/validation.ts'
import { requireUser } from '../../../middleware/auth.ts'
import { flashNotice } from '../../../middleware/session.ts'
import { routes } from '../../../routes.ts'
import { ForbiddenPage, NotFoundPage } from '../../../ui/vinyl-shelf.tsx'
import { AlbumEditPage } from './page.tsx'

export default createController(routes.albums.edit, {
  // The albums controller's middleware does not reach this nested route map,
  // so the boundary is declared again here.
  middleware: [requireUser()],
  actions: {
    async index(context) {
      let album = await getAlbum(context.db, context.params.slug)
      if (!album) {
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }
      if (!canManageAlbum(album, context.auth.identity.id)) {
        return context.render(<ForbiddenPage slug={album.slug} />, { status: 403 })
      }

      return context.render(<AlbumEditPage album={album} />)
    },
    async action(context) {
      let actorId = context.auth.identity.id
      // The enhanced form asks for JSON so it can stay on the page. A plain
      // browser submission gets HTML for every one of these outcomes.
      let asJson = wantsJson(context.request)

      let album = await getAlbum(context.db, context.params.slug)
      if (!album) {
        if (asJson) return new Response('Album not found', { status: 404 })
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }
      // Ownership is checked before field errors and before any upload is
      // stored, so a stranger learns nothing and leaves no file behind.
      if (!canManageAlbum(album, actorId)) {
        if (asJson) return json({ error: 'forbidden' }, 403)
        return context.render(<ForbiddenPage slug={album.slug} />, { status: 403 })
      }

      let result = validateEditAlbum(context.formData)
      let cover = await readCover(context.formData.get('cover'))

      if (!result.ok || !cover.ok) {
        let errors = {
          ...(result.ok ? {} : result.errors),
          ...(cover.ok ? {} : { cover: cover.error }),
        }
        if (asJson) {
          return json({ errors, values: result.values }, 400)
        }

        return context.render(
          <AlbumEditPage album={album} errors={errors} values={result.values} />,
          { status: 400 },
        )
      }

      let newCoverKey = cover.file ? await saveCover(cover.file) : null
      let outcome = await updateAlbum(
        context.db,
        actorId,
        context.params.slug,
        result.revision,
        result.value,
        newCoverKey,
      )

      // Whichever file the database no longer points at goes: the new one if
      // the write was refused, the old one if it was replaced.
      await removeCover(outcome.ok ? outcome.replacedCoverKey : newCoverKey)

      if (!outcome.ok && outcome.reason === 'not-found') {
        if (asJson) return new Response('Album not found', { status: 404 })
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }

      if (!outcome.ok && outcome.reason === 'forbidden') {
        if (asJson) return json({ error: 'forbidden' }, 403)
        return context.render(<ForbiddenPage slug={context.params.slug} />, { status: 403 })
      }

      if (!outcome.ok) {
        // Someone else saved first. 409 says the request was well-formed but no
        // longer applies, so the form comes back with the newer revision and
        // the values this user typed.
        if (asJson) {
          return json({ conflict: true, revision: outcome.album.revision }, 409)
        }

        return context.render(
          <AlbumEditPage album={outcome.album} values={result.values} notice="conflict" />,
          { status: 409 },
        )
      }

      if (result.intent === 'save-and-continue') {
        if (asJson) {
          return json({ saved: true, revision: outcome.album.revision }, 200)
        }

        return context.render(<AlbumEditPage album={outcome.album} notice="saved" />)
      }

      flashNotice(context.session, `Saved ${outcome.album.title}.`)
      return redirect(routes.albums.show.href({ slug: outcome.album.slug }), 303)
    },
  },
})

function wantsJson(request: Request) {
  return request.headers.get('Accept')?.includes('application/json') ?? false
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
