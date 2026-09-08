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

async function createAlbum(title: string, year: number) {
  let response = await router.fetch(
    request(routes.albums.create.href(), {
      method: 'POST',
      body: new URLSearchParams({
        title,
        artist: 'Neil Young',
        year: String(year),
        genre: 'Rock',
        notes: 'Added by a test to break the seeded ordering.',
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  )
  assert.equal(response.status, 303)
}

/** The album titles in the order `/albums` renders them, which is the only
 * place the sort is observable without browser JavaScript. */
async function albumTitles(query?: string) {
  let path = routes.albums.index.href() + (query ? `?${query}` : '')
  let html = await (await router.fetch(request(path))).text()
  return [...html.matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) => match[1])
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

  it('returns albums as JSON from a resource-style route', async () => {
    let response = await router.fetch(request(routes.apiAlbums.href()))
    let payload = (await response.json()) as { albums: Array<{ title: string }> }

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
    assert.equal(payload.albums.length, 3)
    assert.equal(payload.albums[0]?.title, 'Kind of Blue')
  })
})

describe('rendering ui', () => {
  it('renders a complete document shell with head content and component styles', async () => {
    let response = await router.fetch(request(routes.home.href()))
    let html = await response.text()

    assert.match(html, /^<!DOCTYPE html>/)
    assert.equal(response.headers.get('content-type'), 'text/html; charset=UTF-8')
    assert.match(html, /<title>Vinyl Shelf \| Start Here<\/title>/)
    assert.match(html, /<meta name="description" content="A Remix 3 practice app/)
    assert.match(html, /<link rel="stylesheet" href="\/app\.css" \/>/)
    // The server-rendered page carries its component styles without waiting
    // for browser JavaScript.
    assert.match(html, /<style data-rmx="rmxc-/)
  })

  it('serves the app stylesheet with the cascade layer order', async () => {
    let response = await router.fetch(request('/app.css'))
    let css = await response.text()

    assert.equal(response.status, 200)
    assert.match(css, /@layer base, rmx, app;/)
    assert.match(css, /--shelf-accent/)
  })

  it('reads the shell context from a nested navigation component', async () => {
    let response = await router.fetch(request(routes.albums.index.href()))
    let html = await response.text()

    assert.match(html, /aria-current="page"[^>]*>\s*Albums/)
    assert.match(html, /3 albums/)
  })

  it('connects each field label to its input through handle.id', async () => {
    let response = await router.fetch(request(routes.albums.index.href()))
    let html = await response.text()
    let labelIds = [...html.matchAll(/<label for="([^"]+)"/g)].map((match) => match[1])

    assert.ok(labelIds.length >= 5)
    for (let id of labelIds) {
      assert.match(html, new RegExp(`id="${id}"[^>]*name="`))
    }
  })

  it('offers sorting through a GET form with a native select', async () => {
    let response = await router.fetch(request(routes.albums.index.href()))
    let html = await response.text()

    assert.match(html, /<form method="get" action="\/albums"/)
    assert.match(html, /<select id="[^"]+" name="sort"/)
    assert.match(html, /<option value="year"/)
  })

  it('sorts the album list by year, then by title, from the sort query', async () => {
    // The seeds are already in year order, so an extra album is needed before
    // any of the three orderings can be told apart.
    await createAlbum('Zuma', 1975)

    assert.deepEqual(await albumTitles('sort=year'), [
      'Kind of Blue',
      'Zuma',
      'Rumours',
      'The Miseducation of Lauryn Hill',
    ])
    assert.deepEqual(await albumTitles('sort=title'), [
      'Kind of Blue',
      'Rumours',
      'The Miseducation of Lauryn Hill',
      'Zuma',
    ])
  })

  it('falls back to the default order without a sort query or on an unknown one', async () => {
    await createAlbum('Zuma', 1975)

    let recentFirst = ['Zuma', 'Kind of Blue', 'Rumours', 'The Miseducation of Lauryn Hill']
    assert.deepEqual(await albumTitles(), recentFirst)
    assert.deepEqual(await albumTitles('sort=bogus'), recentFirst)
  })

  it('marks the applied sort as selected so the control does not reset', async () => {
    let response = await router.fetch(request(`${routes.albums.index.href()}?sort=year`))
    let html = await response.text()

    assert.match(html, /<option value="year"[^>]*\sselected/)
    assert.equal(/<option value="title"[^>]*\sselected/.test(html), false)
  })

  it('renders a page-level 404 through context.render with a status', async () => {
    let response = await router.fetch(request(routes.albums.show.href({ slug: 'nope' })))

    assert.equal(response.status, 404)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
  })

  it('renders an HTML feed without the component runtime', async () => {
    let response = await router.fetch(request(routes.feed.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
    assert.match(html, /^<!DOCTYPE html>/)
    assert.match(html, /<a href="\/albums\/kind-of-blue">Kind of Blue<\/a>/)
    // No component runtime means no generated component styles or client data.
    assert.equal(/<style data-rmx=/.test(html), false)
  })

  it('escapes interpolated values in the html template feed', async () => {
    let response = await router.fetch(
      request(routes.albums.create.href(), {
        method: 'POST',
        body: new URLSearchParams({
          title: '<script>alert(1)</script>',
          artist: 'Test',
          year: '2020',
          genre: 'Test',
          notes: 'Escaping check.',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )
    assert.equal(response.status, 303)

    let feed = await router.fetch(request(routes.feed.href()))
    let html = await feed.text()

    assert.equal(html.includes('<script>alert(1)</script>'), false)
    assert.match(html, /&lt;script&gt;/)
  })
})
