# 킹고 컴패니언 (SSA)

개인 데이터로 교과 밖 학교생활에서 지금 할 수 있는 최선의 선택을 돕는 에이전트의 데스크톱 웹 프로토타입이다. 지난 활동을 기록하고, 지금의 나를 알게 하고, 가장 좋은 다음 활동을 추천한다. 신청 버튼은 학생이 직접 누른다.

**라이브:** <https://zest-sw.github.io/ssa-kingo-companion/>

예시 데이터와 화면 안의 규칙으로만 동작한다. 실제 AI, 학교 API, 챌린지스퀘어 연동, 서버 저장소는 없다.

## 화면

주소는 해시(`#/…`)다. 사이드바는 메뉴 4개 1단이고, 하위 화면은 페이지 머리 아래 구역 탭이 맡는다.

| 화면 | 주소 | 하위·흐름 |
|---|---|---|
| 홈 | `#/home` | 가입 인터뷰는 처음 한 번 홈 자리에서 열린다 |
| 추천 | `#/recommend` | 탭 `?tab=all`(전체 기회), 모달 `?open=<기회 id>`, 신청 준비 `#/recommend/prepare/<id>` |
| 내 활동 | `#/activities` | 일정 `/schedule`, 기록 `/records`, 회고 인터뷰 `/records/interview[/<활동 id>]`, 경험 카드 묶음 `/records/portfolio` |
| 나의 분석 | `#/analysis` | `/techtree`, `/map`, `/flow`, `/strengths` |
| 내 프로필 | `#/profile` | `/friends`, `/recruit`, `/hall`. 사이드바 아래 학생 카드로 연다 |
| 설정 | `#/settings/<id>` | 톱니바퀴로 연다 |
| 컴포넌트 목록 | `#/_kit` | 개발용, 사이드바에 없다 |

옛 주소는 새 자리로 넘어간다(`src/app/router.ts` 의 `MOVED`).

## 개발

Node.js `^20.19.0` 또는 `>=22.12.0`(`.nvmrc`: 22).

```sh
npm ci                 # 처음 한 번
npm run dev            # 개발 서버
npm run check          # 타입 검사 + 단위 테스트
npm run build          # 배포 빌드 (dist/)
npm run audit:layout   # 모든 경로 × 크기 × 학생 상태 레이아웃 검사 (Playwright, 처음 한 번 npx playwright install chromium)
npm run audit:copy     # 보이는 글자의 기호·금지어·가운뎃점 사슬 검사
npm run audit:design   # AI 티 스캐너 (출력만 본다)
npm run audit:entries  # 같은 목적지로 가는 진입점 수 검사
```

`main` 은 `check` 와 `build` 가 통과하는 상태로 둔다. CI(`.github/workflows/ci.yml`)가 PR 마다 `check`, `build`, `audit:layout`, `audit:copy` 를 돌린다. 작업은 브랜치에서 하고 PR 로 병합한다. 커밋 메시지는 `영역: 무엇을 왜` 한 줄이다.

폭별 확인은 `/qa-frame.html?w=1440&path=%23%2Frecommend` 로 한다(1280, 1440, 1920 에서 완성, 1024 는 깨지지만 않으면 된다).

## 문서 지도

| 알고 싶은 것 | 문서 |
|---|---|
| 무엇을 왜 만드나, 화면과 원칙 | [docs/product/concept.md](docs/product/concept.md) |
| 무엇을 언제 정했나 | [docs/product/decisions.md](docs/product/decisions.md) |
| 색, 글자, 간격, 부품, 움직임의 계약 | [DESIGN.md](DESIGN.md) |
| 메뉴 트리와 이동 규칙 | [docs/design/ia-navigation.md](docs/design/ia-navigation.md) |
| 화면 틀, 경로 표, 다이어그램 부품, 레이아웃 검사 | [docs/design/web-desktop.md](docs/design/web-desktop.md) |
| 조사 자료 | [docs/research/](docs/research) |
| 화면 점검 기록 | [docs/qa/](docs/qa) |
| 여러 에이전트가 나눠 일하는 방식 | [docs/orchestration/](docs/orchestration/README.md) |
| 전체 목록과 옛 기획 | [docs/README.md](docs/README.md) |

`docs/planning/`, `docs/history/` 는 v0.5 이전 기획이라 보존만 하고 따르지 않는다. 루트 `qa/` 는 이전 버전 검수 기록이다.

## 스킬

`.claude/skills/` 에 있다. 화면을 만들거나 고치는 작업은 끝내기 전에 해당하는 스킬로 점검한다.

| 스킬 | 쓰는 때 |
|---|---|
| `kingo-ui-review` | 화면, CSS, 레이아웃을 건드렸을 때. 레이아웃 불변식, `audit:layout`, 두 학생 상태 스크린샷 |
| `kingo-toss-ux` | 화면과 흐름을 설계하거나 고칠 때. 토스 제품 원칙 10가지 점검표 |
| `kingo-ux-writing` | 제목, 버튼, 빈 상태, 안내, 오류, 토스트 같은 화면 문구를 쓸 때 |
| `avoid-ai-design` | AI가 만든 듯한 모양을 점검할 때. `npm run audit:design` |
| `web-interface-guidelines` | 키보드, 초점, 폼, 상태 설계, 주소 상태를 점검할 때 |

## 코드 위치

```
src/
  app/          앱 틀: 사이드바, 해시 라우터, 전역 상태(useApp), 컴포넌트 목록(kit/)
  components/   공용 UI. components/index.ts 에서만 가져온다
  domain/       추천 규칙, 발견 생성 같은 순수 로직과 테스트, 공용 타입
  data/         예시 데이터
  screens/      화면별 폴더. <이름>/index.tsx 의 default export 가 그 화면이다
  styles/       tokens.css (색·간격·글자 토큰), base.css
scripts/        audit-layout, audit-copy
```

색, 간격, 글자는 `src/styles/tokens.css` 변수만 쓴다. 상태는 `useApp()` 하나로 읽고 쓴다.

## 데이터 원칙

- 저장소에는 예시 데이터만 둔다. 실제 학생 기록, 학번과 이름, 토큰과 키는 넣지 않는다.
- 채용 공고 요건은 2026-10-08 직접 확인한 카카오뱅크 공개 공고 3건이며 직무 참고용이다.
- 프로필은 기본 비공개다. 발견과 역량 근거는 공개하지 않고, 학생이 확인한 발견만 추천에 쓴다.

## 버전

v0.7 까지는 모바일(390px) 기준이었다. 2026-10-12 결정으로 데스크톱 웹으로 다시 지었고, 지금은 v3.x 다. 태그는 `prototype-v0.3` ~ `prototype-v0.7` 이 있고, 옛 화면 코드는 `git show prototype-v0.7:src/App.tsx` 처럼 본다. 변경 이유는 [결정 로그](docs/product/decisions.md)에 있다.
