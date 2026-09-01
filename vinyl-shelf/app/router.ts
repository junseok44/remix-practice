import { createRouter, type MiddlewareContext } from 'remix/router'
import { staticFiles } from 'remix/middleware/static'

import albumsController from './actions/albums/controller.tsx'
import albumsEditController from './actions/albums/edit/controller.tsx'
import controller from './actions/controller.tsx'
import genresController from './actions/genres/controller.tsx'
import { render } from './middleware/render.tsx'
import { routes } from './routes.ts'

type AppContext = MiddlewareContext<[ReturnType<typeof render>]>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}

export const router = createRouter<AppContext>({
  middleware: [staticFiles('./public', { index: false }), render()],
})

router.map(routes, controller)
router.map(routes.albums, albumsController)
router.map(routes.albums.edit, albumsEditController)
router.map(routes.genres, genresController)
