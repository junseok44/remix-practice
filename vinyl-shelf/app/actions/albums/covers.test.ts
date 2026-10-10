import * as assert from 'remix/assert'
import { before, beforeEach, describe, it } from 'node:test'

import { Browser } from '../../../test/browser.ts'
import { coverPlaceholderHref } from '../../assets.ts'
import { resetAlbumsForTest } from '../../data/albums.ts'
import { clearCoversForTest, coverStorage, maxCoverSize } from '../../data/covers.ts'
import { db } from '../../data/database.ts'
import { albums } from '../../data/schema.ts'
import { router } from '../../router.ts'
import { routes } from '../../routes.ts'

// Only the leading bytes matter to the sniffer; the rest is filler.
const pngBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]
const jpegBytes = [0xff, 0xd8, 0xff, 0xe0, 5, 6, 7, 8]

function png(name = 'cover.png') {
  return new File([new Uint8Array(pngBytes)], name, { type: 'image/png' })
}

const newAlbum = {
  title: 'Blue Train',
  artist: 'John Coltrane',
  year: '1958',
  genre: 'Hard bop',
  notes: 'Uploaded with a cover.',
}

const kindOfBlue = { slug: 'kind-of-blue' }

const editFields = {
  title: 'Kind of Blue',
  artist: 'Miles Davis',
  year: '1959',
  genre: 'Modal jazz',
  notes: 'Now with a cover.',
}

async function storedCoverKeys() {
  let { files } = await coverStorage.list({ prefix: 'covers/' })
  return files.map((file) => file.key)
}

async function editWithCover(browser: Browser, cover: File) {
  let row = await db.findOne(albums, { where: kindOfBlue })
  return browser.upload(routes.albums.edit.action.href(kindOfBlue), {
    ...editFields,
    revision: String(row?.revision),
    cover,
  })
}

let owner: Browser

before(async () => {
  owner = await Browser.signedIn()
})

beforeEach(async () => {
  await resetAlbumsForTest(db)
  await clearCoversForTest()
})

describe('files: uploading covers', () => {
  it('renders the add form as multipart with a cover field', async () => {
    let html = await (await owner.fetch(routes.albums.index.href())).text()

    assert.match(html, /enctype="multipart\/form-data"/)
    assert.match(html, /type="file" name="cover" accept="image\/png,image\/jpeg,image\/webp"/)
  })

  it('stores an uploaded cover under a key the app chose', async () => {
    let response = await owner.upload(routes.albums.create.href(), {
      ...newAlbum,
      cover: png('../../etc/passwd.png'),
    })
    assert.equal(response.status, 303)

    let row = await db.findOne(albums, { where: { slug: 'blue-train' } })
    assert.match(row?.cover_key ?? '', /^covers\/[0-9a-f-]{36}$/)

    // The original name survives only as metadata on the stored file.
    let stored = await coverStorage.get(row!.cover_key!)
    assert.equal(stored?.name, '../../etc/passwd.png')
    assert.equal(stored?.type, 'image/png')
  })

  it('creates an album without a cover when the file input is left empty', async () => {
    let response = await owner.upload(routes.albums.create.href(), {
      ...newAlbum,
      cover: new File([], '', { type: 'application/octet-stream' }),
    })

    assert.equal(response.status, 303)
    let row = await db.findOne(albums, { where: { slug: 'blue-train' } })
    assert.equal(row?.cover_key, null)
    assert.deepEqual(await storedCoverKeys(), [])
  })

  it('judges the type by the bytes, not the name or the declared type', async () => {
    let disguised = new File(['<svg onload="alert(1)"/>'], 'cover.png', { type: 'image/png' })
    let response = await owner.upload(routes.albums.create.href(), { ...newAlbum, cover: disguised })
    let html = await response.text()

    assert.equal(response.status, 400)
    assert.match(html, /Cover must be a PNG, JPEG, or WebP image/)
    // The text the user typed comes back; the file input cannot be refilled.
    assert.match(html, /value="Blue Train"/)
    assert.equal(await db.count(albums), 3)
    assert.deepEqual(await storedCoverKeys(), [])
  })

  it('stores nothing when the text fields fail validation', async () => {
    let response = await owner.upload(routes.albums.create.href(), {
      ...newAlbum,
      title: '',
      cover: png(),
    })

    assert.equal(response.status, 400)
    assert.deepEqual(await storedCoverKeys(), [])
  })

  it('answers an oversized upload with 413 before the action runs', async () => {
    let huge = new File([new Uint8Array(maxCoverSize + 1)], 'huge.png', { type: 'image/png' })
    let response = await owner.upload(routes.albums.create.href(), { ...newAlbum, cover: huge })

    assert.equal(response.status, 413)
    assert.equal(await db.count(albums), 3)
  })

  it('answers more than one file with 413', async () => {
    let response = await owner.upload(routes.albums.create.href(), {
      ...newAlbum,
      cover: [png('a.png'), png('b.png')],
    })

    assert.equal(response.status, 413)
  })

  it('gives the enhanced form the limit as JSON', async () => {
    let huge = new File([new Uint8Array(maxCoverSize + 1)], 'huge.png', { type: 'image/png' })
    let response = await owner.upload(
      routes.albums.create.href(),
      { ...newAlbum, cover: huge },
      { Accept: 'application/json' },
    )

    assert.equal(response.status, 413)
    assert.match(((await response.json()) as { error: string }).error, /2 MB/)
  })

  it('replaces a cover on edit and removes the old file', async () => {
    assert.equal((await editWithCover(owner, png())).status, 303)
    let [firstKey] = await storedCoverKeys()

    let jpeg = new File([new Uint8Array(jpegBytes)], 'new.jpg', { type: 'image/jpeg' })
    assert.equal((await editWithCover(owner, jpeg)).status, 303)

    let row = await db.findOne(albums, { where: kindOfBlue })
    assert.notEqual(row?.cover_key, firstKey)
    assert.deepEqual(await storedCoverKeys(), [row?.cover_key])
  })

  it('keeps the current cover when an edit sends no new file', async () => {
    await editWithCover(owner, png())
    let before = await db.findOne(albums, { where: kindOfBlue })

    await editWithCover(owner, new File([], '', { type: 'application/octet-stream' }))

    let after = await db.findOne(albums, { where: kindOfBlue })
    assert.equal(after?.cover_key, before?.cover_key)
    assert.equal(after?.revision, (before?.revision ?? 0) + 1)
  })

  it('stores nothing for a non-owner who uploads a cover', async () => {
    let guest = await Browser.signedIn('guest@vinyl.test')
    let response = await editWithCover(guest, png())

    assert.equal(response.status, 403)
    assert.deepEqual(await storedCoverKeys(), [])
  })

  it('discards the new file when the edit loses a revision conflict', async () => {
    let response = await owner.upload(routes.albums.edit.action.href(kindOfBlue), {
      ...editFields,
      revision: '99',
      cover: png(),
    })

    assert.equal(response.status, 409)
    assert.deepEqual(await storedCoverKeys(), [])
  })

  it('removes the cover file with the album', async () => {
    await editWithCover(owner, png())
    assert.equal((await storedCoverKeys()).length, 1)

    let response = await owner.submit(routes.albums.destroy.href(kindOfBlue), { _method: 'DELETE' })

    assert.equal(response.status, 303)
    assert.deepEqual(await storedCoverKeys(), [])
  })
})

