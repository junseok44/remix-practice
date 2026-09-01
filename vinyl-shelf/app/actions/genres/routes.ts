import { get, route } from 'remix/routes'

// This route area only knows its own relative patterns. The app decides where
// the group is mounted (see app/routes.ts).
export const genreRoutes = route({
  index: get('/'),
  show: get('/:genre'),
})
