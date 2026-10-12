# 08 Data and Validation — 확인 질문 답과 과제 노트

## 정독 후 확인 질문

### 1. 1900–2100 검증을 한쪽만 남기면 각각 무엇을 못 막는가

- **form schema만 남기면**: form을 거치지 않는 쓰기를 못 막는다. 테스트의 `db.create(albums, { year: 1200 })`, seed, 나중에 생길 import 스크립트나 다른 action이 1200년 앨범을 그대로 저장한다.
- **table `validate` hook만 남기면**: 잘못된 값이 저장되지는 않는다. 대신 사용자가 그 입력칸 아래에서 우리가 쓴 안내 문장을 못 본다. hook이 던지는 `DataTableValidationError`를 action이 잡지 않으므로 400이 아니라 500 에러 페이지로 끝날 것이다(코드를 읽고 추론한 것이고, 실행해 보지는 않았다). 우리가 쓴 문장은 `error.issues`에만 남는다. 그리고 `"abc"` 같은 문자열은 숫자로 바뀌기 전이라 `CreateAlbumInput` 타입부터 맞지 않는다.

schema는 사람에게 무엇을 고칠지 알려 주는 쪽이고, hook은 어떤 경로로 와도 저장을 막는 쪽이다.

### 2. `yearField`에서 `.refine`이 `.transform`보다 먼저 오는 이유

지금 순서는 문자열 그대로 검사하고, 통과한 값만 숫자로 바꾼다. 그래서 어떤 입력이 와도 사용자가 보는 문장은 `Year must be a number between 1900 and 2100` 하나다.

순서만 바꾸고 술어를 숫자용으로 고쳐서 돌려 봤다(일회성 스크립트, `remix/data-schema` beta.5).

| 입력 | 지금 순서 | transform 먼저 | `coerce.number()` 먼저 |
| -- | -- | -- | -- |
| `"abc"` | 우리 문장 | 우리 문장 | `Expected number` |
| `""` | 우리 문장 | 우리 문장 | `Expected number` |
| `"1e3"` | 우리 문장 | 우리 문장 | 우리 문장 |

`Number()`는 실패하지 않고 `NaN`이나 `0`을 내므로, 이 필드에서는 순서만 바꿔도 메시지가 같았다. 차이는 변환 단계가 스스로 거부할 수 있을 때 생긴다. `coerce.number()`처럼 변환이 먼저 실패하면 refine까지 가지 못하고, 사용자는 입력칸 아래에서 `Expected number`를 읽는다. 무엇을 넣어야 하는지 알려 주지 않는 문장이다.

refine 호출만 위로 옮기고 술어를 그대로 두면 술어가 숫자를 받은 채 `value.trim()`을 부른다. typecheck에서 걸리고, 런타임이라면 `TypeError`가 난다.

### 3. `c.text().notNull()`을 지워도 database가 `not null`을 유지하는 이유

`schema.ts`는 런타임이 쓰는 table 정보일 뿐이고, 실제 DDL은 `db/migrations`의 `up.sql`이 정한다. 파일 맨 위 주석이 말하듯 schema를 고쳐도 database는 바뀌지 않는다. 이미 실행된 `create table albums (... title text not null ...)`이 제약을 계속 갖고 있다. 제약을 풀려면 새 migration을 써야 한다.

과제를 하면서 하나 더 확인했다. 이 버전의 column builder는 `.nullable()`을 부르기 전에는 타입에 `null`이 없다. `c.integer()`만 쓰니 `rating`의 타입이 `number`가 되어 `null`을 넣는 곳마다 typecheck가 실패했다. 그래서 `notNull()`을 지워도 TypeScript 타입조차 그대로다.

### 4. `createAlbum`에는 transaction이 필요하고 `listAlbums`에는 필요 없는 이유

`createAlbum`은 읽은 값으로 쓸 값을 정한다. 이미 있는 slug를 읽고 겹치지 않는 번호를 고른 뒤 insert한다.

1. 요청 A가 `Kind of Blue`를 추가하며 `kind-of-blue-2`를 고른다.
2. A가 insert하기 전에 요청 B가 같은 제목으로 들어와 역시 `kind-of-blue-2`를 고른다.
3. A가 insert한다.
4. B의 insert가 unique 제약에 걸리고, B는 500을 본다.

