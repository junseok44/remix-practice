# 10 Auth, Sessions, and Security — 확인 질문 답과 과제 노트

## 정독 후 확인 질문

### 1. 서명된 cookie에 `{ userId: 1 }`을 직접 넣으면 생기는 문제

서명은 위조를 막을 뿐이다. 서버가 한 번 발급한 값은 서명이 유효한 동안 계속 통한다. session이 더 나은 이유는 둘이다.

- **서버가 끝낼 수 있다.** session은 데이터가 서버 저장소에 있으니, 로그아웃에서 `regenerateId(true)`로 옛 기록을 지우면 복사해 둔 cookie가 바로 쓸모없어진다(테스트 `signs out and makes the old cookie worthless`). 서명된 cookie는 지울 곳이 없다. 누가 cookie를 복사해 두었으면 secret을 바꾸기 전까지 그 사람도 계속 로그인 상태다. 계정을 막거나 권한을 내려도 마찬가지다.
- **내용이 브라우저에 남지 않는다.** 서명은 암호화가 아니라서 cookie 안의 값을 누구나 읽을 수 있다. session cookie에는 ID만 있고, `auth`, `_csrf`, flash 값은 서버에만 있다. flash처럼 "한 번 읽으면 사라지는" 값도 서버가 상태를 쥐고 있어야 만들 수 있다.

### 2. 로그인할 때 session ID를 바꾸지 않으면 가능한 공격 (session fixation)

1. 공격자가 우리 사이트에 접속해 익명 session ID를 하나 받는다.
2. 그 ID를 피해자 브라우저에 심는다. 같은 상위 도메인의 다른 서브도메인이나 XSS 같은 경로로 cookie를 써 넣는다.
3. 피해자가 그 브라우저로 로그인한다. ID가 그대로이니 서버는 그 ID의 session에 `{ userId }`를 쓴다.
4. 공격자가 자기가 알고 있던 그 ID로 요청한다. 피해자로 로그인한 상태다.

로그인할 때 `completeAuth()`가 ID를 바꾸면 3번 뒤 공격자가 가진 ID는 아무 데도 연결되지 않는다(테스트 `rotates the session id on sign-in`).

### 3. flash를 렌더러가 아니라 action에서 읽는 이유

flash 값은 한 번 읽으면 사라진다. 그런데 공통 렌더러는 페이지만 그리지 않는다. 상세 페이지의 추천 frame도 같은 렌더러를 거친다. 렌더러에서 flash를 읽으면 frame을 그리는 쪽이 메시지를 가져갈 수 있다. frame은 메시지를 화면에 쓰지 않으니 그대로 버려지고, 페이지에는 아무것도 안 뜬다.

메시지가 사라지는 곳은 **frame이 있는 상세 페이지**다. 앨범을 추가하거나 넘긴 뒤 도착하는 바로 그 페이지라서 피해가 크다. 페이지 action이 직접 읽어 prop으로 넘기면 frame action은 flash를 건드리지 않는다.

이 버전에서 페이지와 frame 중 어느 쪽이 먼저 읽는지는 실행해서 확인하지 않았다. 가이드의 설명과 `takeNotice` 주석을 근거로 쓴 답이다.

### 4. `requireUser()`가 있는데도 `updateAlbum`이 `actorId`를 받는 이유

`requireUser()`는 "로그인했나"만 본다. "이 앨범의 주인인가"는 보지 않는다. 그리고 controller의 확인은 그 controller에만 있다. 나중에 쓰기 경로가 하나 더 생기면 — 다른 route, 배치 스크립트, 이번 과제의 넘기기 같은 — 그 경로를 만든 사람이 확인을 빼먹을 수 있다. 쓰기 함수가 `actorId`를 인자로 요구하면 호출하는 쪽은 "누가 하는지"를 넘겨야만 컴파일된다. 확인은 모든 호출이 지나가는 마지막 자리에 남는다. 읽기와 확인과 쓰기가 한 transaction 안에 있으니, 확인한 뒤 쓰기 전에 주인이 바뀌는 틈도 없다.

### 5. `cop()`만 있을 때와 `csrf()`만 있을 때

**`cop()`만 있으면 막히지 않는 요청**: `Sec-Fetch-Site`도 `Origin`도 없는 요청이다. 두 header를 보내지 않는 오래된 브라우저에서 다른 사이트가 만든 form POST가 여기 해당한다. `cop()`은 그런 요청을 일부러 통과시킨다. 그러면 cookie가 실린 채 action까지 간다. `csrf()`는 이 경우에도 token이 없으니 403을 낸다.

**`csrf()`만 있을 때 `cop()`이 더해 주는 것**:

- 이른 차단. `cop()`은 session을 읽고 body를 parse하기 전에 끊는다(`app/router.ts` 순서). 다른 사이트의 POST가 session 저장소를 건드리지 않는다.
- token이 새도 막힌다. token이 어떤 경로로 알려져도 브라우저가 붙이는 `Sec-Fetch-Site: cross-site`는 페이지 JavaScript가 고칠 수 없다. 테스트 `rejects a cross-site browser POST before it reaches the action`에서 token이 맞는데도 403이 나는 것이 이 경우다.

