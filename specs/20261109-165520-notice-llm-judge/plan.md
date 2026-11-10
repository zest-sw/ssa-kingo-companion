# Implementation Plan: 공지 판정에 로컬 LLM 더하기

**Branch**: `feat/cse-notices` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261109-165520-notice-llm-judge/spec.md`

**Note**: `/speckit-plan` 절차로 썼다. 스펙 1([../20261107-193624-cse-notice-opportunities/plan.md](../20261107-193624-cse-notice-opportunities/plan.md))의 구조와 규칙을 그대로 잇는다. 산출물: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/llm.md](./contracts/llm.md), [quickstart.md](./quickstart.md).

## Summary

스펙 1 ETL의 판정 단계에 로컬 LLM(이 컴퓨터의 Ollama)을 더한다. 규칙이 확인 필요로 보내거나(또는 고른 방식에 따라 모든 글) LLM이 기회 여부·종류를 정하고, 마감은 규칙이 정한 종류에 맞춰 계속 뽑는다. 주최는 처음엔 LLM이 정했지만 US2 비교 뒤 제목 규칙 값으로 바꿨다(2026-11-10 사용자 결정, research R12).

- **호출**: Ollama 로컬 HTTP API(`/api/chat`)를 Node 기본 `fetch`로 부른다. 답은 JSON 스키마로 칸과 값을 묶고(종류는 11종만), 온도 0, 생각 끄기, 문맥 길이 16384 고정. 새 의존성은 없다.
- **지시문**: 스펙 1 [gold-guide.md](../20261107-193624-cse-notice-opportunities/gold-guide.md)(정답셋 라벨러가 읽는 기준) 한 곳에서 가져온다.
- **보관**: 성공한 답을 글 번호·모델·지시문 판(지시문 해시)마다 `etl/.cache/llm/`에 보관한다. 다시 돌리면 새 글만 묻는다.
- **실패**: 서버가 꺼졌거나 모델이 없으면 그 실행에서 LLM을 끄고 규칙 결과로 돈다. 글 하나가 실패하면 그 글만 규칙 결과다.
- **고르기**: 개발용 501건에 후보 모델마다 답을 한 번씩 받아 보관하고, 보낼 글 두 방식 × 확신 '낮음' 처리 두 가지를 보관한 답으로 계산해 고른다. 최종은 2025년 1~4월 평가용 100건으로 한 번 잰다.

## Technical Context

**Language/Version**: TypeScript 5.7(`strict`), Node 22.18 이상 타입 지우기 실행(로컬 Node 26.4). 스펙 1과 같다.

**Primary Dependencies**: 새 의존성 없음. Node 내장 `fetch`, `AbortSignal.timeout`, `node:crypto`(지시문 해시), `node:fs`. LLM 서버는 Ollama 0.32.0(2026-11-09 확인, 저장소 밖에 설치).

**Storage**: 파일만 쓴다.
- LLM 답 보관: `etl/.cache/llm/<모델>/<지시문 판>/<글번호>.json`(`etl/.cache/`는 이미 .gitignore)
- 결과 JSON·원문 보관·정답셋: 스펙 1 그대로

**Testing**: vitest 5(node, 네트워크·Ollama 없음)와 `tsc --noEmit`, 기존 `npm run check`. LLM 호출은 가짜 함수를 넣어 검사한다.

**Target Platform**: 개발자 컴퓨터. LLM 판정은 Ollama가 있는 컴퓨터에서만 돌고, 없으면 규칙만 돈다.

**Project Type**: 스펙 1과 같은 CLI 일괄 처리 스크립트(ETL).

**Performance Goals**: 하루치 새 글(10건 이하) 3분 안, 90일치 첫 실행 40분 안(SC-008). 서버가 꺼져 있으면 실행 시간이 10초 넘게 늘지 않는다(SC-009). 시험 호출: 첫 호출 5.7초(모델 올리기 4.8초 포함).

**Constraints**:
- 스펙 1 제약을 그대로 따른다(ES2020 lib, `import type`, 500줄, `any` 금지, 원문·키 커밋 금지, push 금지).
- LLM 요청은 한 번에 하나, 글당 120초 제한. 공지 본문은 이 컴퓨터 밖으로 보내지 않는다(FR-026).
- 모델 이름은 설정 한 곳(환경 변수 `KINGO_LLM_MODEL`)에서만 정한다(FR-011).

**Scale/Scope**: 90일 창 약 150건, 개발용 501건, 최종 평가용 100건, 후보 모델 2~3개.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md`는 아직 템플릿이라 스펙 1과 같은 관문을 쓴다(스펙 1 research R14).

