# Implementation Plan: 소프트웨어학과 공지 수집·분류 → 기회 데이터

**Branch**: `feat/cse-notices` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261107-193624-cse-notice-opportunities/spec.md`

**Note**: `/speckit-plan` 절차로 썼다. 산출물: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

## Summary

소프트웨어학과 공지 게시판의 최근 글을 모아 기회 데이터 파일(`etl/out/cse-notices.json`) 하나로 만든다. 각 글을 기회·기회 아님·확인 필요로 나누고, 기회에는 종류·주최·마감을 붙인다.

- **방식**: 저장소 안 새 폴더 `etl/`에 TypeScript 스크립트를 두고, Node 22.18 이상이 `.ts`를 바로 실행한다. 새 의존성은 없다.
- **수집**: 내장 `fetch`로 1초에 한 건씩 받는다. 본문 영역이 확인된 원문만 로컬에 보관하고, 보관한 글은 다시 받지 않는다.
- **판정**: 제목과 게시판 분류만 본다. 순서는 기회 아님 단어 → 종류 단어(우선순위) → 게시판 기본값이다.
- **마감**: 본문 신청 줄 → 제목 날짜 → (특강만) 행사 날 순서로 찾는다. 날짜 표기를 하나로 맞춰 읽고, 확신이 없으면 빈칸으로 둔다.
- **검증**: 정답셋 도구(`eval.ts`)로 개발용 294건에 규칙을 맞추고, 평가용 100건으로 한 번 잰다.

## Technical Context

**Language/Version**: TypeScript 5.7 (`strict`), Node 22.18 이상에서 타입 지우기로 바로 실행(로컬 Node 26.4에서 확인). ESM(`"type": "module"`).

**Primary Dependencies**: 새 의존성 없음.
- 이미 있는 jsdom 26(+@types/jsdom)으로 HTML을 읽는다.
- Node 내장 `fetch`, `AbortSignal.timeout`, `node:fs`, `node:path`, `node:crypto`(SHA-1 표본), `node:timers/promises`, `TextDecoder`(UTF-8·EUC-KR)를 쓴다.

**Storage**: 파일만 쓴다.
- 결과 JSON: `etl/out/cse-notices.json`
- 원문 HTML 보관: `etl/.cache/cse/<글번호>.html`(.gitignore)
- 정답셋 CSV: `etl/gold/`(로컬 전용)

**Testing**: vitest 5(node 환경, 네트워크 없음)와 `tsc --noEmit`. 둘 다 기존 `npm run check`에 들어간다. 테스트 입력은 짧은 HTML·CSV 문자열을 테스트 안에 직접 쓴다. 실제 공개 제목은 쓰되 본문 원문은 쓰지 않는다.

**Target Platform**: 개발자 컴퓨터(macOS·Linux)에서 손으로 실행한다. 정기 실행은 범위 밖이다.

**Project Type**: 기존 웹 저장소 안의 CLI 일괄 처리 스크립트(ETL)다. 앱 번들(`src/`)에는 들어가지 않는다.

**Performance Goals**: 90일치(약 130건) 첫 실행은 5분 이내(1초에 1건이면 약 2.5분), 새 글이 몇 건인 재실행은 1분 이내(SC-008).

**Constraints**:
- 1초에 1건 이하로 순서대로 요청하고, 요청당 15초로 제한한다. User-Agent에는 저장소 주소만 넣는다.
- `lib: ES2020`이라 ES2021 이후 API는 쓰지 않는다.
- 타입만 가져올 때는 `import type`을 쓴다.
- 파일은 500줄 이하로 두고 `any`는 쓰지 않는다.
- 저장소가 공개라 원문·첨부·키는 커밋하지 않는다. 로컬 전용이라 push하지 않는다.

**Scale/Scope**: 게시판 전체 약 1,370건, 월 약 43건이다. 기준일 창은 기본 90일이다. 정답셋은 개발용 294건과 평가용 100건이다.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md`는 아직 템플릿이다. 그래서 아래 관문은 팀 `CLAUDE.md`, 개인 `CLAUDE.local.md`, 전역 워크플로에서 가져왔다([research.md](./research.md) R14).