읽기와 insert를 한 transaction에 묶으면 B가 A의 미완료 상태를 근거로 slug를 고르지 못한다.

`listAlbums`는 select 한 번이다. 문장 하나는 그 자체로 일관된 시점을 보고, 그 결과로 무엇을 쓰지도 않는다. 그래서 묶을 대상이 없다.

이 앱의 sqlite adapter가 연결 하나에서 두 요청의 transaction을 실제로 어떻게 줄 세우는지는 확인하지 못했다. 위 순서는 가이드의 설명을 따른 것이다.

### 5. `context.db`로 받는 것과 직접 import하는 것의 차이

- **바꿔 끼울 수 있다**: action은 middleware가 넣어 준 database를 쓴다. 테스트용 DB, 요청마다 다른 connection, 읽기 전용 복제본으로 바꿀 때 `loadDatabase()`만 바꾸면 되고 action은 그대로 둔다. 직접 import하면 그 action은 그 모듈의 singleton에 고정된다.
- **연결이 타입으로 드러난다**: `context.db`의 타입은 middleware stack에서 나온다. `loadDatabase()`를 빼면 그것을 읽는 모든 action에서 typecheck가 실패한다. import는 그런 의존을 드러내지 않는다.
- **같은 점**: 지금은 middleware가 바로 그 singleton을 넣으므로 런타임 동작은 같다. 초기화 순서도 import 사슬(`middleware/database.ts` → `data/database.ts`의 top-level await)이 보장한다.

## 스터디 과제 노트 — `rating` 추가

| 단계 | 한 일 |
| -- | -- |
| migration | `db/migrations/20261013000000_add_albums_rating`에 `alter table ... add column rating integer`를 넣었다. 되돌릴 때는 `drop column` |
| schema | `rating: c.integer().nullable()`. 3번 답처럼 `.nullable()` 없이는 타입에 `null`이 없다 |
| form 검증 | `ratingField`: 빈 칸은 `null`로 통과시키고, 무언가 썼으면 1–5 정수만 받는다 |
| table hook | `rating`이 `null`이 아니면서 1–5 정수가 아니면 `rating must be an integer between 1 and 5` |
| 화면 | 추가 form과 수정 form에 `Rating (1-5, optional)` 입력칸을 넣었다. 목록 카드는 평점이 있을 때만 `/ 4 of 5`를 붙인다. 상세 페이지는 `Rated 4 / 5` 또는 `Not rated yet`를 보여 준다 |
| seed | seed 타입에서 `rating`을 빼고 넣는다. DB에 기본값이 없으니 seed 앨범은 `null`, 곧 평점 없음이다 |

### 빈 값과 범위 밖 값이 다르게 동작하는 지점

`ratingField`의 refine이 빈 문자열을 먼저 통과시키고, transform이 그것을 `null`로 바꾼다. `7`은 refine에서 걸려 400과 함께 그 입력칸 아래에 `Rating must be a whole number from 1 to 5`가 뜬다. 2번 답과 같은 이유로 검사는 문자열 상태에서 하고 변환은 맨 끝에 둔다.

수정 form에서 칸을 비우고 저장하면 `rating`이 `null`로 갱신된다. 평점을 지우는 방법이 따로 없어도 되는 이유다.

### 테스트 (`app/actions/controller.test.ts`의 `album rating`)

- 빈 rating으로 제출하면 303이고, 저장된 행의 `rating`은 `null`이다.
- `4`로 제출하면 상세 페이지에 `Rated 4 / 5`가 나온다.
- `7`로 제출하면 400이고 안내 문장이 HTML에 있으며, 행이 저장되지 않는다.
- `db.create`로 `rating: 7`을 직접 넣으면 `DataTableValidationError`가 나고, `metadata.column`이 `rating`이다.
- 평점 없는 seed 앨범의 목록과 상세 페이지가 200으로 그려진다.

### 손으로 확인할 것

이미 있는 `db/vinyl-shelf.db`가 있으면 서버를 띄울 때 새 migration이 한 번 돈다. `/albums`에서 평점 없이 하나, `3`으로 하나, `7`로 하나 추가해 본다. 마지막 것은 입력칸 아래에 에러가 떠야 한다.
