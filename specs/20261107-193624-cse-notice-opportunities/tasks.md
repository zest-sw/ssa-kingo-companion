---

description: "소프트웨어학과 공지 수집·분류 구현 태스크"
---

# Tasks: 소프트웨어학과 공지 수집·분류 → 기회 데이터

**Input**: `specs/20261107-193624-cse-notice-opportunities/`의 설계 문서

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 넣는다. spec FR-035가 네트워크 없는 자동 검사를 요구한다. 단계마다 검사를 먼저 쓰고 실패하는 것을 본 뒤 구현한다.

**Organization**: 사용자 스토리별로 묶었다(US1 → US2 → US3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일을 다루고 끝나지 않은 앞 태스크에 기대지 않아 동시에 할 수 있다
- **[Story]**: US1, US2, US3 (spec.md의 사용자 스토리)
- **(사용자)**: 사람이 하는 태스크. Claude는 기다린다

## Path Conventions

- 소스와 검사: `etl/notices/*.ts`, `etl/notices/*.test.ts` (vitest 기본 include)
- 결과 `etl/out/cse-notices.json`, 원문 보관 `etl/.cache/cse/<글번호>.html`, 정답셋 `etl/gold/*.csv`

## 모든 태스크에 적용

- ponytail full로 만든다. 꼭 필요한가 → 이미 있는 것 → 표준 라이브러리 → 기설치 의존성 → 최소 구현 순서로 보고, 새 의존성은 들이지 않는다.
- 타입만 가져올 때는 `import type`, 상대 import에는 `.ts`를 붙인다. ES2021 이후 API(`replaceAll`, `at`, `findLast`, `Object.hasOwn`)는 쓰지 않는다(research R1, R2).
- 파일은 500줄 이하, `any`는 쓰지 않는다. 의도적으로 자른 곳에는 `// ponytail: <한계>, <언제 고칠지>`를 단다.
- 본문·첨부 문장을 결과, 근거, 정답셋 메모, 검사 입력에 넣지 않는다. 검사 HTML은 직접 만든 짧은 조각이고, 실제 공개 제목은 써도 된다.
- 커밋은 사용자가 요청할 때만 해서 커밋 태스크는 없다. `/speckit-implement` 전에 실사용에서 달라지는 점을 사용자에게 보이고 승인을 받는다(태스크 아님).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 실행 환경 확인, 팀 파일 두 줄, 로컬 제외 한 줄

- [X] T001 `node -v`가 v22.18.0 이상인지 확인하고 `npm ci`로 설치한 뒤, 아무것도 바꾸기 전에 `npm run check`가 통과하는 기준선을 기록한다 (package-lock.json, node_modules/)
- [X] T002 [P] tsconfig.json의 `include`를 `["src", "vite.config.ts", "etl"]`로 바꾼다 (research R2)
- [X] T003 [P] .gitignore의 '환경·로컬 파일' 묶음에 `etl/.cache/`를 한 줄 더한다 (FR-033)
- [X] T004 [P] 로컬 전용 제외 목록 .git/info/exclude에 `etl/gold/`를 더한다 (FR-034)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 세 스토리가 함께 쓰는 것. 게시판 목록·본문 읽기, 서버 예의를 지키는 요청, 원문 보관, 종류 표. 원문 보관은 정답셋 작업(US2)도 써서 여기 두고, US3는 그 위에 재실행 보장과 실패 보호를 더한다.

**⚠️ CRITICAL**: 이 단계가 끝나야 스토리 작업을 시작한다

### 검사 먼저

- [X] T005 [P] etl/notices/cse.test.ts를 쓴다. 가짜 get과 임시 폴더(`fs.mkdtempSync`)를 쓰고 네트워크는 쓰지 않는다 (FR-002~FR-006, research R3·R4)
  - **parseList**: 직접 만든 목록 HTML 조각(정보 첫 칸이 '공지'인 고정글 1줄, 'No.N' 일반 글 2줄)을 NoticeRow[]로 읽는다. 게시판 분류의 대괄호 제거, 제목 공백 정리, 게시일·글 번호·pinned를 확인한다.
  - **bodyLines**: `.fr-view` 안만 줄로 읽는다.
    - 안쪽 div 중첩, `<br>`·`</p>` 줄바꿈, 표 한 행이 한 줄로 이어지는지 본다.
    - 페이지 아래 이전글·다음글 영역의 '(~5.17.(일)까지 신청)' 같은 날짜는 나오지 않는다.
    - `.fr-view`가 없으면 null이다.
  - **listSince**: 두 쪽짜리 가짜 목록을 준다.
    - 맨 위 고정글이 기준일보다 오래돼도 멈추지 않고, 기준일보다 오래된 첫 일반 글에서 멈춘다.
    - 쪽마다 반복되는 고정글은 한 번만 들어가고, 기준일 당일 글은 포함한다.
  - **bodyOf**:
    - 본문 영역이 있는 페이지만 `<dir>/<글번호>.html`로 보관한다.
    - 두 번째 호출은 get을 부르지 않고 `fetched: false`다.
    - get 실패면 `{ lines: null, fetched: false }`, 본문 영역이 없으면 `{ lines: null, fetched: true }`이고, 둘 다 보관하지 않는다.
  - **makeGet**: 연속 요청 사이가 1초 이상이고, User-Agent가 `ssa-kingo-companion-etl (+https://github.com/zest-sw/ssa-kingo-companion)`이며, 2xx가 아니면 오류다.
- [X] T006 [P] etl/notices/classify.test.ts를 만든다. `KIND_LABEL`이 11종인지, 앞 9개가 src/domain/recommend-flow/opportunities.ts의 `CATEGORY_LABEL`과 같은지, scholarship='장학', course='교과'인지 본다 (data-model 종류, plan Complexity Tracking)

### 구현

- [X] T007 [P] etl/notices/classify.ts를 만든다. 판정 규칙은 US1에서 넣고, T006 검사가 통과해야 한다
  - `import type { Category } from '../../src/domain/types.ts'`로 `Kind = Category | 'scholarship' | 'course'`를 정의한다.
  - `KIND_LABEL`(11종 한글 이름)을 둔다. 따로 쓸 곳이 없어 `KINDS` 목록은 두지 않는다(ponytail).
- [X] T008 etl/notices/cse.ts에 상수와 요청 함수를 둔다 (FR-006, research R4)
  - 상수: `SOURCE = 'https://cse.skku.edu/cse/notice.do'`, `listUrl(offset)`(`?mode=list&articleLimit=100&article.offset=N`), `viewUrl(no)`(`?mode=view&articleNo=N`), `USER_AGENT`
  - `makeGet(gapMs = 1000)`: 요청을 하나씩 보내고 앞 요청과 gapMs 이상 띄운다(`node:timers/promises`). `AbortSignal.timeout(15000)`을 쓰고, 2xx가 아니면 오류를 던지고, 텍스트를 돌려준다.
- [X] T009 etl/notices/cse.ts에 jsdom으로 두 함수를 만든다 (FR-003, research R3)
  - `parseList(html): NoticeRow[]`: 줄 단위는 `dl.board-list-content-wrap`, 분류는 `.c-board-list-category`, 제목·글 번호는 링크에서, 정보 `li`는 첫째(공지/No.N)와 셋째(게시일)를 쓴다.
  - `bodyLines(html): string[] | null`:
    - `div.fr-view` 아래 노드를 훑는다.
    - 블록 요소(p, div, br, li, tr, h1~h6, table, ul, ol)에서 줄을 바꾸고 td·th 앞에 빈칸을 넣는다(공백을 정리하면 탭도 빈칸이 되므로).
    - 공백·nbsp를 정리하고 빈 줄을 버린 뒤 `window.close()`를 부른다.
- [X] T010 etl/notices/cse.ts에 두 함수를 만든다. T005 검사가 모두 통과해야 한다 (FR-001, FR-002, FR-005)
  - `listSince(since, get)`: offset 0, 100, …으로 읽고 글 번호로 중복을 지운다. 고정글은 멈춤 판단에서 빼되 기준일 안이면 넣고, 기준일보다 오래된 첫 일반 글에서 멈춘다.
  - `bodyOf(no, get, dir = CACHE_DIR)`: 보관함을 먼저 보고, 없으면 받아서 본문 영역이 있을 때만 보관한다. 늘 `{ lines, fetched }`를 돌려준다. 실패하거나 영역이 없으면 lines가 null이고, fetched는 US3의 구조 변경 판단에 쓴다.

**Checkpoint**: `npm run check`가 통과하고, 게시판을 읽고 원문을 보관할 수 있다

---

## Phase 3: User Story 1 - 최근 공지로 기회 데이터 만들기 (Priority: P1) 🎯 MVP

**Goal**: 명령 한 번으로 기준일 이후 공지를 판정해 `etl/out/cse-notices.json`과 요약 한 줄을 만든다 (FR-007~FR-024)

**Independent Test**:
- `node etl/notices/run.ts`가 요약 한 줄을 내고, 결과 파일이 [contracts/cse-notices.schema.json](./contracts/cse-notices.schema.json) 모양이다.
- `cse:228201`이 job·동진쎄미켐·2026-11-15·'본문: 접수기간'으로 나온다.

### 검사 먼저

- [X] T011 [P] [US1] etl/notices/classify.test.ts에 `classify(title, board)` 표와 `hostOf(title)` 표를 더한다 (FR-007~FR-010, FR-017, research R5·R8)
  - **기회**:
    - '[동진쎄미켐] 2026년 11월 신입/경력 정기채용 (~11/15(일))'/채용/모집 → job '제목: 채용'
    - '[풍산그룹] 2026 풍산그룹 본사 초청 채용설명회(사전신청 必)'/채용/모집 → lecture
    - '[CJ올리브네트웍스] AI Campus 2기 교육생을 모집합니다 (~11.29/교육비 무료/신입공채 서류면제)'/채용/모집 → edu
    - '[미래차부트캠프] 제4회 성균관대학교 AI 자율주행 경진대회'/행사/세미나 → contest
    - '2026년 사임당장학회 장학금 신청 (~10/6화까지)'/장학 → scholarship
    - '부산광역시 주최 「DIVE 2026 글로벌 해커톤」 학생 참여자 모집'/행사/세미나 → hackathon
    - '2026 ICPC 대학생 프로그래밍 경시대회 안내'/행사/세미나 → contest
    - '2026학년도 2학기 미래차 SDV/전동화/자율주행 마이크로디그리 신청 안내 - 10/19(월)~10/23(금)'/학사 → course
  - **함정**:
    - '[아우토크립트] 차량 소프트웨어 테스팅 지원 채용'/채용/모집 → job
    - '2026-2학기 소프트웨어학과 진학설명회 안내 (9/30(목) 18:00 / 사전접수 : 9/18(금))'/행사/세미나 → lecture
    - '[SK그룹] 채용연계과정 SKALA 4기 생성형 AI 서비스 개발 과정 모집 (~5/13)'/채용/모집 → edu
    - '[ICT학점연계 인턴십] 2026년 하반기 국내 과정 참여 학생 모집 (~7/8 수 12시)'/취업 → job
    - '2026-1학기 문제해결 교과목 중간시험 부감독 모집(모집 완료)'/채용/모집 → job
    - '[토스] 소프트웨어학과 대상 겨울방학 인턴 채용설명회 (화학관 330110호 장소변경/1,2학년 정원 마감)'/채용/모집 → lecture
  - **게시판 기본값**:
    - '[AI중심대학사업단] 글로벌 IT전문가와 킹고인의 만남 시즌2 여든세 번째 만남 (9/30, 수, 12시)'/행사/세미나 → lecture '게시판: 행사/세미나'
    - 'When Noise Is the Point: What Humanistic Tasks Reveal About Our Data Pipelines(11/18 10:30)'/행사/세미나 → lecture '게시판: 행사/세미나'
  - **기회 아님**:
    - '[졸업평가] 연구논문작품 최종자료 제출 안내 (10/12월~10/30금 23:59)'/학사
    - '2026학년도 2학기 성적우수장학금 안내'/장학
    - '추석 연휴로 인한 학과사무실 단축 운영 안내(9/23(수))'/일반
    - '2026년 성균 AI·SW멘토링 프로그램 1차 배정 결과 안내'/일반
  - **확인 필요**:
    - '[SK그룹] Pre-SKALA 참여자 모집 (~10/14 09시까지)'/채용/모집 → '규칙에 안 걸림 (채용/모집)'
    - '2026년 산학협력프로젝트 유형2 심화 AI R&D 하반기 모집 안내'/학사 → '모집 단어 있음 (학사)'
    - 임의 제목/입학 → '처음 보는 게시판 (입학)'
  - **hostOf**:
    - 주최를 찾음: '[동진쎄미켐] …' → '동진쎄미켐', '[AI중심대학사업단] …' → 'AI중심대학사업단', '부산광역시 주최 「DIVE …」' → '부산광역시'
    - null: '[졸업평가] …', '[특강 안내] …', '[AX SW특강] …', '[26년 2학기] …', '[ICT학점연계 인턴십] …', '[모집공고] …', '[성균관대학교 창업지원단 추천기업] …', '[제16회 글로벌 피우다프로젝트] …', 'SKKU AI Colloquium 2026'
- [X] T012 [P] [US1] etl/notices/deadline.test.ts를 만든다 (FR-012~FR-016, research R6·R7)
  - **`readDates(text, postedAt)` 표**(ISO 날짜 배열):
    - 게시일 2026-04-03일 때 '2026.04.20', '2026. 4. 20.', '04.20', '4/20', '2026년 4월 20일', "'26.4/20", '4/20월', 'Apr 20th, 2026' → 모두 2026-04-20
    - '(11/9월~11/11수)'(게시 2026-11-04) → [2026-11-09, 2026-11-11]
    - '4/20(월)~24(금)' → [2026-04-20, 2026-04-24]
    - 빈 배열이 나와야 함: '13:30 ~ 15:30', '10:00–17:00', '평점평균 2.0 이상', '2026-1학기', '1-2학년', '13/45', '2/30'
    - 게시 2026-12-20의 '1/5' → 2027-01-05
  - **`deadlineOf(lines, title, postedAt, kind)` 사례**:
    (본문 줄은 모두 직접 만든 줄이다. 수집한 본문을 옮기지 않는다)
    1. 날짜 없이 끝나는 접수기간 제목줄 + 다음 줄의 기간 → 기간 끝, '본문: 접수기간'
    2. 신청기간 줄 + 교육기간 줄 → 신청기간 끝
    3. 모집 기간 줄 + 지원 대상 제목줄 + 출생일이 적힌 대상 줄 → 모집 기간 끝
    4. 시각 범위와 '경영지원'만 있는 줄 + 날짜 없는 제목, job → null
    5. 같은 날을 다른 꼴로 적은 두 신청 줄 → 그 날(엇갈림 아님)
    6. 1차·2차 접수기간 두 줄 → null
    7. 게시일보다 앞선 접수기간 → null
    8. '…까지 … 제출' 한 문장 → 그 날, '본문: 제출'
    9. 본문 [] + '[뷰웍스] 2027 뷰웍스 대졸 신입 공채(~9/21)', job → 2026-09-21 '제목'
    10. 본문 [] + '… 진학설명회 안내 (9/30(목) 18:00 / 사전접수 : 9/18(금))', lecture → 2026-09-18 '제목'
    11. 본문 [] + '… 여든세 번째 만남 (9/30, 수, 12시)', lecture → 2026-09-30 '행사 날: 제목'
    12. 날짜와 시각 범위가 있는 일시 줄 + 날짜 없는 제목, lecture → 그 날, '행사 날: 본문'
    13. 본문 [] + 'Humanistic, … Alignment(10:00 - 11:00, May 8th, 2026)'(게시 2026-04-21), lecture → 2026-05-08 '행사 날: 제목'
    14. 본문 [] + 제목 괄호에 날짜 하나만 있는 contest → null
- [X] T013 [P] [US1] etl/notices/run.test.ts를 만든다 (FR-018~FR-024, data-model 검증 규칙)
  - **`judge(row, lines)`**:
    - 동진쎄미켐 글이면 id 'cse:228201', url, host, kind, deadline, rule, deadlineRule이 맞다.
    - 기회 아님은 `{ verdict: 'not' }`이다.
    - 확인 필요는 why가 있는 ReviewItem이다.
    - lines가 null이면 제목과 상관없이 '본문 못 받음'이다.
  - **`buildResult(rows, judged, { since, collectedAt, fetched })`**:
    - SSAFY 16기 216747 '(~5/11)'(04-23)와 217063 '(~5/11월)'(04-29) → 217063만 남고 merged=1이다.
    - KB국민은행 219217·219218·219219(부문만 다르고 마감 같음) → 셋 다 남는다.
    - 마감이 null인 같은 제목 둘 → 둘 다 남는다.
    - 기회·확인 필요 모두 글 번호 큰 순이다.
    - 기회+기회 아님+확인 필요+합친 중복 = 행 수이고, 마감 빈칸 = deadline이 null인 기회 수다.
  - **`formatSummary`**: '새 글 3 · 기회 … · 마감 빈칸 …' 꼴과 똑같다.
  - **결과 모양**:
    - 계약에 있는 키만 있다.
    - id와 url의 글 번호가 같다.
    - rule이 `^(제목|게시판): `이다.
    - deadline이 null이면 deadlineRule도 null이다.

### 구현

- [X] T014 [P] [US1] etl/notices/classify.ts에 `classify(title, board): Judged`를 만든다. T011의 classify 표가 통과해야 한다 (FR-007~FR-011)
  - 기회 아님 구 목록과 종류 단어표·우선순위를 둔다. 출발 표는 research R5다. 길고 구체적인 단어만으로 표본 함정을 모두 피해서 감싸는 말 지우기는 두지 않았고, '신입'(⊂신입생)·'경력'(⊂경력개발)은 뺐다.
  - 게시판 기본값은 FR-009 표대로이고, 처음 보는 분류는 확인 필요다.
  - 근거 문자열은 data-model '근거에 쓰는 말'을 따른다.
- [X] T015 [US1] etl/notices/classify.ts에 `hostOf(title): string | null`을 만든다. 맨 앞 대괄호를 보되 꼬리표 단어(특강, 안내, 강연, 학기, 졸업, 모집, 인턴, 추천, 공고, 제N회)가 있으면 버린다. 다음으로 '○○ 주최'를 보고, 그래도 없으면 null이다. T011의 hostOf 표가 통과해야 한다 (FR-017)
- [X] T016 [P] [US1] etl/notices/deadline.ts에 날짜 함수 두 개를 만든다. T012의 readDates 표가 통과해야 한다 (FR-014, FR-015)
  - `readDates(text, postedAt): string[]`: research R6의 토큰 순서를 따른다. 요일은 함께 먹고, `-`는 ISO에서만 날짜로 보고, 일만 있는 기간 끝을 처리한다. 시각은 무시하고, 달력에 없는 날은 버리고, 연도를 추정한다.
  - `stripDates(title): string`: 날짜·시각·요일 표시·`~`·빈 괄호를 지운다. 중복 열쇠에 쓴다.
- [X] T017 [US1] etl/notices/deadline.ts에 `deadlineOf(lines, title, postedAt, kind): { date: string; rule: string } | null`을 만든다. T012 deadlineOf 사례가 모두 통과해야 한다 (FR-012, FR-013, FR-016, research R7)
  - 찾는 순서: 신청 줄(라벨 목록, 다음 줄 날짜, 자격·대상·출생 줄과 행사 줄 제외) → 제목의 마감 표시 날짜 → 특강의 행사 날.
  - 날짜가 엇갈리거나 게시일보다 앞서면 null이다.
  - 근거는 '본문: <라벨>', '제목', '행사 날: 제목|본문' 중 하나다.
- [X] T018 [US1] etl/notices/run.ts에 `judge(row: NoticeRow, lines: string[] | null)`를 만든다. classify 다음, 기회면 hostOf와 deadlineOf로 Opportunity·ReviewItem·기회 아님 중 하나를 돌려준다. lines가 null이면 '본문 못 받음'이다 (FR-007, FR-011, FR-020, FR-027)
- [X] T019 [US1] etl/notices/run.ts에 두 함수를 만든다. T013 검사가 모두 통과해야 한다 (FR-018, FR-019, FR-022~FR-024)
  - `buildResult(rows, judged, opts)`: stripDates 열쇠와 같은 마감(null 아님)으로 묶어 글 번호가 가장 큰 것만 남긴다. 글 번호 큰 순으로 정렬하고 Summary를 계산한다.
  - `formatSummary(summary)`: contracts/cli.md 꼴대로 쓴다.
- [X] T020 [US1] etl/notices/run.ts에 `collect`와 `main()`을 만든다 (FR-001, FR-019, contracts/cli.md)
  - `collect(since, get, dir)`: listSince 다음 행마다 bodyOf를 부른다. 새로 받은 수를 세고, 표준 오류에 가끔 '목록 n쪽', '본문 i/N'을 찍는다.
  - `main()`: 이 파일을 직접 실행할 때만 돈다(`process.argv[1]`과 `fileURLToPath(import.meta.url)` 비교).
    - 기준일 인자는 `YYYY-MM-DD`다. 틀리면 '기준일은 YYYY-MM-DD 꼴로 주세요: <값>'을 찍고 코드 2로 끝낸다. 없으면 컴퓨터 날짜의 90일 전이다.
    - collect → judge → buildResult 순서로 돌린다. `etl/out/`을 만들고 `etl/out/cse-notices.json`을 들여쓰기 2칸, 끝 줄바꿈으로 쓴 뒤 요약을 표준 출력에 찍는다.
- [X] T021 [US1] 실제 게시판으로 quickstart §2를 확인하고 etl/out/cse-notices.json을 만든다 (SC-008, SC-011)
  - `time node etl/notices/run.ts`가 5분 안에 끝나고 요약이 나온다. 이 실행이 `import type` 실수도 잡는다.
  - `since`가 90일 전이고, `cse:228201` 값이 기대대로다.
  - 마감이 있는 기회는 모두 deadlineRule이 있다.

**Checkpoint**: US1만으로 기회 데이터 파일을 만들 수 있다(MVP). 첫 실행에서 원문이 보관되고, 다음 실행부터 새 글만 받는다

---

## Phase 4: User Story 2 - 정답셋으로 판정이 맞는지 확인하기 (Priority: P2)

**Goal**: 정답셋 초안·비교 도구를 만든다. 개발용 약 301건으로 규칙을 맞추고, 규칙 확정 뒤 평가용 100건으로 한 번 잰다 (FR-028~FR-032, SC-001~SC-007)

**Independent Test**: 라벨을 단 몇 줄짜리 CSV로 `node etl/notices/eval.ts <csv>`를 돌리면 지표 표와 틀린 글 목록이 나온다. 값을 잘못 적은 줄이 있으면 줄 번호와 함께 코드 2로 끝난다

### 검사 먼저

- [X] T022 [P] [US2] etl/notices/eval.test.ts를 만든다 (contracts/gold-csv.md, data-model 지표)
  - **CSV 왕복**: 쉼표·따옴표·줄바꿈이 든 칸이 그대로 돌아온다. 쓴 파일은 BOM으로 시작하고 줄 끝이 CRLF다. LF만 있고 BOM이 없는 파일도 읽는다.
  - **`decodeCsv`**: UTF-8이 아닌 바이트 [0xC7, 0xD1]을 EUC-KR로 읽어 '한'이 된다.
  - **`parseGold`가 받는 값**:
    - 날짜 '2026/11/15'·'2026.11.15'·'2026. 11. 15.' → 2026-11-15
    - 마감 '없음' → 'none', '그림·첨부' → 'image'
    - 기회 'o'·'x', 한글 종류 이름 → 식별자
    - 주최 '없음'·빈칸 → null
  - **`parseGold`가 오류를 모두 모아 행·칸·값으로 알리는 경우**: 모르는 종류 '대회', X인데 종류 있음, O인데 마감 비었음, 같은 링크 두 줄, 링크 꼴 틀림, 머리글 빠짐
  - **`score(gold, judged)`**: 손으로 센 10줄 예에서 SC-001~SC-007 값과 분모가 맞는다. 기회 놓침 분모는 정답이 기회인 글이다. 분모 0은 '해당 없음'이고, 항목별 틀린 글 목록이 나온다.
  - **`sampleBySha1(ids, n)`**: 입력 순서를 섞어도 같은 n개를 고른다.

### 구현

- [X] T023 [US2] etl/notices/eval.ts에 CSV 함수 세 개를 만든다 (research R11)
  - `writeCsv(rows)`: UTF-8 BOM, CRLF, 모든 칸을 따옴표로 감싼다.
  - `decodeCsv(bytes)`: TextDecoder UTF-8(fatal)로 읽고, 실패하면 'euc-kr'로 읽는다.
  - `readCsv(text)`: RFC 4180대로 읽고 BOM을 지운다.
- [X] T024 [US2] etl/notices/eval.ts에 `parseGold(rows)`를 만든다. 칸은 머리글 이름으로 찾고, 날짜 칸은 deadline.ts의 `readDates`로 바꾼다. contracts/gold-csv.md와 data-model GoldRow의 검증 규칙을 따르고, 오류는 전부 모아 돌려준다 (FR-031)
- [X] T025 [US2] etl/notices/eval.ts에 `score(gold, judged)`를 만든다. 지표 7개와 주최 채움을 계산하고, 분모 0이면 '해당 없음'이다. 항목별 틀린 글을 (id, 규칙 값, 정답 값, 근거)로 낸다. T022 검사가 모두 통과해야 한다 (FR-028, data-model 지표)
- [X] T026 [US2] etl/notices/eval.ts에 `new <시작일> <끝날> [개수]` 명령을 만든다. 직접 실행할 때만 돈다 (contracts/cli.md)
  - listSince(시작일)에서 끝날 이후 글을 거른다. 개수를 주면 sampleBySha1으로 고른다.
  - 고른 글마다 bodyOf로 본문을 보관한다.
  - `etl/gold/draft-<시작일>-<끝날>.csv`에 링크·게시판·제목·게시일을 채운다. 파일이 이미 있으면 덮어쓰지 않고 코드 2로 끝낸다.
- [X] T027 [US2] etl/notices/eval.ts에 비교 명령 `<정답셋.csv>`를 만든다 (contracts/cli.md)
  - 파일을 읽어 parseGold에 넣는다. 오류가 있으면 모두 찍고 코드 2로 끝낸다.
  - 줄마다 CSV의 제목·게시판·게시일과 bodyOf 본문을 run.ts의 `judge`에 넣는다.
  - score 결과를 지표 표와 틀린 글 목록으로 찍는다. 모든 기준을 통과하면 0, 아니면 1로 끝낸다.

### 정답셋 작업 (이 순서를 바꾸지 않는다)

- [X] T028 [US2] `node etl/notices/eval.ts new 2026-04-01 2026-11-06`으로 개발용 초안 etl/gold/draft-2026-04-01-2026-11-06.csv(약 301줄)를 만든다. 본문 약 301건이 보관되고(T021에서 보관한 148건은 다시 받지 않는다), 1초에 1건이라 5분 남짓 걸린다 (FR-029)
- [X] T029 [US2] Claude가 etl/gold/draft-2026-04-01-2026-11-06.csv에 라벨 초안을 단다 (FR-032)
  - classify·deadlineOf를 돌리지 않고, 규칙 결과도 보지 않는다.
  - 보관함 본문을 cse.ts의 `bodyLines`로 꺼내 읽는다. 꺼내는 스크립트는 세션 임시 폴더에 두고 저장소에 남기지 않는다.
  - 글마다 제목과 본문(앞부분, 날짜가 있는 줄)을 30건씩 읽고, spec '정답 기준'대로 기회·종류·마감(날짜/없음/그림·첨부)·주최·확신을 채운다.
  - 메모에는 판단 이유만 쓰고 본문 문장은 옮기지 않는다.
  - 애매한 글은 확신 '낮음'으로 두고, 낮은 줄을 위로 정렬해 저장한다.
- [X] T030 [US2] 개발용 정답셋을 교차 라벨로 확정한다 (FR-032. 2026-11-08 사용자 결정으로, 사용자가 301줄을 직접 고치는 대신)
  - codex 워커 3개가 T029와 같은 덤프와 기준으로 301건을 따로 라벨한다. 애매한 글 기준은 추천안을 쓴다. T029 라벨과 규칙 결과는 보지 않는다.
  - 두 라벨이 같은 칸은 확정한다. 갈린 칸은 새 판정 에이전트가 글을 다시 읽어 답과 이유를 단다.
  - (사용자) 갈린 줄 목록만 보고 판정을 고치고, 애매한 글 기준 5가지를 확정한다.
  - 확정한 라벨을 etl/gold/draft-2026-04-01-2026-11-06.csv에 쓴다. 링크·게시판·제목·게시일은 그대로 둔다.
  - 결과(2026-11-08): 260줄은 네 칸이 같았다. 갈린 41줄은 판정 에이전트가 어느 쪽이 초안인지 모른 채 정했다(초안 값 20칸, codex 값 30칸). 추천안 ②가 본문에 설명회가 곁들여진 채용 공고까지 특강으로 만들어서, 사용자가 ②·③을 고쳐 확정했고 10줄을 다시 정했다. 확신 칸에 출처(일치 258, 판정 8, 판정·낮음 27, 기준 8)를 적었다. codex 워커 셋이 초안 라벨·저장소를 열지 않은 것은 codex 작업 기록으로 확인했다.
- [X] T031 [US2] 사용자가 정한 애매한 글 기준을 specs/20261107-193624-cse-notice-opportunities/spec.md '정답 기준' 절에 적는다(5가지, 2026-11-08)
- [X] T032 [US2] `node etl/notices/eval.ts etl/gold/draft-2026-04-01-2026-11-06.csv`를 돌리면서, SC-001~SC-007을 모두 넘길 때까지 etl/notices/classify.ts·deadline.ts의 단어표와 라벨 목록을 고친다. 평가용은 아직 만들지 않는다
  - 고친 규칙마다 그 제목이나 줄을 classify.test.ts·deadline.test.ts 표에 한 줄 더한다.
  - `npm run check`는 계속 통과해야 한다.
  - T021 첫 실행에서 본 후보(정답셋으로 확인한 뒤 고친다):
    - 신청 줄 날짜가 엇갈려도 제목의 마감 표시 날짜와 같은 후보가 있으면 그 날짜로 고른다(CJ제일제당 '~9/30').
    - '실습기간' 줄은 건너뛴다.
    - '참가신청 :' 꼴을 라벨로 본다.
    - 특강의 '일정' 줄을 행사 날로 본다.
    - 영어 'Engineer'·'Forum'과 '신입행원'을 단어로 더한다.
    - 코드 리뷰에서 넘어온 것: '챌린지스퀘어'처럼 종류 단어를 품은 행사 이름(지금은 대회·공모전으로 읽음)은 정답셋 기준을 보고 정한다.
  - 결과(2026-11-08): 확인 필요가 11.0%에서 7.0%로 내려가 일곱 지표가 모두 통과했다(research R15). 후보 중 CJ 제목 일치, 실습기간, Engineer·Forum·신입행원, 챌린지스퀘어(특강)를 넣었다. 특강 '일정' 줄과 '참가신청 :'은 개발용에서 바뀌는 글이 없어 넣지 않았다. 정답 기준 2·4·5의 단어도 넣었다.
- [X] T033 [US2] 규칙을 확정하고, 개발용 최종 지표 표(값·분모)를 specs/20261107-193624-cse-notice-opportunities/research.md 끝에 'R15. 개발용 결과'로 적는다
- [X] T034 [US2] `node etl/notices/eval.ts new 2025-09-01 2025-12-31 100`으로 평가용 초안 etl/gold/draft-2025-09-01-2025-12-31.csv를 만든다. SHA-1 순서로 고정한 100건이다 (FR-029)
- [X] T035 [US2] Claude가 etl/gold/draft-2025-09-01-2025-12-31.csv에 T029와 같은 방법으로 라벨 초안을 단다. 이 파일로 비교하기 전까지 규칙 결과를 보지 않는다
  - 결과(2026-11-08): 새 Claude 서브에이전트 2개가 확정 기준(guide-v3)으로 50건씩 라벨했다. 작업 기록상 기준·덤프·검사 스크립트·자기 결과 파일만 열었다.
- [X] T036 [US2] 평가용 정답셋도 T030과 같은 교차 라벨로 확정한다. codex가 따로 라벨하고, 갈린 칸은 판정 에이전트가 정리하고, (사용자) 갈린 줄만 고친다. 이 파일로 비교하기 전까지 아무도 규칙 결과를 보지 않는다
- [X] T037 [US2] `node etl/notices/eval.ts etl/gold/draft-2025-09-01-2025-12-31.csv`를 딱 한 번 돌리고, 결과를 specs/20261107-193624-cse-notice-opportunities/research.md에 'R16. 평가용 결과(최종)'로 적는다. 기준에 못 미치면 원인을 사용자에게 보고하고 멈춘다. 평가용을 보고 규칙을 고치지 않는다 (US2 시나리오 4)
  - 결과(2026-11-08): 일곱 지표 중 넷 통과, SC-004 마감 정확(92.5%)·SC-006 주최(81.1%)·SC-007 확인 필요(14.0%) 미달(research R16). 규칙을 고치지 않고 원인을 사용자에게 보고하고 멈췄다.

**Checkpoint**: 개발용·평가용 수치가 기록되고 규칙이 확정된다

---

## Phase 5: User Story 3 - 다시 실행할 때 새 글만 받고, 실패해도 결과를 지키기 (Priority: P3)

**Goal**: 다시 요청하지 않는다는 보장, 목록 실패·구조 변경 때 멈추기, 본문 한 건 실패 처리, 반쪽 파일 막기, 실패 메시지와 종료 코드 (FR-021, FR-023, FR-025~FR-027, SC-009)

**Independent Test**:
- 두 번 연속 실행하면 두 번째의 '새 글'이 0이거나 새 글 수와 같다.
- 네트워크를 끊고 실행하면 코드 1로 끝나고 결과 파일 해시가 그대로다.

### 검사 먼저

- [X] T038 [P] [US3] etl/notices/run.test.ts에 재실행·실패 검사를 더한다. 가짜 get, 임시 폴더, 미리 써 둔 결과 파일을 쓴다 (SC-009, contracts/cli.md 실패 표)
  - 두 번째 collect는 본문 요청이 0건이고, fetched가 새 글 수와 같다.
  - 목록 get이 실패하면 `BoardError`이고, 메시지에 offset과 이유가 있다.
  - 목록 0건이면 구조 변경 오류다.
  - 새로 받은 본문 2건 이상이 모두 본문 영역이 없으면 구조 변경 오류다. 1건이면 그 글만 '본문 못 받음'이고 보관하지 않는다.
  - `writeResult`:
    - `.tmp`에 쓴 뒤 이름을 바꾼다.
    - 쓰기가 실패하면 기존 파일이 그대로다.
    - 같은 입력이면 collectedAt만 다르다.
  - main의 오류는 정해진 메시지 꼴과 종료 코드(1/2)로 끝난다.

### 구현

- [X] T039 [US3] etl/notices/cse.ts의 listSince에서 get이 실패하면 `BoardError`를 던진다(메시지에 offset·이유. 목록 실패와 구조 변경을 한 클래스로 받아 main이 한 번만 잡는다). 시간 초과·2xx 아님·연결 실패를 사람이 읽을 이유로 바꾼다 (FR-025)
- [X] T040 [US3] etl/notices/run.ts의 collect에 구조 변경 판단을 넣는다. 목록이 0건이거나, 새로 받은 본문 2건 이상 모두 본문 영역이 없으면 오류다. 본문 한 건 실패는 null로 남기고 judge가 '본문 못 받음'으로 처리한다 (FR-024, FR-026, FR-027)
- [X] T041 [US3] etl/notices/run.ts에 반쪽 파일 막기와 오류 처리를 넣는다. T038 검사가 모두 통과해야 한다 (FR-021, FR-023, FR-025)
  - `writeResult(path, file)`: `cse-notices.json.tmp`에 쓰고 `fs.renameSync`로 바꾼다.
  - main 오류 처리: contracts/cli.md 실패 표의 메시지를 표준 오류 한 줄로 쓰고 코드 1·2로 끝낸다. 결과 파일은 건드리지 않는다.
- [X] T042 [US3] 실제로 quickstart §3·§5를 확인하고 etl/out/cse-notices.json이 지켜지는지 본다 (SC-008, SC-009)
  - 재실행: 1분 안에 끝나고 '새 글'이 0이거나 새 글 수와 같다. collectedAt만 다른지 `git diff --no-index`로 본다.
  - 네트워크를 끊고 실행: 코드 1로 끝나고 `shasum etl/out/cse-notices.json`이 그대로다.

**Checkpoint**: 세 스토리가 모두 동작한다

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T043 [P] etl/notices/*.ts를 기계적으로 점검한다
  - `wc -l`로 모두 500줄 이하인지, `any`가 없는지, 타입만 쓰는 import가 모두 `import type`인지 본다.
  - 알려진 한계에 `// ponytail:` 주석이 있는지 본다: 보관 만료 없음, 읽는 날짜 꼴 한정, 중복 열쇠, 주최 대괄호 규칙, robots.txt(2026-11-07 확인, 정기 실행 전에 다시 볼 것).
- [X] T044 [P] quickstart.md §6으로 etl/.cache·etl/gold·etl/out/cse-notices.json의 원문 보호를 확인한다 (FR-033, FR-034, SC-010)
  - `git check-ignore -v etl/.cache/cse/228201.html`가 규칙을 보여 준다.
  - `git status --short`에 etl/.cache·etl/gold가 없다.
  - etl/out/cse-notices.json의 근거 칸이 정해진 말뿐이고 본문 문장이 없다.
  - User-Agent에 개인정보가 없다.
- [X] T045 specs/20261107-193624-cse-notice-opportunities/quickstart.md §1~§8을 처음부터 다시 돌리고, 마지막에 `npm run check && npm run build && npm run audit:layout`이 모두 통과하는지 확인한다. audit:layout을 처음 돌리면 `npx playwright install chromium`이 필요하다
- [X] T046 ponytail-review로 etl/ 변경과 tsconfig.json·.gitignore 변경을 점검하고, 과설계 지적을 고친다 (전역 워크플로 3단계)
- [X] T047 `/code-review`로 etl/notices/*.ts 변경의 정확성을 점검하고, 외부 요청과 파일 쓰기가 있으니 `/security-review`도 돌린다. 지적을 고친 뒤 T045를 다시 통과시킨다 (전역 워크플로 4단계)
  - 2026-11-08: 보안 리뷰 발견 없음. 코드 리뷰 18건(수집·실행·정답셋 10, 마감 8)과 분류의 숨은 낱말 1건을 고쳤다. 검사 입력과 문서에 있던 수집 원문 줄은 직접 만든 줄로 바꿨다.
  - 실제 90일치에서 결과가 바뀐 글은 의도한 3건이다: cse:225356 마감 9/11→9/29, cse:224691 빈칸→9/15, 현대해상 두 글 합침. 개발용 301건 전체 영향은 T032에서 정답셋으로 본다.

---

## Phase 7: 2차 맞추기 (2026-11-09 사용자 결정)

**Goal**: 1차 평가용에서 미달한 SC-004·SC-006·SC-007을 다시 맞추고, 처음 보는 평가용으로 한 번 더 잰다 (spec FR-029 2차, research R16)

- [X] T048 [US2] 1차 평가용 100건을 개발용에 합쳐 etl/gold/dev-2025-09-01-2026-11-06.csv(401건)를 만든다. 두 원본 CSV는 그대로 둔다
- [X] T049 [US2] 합친 401건으로 etl/notices/classify.ts·deadline.ts를 다시 맞춘다
  - 바꾼 규칙마다 classify.test.ts·deadline.test.ts 표에 한 줄 더하고, 401건 전체에서 새로 틀린 글이 없는지 바꾸기 전과 비교한다.
  - 후보(R16 미달 원인): 사업 이름·회차·꼬리표가 붙은 대괄호 주최, 단어표에 없는 영어·한국어 낱말, 도우미 모집, '채용 모집 + 채용설명회' 꼴, 법정 예방교육.
- [X] T050 [US2] 규칙을 확정하고 research.md에 'R17. 2차 개발용 결과'를 적는다. 확정한 규칙으로 etl/out/cse-notices.json을 다시 만든다
- [X] T051 [US2] `node etl/notices/eval.ts new 2025-05-01 2025-08-31 100`으로 2차 평가용 초안 etl/gold/draft-2025-05-01-2025-08-31.csv를 만든다
- [X] T052 [US2] 2차 평가용을 T035·T036과 같은 교차 라벨로 확정한다. Claude 서브에이전트 2개와 codex 워커 2개가 확정 기준으로 따로 라벨하고, 갈린 칸은 판정 에이전트가 정하고, (사용자) 갈린 줄만 확인한다. 측정 전까지 아무도 이 100건에 규칙을 돌리지 않는다
  - 결과(2026-11-09): 90건 일치, 갈린 10건은 판정 에이전트가 정했고, 사용자가 확인하며 1건의 종류를 고쳤다(멘토링 → 교육·캠프).
- [X] T053 [US2] `node etl/notices/eval.ts etl/gold/draft-2025-05-01-2025-08-31.csv`를 딱 한 번 돌리고 research.md에 'R18. 2차 평가용 결과(최종)'를 적는다. 기준에 못 미치면 원인을 보고하고 멈춘다. 평가용을 보고 규칙을 고치지 않는다
  - 결과(2026-11-09): 일곱 지표 중 셋 통과(기회 놓침, 마감 정확 98.0%, 마감 채움), SC-001 기회 여부 93.3%·SC-003 종류 88.6%·SC-006 주최 88.6%·SC-007 확인 필요 11.0% 미달(research R18). 규칙을 고치지 않고 원인을 보고하고 멈췄다.
- [X] T055 1·2차 맞추기에서 바뀐 etl/notices/classify.ts·deadline.ts에 ponytail-review와 `/code-review`를 돌리고 지적을 고친다 (전역 워크플로 3·4단계)
  - 2026-11-09: ponytail-review 지적 없음. code-review 10건(마감 7, 분류·주최 3)을 고치고 검사 줄을 더했다. 개발용 401건에서 새로 틀린 글이 없다(research R18 끝).
- [X] T054 `npm run check && npm run build && npm run audit:layout`을 다시 통과시킨다

**마무리**(2026-11-09 사용자 결정): 스펙 1은 2차 평가용 성적(research R18)으로 마친다. 미달한 SC-001·SC-003·SC-006·SC-007은 알려진 한계다. 확인 필요와 경계 글의 LLM 판정은 다음 스펙에서 한다.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)**: 바로 시작한다. T001이 끝나야 검사를 돌릴 수 있다.
- **Foundational (2)**: Setup 다음. 모든 스토리를 막는다.
- **US1 (3)**: Foundational 다음.
- **US2 (4)**: US1 다음. 비교에 run.ts의 `judge`를 쓰고, 정답셋 작업은 맞출 규칙이 있어야 한다.
- **US3 (5)**: US1 다음. US2와는 서로 기대지 않는다.
- **Polish (6)**: 원하는 스토리가 끝난 뒤.

### User Story Dependencies

- **US1**: 기반 단계만 있으면 된다.
- **US2**: US1의 `judge`와 deadline.ts의 `readDates`를 쓴다.
- **US3**: US1의 `collect`와 main을 단단하게 만든다.
- 순서는 요청대로 US1 → US2 → US3다. 다만 T030·T036(교차 라벨과 사용자 확인)을 기다리는 동안 US3(T038~T042)를 먼저 해도 된다.

### Within Each Phase

- 검사(T005·T006, T011~T013, T022, T038)를 먼저 쓰고 실패를 본 뒤 구현한다.
- 같은 파일 태스크는 차례로 한다.
  - classify.ts: T007 → T014 → T015
  - deadline.ts: T016 → T017
  - run.ts: T018 → T019 → T020 → T040 → T041
  - eval.ts: T023 → T027
- 정답셋 작업은 T028 → T037을 반드시 순서대로 한다. 평가용(T034~T037)은 T033의 규칙 확정 뒤에만 한다.

### Parallel Opportunities

- T002·T003·T004: 서로 다른 설정 파일
- T005·T006, T007·T008: cse 쪽과 classify 쪽이 다른 파일
- T011·T012·T013: 서로 다른 검사 파일
- T014·T016: classify.ts와 deadline.ts
- T038: US2와 따로 진행할 수 있음
- T043·T044

---

## Parallel Example: User Story 1

```text
# 검사 세 개를 함께 쓴다
Task: "T011 classify.test.ts에 classify·hostOf 표"
Task: "T012 deadline.test.ts에 readDates 표와 deadlineOf 사례"
Task: "T013 run.test.ts에 judge·buildResult·formatSummary"

# 서로 다른 파일의 규칙을 함께 구현한다
Task: "T014 classify.ts의 classify()"
Task: "T016 deadline.ts의 readDates()·stripDates()"
```

## Parallel Example: User Story 2와 3

```text
# 사용자가 개발용 정답셋을 고치는 동안(T030) Claude는 US3를 진행한다
Task: "T038 run.test.ts에 재실행·실패 검사"
Task: "T039 cse.ts의 BoardError"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2를 마치고 `npm run check`를 통과시킨다.
2. Phase 3(US1)을 마치고 `node etl/notices/run.ts`로 실제 파일을 만든다.
3. **멈추고 확인**: 요약, 계약 모양, `cse:228201` 값을 본다.

### Incremental Delivery

1. **US1**: 기회 데이터 파일 (정확도 수치는 아직 없음)
2. **US2**: 정답셋으로 규칙 맞추기, 평가용 최종 성적
3. **US3**: 재실행 보장과 실패 보호
4. **Polish**: 점검 → ponytail-review → `/code-review`·`/security-review`

---

## Notes

- [P]는 다른 파일이고 끝나지 않은 앞 태스크에 기대지 않는다는 뜻이다.
- T030·T036의 사용자 몫(갈린 줄 확인, 애매한 글 기준 확정)은 Claude가 대신하지 않는다.
- 평가용 정답셋을 본 뒤에는 규칙을 고치지 않는다. 고쳐야 하면 사용자와 다음 단계를 정한다.
- 커밋은 사용자가 요청할 때만 한다. 로컬 전용이라 push하지 않는다.
