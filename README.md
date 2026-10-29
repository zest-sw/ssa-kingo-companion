# 킹고 컴패니언 (SSA)

개인 데이터로 교과 밖 학교생활에서 지금 할 수 있는 최선의 선택을 돕는 에이전트의 **데스크톱 웹 프로토타입**입니다. 지난 활동을 기록하고(과거), 지금의 나를 알게 하고(현재), 가장 좋은 다음 활동을 추천합니다(미래). 정보 찾기부터 신청 준비까지는 에이전트가 맡고, 신청 버튼은 학생이 직접 누릅니다.

> 예시 데이터와 화면 안의 규칙으로만 동작합니다. 실제 AI, 학교 API, 챌린지스퀘어 연동, 서버 저장소는 없습니다.
> 기준 문서: [docs/product/concept.md](docs/product/concept.md) · 화면 명세: [docs/design/web-desktop.md](docs/design/web-desktop.md)

## 실행

Node.js `^20.19.0` 또는 `>=22.12.0`이 필요합니다(`.nvmrc`: 22).

```sh
npm ci           # 처음 한 번
npm run dev      # 개발 서버
npm run check    # 타입 검사 + 단위 테스트 (tsc --noEmit && vitest run)
npm test         # 단위 테스트 감시 모드
npm run build    # 배포 빌드 (dist/)
```

- 화면: `#/home`, `#/recommend`, `#/activities`, `#/records`, `#/analysis`, `#/challenges`, `#/friends`. 하위 경로는 `#/analysis/techtree` 처럼 씁니다.
- 공용 컴포넌트 목록: `#/_kit`
- 폭별 확인: `/qa-frame.html?w=1440&path=%23%2Frecommend` (1280 / 1440 / 1920 에서 완성, 1024 에서는 사이드바가 아이콘만 남습니다)

## 폴더 구조

```
src/
  app/          앱 틀: 사이드바, 해시 라우터, 전역 상태(useApp), 컴포넌트 목록(kit/)
  components/   공용 UI. components/index.ts 에서 가져온다
  domain/       추천 규칙, 발견 생성, 보드 칸 같은 순수 로직과 테스트, 공용 타입
  data/         예시 데이터 (catalog: 기회·채용 요건, seed: 첫 상태, options: 선택지 문구)
  screens/      화면별 폴더. <이름>/index.tsx 의 default export 가 그 화면이다
  styles/       tokens.css (색·간격·글자 토큰), base.css
public/         qa-frame.html (폭별 확인)
docs/           product(기준), design(명세·목업), orchestration(작업 방식)
qa/             이전 버전 검수 기록
```

## 화면을 만들 때

- 상태는 `useApp()` 하나로 읽고 씁니다. `state`(원본), `view`(추천 후보·발견 같은 계산값), `run(action, { toast, undoable })`.
  되돌릴 수 있는 행동(관심 없음, 나중에 보기, 기록 삭제)은 `undoable: true` 로 토스트에 '되돌리기'를 답니다.
- 화면은 `{ sub }` 를 받습니다. 탭·하위 화면은 `navigate('analysis/map')` 으로 옮기고 화면 폴더 안에서 처리합니다.
- 색·간격·글자는 `src/styles/tokens.css` 의 변수만 씁니다. 상세는 오른쪽 `Drawer`, 짧은 확인만 `Modal`.
- 점수·레벨·순위는 화면에 내지 않습니다. 추천 점수(`Scored.score`)는 정렬에만 씁니다.

## 버전

| 태그 | 날짜 | 내용 |
|---|---|---|
| `prototype-v0.3` | 2026-10-07 | 성장 지도·활동 탐색·ETL 흐름 비주얼 MVP |
| `prototype-v0.4` | 2026-10-07 | 6화면 인터랙티브 데모, 관계 확인·회고 초안 |
| `prototype-v0.5` | 2026-10-08 | 연결 성장 UX: 분석-그래프 강조, 회고 통합, 6축 근거 렌즈 |
| `prototype-v0.6` | 2026-10-08 | 경험과 채용 공고 요건 연결 |
| `prototype-v0.7` | 2026-10-08 | 에이전트 큐레이션 UX(모바일): 주 1개 추천, 30초 회고, 3탭 |

v0.7 까지는 모바일(390px) 기준이었고, 지금은 데스크톱 웹으로 다시 짓는 중입니다(2026-10-12 결정). 이전 화면 코드는 `git show prototype-v0.7:src/App.tsx` 처럼 태그로 봅니다.

## 작업 방식

- `main`은 항상 `npm run check`와 `npm run build`가 통과하는 상태로 둡니다. CI(`.github/workflows/ci.yml`)가 PR 마다 확인합니다.
- 새 작업은 브랜치에서 하고 PR로 리뷰한 뒤 병합합니다. 여러 에이전트가 나눠 일하는 방식은 [docs/orchestration/](docs/orchestration/README.md)에 있습니다.
- 커밋 메시지는 `영역: 무엇을 왜` 한 줄로 씁니다. 예: `추천: 같은 분야 연속 추천 감점`

## 데이터 원칙

- 저장소에는 예시 데이터만 둡니다. 실제 학생 기록, 학번·이름, 토큰·키는 넣지 않습니다.
- 채용 공고 요건은 2026.10.08 직접 확인한 카카오뱅크 공개 공고 3건이며 직무 참고용입니다.
- 프로필은 기본 비공개입니다. 발견과 역량 근거는 공개하지 않고, 학생이 확인한 발견만 추천에 씁니다.

## 관련 문서

- [문서 목록](docs/README.md)
- [Notion 서비스 철학·컨셉 정리](https://app.notion.com/p/3f4b044fa973801d8d70e04f32e80648)