### 6. 남의 앨범 수정 form에 빈 제목을 보내면 400이 아니라 403인 이유

400을 돌려주면 주인이 아닌 사람이 그 action의 검증 규칙을 마음껏 시험해 볼 수 있다. 어떤 필드가 필수인지, 어떤 값이 통과하는지를 알아낸다. 더 나쁜 것은 응답이 둘로 갈린다는 점이다. 잘못된 값이면 400, 올바른 값이면 403이 온다. 그러면 "검증은 통과했고 권한만 없다"가 드러나고, 일부 action에서는 그 차이가 데이터의 존재나 상태를 알려 준다. 주인이 아니면 무엇을 보내든 같은 403을 받는 것이 맞다. 이번 과제에서도 같은 규칙을 지켰다(아래).

## 스터디 과제 노트 — 앨범 넘기기

### 정한 것

| 정할 것 | 고른 것 | 이유 |
| -- | -- | -- |
| route | `POST /albums/:slug/transfer` (`routes.albums.transfer`) | 넘기기는 `albums` controller의 leaf 동작이다. method override 없이 일반 form으로 보낸다 |
| 수락 단계 | 넣지 않았다 | 바로 넘긴다. "넘기는 중" 상태를 두지 않으니 상태 전이 확인도 없다 |
| 기록 | 남기지 않았다 | flash 메시지가 넘긴 사람에게 한 번 알려 줄 뿐이다 |
| revision | 넘길 때 1 올린다 | 옛 주인이 열어 둔 수정 form이 낡은 것으로 처리되게 한다 |

### 동작

- 상세 페이지 아래쪽, 주인에게만 `Transfer to another account` 입력칸과 `Transfer album` 버튼이 보인다. form에는 `CsrfField`가 들어 있고, 일반 POST라 JavaScript 없이 동작한다.
- `transferAlbum`(`app/data/albums.ts`)은 `updateAlbum`처럼 한 transaction 안에서 앨범을 읽고, 주인인지 먼저 확인한 뒤 받는 사람을 찾는다. 이메일은 앞뒤 공백을 지우고 소문자로 맞춘다.
- 넘기면 상세 페이지로 303하고, flash로 `Transferred Kind of Blue to Guest Listener.`를 보여 준다. 그 페이지에서는 이미 주인이 아니므로 수정·삭제·넘기기가 모두 사라진다.
- 없는 이메일이면 상세 페이지를 400으로 다시 그린다. 입력칸에는 쓴 값이 남고 그 아래 `No account uses that email.`이 뜬다. 자기 자신에게 넘기면 `You already own this album.`으로 400이다.

### 주인 확인을 받는 사람 확인보다 먼저 한다

6번 답과 같은 이유다. 받는 사람을 먼저 찾으면 주인이 아닌 사람이 이메일을 바꿔 가며 보내 볼 수 있다. 400(`No account uses that email`)과 403이 갈리는 것을 보고 어떤 이메일이 가입되어 있는지 알아낸다. 그래서 데이터 함수 안에서 `forbidden`을 먼저 돌려준다. 테스트 `answers a non-owner with 403 even for an unknown email`이 이것을 고정한다.

주인에게는 "없는 이메일"이 그대로 보인다. 로그인한 사용자가 자기 앨범을 걸어야만 가입 여부를 확인할 수 있다는 뜻이다. 과제가 400 화면을 요구하므로 받아들였다. 막고 싶다면 수락 단계를 두고, 없는 이메일에도 "초대를 보냈다"고 똑같이 답하는 방식이 있다.

### 테스트 (`app/actions/albums/controller.test.ts`의 `auth: album transfer`)

- 주인이 `' Guest@Vinyl.test '`로 넘기면 303이고 `owner_id`가 바뀐다. 옛 주인의 상세 페이지에는 flash가 뜨고 수정·삭제·넘기기 버튼이 없다. guest의 화면에는 `Edit album`이 생긴다.
- 없는 이메일이면 400이고, 안내 문장과 입력값이 HTML에 있으며, 주인은 그대로다.
- 주인이 아니면 403이고, 주인은 그대로다.
- 주인이 아니면 없는 이메일로 보내도 403이다.
- 주인이 token 없이 보내면 403이고, 주인은 그대로다.

### 손으로 확인할 것

`shelf@vinyl.test` / `vinyl-shelf-demo`로 로그인한다. `Kind of Blue` 상세 페이지에서 `guest@vinyl.test`로 넘긴다. 상단에 넘겼다는 메시지가 뜨고 버튼들이 사라져야 한다. 로그아웃 후 `guest@vinyl.test`로 로그인하면 같은 페이지에 수정·삭제·넘기기가 보여야 한다. 브라우저 JavaScript를 끄고 해도 같아야 한다.