| # | 관문 (출처) | Phase 0 전 | Phase 1 후 |
|---|---|---|---|
| G1 | 새 의존성은 표준 API로 안 될 때만 (CLAUDE.md 코드 규칙) | 통과: 내장 기능과 기설치 jsdom만 씀 | 통과 |
| G2 | TypeScript strict, `any` 금지 (CLAUDE.md) | 통과: 기존 tsconfig에 `etl`만 포함 | 통과: 판정 결과를 구별 합집합 타입으로 둠 |
| G3 | 파일 하나는 한 가지, 500줄 이하 (CLAUDE.md, 쓰기 훅) | 통과 | 통과: 소스 5개를 역할별로 나눔(아래 구조) |
| G4 | 분기·계산 로직은 테스트를 남긴다 (CLAUDE.md) | 통과 | 통과: 모듈마다 테스트 파일 하나. 위치는 Complexity Tracking 참고 |
| G5 | 실제 학생 데이터·이름·키를 저장소에 넣지 않는다 (CLAUDE.md, CLAUDE.local.md) | 통과 | 통과: 원문 보관 폴더는 .gitignore, 정답셋은 exclude. 결과와 근거에 본문 문장 없음. 첨부는 받지 않음 |
| G6 | 의도적으로 자른 곳은 `// ponytail:` 주석 (CLAUDE.md) | 통과 | 통과: 보관 만료 없음, 날짜 꼴 한정, 중복 열쇠, robots.txt 재확인 시점에 주석을 단다 |
| G7 | 공용 파일(`src/app`, `src/components`, `src/styles`, `src/domain`, 공용 타입)은 직접 고치지 않는다 (CLAUDE.md 작업 방식) | 통과 | 통과: `src/domain/types.ts`는 `import type`으로 읽기만 함. 바꾸는 팀 파일은 루트 설정 두 줄(`tsconfig.json`, `.gitignore`)이고 PR에 적는다 |
| G8 | `main`은 늘 check·build 통과 (CLAUDE.md) | 통과 | 통과: etl 테스트·타입 검사가 check에 들어가고, build는 `src/`만 묶어서 영향 없음 |
| G9 | 로컬 전용, 공개 저장소 (CLAUDE.local.md) | 통과 | 통과: push 주소 막힘. 커밋은 사용자가 요청할 때만 |
| G10 | 워크플로: plan 다음은 `/speckit-tasks` → 실사용 변화 승인 → `/speckit-implement`(ponytail full) → ponytail-review → `/code-review` (전역 CLAUDE.md) | 해당 | 해당: 다음 단계로 이어짐 |

위반 없음. 규칙의 글자와 다른 곳 두 군데는 아래 Complexity Tracking에 이유를 적었다.

## Project Structure

### Documentation (this feature)

```text
specs/20261107-193624-cse-notice-opportunities/
├── spec.md              # 요구사항 (2차 개정)
├── plan.md              # 이 파일
├── research.md          # Phase 0: 결정과 근거
├── data-model.md        # Phase 1: 타입, 검증 규칙, 근거에 쓰는 말, 지표 정의
├── quickstart.md        # Phase 1: 확인 절차
├── contracts/
│   ├── cse-notices.schema.json   # 결과 파일 계약 (스펙 2가 읽음)
│   ├── cli.md                    # 명령, 출력, 종료 코드, 메시지
│   └── gold-csv.md               # 정답셋 CSV 형식
├── checklists/
│   └── requirements.md  # spec 품질 점검표
└── tasks.md             # Phase 2 (/speckit-tasks, 아직 없음)
```

### Source Code (repository root)