| # | 관문 (출처) | Phase 0 전 | Phase 1 후 |
|---|---|---|---|
| G1 | 새 의존성은 표준 API로 안 될 때만 (CLAUDE.md) | 통과: 내장 fetch로 Ollama HTTP API | 통과 |
| G2 | TypeScript strict, `any` 금지 (CLAUDE.md) | 통과 | 통과: LLM 답은 검사한 뒤에만 타입이 붙는다(data-model) |
| G3 | 파일 하나는 한 가지, 500줄 이하 (CLAUDE.md, 쓰기 훅) | 통과 | 통과: 새 파일은 `llm.ts` 하나, run.ts는 판정 묶기만 늘어남 |
| G4 | 분기·계산 로직은 테스트를 남긴다 (CLAUDE.md) | 통과 | 통과: `llm.test.ts`와 run.test.ts 사례 |
| G5 | 수집 원문과 키를 커밋하지 않는다 (CLAUDE.local.md) | 통과: 보관은 `etl/.cache/` 아래 | 통과: LLM 답에 본문 문장이 없다(주최 40자 제한) |
| G6 | 로컬 전용, push·PR 없음 (CLAUDE.local.md) | 통과 | 통과 |
| G7 | 사실(마감)은 로직 값만 (concept.md) | 통과: LLM은 날짜를 내지 않는다 | 통과: 답 스키마에 날짜 칸이 없다 |
| G8 | 구현 전 승인(전역 워크플로 2-1)과 goldfish 리뷰(2-0) | `/speckit-tasks` 뒤에 한다 | 해당 없음 |

## Project Structure

### Documentation (this feature)

```text
specs/20261109-165520-notice-llm-judge/
├── spec.md              # 요구사항
├── plan.md              # 이 파일
├── research.md          # Phase 0: 결정과 근거
├── data-model.md        # Phase 1: 타입, 보관 파일, 근거에 쓰는 말, 요약 수
├── quickstart.md        # Phase 1: 확인 절차
├── contracts/
│   └── llm.md           # LLM 입력·답·보관·실패 계약, 실행 명령과 결과 파일 계약의 바뀐 곳
├── checklists/
│   └── requirements.md  # spec 품질 점검표
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
etl/notices/
├── llm.ts           # 새 파일: 지시문 만들기(본문 줄 자르기), Ollama 부르기, 답 읽기·검사, 보관, 연결 실패 끊기,
│                    #   LLM 답 → 판정(확신 '낮음' 처리), 설정(KINGO_LLM_MODEL·OLLAMA_HOST), 보낼 글 방식 상수
├── llm.test.ts      # 새 파일: 줄 자르기, 답 읽기(정상·코드 블록·모르는 종류·빈 주최·긴 주최·깨진 JSON), 보관(같은 판·판 바뀜·실패 미보관),
│                    #   서버 꺼짐·모델 없음 → 끊기, 시간 초과, 확신 '낮음' 처리
├── run.ts           # judge(글, 본문, LLM 판정?)로 넓히고, judgeAll(글들, 본문들, ask?, route, low)이 보낼 글을 골라 묻고 요약 수를 센다.
│                    #   main(…, ask?)은 ask를 바깥에서 받는다. 실제 ask는 import.meta.main 줄에서만 makeAsk()로 만든다(검사는 늘 가짜).
│                    #   formatSummary(s, llm?)에 LLM 수와 연결 실패 줄. 함수 꼴은 data-model '함수 꼴'
├── run.test.ts      # LLM 종류로 마감을 다시 정함, 주최는 제목 규칙 값, 보낼 글 고르기, 요약 줄, 결과가 계약 패턴을 지킴
├── eval.ts          # compare가 judgeAll을 같은 ask로 쓴다(FR-023)
└── (classify.ts, deadline.ts, cse.ts는 그대로)
```

바꾸는 기존 문서:
- 스펙 1 `contracts/cse-notices.schema.json`: `rule` 패턴에 `LLM: .+`를 더한다(FR-017). 2026-11-09 plan 단계에서 빠져 있던 마감 근거 `본문·제목`은 이미 더했다.
- 스펙 1 `data-model.md` '근거에 쓰는 말', `contracts/cli.md` 요약 줄.

**모듈 의존 방향**: `run.ts` → `llm.ts` → `classify.ts`(종류 이름표). `eval.ts` → `run.ts`. `llm.ts`는 `run.ts`를 가져오지 않는다(판정 묶기는 run.ts가 한다).

**Structure Decision**: 새 파일은 `llm.ts` 하나다(브레인스토밍 결정). LLM 쪽 일(지시문, 호출, 검사, 보관)은 모두 여기 두고, 판정을 묶는 일은 스펙 1처럼 run.ts가 맡는다. 조합 비교 계산은 한 번 쓰는 일이라 저장소 밖 임시 스크립트로 하고 표만 research에 남긴다.

## Complexity Tracking

| 늘어난 것 | 왜 필요한가 | 더 단순한 방법을 안 쓴 이유 |
|---|---|---|
| 보낼 글 방식·확신 '낮음' 처리 상수 두 개(`judgeAll`·`fromLlm`의 기본값 인자) | US2 비교로 하나씩 정하는 값이다. 검사와 조합 비교 스크립트가 두 값을 다 돌리려면 인자로 받아야 한다 | 환경 변수 같은 실행 설정으로 열면 아무도 안 바꾸는 손잡이가 된다. 실행은 늘 기본값(상수)을 쓰고, 비교가 끝나면 상수 값을 굳힌다 |
| judgeAll(비동기) | LLM 호출이 비동기라 판정 묶기를 한 곳에 둬야 실행과 비교가 어긋나지 않는다(FR-023) | main과 eval에 같은 반복문을 두면 둘이 갈라진다 |
