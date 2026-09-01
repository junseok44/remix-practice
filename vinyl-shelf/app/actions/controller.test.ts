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
    let response = await router.fetch(request(routes.albums.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Kind of Blue/)
    assert.match(html, /method="post"/)
    assert.match(html, /Add album/)
  })

  it('creates an album from form data and redirects to the album detail route', async () => {
    let response = await router.fetch(
      request(routes.albumsAction.href(), {
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
    assert.equal(response.headers.get('location'), routes.album.href({ slug: 'discovery' }))

    let detail = await router.fetch(request(routes.album.href({ slug: 'discovery' })))
    assert.equal(detail.status, 200)
    assert.match(await detail.text(), /Daft Punk/)
  })

  it('renders album details from a route param', async () => {
    let response = await router.fetch(request(routes.album.href({ slug: 'kind-of-blue' })))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Miles Davis/)
    assert.match(html, /Route params/)
  })

  it('returns a 404 response for a missing album', async () => {
    let response = await router.fetch(request(routes.album.href({ slug: 'missing-album' })))
    let html = await response.text()

    assert.equal(response.status, 404)
    assert.match(html, /Album not found/)
  })

  it('deletes an album and redirects to the album list', async () => {
    let response = await router.fetch(
      request(routes.albumDelete.href({ slug: 'kind-of-blue' }), { method: 'POST' }),
    )

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), routes.albums.href())

    let detail = await router.fetch(request(routes.album.href({ slug: 'kind-of-blue' })))
    assert.equal(detail.status, 404)
  })

  it('returns a 404 response when deleting a missing album', async () => {
    let response = await router.fetch(
      request(routes.albumDelete.href({ slug: 'missing-album' }), { method: 'POST' }),
    )

    assert.equal(response.status, 404)
    assert.match(await response.text(), /Album not found/)
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
