# 07 Animation — 확인 질문 답과 과제 노트

## 정독 후 확인 질문

### 1. 카드 hover 들어올림에 `animateLayout`을 쓰지 않는 이유

hover는 레이아웃을 바꾸지 않는다. 카드가 `transform`으로 몇 px 떠오를 뿐, 차지하는 칸의 위치와 크기는 그대로다. `animateLayout`은 렌더 사이에 요소의 geometry가 바뀌었을 때 FLIP으로 그 차이를 메우는 도구라서, geometry가 그대로면 할 일이 없다. 게다가 hover는 렌더를 일으키지 않는 순수 CSS 상태다. 그래서 `spring.transition('transform', 'bouncy')`가 만든 CSS `transition`이 맞는 도구다 — JavaScript가 돌기 전부터, 브라우저 compositor에서 바로 동작한다.

### 2. 큐 항목의 key를 배열 index로 바꾸면 깨지는 것

key는 "이 DOM 노드가 어느 항목인가"의 계약이다. index를 key로 쓰면 맨 앞 항목을 지웠을 때 실제로는 첫 항목이 사라졌는데, 런타임은 "마지막 key가 사라졌고 나머지는 내용만 바뀌었다"고 본다.

- `animateExit`가 엉뚱한 줄(마지막 줄)에서 돈다.
- 남은 줄은 텍스트만 바뀌고 자리 이동이 없으니 `animateLayout`이 움직이지 않는다.
- 새 항목을 앞에 넣으면 `animateEntrance`도 마지막 줄에서 돈다.

### 3. `spring.transition`이 문자열을 돌려주는 것이 SSR에서 중요한 이유

문자열이면 서버가 렌더할 때 `css()` 스타일 안에 `transition: transform <길이> linear(...)`로 그대로 들어간다. HTML과 함께 내려가므로 hydration 전에도, JavaScript가 꺼져 있어도 hover 모션이 동작한다. 함수나 Animation 객체였다면 브라우저에서 코드가 돌아야만 모션이 붙었을 것이다. 같은 이유로 `@media (prefers-reduced-motion: reduce) { transition: none }`도 서버 스타일에 함께 실린다(테스트 `respects prefers-reduced-motion in server-rendered styles`).

### 4. `countUp`이 cancel 함수를 돌려주지 않으면 생기는 버그

재생 수가 빠르게 두 번 바뀌면 이전 카운트업 루프가 멈추지 않고 새 루프와 동시에 돈다. 두 루프가 번갈아 `shownPlays`를 덮어써서 숫자가 앞뒤로 튀고, 먼저 시작한 루프가 늦게 끝나면 최종값이 옛 목표값으로 남을 수 있다. 컴포넌트가 사라진 뒤에도 `requestAnimationFrame` 루프가 남아 `handle.update()`를 계속 부른다. 지금은 `change`가 올 때마다 `cancelCount?.()`로 이전 루프를 먼저 끊는다.

### 5. `pressAnimation?.cancel()`을 지우면 빠른 연타에서 바뀌는 것

`element.animate()`는 부를 때마다 새 Animation을 그 요소에 겹쳐 쌓는다. cancel 없이 연타하면 여러 개가 동시에 돌면서 가장 나중 것이 위에 덮이고, 앞의 것들이 끝나는 시점마다 transform이 툭툭 끊긴다. 요소에 붙은 Animation 수도 연타 횟수만큼 늘어난다. cancel이 있으면 매번 진행 중인 것을 버리고 처음부터 다시 시작하므로, 한 번에 하나만 돈다.

### 6. reduced motion을 CSS와 JS 양쪽에서 확인하는 이유

모션이 두 경로로 나가기 때문이다.

| 모션 | 실행 주체 | 끄는 곳 |
| -- | -- | -- |
| hover 들어올림, CSS transition | 브라우저 CSS 엔진 | `@media (prefers-reduced-motion: reduce)` |
| 카운트업, 버튼 press | JavaScript (rAF, `element.animate`) | `prefersReducedMotion()` |

미디어 쿼리는 CSS로 선언한 transition만 끈다. JavaScript가 직접 돌리는 루프나 Web Animations API 호출은 CSS가 막을 수 없으니 JS에서 따로 확인해야 한다.

## 스터디 과제 노트 — 검색 결과에 모션 붙이기

`app/assets/album-search.tsx`의 결과 `<li key={album.slug}>`에 `link()`와 함께 세 mixin을 붙였다.

- `animateEntrance` / `animateExit`: 위에서 살짝 내려오며 나타나고, 아래로 빠지며 사라진다(`spring('snappy')`).
- `animateLayout({ ...spring('bouncy'), size: false })`: 검색어가 바뀌어 남은 항목의 순서나 위치가 바뀌면 새 자리로 미끄러진다. 결과 행은 크기가 같으니 scale projection 없이 위치만 옮긴다.

key는 slug다. 서버가 주는 고유값이라, 검색어가 바뀌어도 같은 앨범은 같은 노드로 남아 layout 이동을 하고, 빠진 앨범만 exit를 탄다.

### reduced motion 경계 — JS를 골랐다

세 mixin은 Web Animations API로 돈다. 그래서 1번 표의 CSS 경로로는 끌 수 없다. 렌더할 때마다 `prefersReducedMotion()`을 읽고, 켜져 있으면 세 mixin에 `false`를 넘겨 끈다. README에 적힌 대로 `false`는 해당 애니메이션을 비활성화한다. 렌더마다 읽으므로 OS 설정을 바꾼 뒤 다음 입력부터 바로 반영된다. 서버 렌더에는 `window`가 없으므로 그때는 끈 상태로 렌더한다 — 결과 목록은 처음에 비어 있어 서버 출력에 영향이 없다.

### 빠르게 타이핑할 때 추가 코드가 필요 없는 이유

- **이전 요청 취소**: `on('input', handler(event, signal))`의 `signal`이 핸들러가 다시 불릴 때 abort된다. 그 signal을 `fetch`에 넘기고 있어서 이전 요청이 네트워크에서 끊긴다. 응답이 이미 도착했더라도 `if (signal.aborted) return`이 옛 결과를 버린다. ch05에서 쓴 그대로이고 이번에 바꾼 것이 없다.
- **중간에 끊긴 애니메이션**: README에 따르면 `animateLayout`은 진행 중에 새 layout 변화가 오면 현재 보이는 transform에서 이어서 움직인다. exit 중인 keyed 노드가 다시 렌더되면 노드를 되찾아(reclaim) 자연 스타일로 다시 향한다. 그래서 `blue` → `blu` → `blue`처럼 같은 앨범이 사라졌다 돌아와도 노드가 겹치거나 목록이 깨지지 않는다.

### 확인 방법

1. `npm run start` 후 `/albums`에서 검색창에 `r`, `ru`, `rum`처럼 빠르게 친다. 빠지는 행은 아래로 사라지고 남는 행은 위로 미끄러진다.
2. DevTools Network에서 이전 `/api/albums?query=` 요청이 `(canceled)`로 표시되는지 본다.
3. macOS 시스템 설정 → 손쉬운 사용 → 디스플레이 → "동작 줄이기"를 켜거나, DevTools Rendering 패널에서 `prefers-reduced-motion: reduce`를 에뮬레이트한 뒤 같은 입력을 반복한다. 결과가 모션 없이 바로 바뀌어야 한다.

자동 테스트는 서버가 이 모듈을 브라우저용으로 내보내고 그 안에 exit 모션과 reduced-motion 확인이 들어 있는지까지만 본다. 실제 모션은 브라우저에서 눈으로 확인해야 한다.
