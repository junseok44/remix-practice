import * as assert from 'remix/assert'
import { beforeEach, describe, it } from 'remix/test'

import { resetAlbumsForTest } from '../data/albums.ts'
import { router } from '../router.ts'
import { routes } from '../routes.ts'

function request(path: string, init?: RequestInit) {
  return new Request(`http://local.test${path}`, init)
}

beforeEach(() => {
  resetAlbumsForTest()
})

describe('start here practice routes', () => {
  it('renders the Vinyl Shelf dashboard with chapter checkpoints', async () => {
    let response = await router.fetch(request(routes.home.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Vinyl Shelf/)
    assert.match(html, /Start Here/)
    assert.match(html, /Request/)
    assert.match(html, /Controller/)
  })

  it('renders albums with the seeded collection and native form', async () => {
    let response = await router.fetch(request(routes.albums.index.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Kind of Blue/)
    assert.match(html, /method="post"/)
    assert.match(html, /Add album/)
  })

  it('creates an album from form data and redirects to the album detail route', async () => {
    let response = await router.fetch(
      request(routes.albums.create.href(), {
        method: 'POST',
        body: new URLSearchParams({
          title: 'Discovery',
          artist: 'Daft Punk',
          year: '2001',
          genre: 'French house',
          notes: 'Practice a native form action and redirect.',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), routes.albums.show.href({ slug: 'discovery' }))

    let detail = await router.fetch(request(routes.albums.show.href({ slug: 'discovery' })))
    assert.equal(detail.status, 200)
    assert.match(await detail.text(), /Daft Punk/)
  })

  it('renders album details from a route param', async () => {
    let response = await router.fetch(request(routes.albums.show.href({ slug: 'kind-of-blue' })))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Miles Davis/)
    assert.match(html, /Route params/)
  })

  it('returns a 404 response for a missing album', async () => {
    let response = await router.fetch(request(routes.albums.show.href({ slug: 'missing-album' })))
    let html = await response.text()

    assert.equal(response.status, 404)
    assert.match(html, /Album not found/)
  })

  it('renders a route-owned edit form from a nested route map', async () => {
    let response = await router.fetch(request(routes.albums.edit.index.href({ slug: 'kind-of-blue' })))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Edit album/)
    assert.match(html, /Kind of Blue/)
    assert.match(html, /Routing and Controllers/)
    assert.match(html, /method="post"/)
  })

  it('updates an album through the nested edit action and redirects to show', async () => {
    let response = await router.fetch(
      request(routes.albums.edit.action.href({ slug: 'kind-of-blue' }), {
        method: 'POST',
        body: new URLSearchParams({
          title: 'Kind of Blue',
          artist: 'Miles Davis',
          year: '1959',
          genre: 'Modal jazz',
          notes: 'Updated through a nested controller action.',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), routes.albums.show.href({ slug: 'kind-of-blue' }))

    let detail = await router.fetch(request(routes.albums.show.href({ slug: 'kind-of-blue' })))
    assert.match(await detail.text(), /Updated through a nested controller action/)
  })

  it('lists genres from the composed route area', async () => {
    let response = await router.fetch(request(routes.genres.index.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Genres/)
    assert.match(html, /Modal jazz/)
    assert.match(html, /Rock/)
  })

  it('lists albums that belong to a genre', async () => {
    let response = await router.fetch(request(routes.genres.show.href({ genre: 'Modal jazz' })))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Kind of Blue/)
  })

  it('returns a 404 response for a genre no album belongs to', async () => {
    let response = await router.fetch(request(routes.genres.show.href({ genre: 'Vaporwave' })))
    let html = await response.text()

    assert.equal(response.status, 404)
    assert.match(html, /Genre not found/)
  })

  it('returns albums as JSON from a resource-style route', async () => {
    let response = await router.fetch(request(routes.apiAlbums.href()))
    let payload = (await response.json()) as { albums: Array<{ title: string }> }

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
    assert.equal(payload.albums.length, 3)
    assert.equal(payload.albums[0]?.title, 'Kind of Blue')
  })
})
