# Files and Assets 원문 한국어 번역

원문: [Files and Assets | Remix Docs](https://guides.remix.run/files-and-assets/)
라이선스: Remix Docs 페이지 하단의 “docs and examples licensed under MIT” 표기를 기준으로 번역 및 정리했다.

프로젝트 적용 실습은 [`practice-guide.ko.md`](./practice-guide.ko.md)에서 다룬다.

이 챕터의 원문 페이지도 2026-10-10 기준 개요만 있다. 페이지 맨 위에 "아직 끝나지 않은 챕터"라는
안내와 함께, 동작하는 API 예제는 아래 README들을 보라고 적혀 있다. 아래 번역은 그 안내와 절
10개의 개요 전체다.

- [Assets](https://github.com/remix-run/remix/blob/main/packages/assets/README.md)
- [Form data middleware](https://github.com/remix-run/remix/blob/main/packages/form-data-middleware/README.md)
- [File storage](https://github.com/remix-run/remix/blob/main/packages/file-storage/README.md)
- [File responses](https://github.com/remix-run/remix/blob/main/packages/response/README.md)

## 개요

Remix는 세 종류의 파일을 따로 다룬다. 그대로 내보내는 공개 파일, 브라우저에 보내기 전에 컴파일해야
하는 소스, 그리고 신뢰 경계를 넘어 들어오는 사용자 업로드다.

## 정적 파일과 소스에서 내보내는 asset {#static-files-vs-source-served-assets}

루트의 `public/` 디렉터리에 있는 파일을 있는 그대로 내보낼 때는 `staticFiles()`를 쓴다.
TypeScript, JavaScript, CSS, 이미지, 폰트처럼 컴파일, 의존성 해석, 변환, preload, fingerprint가 붙은
URL이 필요한 파일에는 `createAssetServer()`를 쓴다.

## asset server의 경계를 정한다 {#remix-s-unbundled-asset-server}

`rootDir`와 공개 `basePath`를 정한 다음, `allowFiles`, `allowPackages`, `denyFiles`를 설정한다. 이
설정은 컴파일 설정이 아니라 보안 경계다 — asset server가 무엇을 바깥에 내보낼지를 정한다.

## 브라우저 모듈, CSS, 파일 asset {#browser-modules-asset-roots-and-package-mounts}

브라우저 소스는 그것을 쓰는 쪽 옆에 둔다. 예를 들어 `app/actions/cart/public/` 같은 곳이다. 로컬
의존성은 모두 `allowFiles`에 걸려야 하고, 패키지 의존성은 따로 허용한다.

## asset href, client entry, import map, preload {#client-entry-hrefs-import-maps-and-module-preloads}

렌더링되는 script entry에는 `getScriptEntry()`를, 스타일과 파일에는 `getHref()`를, 더 세밀하게
다룰 때는 `getPreloads()`를 쓴다. 이 메타데이터는 `app/assets.ts`에서 한 번만 해석한다.

## 파일 변환과 변환 결과 캐시 {#asset-file-transforms}

요청이 고르는 변환은 `defineFileTransform()`으로 정의하고, 필요하면 `createFsFileCache()`로 변환
결과를 디스크에 캐시한다.

## 개발 중 감시와 production fingerprint {#fingerprinting-source-maps-minification}

개발 중 파일 감시는 하나만 고른다 — asset server의 감시나 Node의 `--watch` 중 하나다. production에서는
감시를 끄고, 내용 기반 fingerprint를 켜서 asset을 바뀌지 않는 것으로 캐시하게 한다.

## 한도가 있는 form 업로드를 parse한다 {#file-uploads}

`formData()`에 `uploadHandler`와 header, 파일, part의 크기 한도를 설정한다. parser나 저장소에서 난
실패는 알맞은 HTTP 응답으로 바꾼다.

## 앱이 정한 key로 파일을 저장한다 {#file-storage-memory-filesystem-s3}

`FileStorage` API를 메모리, 파일 시스템, S3 호환 저장소 위에서 쓴다. media type과 크기를 검증하고,
원래 파일 이름은 메타데이터로만 남긴다.

## 저수준 multipart parser는 필요할 때만 쓴다 {#multipart-parsing}

평범한 스트리밍 업로드는 `remix/form-data-parser`가 처리한다. form이 아닌 형식, 직접 만든 스트림,
특수한 part 처리가 필요할 때만 `remix/multipart-parser`를 직접 쓴다.

## 올바른 HTTP 의미로 다운로드를 스트리밍한다 {#file-downloads-lazy-files-mime-types-and-range-responses}

파일 시스템의 데이터는 `LazyFile`로 열거나 `FileStorage`에서 읽은 다음, `createFileResponse()`로
응답한다. 그러면 content length, MIME type, ETag, 조건부 요청, range 요청이 제대로 처리된다.
