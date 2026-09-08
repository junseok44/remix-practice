import * as assert from 'remix/assert'
// `remix/test` registers suites for the `remix test` runner, which needs
// playwright. This app runs `node --test`, so the suite uses the node test
// runner directly and keeps `remix/assert` for assertions.
import { beforeEach, describe, it } from 'node:test'

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

  it('deletes an album through method override middleware', async () => {
    let response = await router.fetch(
      request(routes.albums.destroy.href({ slug: 'kind-of-blue' }), {
        method: 'POST',
        body: new URLSearchParams({ _method: 'DELETE' }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), routes.albums.index.href())

    let detail = await router.fetch(request(routes.albums.show.href({ slug: 'kind-of-blue' })))
    assert.equal(detail.status, 404)
  })

  it('adds a request id to context and response headers', async () => {
    let response = await router.fetch(
      request(routes.apiAlbums.href(), {
        headers: { 'X-Request-Id': 'test-request-123' },
      }),
    )
    let payload = (await response.json()) as { requestId: string }

    assert.equal(response.headers.get('X-Request-Id'), 'test-request-123')
    assert.equal(payload.requestId, 'test-request-123')
  })

  it('adds a response time header to HTML pages and JSON responses', async () => {
    let page = await router.fetch(request(routes.albums.index.href()))
    let json = await router.fetch(request(routes.apiAlbums.href()))

    assert.match(page.headers.get('X-Response-Time') ?? '', /^\d+ms$/)
    assert.match(json.headers.get('X-Response-Time') ?? '', /^\d+ms$/)
  })

  it('times static file responses too, because the timer sits above staticFiles()', async () => {
    let response = await router.fetch(request('/favicon.svg'))

    assert.equal(response.status, 200)
    assert.match(response.headers.get('X-Response-Time') ?? '', /^\d+ms$/)
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
