import { createController } from 'remix/router'
import { redirect } from 'remix/response/redirect'

import { getAlbum, updateAlbum } from '../../../data/albums.ts'
import { validateCreateAlbum } from '../../../data/validation.ts'
import { routes } from '../../../routes.ts'
import { NotFoundPage } from '../../../ui/vinyl-shelf.tsx'
import { wantsJson } from '../../wants-json.ts'
import { AlbumEditPage } from './page.tsx'

export default createController(routes.albums.edit, {
  actions: {
    index(context) {
      let album = getAlbum(context.params.slug)
      if (!album) {
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }

      return context.render(<AlbumEditPage album={album} />)
    },
    action(context) {
      let result = validateCreateAlbum(context.formData)

      if (!result.ok) {
        // The enhanced form asks for JSON so it can show inline errors without
        // replacing the page. A plain browser submission still gets HTML.
        if (wantsJson(context.request)) {
          return new Response(JSON.stringify({ errors: result.errors, values: result.values }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          })
        }

        let album = getAlbum(context.params.slug)
        if (!album) {
          return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
        }

        return context.render(<AlbumEditPage album={album} errors={result.errors} values={result.values} />, {
          status: 400,
        })
      }

      let album = updateAlbum(context.params.slug, result.value)
      if (!album) {
        return context.render(<NotFoundPage slug={context.params.slug} />, { status: 404 })
      }

      return redirect(routes.albums.show.href({ slug: album.slug }), 303)
    },
  },
})
