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
    assert.match(html, /method="post"/)
    assert.match(html, /action="\/albums\/kind-of-blue\/edit"/)
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
      assert.match(html, new RegExp(`<(input|textarea)[^>]*id="${id}"`))
    }
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

interface RmxData {
  h?: Record<string, { exportName: string; moduleUrl: string; props: Record<string, unknown> }>
  f?: Record<string, { name?: string; src: string; status: string }>
}

// A streamed response may carry several rmx-data scripts, one per flush.
function rmxData(html: string): RmxData {
  let merged: RmxData = { h: {}, f: {} }

  for (let match of html.matchAll(/<script type="application\/json" id="rmx-data">(.*?)<\/script>/gs)) {
    let data = JSON.parse(match[1]!) as RmxData
    Object.assign(merged.h!, data.h)
    Object.assign(merged.f!, data.f)
  }

  return merged
}

function clientEntries(html: string) {
  return Object.values(rmxData(html).h ?? {})
}

describe('interactivity', () => {
  it('marks only the interactive parts of the albums page as client entries', async () => {
    let response = await router.fetch(request(routes.albums.index.href()))
    let entries = clientEntries(await response.text())
    let names = entries.map((entry) => entry.exportName).sort()

    assert.deepEqual(names, ['AlbumSearch', 'QueuePanel'])
  })

  it('passes route URLs and serializable data to the hydrated search', async () => {
    let response = await router.fetch(request(routes.albums.index.href()))
    let search = clientEntries(await response.text()).find(
      (entry) => entry.exportName === 'AlbumSearch',
    )

    assert.ok(search)
    assert.equal(search.props.searchHref, routes.apiAlbums.href())
    assert.match(search.moduleUrl, /album-search/)
  })

  it('renders the hydrated edit form as a working form without JavaScript', async () => {
    let response = await router.fetch(
      request(routes.albums.edit.index.href({ slug: 'kind-of-blue' })),
    )
    let html = await response.text()
    let entries = clientEntries(html)

    assert.deepEqual(
      entries.map((entry) => entry.exportName),
      ['AlbumEditForm'],
    )
    // Progressive enhancement: the server-rendered markup is a real form
    // pointing at the same action the enhanced submit handler fetches.
    assert.match(html, /<form method="post" action="\/albums\/kind-of-blue\/edit"/)
    assert.match(html, /name="title"/)
    assert.match(html, /<button type="submit"/)
    assert.equal(entries[0]?.props.actionHref, routes.albums.edit.action.href({ slug: 'kind-of-blue' }))
  })

  it('serves the client entry modules the browser will import', async () => {
    let response = await router.fetch(request(routes.albums.index.href()))
    let entries = clientEntries(await response.text())

    for (let entry of entries) {
      let module = await router.fetch(request(entry.moduleUrl))
      assert.equal(module.status, 200, `${entry.moduleUrl} should be servable`)
      assert.match(module.headers.get('content-type') ?? '', /javascript/)
    }
  })

  it('answers the enhanced form with JSON errors instead of an HTML page', async () => {
    let response = await router.fetch(
      request(routes.albums.edit.action.href({ slug: 'kind-of-blue' }), {
        method: 'POST',
        body: new URLSearchParams({
          title: '',
          artist: 'Miles Davis',
          year: 'not-a-year',
          genre: 'Modal jazz',
          notes: 'Validation check.',
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      }),
    )
    let payload = (await response.json()) as { errors: Record<string, string> }

    assert.equal(response.status, 400)
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
    assert.match(payload.errors.title ?? '', /required/)
    assert.match(payload.errors.year ?? '', /Year/)
  })

  it('still answers a plain browser submission with a re-rendered HTML page', async () => {
    let response = await router.fetch(
      request(routes.albums.edit.action.href({ slug: 'kind-of-blue' }), {
        method: 'POST',
        body: new URLSearchParams({
          title: '',
          artist: 'Miles Davis',
          year: '1959',
          genre: 'Modal jazz',
          notes: 'Validation check.',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )
    let html = await response.text()

    assert.equal(response.status, 400)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
    assert.match(html, /Title is required/)
  })

  it('filters the JSON route the search component fetches', async () => {
    let response = await router.fetch(request(`${routes.apiAlbums.href()}?query=blue`))
    let payload = (await response.json()) as {
      query: string
      albums: Array<{ title: string; href: string }>
    }

    assert.equal(response.status, 200)
    assert.equal(payload.query, 'blue')
    assert.equal(payload.albums.length, 1)
    assert.equal(payload.albums[0]?.title, 'Kind of Blue')
    assert.equal(payload.albums[0]?.href, routes.albums.show.href({ slug: 'kind-of-blue' }))
  })

  it('returns an empty result set instead of an error for an unknown query', async () => {
    let response = await router.fetch(request(`${routes.apiAlbums.href()}?query=zzzz`))
    let payload = (await response.json()) as { albums: unknown[] }

    assert.equal(response.status, 200)
    assert.equal(payload.albums.length, 0)
  })
})

describe('streaming ui with frames', () => {
  it('renders the recommendations region without the document shell', async () => {
    let response = await router.fetch(
      request(routes.albums.recommendations.href({ slug: 'kind-of-blue' })),
    )
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
    assert.match(html, /Because you opened Kind of Blue/)
    // The region belongs inside another page, so it must not carry the shell.
    assert.equal(html.includes('<html'), false)
    assert.equal(html.includes('aria-label="Primary"'), false)
  })

  it('renders the shelf stats region without the document shell', async () => {
    let response = await router.fetch(request(routes.stats.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
    // The region belongs inside another page, so it must not carry the shell.
    assert.equal(html.includes('<html'), false)
    assert.equal(html.includes('aria-label="Primary"'), false)
  })

  it('registers a named, pending shelf stats frame on the home page', async () => {
    let response = await router.fetch(request(routes.home.href()))
    let html = await response.text()
    let stats = Object.values(rmxData(html).f ?? {}).find((frame) => frame.name === 'shelf-stats')

    assert.ok(stats, 'expected a frame named shelf-stats')
    assert.equal(stats.src, routes.stats.href())
    // The fallback makes the frame non-blocking, so the marker starts pending.
    assert.equal(stats.status, 'pending')
  })

  it('counts albums, distinct genres and the newest year in the stats region', async () => {
    // Rock is already on the shelf, so this album adds to the count without
    // adding a genre.
    await router.fetch(
      request(routes.albums.create.href(), {
        method: 'POST',
        body: new URLSearchParams({
          title: 'Zuma',
          artist: 'Neil Young',
          year: '2012',
          genre: 'rock',
          notes: 'Repeats an existing genre in a different case.',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )

    let html = await (await router.fetch(request(routes.stats.href()))).text()
    let values = [...html.matchAll(/<dd[^>]*>([^<]+)<\/dd>/g)].map((match) => match[1])

    assert.deepEqual(values, ['4', '3', '2012'])
  })

  it('never recommends the album the region belongs to', async () => {
    let response = await router.fetch(
      request(routes.albums.recommendations.href({ slug: 'kind-of-blue' })),
    )
    let html = await response.text()

    assert.equal(html.includes(`href="${routes.albums.show.href({ slug: 'kind-of-blue' })}"`), false)
    assert.match(html, /href="\/albums\//)
  })

  it('returns a small 404 response for a missing album region', async () => {
    let response = await router.fetch(
      request(routes.albums.recommendations.href({ slug: 'missing-album' })),
    )

    assert.equal(response.status, 404)
    assert.equal(await response.text(), 'Album not found')
  })

  it('registers a named, pending frame on the album detail page', async () => {
    let response = await router.fetch(request(routes.albums.show.href({ slug: 'kind-of-blue' })))
    let html = await response.text()
    let frames = Object.values(rmxData(html).f ?? {})
    let recommendations = frames.find((frame) => frame.name === 'album-recommendations')

    assert.ok(recommendations, 'expected a frame named album-recommendations')
    assert.equal(recommendations.src, routes.albums.recommendations.href({ slug: 'kind-of-blue' }))
    // The fallback makes the frame non-blocking, so the marker starts pending.
    assert.equal(recommendations.status, 'pending')
  })

  it('streams the fallback first and the resolved region later in the same response', async () => {
    let response = await router.fetch(request(routes.albums.show.href({ slug: 'kind-of-blue' })))
    let html = await response.text()

    let fallbackAt = html.indexOf('Loading recommendations…')
    let regionAt = html.indexOf('Because you opened Kind of Blue')

    assert.ok(fallbackAt >= 0, 'expected the fallback in the initial HTML')
    assert.ok(regionAt > fallbackAt, 'expected the region to stream after the fallback')
    // Deferred frame content arrives as a template chunk, not in place.
    assert.match(html, /<template id="/)
  })

  it('targets the named frame from links inside the region', async () => {
    let response = await router.fetch(
      request(routes.albums.recommendations.href({ slug: 'kind-of-blue' })),
    )
    let html = await response.text()

    assert.match(html, /rmx-target="album-recommendations"/)
    assert.match(html, /rmx-src="\/albums\/[^"]+\/recommendations"/)
    // The public destination stays in href for runtimes that never start.
    assert.match(html, /href="\/albums\/(rumours|miseducation)"/)
  })

  it('hydrates the refresher island with the frame name it reloads', async () => {
    let response = await router.fetch(request(routes.albums.show.href({ slug: 'kind-of-blue' })))
    let entries = clientEntries(await response.text())
    let refresher = entries.find((entry) => entry.exportName === 'RecommendationsRefresher')

    assert.ok(refresher, 'expected the refresher client entry')
    assert.equal(refresher.props.frameName, 'album-recommendations')
    assert.match(refresher.moduleUrl, /recommendations-refresher/)
  })
})