```text
etl/
├── notices/
│   ├── run.ts            # 진입점. judge(글, 본문 줄) → 판정·주최·마감을 묶음, buildResult(판정들) → 중복 정리·정렬·요약,
│   │                     #   main()은 이 파일을 직접 실행할 때만 돈다(테스트가 import해도 안 돎)
│   ├── cse.ts            # 소프트웨어학과 게시판: 주소, 요청(1초 간격·15초·User-Agent), 원문 보관 읽기·쓰기,
│   │                     #   목록 HTML → NoticeRow[], 본문 HTML → 줄 목록(.fr-view 안만)
│   ├── classify.ts       # 기회 아님 단어, 종류 단어표와 우선순위, 게시판 기본값, 주최, 종류 한글 이름표
│   ├── deadline.ts       # 날짜 토큰 읽기, 연도 추정, 신청 줄 찾기, 마감과 마감 근거 고르기
│   ├── eval.ts           # 정답셋: new(초안 CSV), 비교(지표·틀린 글), CSV 읽기·쓰기
│   ├── cse.test.ts       # 목록(고정글·중복 글 번호·멈춤 기준), 본문 경계(이전글·다음글 제외), 표 줄
│   ├── classify.test.ts  # 함정 사례 제목들, 게시판 기본값, 처음 보는 분류, 주최 꼬리표, 이름표 = CATEGORY_LABEL
│   ├── deadline.test.ts  # 날짜 꼴, 요일, 일만 있는 끝, 시각 무시, 연도 넘김, 신청 줄·다음 줄·자격 줄, 엇갈림 → 빈칸
│   ├── run.test.ts       # 중복 정리(SSAFY는 합침, KB 3건은 남김), 정렬, 요약 식, 결과 모양 = 계약
│   └── eval.test.ts      # CSV(따옴표·줄바꿈·BOM·EUC-KR·엑셀 날짜 꼴), 값 오류 모음, 지표 분모·해당 없음
├── out/
│   └── cse-notices.json  # 결과 (커밋 여부는 스펙 2에서)
├── .cache/cse/           # 원문 보관 (.gitignore)
└── gold/                 # 정답셋 CSV (.git/info/exclude, 올릴지는 사용자가)
```

바꾸는 기존 파일:
- `tsconfig.json`: `include`에 `"etl"`을 더한다.
- `.gitignore`: `etl/.cache/`를 더한다.
- `.git/info/exclude`(로컬, 커밋 안 됨): `etl/gold/`를 더한다.

**모듈 의존 방향**: `run.ts` → `cse.ts`, `classify.ts`, `deadline.ts`. `eval.ts` → `run.ts`(같은 `judge`를 써서 비교와 실제 실행이 어긋나지 않게), `cse.ts`. 공용 타입은 `src/domain/types.ts`에서 `import type`으로만 가져온다.

**Structure Decision**: 앱(`src/`)과 떨어진 최상위 `etl/`에 출처별 폴더(`notices/`)를 둔다.
- 기준 문서가 기회 정보를 '별도 ETL'로 두라고 해서 앱 번들과 분리한다.
- 나중에 출처가 늘면 `cse.ts` 옆에 출처 파일을 하나 더하고 `run.ts`에서 고른다. 판정 모듈(`classify.ts`, `deadline.ts`)은 함께 쓴다.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 판정 로직이 `src/domain/`이 아니라 `etl/notices/`에 있음 (CLAUDE.md "분기·계산 로직은 src/domain/") | ETL은 Node 전용 코드(fs, fetch, jsdom)이고 앱 번들에 들어가면 안 된다. 기준 문서도 별도 ETL이다. 규칙의 뜻(로직을 화면과 떼고 테스트를 남김)은 그대로 지킨다 | `src/domain/`에 두면 Node 전용 코드가 브라우저 쪽 공용 폴더에 섞이고, 공용 파일 변경 보고 대상이 된다 |
| 종류 한글 이름 9개를 `classify.ts`에 다시 적음 (CLAUDE.md "이미 있는 헬퍼를 다시 만들지 않는다") | `CATEGORY_LABEL`이 있는 `opportunities.ts`는 확장자 없는 import(`'../recommend'`)라 Node가 직접 가져오지 못한다 | 공용 파일의 import를 고치면 공용 파일 변경이 된다. 대신 vitest 검사로 두 표가 같은지 확인해 어긋남을 막는다 |
