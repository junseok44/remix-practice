# Files and Assets

원문: [Files and Assets | Remix Docs](https://guides.remix.run/files-and-assets/) ·
전문 번역: [`original-translation.ko.md`](./original-translation.ko.md)

이 문서 하나로 챕터의 개념을 익히고, `vinyl-shelf` 프로젝트 코드로 실습한다. 각 절은 먼저
개념을 설명하고, **vinyl-shelf에서는** 단락에서 이 프로젝트의 실제 코드와 연결한다. 개념
설명에 붙은 코드 블록은 API의 모양만 보여주는 것이고, **vinyl-shelf에서는** 쪽 블록은 위에
적은 경로의 실제 파일 내용이다.

이 문서의 코드와 파일 경로는 `curriculum 11: Files and Assets` 커밋 시점 기준이다.

원문 페이지는 아직 개요뿐이다. 이 문서의 개념 설명은 원문 개요와 패키지 README, 그리고
`remix@3.0.0-beta.5`에 실제로 들어 있는 타입 선언과 코드를 읽고 쓴 것이다. 원문과 설치된 버전의
이름이 다른 자리는 그 자리에서 적었다.

이 챕터가 끝나면 vinyl-shelf는 이렇게 바뀐다.

- 앨범을 추가하거나 고칠 때 커버 이미지를 올릴 수 있다. PNG, JPEG, WebP만, 2MB까지다.
- 상세 페이지와 수정 페이지에 커버가 보인다. 커버가 없으면 레코드 모양의 기본 그림이 보인다.
- 상세 페이지에 "Download cover" 링크가 생긴다.
- 커버를 바꾸거나 앨범을 지우면 예전 파일도 지워진다.

원문은 파일을 세 종류로 나눈다. 이 챕터는 그 셋을 모두 건드린다.

| 종류 | 예 | vinyl-shelf에서 맡는 곳 |
| -- | -- | -- |
| 그대로 내보내는 공개 파일 | `public/app.css`, `public/favicon.svg` | `staticFiles()` |
| 컴파일하거나 경계 안에서 내보내는 소스 | `app/assets/*.tsx`, 기본 커버 SVG | `createAssetServer()` |
| 사용자가 올리는 파일 | 앨범 커버 | `formData()` → 검사 → `FileStorage` → `createFileResponse()` |

1~6절이 앞의 두 줄, 7~10절이 마지막 줄 이야기다.

## 1. 정적 파일과 소스에서 내보내는 asset

`staticFiles()`는 디렉터리 안의 파일을 바꾸지 않고 내보낸다. 컴파일도, 의존성 해석도 없다.
`createAssetServer()`는 소스 파일을 요청받는 순간 컴파일하고, import를 브라우저가 찾을 수 있는
URL로 바꿔 쓰고, 필요하면 fingerprint를 붙인다.

가르는 기준은 **"브라우저에 보내기 전에 손을 대야 하는가"**다. TypeScript는 컴파일해야 하므로 asset
server로 간다. 아이콘 하나처럼 손댈 것이 없으면 `public/`으로 충분하다.

### vinyl-shelf에서는

두 가지가 이미 router 맨 앞에 있었다. `app/router.ts`:

```ts
middleware: [
  staticFiles('./public', { index: false }),
```

asset server는 middleware가 아니라 `routes.assets`(`/assets/*path`) route가 부른다. 이 챕터에서
기본 커버 그림 `app/assets/cover-placeholder.svg`를 asset server 쪽에 두었다. `public/`에 둬도
동작한다. asset server 쪽을 고른 것은 2~4절의 경계와 href API를 실제로 써 보려는 것이다.

## 2. asset server의 경계를 정한다

asset server는 `rootDir` 아래의 파일을 URL로 바꿔 내보낸다. 무엇을 내보낼지는 허용 목록과 거부
목록이 정한다. 원문이 강조하는 점은 이것이 **보안 경계**라는 것이다. 허용 목록을 넓게 잡으면
`app/data/users.ts` 같은 서버 코드가 그대로 브라우저에 보인다.

원문은 옵션 이름을 `allowFiles`, `allowPackages`, `denyFiles`로 적는다. beta.5의 타입 선언에는
`allow`와 `deny` 두 개만 있다. 아래 코드는 설치된 버전 이름을 따른다.

### vinyl-shelf에서는

`app/assets.ts`:

```ts
export const assetServer = createAssetServer({
  basePath: '/assets',
  rootDir,
  fileMap: {
    'app/*path': 'app/*path',
    'node_modules/*path': 'node_modules/*path',
  },
  // allow/deny decide what the public can fetch, not just what gets compiled.
  allow: ['app/assets/**', 'node_modules/**'],
  deny: ['app/**/*.test.*'],
  files: { extensions: ['.svg'] },
```

`fileMap`은 `app/` 전체를 URL에 연결하지만, `allow`가 `app/assets/**`만 연다. 그래서
`/assets/app/data/users.ts`는 404다. `covers.test.ts`의 `refuses source files outside the allowed
directories` 테스트가 이것을 확인한다.

`deny`는 지금 막는 파일이 없다. `app/assets/` 안에는 아직 테스트 파일이 없기 때문이다. 나중에 누가
`app/assets/` 옆에 테스트를 두더라도 공개되지 않게 미리 걸어 둔 것이다. 이 거부 규칙이 실제로 파일을
막는지는 아직 테스트로 확인하지 않았다.

`node_modules/**`를 연 것은 넓다. hydrate되는 컴포넌트가 `remix/ui` 같은 패키지 모듈을 import하기
때문에 열었다. 원문의 `allowPackages`처럼 패키지 이름 단위로 좁히는 방법은 beta.5에 없다.

## 3. 브라우저 모듈, CSS, 파일 asset

asset server는 세 종류를 내보낸다.

- **script 모듈** — `.ts`, `.tsx`, `.js`. 컴파일하고 import를 바꿔 쓴다.
- **스타일** — `.css`. 컴파일하고 `url(...)`을 바꿔 쓴다.
- **파일 asset** — 이미지, 폰트. 변환 없이(또는 5절의 변환을 거쳐) 내보낸다. `files.extensions`에 적은
  확장자만 여기에 해당한다.

원문은 브라우저 소스를 쓰는 쪽 옆, 예를 들어 `app/actions/cart/public/`에 두라고 한다.

### vinyl-shelf에서는

이 프로젝트는 5장부터 hydrate되는 컴포넌트를 모두 `app/assets/`에 모아 두었다. 원문의 배치와 다르다.
Remix 스킬 문서의 프로젝트 구조가 `app/assets/`를 "client entry와 브라우저 코드"의 자리로 정하고 있어서
그대로 두었다.

파일 asset은 이 챕터에서 처음 생겼다. `files: { extensions: ['.svg'] }`가 SVG를 파일 asset으로 연다.
이 설정이 없으면 같은 경로라도 asset server가 처리하지 않는다.

기본 커버 그림은 직접 그린 단순한 레코드 모양이다. `app/assets/cover-placeholder.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="No cover">
  <rect width="240" height="240" fill="#efe7da"/>
  <circle cx="120" cy="120" r="88" fill="#2b2622"/>
```

이 SVG는 저장소에 들어 있는, 우리가 쓴 파일이다. 사용자가 올리는 SVG는 받지 않는다(8절).

## 4. asset href, client entry, import map, preload

컴포넌트 안에서 asset URL을 문자열로 조립하지 않는다. URL 규칙(`basePath`, fingerprint)이 바뀌면
모든 곳을 고쳐야 하기 때문이다. 대신 asset server에 묻는다.

- `getHref(filePath)` — 스타일이나 파일의 URL
- `getScriptEntry()` — 렌더링되는 script entry
- `getPreloads()` — 먼저 받아 둘 모듈 목록

그리고 이 값을 `app/assets.ts`에서 한 번만 계산해 export한다.

### vinyl-shelf에서는

기본 커버 URL은 `getHref()`로 받는다. `app/assets.ts`:

```ts
export const coverPlaceholderHref = await assetServer.getHref('app/assets/cover-placeholder.svg')
```

module의 top-level `await`라서 서버가 뜰 때 한 번만 계산된다. 지금 값은
`/assets/app/assets/cover-placeholder.svg`다. 6절의 fingerprint를 켜면 이 값이 바뀌지만, 이 이름을
쓰는 화면 코드는 고칠 필요가 없다.

같은 파일의 `entryHref`는 5장부터 `routes.assets.href(...)`로 조립해 왔다. 원문의 권장대로라면
이것도 `getScriptEntry()`로 바꿀 자리다. 이 챕터에서는 건드리지 않았다.

상세 페이지는 커버가 있으면 커버 route를, 없으면 기본 그림을 쓴다. `app/ui/vinyl-shelf.tsx`:

```tsx
<img
  src={
    album.cover_key ? routes.albums.cover.href({ slug: album.slug }) : coverPlaceholderHref
  }
  alt={album.cover_key ? `Cover of ${album.title}` : 'No cover yet'}
  width={220}
  height={220}
  mix={coverStyle}
/>
```

## 5. 파일 변환과 변환 결과 캐시

파일 asset에는 요청이 고르는 변환을 붙일 수 있다. 예를 들어 이미지 URL에 "200px로 줄여서"를 붙이면
asset server가 줄인 결과를 내보낸다. `defineFileTransform()`으로 변환을 정의하고, 같은 변환을 매번
다시 하지 않도록 `createFsFileCache()`로 결과를 디스크에 둔다.

### vinyl-shelf에서는

쓰지 않았다. 변환은 저장소 안의 asset에 붙는 기능이다. 사용자가 올린 커버는 asset server가 아니라
`FileStorage`에 있으므로 여기에 해당하지 않는다. 커버 썸네일을 만들고 싶다면 업로드할 때 직접 줄여서
따로 저장해야 한다. 이미지 처리 라이브러리가 필요한 일이라 이 챕터 범위에서 뺐다.

## 6. 개발 중 감시와 production fingerprint

개발 중에는 파일을 고치면 바로 반영돼야 한다. 감시하는 쪽은 하나만 둔다 — asset server의 `watch`나
Node의 `--watch` 중 하나다. 둘 다 켜면 같은 변경에 두 번 반응한다.

production에서는 감시를 끄고 fingerprint를 켠다. fingerprint는 파일 내용에서 만든 값을 URL에 넣는
것이다. 내용이 바뀌면 URL이 바뀌므로, 브라우저에 "이 URL은 영원히 그대로"라고 말해도 된다(`immutable`
캐시).

### vinyl-shelf에서는

`watch: false`다. 개발 서버가 이미 Node의 `--watch`로 돌아서, 파일을 고치면 서버 전체가 다시 뜬다.

fingerprint는 켜지 않았다. 그래서 asset은 모두 `Cache-Control: no-cache`로 나간다. 브라우저가 매번
서버에 확인하지만, 바뀌지 않았으면 본문 없이 `304`를 받는다. 배포를 다룰 때 켤 자리로 남겨 둔다.

## 7. 한도가 있는 form 업로드를 parse한다

파일이 든 form은 `enctype="multipart/form-data"`로 보낸다. 본문이 여러 part로 나뉘고, 파일 part에는
파일 바이트가 그대로 들어 있다.

`formData()` middleware가 이 본문을 읽는다. 업로드는 서버로 들어오는 가장 큰 입력이라 한도 없이 받으면
안 된다. 한도는 다섯 개다.

| 옵션 | 넘으면 |
| -- | -- |
| `maxFiles` | 파일 part 개수 (기본 20) |
| `maxFileSize` | 파일 하나의 크기 |
| `maxParts` | 파일과 텍스트를 합친 part 개수 |
| `maxTotalSize` | 본문 전체 크기 |
| `maxHeaderSize` | part 하나의 header 크기 |

한도는 본문을 끝까지 받은 뒤가 아니라 **받는 도중에** 확인한다. 넘는 순간 parser가 멈추고 에러를
던진다.

`uploadHandler`는 파일 part마다 불린다. 돌려준 값이 `FormData`에 들어간다. `null`을 돌려주면 그 파일은
버려진다.

원문은 parser의 실패를 "알맞은 HTTP 응답으로 바꾸라"고 한다. `formData()`는 에러를 던지기만 하므로,
감싸지 않으면 사용자는 `500`을 본다.

### vinyl-shelf에서는

`formData()`를 감싼 middleware를 새로 만들었다. `app/middleware/form-data.ts`:

```ts
export function parseForms() {
  let parse = formData({
    maxFiles: 1,
    maxFileSize: maxCoverSize,
    maxParts: 20,
    maxHeaderSize: 8 * 1024,
    // Room for the text fields on top of one full-size cover.
    maxTotalSize: maxCoverSize + 64 * 1024,
    // A file under any other field name is dropped instead of kept in memory.
    uploadHandler(upload) {
      return upload.fieldName === 'cover' ? upload : null
    },
  })
```

한도는 앨범 form에 맞춘 값이다. 파일은 커버 하나, 텍스트 필드는 여섯 개 남짓이다.

`uploadHandler`는 `cover`라는 이름의 파일만 남긴다. 여기서 파일을 저장소에 바로 쓰지 않은 데는
이유가 있다. 이 middleware는 로그인 확인(`requireUser()`)과 소유권 확인보다 **앞에서** 돈다. 여기서
저장하면 로그인하지 않은 사람이나 남의 앨범을 고치려는 사람의 파일도 디스크에 남는다. 그래서 파일은
메모리에 2MB까지만 들고 있다가, action이 모든 확인을 마친 뒤에 저장한다(8절).

실패를 응답으로 바꾸는 부분:

```ts
  // Cast back to the original type so `context.formData` stays typed for
  // every controller; the wrapper only changes what a parse failure returns.
  return (async (context, next) => {
    try {
      return await parse(context, next)
    } catch (error) {
      let response = parseFailureResponse(error, context.headers.get('Accept'))
      if (response) return response
      throw error
    }
  }) as typeof parse
```

한도를 넘으면 `413 Content Too Large`, 본문이 깨졌으면 `400`이다. 수정 form처럼 JSON을 원하는 요청에는
`{ error }` JSON으로, 그 밖에는 짧은 텍스트로 답한다.

`as typeof parse`는 타입 때문이다. 9장에서 본 것처럼 controller의 `context.formData` 타입은 middleware
목록에서 나온다. 감싼 함수를 그냥 돌려주면 그 타입 정보가 사라져, 모든 controller에서
`context.formData`가 타입 에러가 난다.

알아 둘 한계가 있다. 413은 `render()` middleware보다 앞에서 나오므로 페이지를 그릴 수 없다. JavaScript
없이 큰 파일을 올린 사용자는 앱 화면이 아니라 텍스트 한 줄을 본다.

form 쪽은 `enctype`과 파일 input을 더했다. `app/ui/vinyl-shelf.tsx`:

```tsx
<form
  method="post"
  action={routes.albums.create.href()}
  enctype="multipart/form-data"
  mix={panelStyle}
>
```

`accept="image/png,image/jpeg,image/webp"`도 붙였다. 파일 선택 창에서 고를 수 있는 형식을 좁혀 주지만,
검사는 아니다. 사용자는 "모든 파일"을 골라 무엇이든 보낼 수 있다.

검증에 실패해 form을 다시 보여줄 때 텍스트 필드는 다시 채워지지만, 파일 input은 비어 있다. 브라우저가
스크립트로 파일 input 값을 넣는 것을 막기 때문이다. 사용자는 파일을 다시 골라야 한다.

middleware 순서도 짚어 둔다. `cop()`은 parse보다 앞이라 다른 사이트에서 오는 업로드는 본문을 읽기 전에
막힌다. `csrf()`는 `_csrf` 필드를 읽어야 하므로 parse보다 뒤다. 그래서 token이 틀린 요청도 본문은
일단 읽힌다. 한도가 그 비용에 상한을 건다.

## 8. 앱이 정한 key로 파일을 저장한다

`FileStorage`는 `File` 객체를 key로 넣고 꺼내는 저장소다. 메서드는 `set`, `get`, `has`, `remove`, `list`,
`put`이다. 백엔드는 메모리, 파일 시스템, S3 호환 저장소가 있고, 앱 코드는 백엔드가 바뀌어도 그대로다.

원문의 지침은 셋이다.

- **key는 앱이 정한다.** 사용자가 보낸 파일 이름을 key나 경로로 쓰면 `../../etc/passwd` 같은 이름이
  그대로 경로가 된다.
- **media type과 크기를 검증한다.** 브라우저가 보낸 `Content-Type`도 파일 이름처럼 클라이언트가 정한
  값이다.
- **원래 이름은 메타데이터로만 남긴다.**

### vinyl-shelf에서는

저장소와 검사는 `app/data/covers.ts`에 모았다. 개발은 파일 시스템(`tmp/uploads`), 테스트는 메모리다.

```ts
export const coverStorage: FileStorage =
  process.env.NODE_ENV === 'test'
    ? createMemoryFileStorage()
    : createFsFileStorage(fileURLToPath(new URL('../../tmp/uploads', import.meta.url)))
```

형식은 파일의 첫 몇 바이트로 판단한다. PNG, JPEG, WebP는 파일 맨 앞에 정해진 바이트(magic bytes)가
있다.

```ts
/**
 * Reads the type from the first bytes. The browser's `Content-Type` and the
 * filename are whatever the client chose to send. SVG is left out on purpose:
 * it is a document that can carry script, not just pixels.
 */
export function sniffCoverType(bytes: Uint8Array): CoverType | null {
```

SVG를 받지 않는 이유가 주석에 있다. SVG는 그림이 아니라 XML 문서라서 `<script>`나 `onload`를 담을 수
있다. 사용자가 올린 SVG를 우리 도메인에서 열면 그 스크립트가 우리 사이트 권한으로 돈다.

`readCover`는 form 값을 검사만 하고 저장하지 않는다.

```ts
export async function readCover(value: FormDataEntryValue | null): Promise<ReadCoverResult> {
  // A file input left empty still sends a part, with no name and no bytes.
  if (!(value instanceof File) || value.size === 0) return { ok: true, file: null }

  if (value.size > maxCoverSize) {
    return { ok: false, error: 'Cover must be 2 MB or smaller' }
  }

  let bytes = new Uint8Array(await value.arrayBuffer())
  let type = sniffCoverType(bytes)
  if (!type) {
    return { ok: false, error: 'Cover must be a PNG, JPEG, or WebP image' }
  }

  // The original name stays only as metadata; the storage key is ours.
  return { ok: true, file: new File([bytes], value.name, { type }) }
}
```

빈 파일 input도 part를 하나 보낸다는 점이 첫 줄의 이유다. 이름도 바이트도 없는 파일이 오고, 이것은
"커버를 고르지 않았다"는 뜻이다.

크기 확인은 middleware의 `maxFileSize`와 겹친다. middleware 설정이 바뀌거나 다른 경로로 파일이 들어와도
이 함수는 혼자 안전하도록 남겨 두었다.

마지막 줄에서 브라우저가 보낸 type을 버리고, 바이트로 알아낸 type으로 새 `File`을 만든다. 이름은
메타데이터로만 따라간다. key는 따로 만든다.

```ts
export async function saveCover(file: File) {
  let key = `covers/${randomUUID()}`
  await coverStorage.set(key, file)
  return key
}
```

DB의 `albums.cover_key`에는 이 key만 들어간다(migration
`db/migrations/20261010000200_add_albums_cover`). 파일 시스템 백엔드는 key를 다시 hash해서 경로를
만든다. 개발 서버에서 올려 보면 `tmp/uploads/8f/8f21dd….dat`과 `.meta.json`이 생긴다. 원래 이름은
`.meta.json` 안에만 있다.

controller는 모든 확인이 끝난 뒤에 저장한다. `app/actions/albums/controller.tsx`의 create:

```tsx
let result = validateCreateAlbum(context.formData)
let cover = await readCover(context.formData.get('cover'))

if (!result.ok || !cover.ok) {
```

텍스트 필드와 커버를 같이 검사하고, 둘 중 하나라도 틀리면 둘의 에러를 함께 보여준다. 통과하면 그때
저장한다.

```tsx
// Stored only after every check passed, so a rejected form leaves no file behind.
let coverKey = cover.file ? await saveCover(cover.file) : null
let album
try {
  album = await createAlbum(context.db, user.id, result.value, coverKey)
} catch (error) {
  await removeCover(coverKey)
  throw error
}
```

파일과 DB 행은 한 transaction으로 묶을 수 없다. 그래서 순서로 맞춘다. 원칙은 **DB가 가리키는 파일은
반드시 있어야 하고, 아무도 가리키지 않는 파일은 지운다**이다.

- 만들기 — 파일을 먼저 저장하고 행을 쓴다. 행 쓰기가 실패하면 파일을 지운다.
- 바꾸기 — 새 파일을 저장하고 행을 고친다. 고치기에 성공하면 옛 파일을, 실패하면(소유권, revision
  충돌) 새 파일을 지운다.
- 지우기 — 행을 먼저 지우고 파일을 지운다.

바꾸기는 `app/actions/albums/edit/controller.tsx`에 있다.

```tsx
let newCoverKey = cover.file ? await saveCover(cover.file) : null
let outcome = await updateAlbum(
  context.db,
  actorId,
  context.params.slug,
  result.revision,
  result.value,
  newCoverKey,
)

// Whichever file the database no longer points at goes: the new one if
// the write was refused, the old one if it was replaced.
await removeCover(outcome.ok ? outcome.replacedCoverKey : newCoverKey)
```

`updateAlbum`이 옛 key를 `replacedCoverKey`로 돌려준다. 옛 key를 transaction 안에서 읽어야 그 사이에
다른 저장이 끼어들어도 정확하다.

수정 action은 이 챕터에서 순서를 바꿨다. 10장에서는 소유권을 "검증 실패일 때만" 먼저 봤다. 이제는 모든
경우에 맨 앞에서 본다. 남의 앨범에 올린 파일이 잠깐이라도 저장소에 들어가지 않게 하려는 것이다.

## 9. 저수준 multipart parser는 필요할 때만 쓴다

`formData()` 아래에는 `remix/form-data-parser`의 `parseFormData()`가 있고, 그 아래에
`remix/multipart-parser`가 있다. 평범한 form 업로드에는 맨 위층이면 충분하다. 맨 아래층은 form이 아닌
multipart 형식이나, part를 하나씩 직접 스트리밍해야 할 때만 쓴다.

### vinyl-shelf에서는

`formData()`만 쓴다. 저수준 parser는 쓰지 않았다. 다만 에러 클래스는 `remix/form-data-parser`에서
가져왔다. `MaxFileSizeExceededError` 같은 한도 에러는 multipart parser에서 정의되고 form-data-parser가
다시 export한다. `formData()` middleware 자신도 같은 클래스로 한도 에러를 구분한다.

## 10. 올바른 HTTP 의미로 다운로드를 스트리밍한다

파일을 응답으로 내보낼 때 손으로 `new Response(file.stream())`를 쓰면 빠지는 것이 많다.
`createFileResponse(file, request, options)`가 대신 채워 준다.

| 처리 | 무엇이 되는가 |
| -- | -- |
| `Content-Length`, `Content-Type` | 파일의 크기와 type에서 |
| `ETag`, `Last-Modified` | 기본은 크기와 수정 시각으로 만든 weak ETag |
| 조건부 요청 | `If-None-Match`가 맞으면 본문 없이 `304` |
| range 요청 | `Range` header에 `206 Partial Content` |

`cacheControl`은 기본값이 없다. 정하지 않으면 header가 붙지 않는다.

### vinyl-shelf에서는

route를 하나 더했다. `app/routes.ts`:

```ts
cover: get('/albums/:slug/cover'),
```

URL에는 slug만 있고 저장소 key는 드러나지 않는다. `app/actions/albums/controller.tsx`:

```tsx
async cover(context) {
  let album = await getAlbum(context.db, context.params.slug)
  let file = album?.cover_key ? await getCover(album.cover_key) : null
  if (!album || !file) return new Response('No cover', { status: 404 })

  // no-cache + the default weak ETag: the browser keeps the image but asks
  // each time, and gets a 304 until the cover is replaced.
  let response = await createFileResponse(file, context.request, { cacheControl: 'no-cache' })
  // The type was sniffed on upload; this stops the browser guessing another.
  response.headers.set('X-Content-Type-Options', 'nosniff')
```

`no-cache`는 "캐시하지 마"가 아니라 "쓰기 전에 매번 확인해"다. 커버 URL은 커버를 바꿔도 같으므로,
`max-age`를 주면 바꾼 뒤에도 옛 그림이 보인다. 매번 확인하되, 바뀌지 않았으면 `304`로 본문 없이 끝난다.

`nosniff`는 브라우저가 내용을 보고 type을 다시 추측하지 못하게 한다. type은 업로드할 때 바이트로
확인했으니, 그 값만 믿게 한다.

다운로드는 `?download`가 붙었을 때만이다.

```tsx
if (context.url.searchParams.has('download')) {
  // A name built from the slug, never the uploaded filename.
  let filename = `${album.slug}-cover.${coverExtension(file.type)}`
  response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
}
```

저장된 원래 이름을 쓰지 않은 이유가 있다. 이름에 `"`나 줄바꿈이 들어 있으면 header가 깨지거나 다른
header를 끼워 넣을 수 있다. slug는 영문 소문자, 숫자, `-`만 가지므로 그대로 넣어도 안전하다.
`offers a download named after the album, not the upload` 테스트가 `my holiday "photo".png`라는 이름으로
이것을 확인한다.

개발 서버에서 실제 응답을 보면 이렇다.

```text
HTTP/1.1 200
accept-ranges: bytes
cache-control: no-cache
content-length: 23
content-type: image/png
etag: W/"23-1791621580816"
last-modified: Sat, 10 Oct 2026 08:39:40 GMT
x-content-type-options: nosniff
```

`accept-ranges: bytes`는 우리가 정하지 않았다. 이미지처럼 압축해도 줄지 않는 type에는
`createFileResponse`가 range 요청을 기본으로 켠다.

## 테스트

업로드 테스트는 `app/actions/albums/covers.test.ts`에 따로 두었다. multipart 요청은 `test/browser.ts`에
더한 `upload()`로 보낸다.

```ts
/** Like `submit`, but multipart, the way a form with a file input posts. */
async upload(
  path: string,
  fields: Record<string, string | File | File[]>,
  headers: Record<string, string> = {},
) {
```

테스트 PNG는 진짜 그림이 아니라 PNG 서명 8바이트 뒤에 아무 바이트나 붙인 것이다. 형식 검사가 첫
바이트만 보기 때문에 그것으로 충분하다.

확인하는 것은 크게 셋이다.

| 묶음 | 확인하는 것 |
| -- | -- |
| `files: uploading covers` | 저장 key, 형식 검사, 413, 실패 시 파일이 남지 않는지, 바꾸기와 지우기 |
| `files: serving covers` | header, 304, 다운로드 이름, 404, 기본 그림 |
| `files: asset server boundary` | SVG 파일 asset, 허용 목록 밖의 소스 차단 |

"파일이 남지 않는지"는 매 테스트 뒤 저장소의 `covers/` key 목록을 직접 세어 본다. 응답 코드만 보면
놓치는 버그 — 거절했는데 파일은 저장된 경우 — 를 잡으려는 것이다.

## 정독 후 확인 질문

1. 기본 커버 SVG는 asset server로 내보내면서, 사용자가 올리는 SVG는 받지 않는다. 같은 형식인데 왜
   다르게 다루는가?
2. `uploadHandler`에서 파일을 바로 저장소에 쓰면 무엇이 문제인가? middleware 순서와 엮어서 설명해
   보자.
3. 브라우저가 보낸 `Content-Type: image/png`를 믿지 않고 첫 바이트를 보는 이유는 무엇인가? 반대로 첫
   바이트 검사만으로 막지 못하는 것은 무엇일까?
4. 커버를 바꿀 때 "새 파일 저장 → 행 고치기 → 옛 파일 지우기" 순서를 거꾸로 하면 어떤 상태가 생길 수
   있는가?
5. 커버 응답에 `Cache-Control: public, max-age=31536000, immutable`을 주면 어떤 문제가 생기는가? 그
   값을 쓰려면 URL을 어떻게 바꿔야 하는가?
6. `Content-Disposition`에 업로드된 원래 이름을 넣으면 무엇이 위험한가?

## 스터디 과제

**커버를 지우는 기능을 만든다.** 지금은 커버를 바꿀 수만 있고, 기본 그림으로 되돌릴 수는 없다.

1. 수정 form에 "커버 지우기"를 더한다. 체크박스로 할지, 별도 버튼과 route로 할지는 각자 정한다.
2. 주인만 지울 수 있어야 한다. 소유권 확인은 데이터 계층의 쓰기 안에도 둔다.
3. 지운 뒤에는 저장소에도 파일이 남지 않아야 한다. "DB가 가리키지 않는 파일은 지운다"는 8절의 원칙을
   지킨다.
4. 같은 제출에 "커버 지우기"와 새 파일이 함께 오면 어떻게 할지 정하고, 그 결정을 테스트로 남긴다.
5. revision 충돌(409)일 때는 아무것도 지워지지 않아야 한다.
6. 테스트를 셋 이상 추가한다 — 지우면 `cover_key`가 비고 파일이 사라진다, 주인이 아니면 403이고 파일이
   남는다, 지운 뒤 커버 route가 404다.

여유가 있으면 커버 URL에 fingerprint를 붙여 본다. 예를 들어 key의 일부를 query로 붙이면 커버가 바뀔
때 URL도 바뀐다. 그러면 10절의 `no-cache`를 `immutable`로 바꿀 수 있는지, 바꾸면 무엇을 얻고 무엇을
조심해야 하는지 정리해 온다.
