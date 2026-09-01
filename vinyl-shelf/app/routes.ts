import { form, get, post, route } from 'remix/routes'

import { genreRoutes } from './actions/genres/routes.ts'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  albums: {
    index: get('/albums'),
    create: post('/albums'),
    show: get('/albums/:slug'),
    edit: form('/albums/:slug/edit'),
  },
  genres: route('/genres', genreRoutes),
  apiAlbums: get('/api/albums'),
})
