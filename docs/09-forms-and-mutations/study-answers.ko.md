# 09 Forms and Mutations — 확인 질문 답과 과제 노트

## 정독 후 확인 질문

### 1. 성공한 POST에 페이지를 직접 그려 주면 무엇이 잘못되는가, `303`이 `302`보다 맞는 이유

주소창과 history에 POST 결과가 남는다. 사용자가 새로고침하거나 뒤로 갔다 앞으로 오면 브라우저가 "양식을 다시 제출할까요?"를 묻고, 확인하면 같은 POST가 다시 간다. 추가라면 앨범이 두 개 생기고, 수정이라면 그 사이 남이 저장한 것을 다시 덮는다.

`303 See Other`는 명세가 "다음 요청은 GET으로"라고 못 박는다. `302`는 원래 method를 유지하라는 뜻이었고, 브라우저들이 관행으로 GET으로 바꿔 왔을 뿐이다. 그래서 의도를 응답에 적는 쪽은 303이다. 새로고침하면 GET만 다시 간다.

### 2. `new FormData(form)`과 `new FormData(form, event.submitter)`의 차이

두 번째 인자로 submitter를 넘겨야 누른 버튼의 `name`과 `value`가 body에 들어간다. 첫 번째 형태는 입력칸만 담는다.

빼먹으면 `intent`가 body에 없다. 서버는 `defaulted(..., 'save')`로 그것을 `save`로 읽는다. `Save and keep editing`을 눌러도 상세 페이지로 이동해 버리고, 에러는 하나도 나지 않는다.

JavaScript를 끄면 이 증상이 안 보인다. 그때는 브라우저가 직접 form을 제출하는데, 브라우저는 누른 버튼의 이름과 값을 언제나 넣어 준다. 그래서 "JS 끄면 되고 켜면 안 되는" 버그가 된다.

### 3. 모르는 `intent`는 기본 동작, 비어 있는 제목은 400 — 기준

기준은 **사용자가 고칠 수 있는가**다.

| 값 | 사용자가 본 적 있나 | 처리 |
| -- | -- | -- |
| 제목 | 직접 쓴 입력칸이다 | 400, 입력칸 아래에 무엇을 고칠지 알려 준다 |
| `intent` | 버튼에 숨은 값이다 | 기본 동작으로 처리한다. 오래된 탭이나 누가 손댄 form에서만 온다 |

`intent`에 400을 돌려주면 사용자는 고칠 입력칸이 없는 에러 화면을 본다. 이번 과제에서도 같은 기준을 썼다. 다만 기본값을 고를 때 "더 안전한 쪽"이라는 조건을 하나 더 붙였다(아래 과제 노트).

### 4. 수정 action에서 검증이 revision 비교보다 먼저 와야 하는 이유

오래된 탭에서 제목을 비우고 저장한 사용자를 생각해 본다.

- **검증이 먼저(지금)**: 바로 400과 `Title is required`가 뜬다. 고쳐서 다시 내면 그때 revision을 비교하고 409를 받는다. 각 화면이 그 자리에서 할 일 하나씩을 알려 준다.
- **revision이 먼저**: 409 화면이 "다른 사람이 먼저 저장했다, 다시 내면 덮어쓴다"고 말한다. 사용자가 그대로 다시 내면 이번에는 400이 뜬다. 덮어쓰려던 사람이 엉뚱한 단계에서 막히고, 그 409 화면은 결국 저장될 수 없는 값을 보여 준 셈이다. 게다가 revision을 비교하려면 DB를 읽어야 하는데, 어차피 거절할 요청에 그 일을 먼저 한다.

테스트 `reports validation failures before touching the revision`이 이 순서를 고정한다. 오래된 revision `99`와 빈 제목을 같이 보내면 400이고, revision은 1 그대로다.

### 5. revision 비교와 저장이 같은 transaction에 없으면 깨지는 것

1. A와 B가 모두 revision 1에서 만든 form을 낸다.
2. A가 읽는다. 저장된 revision은 1이니 비교를 통과한다.
3. A가 쓰기 전에 B가 읽는다. 아직 1이니 B도 통과한다.
4. A가 쓰고 revision을 2로 올린다.
5. B가 쓰고 revision을 2로 "올린다". A의 변경이 아무 경고 없이 사라진다.