describe('files: serving covers', () => {
  it('serves the stored cover with its sniffed type and no sniffing by the browser', async () => {
    await editWithCover(owner, png())
    let response = await router.fetch(
      new Request(`http://local.test${routes.albums.cover.href(kindOfBlue)}`),
    )

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'image/png')
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff')
    assert.equal(response.headers.get('Cache-Control'), 'no-cache')
    assert.equal(response.headers.get('Content-Length'), String(pngBytes.length))
    assert.equal(response.headers.get('Content-Disposition'), null)
  })

  it('answers a repeat request with 304 while the cover is unchanged', async () => {
    await editWithCover(owner, png())
    let url = `http://local.test${routes.albums.cover.href(kindOfBlue)}`
    let first = await router.fetch(new Request(url))
    let etag = first.headers.get('ETag')
    assert.ok(etag)

    let second = await router.fetch(new Request(url, { headers: { 'If-None-Match': etag } }))
    assert.equal(second.status, 304)
  })

  it('offers a download named after the album, not the upload', async () => {
    await editWithCover(owner, png('my holiday "photo".png'))
    let response = await router.fetch(
      new Request(`http://local.test${routes.albums.cover.href(kindOfBlue, { download: '' })}`),
    )

    assert.equal(
      response.headers.get('Content-Disposition'),
      'attachment; filename="kind-of-blue-cover.png"',
    )
  })

  it('returns 404 for an album without a cover', async () => {
    let response = await router.fetch(
      new Request(`http://local.test${routes.albums.cover.href(kindOfBlue)}`),
    )
    assert.equal(response.status, 404)
  })

  it('shows the placeholder asset until a cover is uploaded', async () => {
    let before = await (await owner.fetch(routes.albums.show.href(kindOfBlue))).text()
    assert.ok(before.includes(`src="${coverPlaceholderHref}"`))
    assert.equal(before.includes('Download cover'), false)

    await editWithCover(owner, png())
    let after = await (await owner.fetch(routes.albums.show.href(kindOfBlue))).text()
    assert.ok(after.includes(`src="${routes.albums.cover.href(kindOfBlue)}"`))
    assert.match(after, /Download cover/)
  })
})

describe('files: asset server boundary', () => {
  it('serves the placeholder SVG as a file asset', async () => {
    let response = await router.fetch(new Request(`http://local.test${coverPlaceholderHref}`))

    assert.equal(response.status, 200)
    assert.match(response.headers.get('Content-Type') ?? '', /^image\/svg\+xml/)
  })

  it('refuses source files outside the allowed directories', async () => {
    let response = await router.fetch(
      new Request(`http://local.test${routes.assets.href({ path: 'app/data/users.ts' })}`),
    )
    assert.equal(response.status, 404)
  })
})
