# Remix 3 Practice

Remix 3 beta를 `vinyl-shelf`라는 작은 토이 프로젝트로 학습하는 저장소다. 목표는 공식 가이드의
각 챕터를 한국어 문서로 읽고, 같은 개념을 실제 코드로 확인하면서 커밋 단위로 따라갈 수 있게
만드는 것이다.

## 프로젝트 구성

```text
.
├── docs/          # 커리큘럼 문서
└── vinyl-shelf/   # Remix 3 beta 실습 앱
```

## Vinyl Shelf

`vinyl-shelf`는 작은 음반 컬렉션 앱이다. 사용자는 앨범을 둘러보고, 상세 페이지를 열고, 새 앨범을
추가하고, 나중에는 로그인한 사용자만 컬렉션을 관리하도록 확장한다.

커리큘럼이 진행되면서 다음 기능을 단계적으로 구현한다.

- 앨범 목록, 상세 페이지, 생성/수정/삭제 form
- route contract와 controller 분리
- request handling, redirects, 404/400 response, cancellation
- server-rendered UI와 필요한 부분만 hydrate하는 interactivity
- form validation과 persistent data layer
- auth, session, security boundary
- 앨범 커버 이미지와 asset/file handling
- route/controller/component 테스트
- production 실행, 환경변수, 배포 준비

## 학습 방식

커리큘럼은 번호가 붙은 문서 폴더와 커밋으로 관리한다.

```text
docs/
├── 00-remix-3-beta-preview/
└── 01-start-here-guide/
```

각 가이드 챕터 폴더에는 보통 두 문서가 있다.

- `original-translation.ko.md`: 원문 전체 번역 및 정리
- `practice-guide.ko.md`: 원문의 절 구조를 따라 개념을 설명하고, 절마다 이 프로젝트의
  코드와 연결하는 실습 문서. 끝에 정독 후 확인 질문과 스터디 과제가 있다.

0번 커리큘럼처럼 이론 중심인 경우에는 코드 변경 없이 `overview.ko.md`만 둘 수 있다.

추천 학습 방식은 각 챕터 폴더의 `practice-guide.ko.md`를 보고 직접 따라가는 것이다. 필요할 때
`original-translation.ko.md`를 열어 원문 흐름을 확인하고, 이론 중심 챕터는 `overview.ko.md`를 먼저
읽는다. 문서가 계속 추가되므로 고정된 읽는 순서는 README에 두지 않고, `docs/`의 번호가 붙은 폴더를
순서대로 보면 된다.

## 앱 실행

```sh
cd vinyl-shelf
corepack pnpm install
corepack pnpm run dev
```

검증:

```sh
cd vinyl-shelf
corepack pnpm test
corepack pnpm run typecheck
```

## 커밋으로 학습하기

커리큘럼 커밋은 다음 제목 규칙을 따른다.

```text
curriculum 00: Remix 3 beta preview
curriculum 01: Start Here
curriculum 02: Routing and Controllers
curriculum 03: Request Handling
curriculum 04: Rendering UI
curriculum 05: Interactivity
curriculum 06: Streaming UI with Frames
curriculum 07: Animation
curriculum 08: Data and Validation
curriculum 09: Forms and Mutations
curriculum 10: Auth, Sessions, and Security
curriculum 11: Files and Assets
```

특정 챕터 상태로 이동해서 보고 싶다면 해당 커밋을 checkout하면 된다.

```sh
git log --oneline
git checkout <commit>
```

다시 최신 상태로 돌아오려면:

```sh
git checkout main
```

## 스터디 진행

모임 전에 각자 준비하는 것은 두 가지다.

1. 그 주 챕터의 `practice-guide.ko.md`를 정독하고, **정독 후 확인 질문**의 답을 글로 써 온다.
   모임에서 서로의 답을 비교하고, 답이 갈리는 질문이 그날의 토론 주제가 된다.
2. **스터디 과제**를 자기 브랜치에서 구현해 온다. 과제에는 정답 코드가 없다 — 모임에서
   서로의 코드를 비교하며, 같은 과제에서 다른 설계가 나온 지점을 이야기한다.

### 과제 브랜치 만드는 법

과제는 챕터를 넘어가며 한 브랜치에 쌓지 않는다. 과제 코드가 다음 챕터의 리팩터링과 같은
파일을 고치기 때문에, 이어서 쌓으면 챕터마다 충돌이 난다. 챕터마다 그 챕터의 커밋에서 새로
분기한다.

각 `curriculum NN` 커밋에는 `chNN` 태그가 붙어 있다.

```sh
git fetch --tags                  # 태그를 아직 안 받았다면

# 챕터 N 과제 시작: 그 챕터의 태그에서 자기 브랜치를 만든다
git switch -c {이름}/ch01 ch01

# 구현하고 커밋한 뒤, 자기 fork에 올려서 모임에서 공유한다
git push origin {이름}/ch01

# 다음 챕터는 다음 태그에서 새로 분기한다. 이전 브랜치는 그대로 둔다.
git switch -c {이름}/ch02 ch02
```

과제 구현 중 검증은 앱과 같다 — `corepack pnpm test`, `corepack pnpm run typecheck`.
