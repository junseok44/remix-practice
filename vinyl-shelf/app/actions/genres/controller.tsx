import { createController } from 'remix/router'

import { listAlbums, listGenres } from '../../data/albums.ts'
import { routes } from '../../routes.ts'
import { GenreListPage, GenreNotFoundPage, GenrePage } from './page.tsx'

export default createController(routes.genres, {
  actions: {
    index(context) {
      return context.render(<GenreListPage genres={listGenres()} />)
    },
    show(context) {
      let genre = context.params.genre
      let albums = listAlbums().filter((album) => album.genre === genre)

      if (albums.length === 0) {
        return context.render(<GenreNotFoundPage genre={genre} />, { status: 404 })
      }

      return context.render(<GenrePage genre={genre} albums={albums} />)
    },
  },
})