revision을 도입한 목적이 바로 5번을 막는 것인데, 비교와 쓰기 사이에 틈이 있으면 그대로 다시 생긴다. 한 transaction으로 묶으면 B의 읽기가 A의 쓰기 뒤로 밀린다. B는 revision 2를 보고 409를 받는다.

8장 답과 같이, 이 sqlite adapter가 두 요청의 transaction을 실제로 어떻게 줄 세우는지는 확인하지 않았다.

## 스터디 과제 노트 — 삭제를 충돌로부터 보호하기

### 고른 것

| 정할 것 | 고른 것 | 이유 |
| -- | -- | -- |
| 409 화면 위치 | 상세 페이지를 지금 상태로 다시 그린다 | 삭제 버튼이 있던 화면이고, 지금 내용이 곧 "무엇이 바뀌었나"의 답이다 |
| 바뀐 것을 어디까지 | 저장이 몇 번 있었는지(`revision 1 → 2`)와 현재 내용 | 옛 값은 form에 없어서 필드별 비교는 못 한다. 옛 값을 숨은 필드로 다 싣는 것은 과하다고 봤다 |
| 두 번째 intent | `delete-anyway`. 충돌 안내 안의 `Delete anyway` 버튼에만 있다 | 평소 화면에는 revision을 확인하는 삭제 하나만 둔다 |

### 동작

- 상세 페이지의 삭제 form에 `revision` 숨은 필드와 `name="intent" value="delete"` 버튼이 들어갔다. `_method=DELETE`는 그대로다.
- `deleteAlbum`이 `updateAlbum`과 같은 모양이 됐다. 한 transaction 안에서 읽고, revision이 다르면 `conflict`와 지금 행을 돌려준다. `expectedRevision`이 `null`이면(= `delete-anyway`) 비교를 건너뛴다.
- 삭제 action은 not-found면 404, conflict면 409 상세 페이지, 성공이면 목록으로 303이다.
- 409 화면에는 `This album changed after you opened it, so it was not deleted.`와 저장 횟수, `Delete anyway` 버튼이 뜬다. 원래 `Delete album` 버튼도 새 revision을 달고 다시 그려지므로, 그것을 눌러도 이제는 지워진다.
- 전부 일반 HTML form이라 JavaScript 없이 동작한다.

### 모르는 intent는 확인하는 삭제로 처리한다

3번 기준대로 모르는 intent를 에러로 만들지 않았다. 다만 수정 form과 달리 기본값을 아무것이나 고를 수 없다. intent가 둘 중 하나는 revision 확인을 건너뛰기 때문이다. 손댄 form이 그쪽으로 떨어지면 안 되므로, 모르는 값은 확인하는 `delete`로 처리한다. revision을 읽을 수 없을 때도 0으로 보고 409를 돌려준다. 어떤 경우에도 확인 없이 지워지는 일은 없다.

### 기존 테스트 하나를 고쳤다

`deletes an album through method override middleware`는 revision 없이 삭제를 보냈다. 이제 revision이 없으면 0으로 읽혀 409가 나므로, 그 테스트에 `revision: '1'`을 넣었다. 테스트가 보려던 것(method override로 DELETE가 도착한다)은 그대로다.

### 테스트 (`conflict-safe delete`)

- 상세 페이지 form에 revision과 `delete` intent가 그려진다.
- 현재 revision으로 지우면 목록으로 303이고 행이 없다.
- 그 사이 저장이 한 번 있었으면 409이고, `revision 1 → 2`, 바뀐 notes, `delete-anyway` 버튼이 HTML에 있으며 행은 남아 있다.
- 409를 본 뒤 `delete-anyway`로 보내면 303이고 행이 없다.
- 모르는 intent(`nuke`)는 확인하는 삭제로 처리돼 409다.

### 손으로 확인할 것

탭 두 개에서 같은 앨범을 연다. 한쪽에서 수정해 저장한 뒤, 다른 탭(새로고침하지 않은 상세 페이지)에서 `Delete album`을 누른다. 충돌 안내가 떠야 하고, `Delete anyway`를 누르면 목록으로 이동해야 한다. 브라우저 JavaScript를 끄고 반복해도 같아야 한다.
