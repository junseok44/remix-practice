import { createRouter, type RouterContext } from 'remix/router'
import { cop } from 'remix/middleware/cop'
import { csrf } from 'remix/middleware/csrf'
import { methodOverride } from 'remix/middleware/method-override'
import { staticFiles } from 'remix/middleware/static'

import albumsController from './actions/albums/controller.tsx'
import albumsEditController from './actions/albums/edit/controller.tsx'
import controller from './actions/controller.tsx'
import loginController from './actions/login/controller.tsx'
import { loadAuth } from './middleware/auth.ts'
import { loadDatabase } from './middleware/database.ts'
import { parseForms } from './middleware/form-data.ts'
import { requestId } from './middleware/request-id.ts'
import { render } from './middleware/render.tsx'
import { loadSession } from './middleware/session.ts'
import { routes } from './routes.ts'

export const router = createRouter({
  middleware: [
    staticFiles('./public', { index: false }),
    requestId(),
    // Rejects cross-site browser POSTs before any session is read or body parsed.
    cop(),
    loadSession(),
    parseForms(),
    methodOverride(),
    // After formData so the `_csrf` field is readable, and after the session
    // that stores the expected token.
    csrf(),
    loadDatabase(),
    loadAuth(),
    render(),
  ],
})

type AppContext = RouterContext<typeof router>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}

router.map(routes, controller)
router.map(routes.login, loginController)
router.map(routes.albums, albumsController)
router.map(routes.albums.edit, albumsEditController)
