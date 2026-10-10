import { del, form, get, post, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  albums: {
    index: get('/albums'),
    create: post('/albums'),
    show: get('/albums/:slug'),
    recommendations: get('/albums/:slug/recommendations'),
    cover: get('/albums/:slug/cover'),
    destroy: del('/albums/:slug'),
    edit: form('/albums/:slug/edit'),
  },
  login: form('/login'),
  logout: post('/logout'),
  feed: get('/feed'),
  apiAlbums: get('/api/albums'),
})
