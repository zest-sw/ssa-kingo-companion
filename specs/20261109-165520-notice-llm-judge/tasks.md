# Tasks: 공지 판정에 로컬 LLM 더하기

**Input**: Design documents from `specs/20261109-165520-notice-llm-judge/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/llm.md](./contracts/llm.md), [quickstart.md](./quickstart.md)

**Tests**: FR-025가 요구한다. 모두 Ollama 없이 도는 vitest이고 기존 `npm run check`에 들어간다. LLM 호출은 가짜 함수로 바꿔 넣는다.

**Organization**: 스토리 순서는 US1(P1) → US3(P3) → US2(P2)다. US3는 US1과 같은 파일(llm.ts, run.ts)을 고쳐서 US1 바로 뒤에 하고, US2는 동작하는 판정 경로가 있어야 비교할 수 있어 마지막에 한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일이고 끝나지 않은 앞 태스크에 기대지 않아 함께 할 수 있다
- **[Story]**: US1, US2, US3

## Path Conventions

- 소스: `etl/notices/` (스펙 1과 같은 폴더)
- 스펙 1 문서: `specs/20261107-193624-cse-notice-opportunities/`
- 임시 스크립트와 LLM 비교 산출물: 세션 scratchpad(저장소 밖)

---

## Phase 1: Setup

**Purpose**: 결과 파일 계약을 먼저 고쳐 둔다

- [X] T001 [P] 스펙 1 계약을 LLM 근거에 맞게 고친다 (FR-017)
  - specs/20261107-193624-cse-notice-opportunities/contracts/cse-notices.schema.json: `opportunities[].rule` 패턴을 `^(제목|게시판|LLM): .+$`로.
  - specs/20261107-193624-cse-notice-opportunities/data-model.md '근거에 쓰는 말'에 `rule` = `LLM: <모델 이름>`, `why` = `LLM 확신 낮음`을 더한다.
  - specs/20261107-193624-cse-notice-opportunities/contracts/cli.md에 요약 끝 `LLM 판정 L(보관 A · 새로 B · 실패 C)`, 연결 실패 줄, 환경 변수 `KINGO_LLM_MODEL`·`OLLAMA_HOST`를 더한다(이 기능 contracts/llm.md '실행 명령의 바뀐 곳').
- [X] T002 [P] `git check-ignore -v etl/.cache/llm/x/y/1.json`으로 보관 위치가 이미 `.gitignore`의 `etl/.cache/`에 덮이는지 확인한다(바꿀 것 없음이 기대값)

---

## Phase 2: Foundational

**Purpose**: 세 스토리가 함께 쓰는 타입과 판정 자리

- [X] T003 etl/notices/llm.ts를 만든다: 타입 `LlmAnswer`·`LlmOutcome`·`Ask`(모델 이름 속성 포함)·`LlmJudged`·`LlmStats`(data-model), 상수 `LLM_ROUTE`(처음 값 `review`, 기준 문서와 같음)·`LLM_LOW`(처음 값 `review`)·`DEFAULT_MODEL`(처음 값 `gemma-4-longctx:latest` = 받아 둔 Gemma 4 E4B), `KIND_LABEL`을 거꾸로 찾는 한글 종류 이름 → `Kind` 표(classify.ts의 `KIND_LABEL`을 가져와 쓴다)
- [X] T004 etl/notices/run.ts의 `judge(row, lines)`를 `judge(row, lines, llm?: LlmJudged)`로 넓힌다
  - `llm`이 있으면 규칙 판정 대신 쓴다. 기회면 `deadlineOf`를 LLM 종류로 부르고(FR-007), 주최는 `llm.host`를 쓴다. 없으면 지금과 같다.
  - etl/notices/run.test.ts에 사례를 더한다: 규칙은 교육·캠프, LLM은 특강인 글 → 행사 날로 마감, 주최는 LLM 값, `rule`은 `LLM: <모델>`. `llm`이 없으면 기존 사례가 그대로 통과한다.

**Checkpoint**: `npm run check` 통과, 규칙만 쓰는 동작은 그대로

---

## Phase 3: User Story 1 - 규칙이 못 정하거나 헷갈리는 글을 로컬 LLM이 판정한다 (Priority: P1) 🎯 MVP

**Goal**: 고른 방식의 글을 LLM이 판정하고, 답을 보관하고, 근거와 요약에 드러낸다 (FR-001~FR-011, FR-016, FR-017, FR-023)

**Independent Test**: Ollama를 켜고 `node etl/notices/run.ts`를 돌리면 확인 필요였던 글이 `rule: LLM: <모델>`인 기회나 기회 아님으로 정해지고, 바로 다시 돌리면 요약의 '새로'가 0이다(quickstart §2)

### 검사 먼저

- [X] T005 [P] [US1] etl/notices/llm.test.ts를 만든다(가짜 HTTP 함수, 임시 보관 폴더)
  - 지시문 입력: 본문 앞 60줄과 그 뒤 날짜·신청 단어 줄, 120줄까지, 줄당 300자, 합쳐 8,000자. 본문 글자가 없으면 그렇다고 적는다. 게시판·제목이 들어간다(research R3).
  - 답 읽기: 정상 JSON, ```` ```json ```` 코드 블록에 싼 JSON, 모르는 종류 → 실패, O인데 빈 종류 → 실패, 빈 주최·'없음' → null, 41자 주최 → 실패, X면 종류·주최를 버림, 확신 높음/낮음 → `sure`, 깨진 JSON → 실패(contracts/llm.md '답 검사').
  - `fromLlm`: data-model 표의 여섯 줄(확신 × `LLM_LOW` × O/X).
  - 보관: 같은 글·모델·판이면 가짜 HTTP 함수를 부르지 않고 `cached: true`, 판이 바뀌면 다시 묻는다, 실패한 답은 보관 파일이 생기지 않는다, 깨진 보관 파일(JSON 아님·꼴 틀림)은 없는 것으로 보고 다시 묻는다, 모델 이름의 `/`·`:`는 폴더 이름에서 `_`가 된다.
  - 판: 지시문, 사용자 메시지 틀, 자르기 한도, `options` 중 하나만 바뀌어도 판(해시)이 바뀐다(contracts/llm.md '판').
  - 설정: `KINGO_LLM_MODEL`이 없으면 `DEFAULT_MODEL`, `OLLAMA_HOST` 읽기(없음 → `http://127.0.0.1:11434`, `0.0.0.0` → `http://0.0.0.0:11434`, `localhost:8080` → `http://localhost:8080`, `https://x:1/` → `https://x:1`)(contracts/llm.md '설정').
  - 요청 본문: `think: false`, `options`의 `temperature: 0`·`num_ctx: 16384`, `format`이 답 스키마다.
- [X] T006 [P] [US1] etl/notices/run.test.ts에 `judgeAll` 사례를 더한다(가짜 Ask, `model` 속성 포함. 꼴은 data-model '함수 꼴')
  - `route` `review`면 규칙이 확인 필요로 낸 글만 묻고, `all`이면 본문을 받은 모든 글을 묻는다. 본문을 못 받은 글은 묻지 않는다. `judged`는 `rows` 순서다. `ask`가 없으면 규칙만 쓰고 `llm`은 null이다.
  - `low` `review`면 확신 낮은 답이 확인 필요(`LLM 확신 낮음`), `accept`면 그대로 판정이다.
  - 요약 수: 보관 A, 새로 B, 실패 C를 세고 보내지 않은 글은 세지 않는다. `formatSummary(s, llm)` 끝에 `· LLM 판정 {A+B}(보관 A · 새로 B · 실패 C)`. `llm`이 없으면 스펙 1과 같은 한 줄이다.
  - 결과가 스펙 1 결과 파일 스키마의 `rule`·`deadlineRule` 패턴을 지킨다(스키마 파일을 읽어 정규식으로 확인, LLM 근거 포함).

### 구현

- [X] T007 [US1] etl/notices/llm.ts에 지시문을 만든다
  - 지시문: 스펙 1 specs/20261107-193624-cse-notice-opportunities/gold-guide.md의 1절(기회 O/X, 정해 둔 기준), 2절(종류 11종 뜻 표, 좁은 쪽 우선 순서, 예시 제목 표), 4절(주최)을 옮긴다. 끝에 'JSON 하나로만 답한다', '날짜는 쓰지 않는다', '주최에 사람 이름을 쓰지 않는다'(contracts/llm.md '요청').
  - 사용자 메시지: 게시판, 제목, 본문 줄(research R3대로 자름).
  - 판: 글 내용만 뺀 요청 전체의 SHA-1 앞 8자리(contracts/llm.md '판').
- [X] T008 [US1] etl/notices/llm.ts에 답 읽기(`parseAnswer`)와 `fromLlm`을 만든다(contracts/llm.md '답 검사', data-model 'LLM 답 → 판정')
- [X] T009 [US1] etl/notices/llm.ts에 `makeAsk({ model?, host?, dir?, post? })`를 만든다. 돌려주는 Ask에는 `model` 속성이 있다(data-model 'Ask')
  - 설정: `KINGO_LLM_MODEL`(없으면 `DEFAULT_MODEL`), `OLLAMA_HOST`(contracts/llm.md '설정'대로 읽음) (FR-011, research R9).
  - 요청: `/api/chat`, `stream: false`, `think: false`, `keep_alive: "10m"`, `options: { temperature: 0, num_ctx: 16384 }`, `format`에 답 스키마(contracts/llm.md '요청'), `AbortSignal.timeout(120000)`.
  - 보관: `etl/.cache/llm/<모델>/<판>/<글번호>.json`, 보관함을 먼저 읽고, `.tmp`에 쓴 뒤 이름 바꾸기, 성공한 답만(research R6). 보관 파일 꼴이 틀리면 없는 것으로 본다.
  - HTTP 함수 `post`는 바깥에서 넣을 수 있게 둔다(기본은 내장 fetch).
- [X] T010 [US1] etl/notices/run.ts에 `judgeAll(rows, lines, ask?, route = LLM_ROUTE, low = LLM_LOW)`을 만들고 `main`이 쓴다(꼴은 data-model '함수 꼴')
  - 보낼 글을 `route`로 고르고, 차례로 묻고(한 번에 하나, FR-014), `fromLlm(answer, ask.model, low)`으로 바꿔 `judge`에 넣는다. 요약 수를 센다. 20건마다 표준 오류에 `LLM n/m`.
  - `main(args, get, out, dir, ask?)`은 ask를 인자로만 받는다. 실제 ask는 `import.meta.main` 줄에서 `makeAsk()`로 만든다. 기존 run.test.ts의 main 사례(ask 없이 부름)는 요약이 스펙 1과 같은 한 줄이라 기대값을 바꾸지 않고 통과한다.
  - `formatSummary(s, llm?)`에 LLM 수를 붙인다(FR-016).
- [X] T011 [US1] etl/notices/eval.ts의 `compare`·`main`이 끝 인자 `ask?`를 받아 `judgeAll`에 넣게 바꾼다(FR-023). 실제 ask는 `import.meta.main` 줄에서만 만든다. 본문 배열은 정답셋 순서 그대로 넘기고, `score`는 지금처럼 `gold[i]`와 `judged[i]`를 짝짓는다. 기존 eval.test.ts는 ask 없이 부르므로 그대로 통과한다. 지표 위에 LLM 줄을 찍고, K>0이면 지표를 내지 않고 종료 코드 1, C>0이면 표 아래에 실패 수를 쓴다(contracts/llm.md '정답셋 비교의 바뀐 곳'). eval.test.ts에 가짜 Ask로 K>0 → 코드 1·지표 없음, C>0 → 지표와 실패 줄 사례를 더한다
- [X] T012 [US1] 실제 확인(quickstart §2): Ollama를 켜고 `time node etl/notices/run.ts`를 두 번 돌린다. 요약의 LLM 수, 결과 파일의 `LLM: <모델>` 근거를 보고, 두 번째 실행의 '새로'가 첫 실행의 실패 수 이하인지 본다. 첫 실행 시간을 적는다(SC-008). 바뀐 기회 몇 건을 정답 기준으로 눈으로 본다
  - 결과(2026-11-09, gemma-4-longctx:latest, 확인 필요만 보냄): 첫 실행 `새 글 2 · … · LLM 판정 6(보관 0 · 새로 6 · 실패 0)` 17.8초, 두 번째 `LLM 판정 6(보관 6 · 새로 0 · 실패 0)` 3.1초. 결과 파일 근거는 `LLM: gemma-4-longctx:latest`.
  - LLM이 정한 6건은 모두 개발용 정답셋에 있다: 기회 여부 6/6, 종류 5/5, 마감 5/5, 주최 4/5(cse:225151은 채용 회사 대신 그 회사가 나온 기관을 주최로 씀).

**Checkpoint**: US1만으로 LLM 판정이 돌고, 보관으로 다시 돌릴 때 빠르다

---

## Phase 4: User Story 3 - LLM이 없거나 실패해도 ETL은 끝까지 돈다 (Priority: P3)

**Goal**: 서버 꺼짐·모델 없음·글 실패에서 규칙 결과로 돌아가고 요약에 알린다 (FR-012~FR-015)

**Independent Test**: `OLLAMA_HOST=http://127.0.0.1:11999 node etl/notices/run.ts`가 종료 코드 0으로 결과 파일을 쓰고, 요약 다음 줄에 연결 실패 문장이 나오고, 실행 시간이 LLM 없는 실행보다 10초 넘게 늘지 않는다(quickstart §3)

### 검사 먼저

- [X] T013 [P] [US3] etl/notices/llm.test.ts에 실패 사례를 더한다
  - `'down'`: 연결 거부(`TypeError`, cause.code `ECONNREFUSED`), 주소 해석 실패(`ENOTFOUND`), 연결 제한 시간(`UND_ERR_CONNECT_TIMEOUT`), 그 밖의 `TypeError`(URL 꼴 아님), HTTP 404.
  - `'down'` 뒤: 보관함에 있는 글은 `cached` 답, 없는 글은 HTTP 함수를 부르지 않고 바로 `'down'`.
  - `'fail'`: 서버에 닿은 뒤의 `TimeoutError`, HTTP 500, 답 검사 실패. 보관하지 않는다.
- [X] T014 [P] [US3] etl/notices/run.test.ts에 `judgeAll` 실패 사례를 더한다: 꺼짐이면 보관한 답이 있는 글은 그 답, 나머지는 규칙 결과, 처음 `'down'`을 받은 글을 포함한 `skipped`(K) 수, K>0이면 `formatSummary` 다음 줄 `LLM에 연결하지 못해 K건은 규칙만 썼어요 (<모델>)`, K=0이면 그 줄 없음. 글 실패는 그 글만 규칙 결과

### 구현

- [X] T015 [US3] etl/notices/llm.ts의 `makeAsk`에 실패 구분과 끊기를 넣는다(contracts/llm.md '실패 구분', research R7). HTTP 응답 전의 `fetch` 오류와 404는 `'down'`이다. 꺼짐을 한 번 알면 그 ask는 서버를 다시 부르지 않고, 보관함에 없는 글에 바로 `'down'`을 준다. 보관한 답은 꺼진 뒤에도 읽는다
- [X] T016 [US3] etl/notices/run.ts의 `judgeAll`·`formatSummary`에 `skipped`(K)와 K>0일 때의 연결 실패 줄을 넣는다. LLM 문제로는 종료 코드가 바뀌지 않는다
- [X] T017 [US3] 실제 확인(quickstart §3): 보관 답 3개를 잠시 옮겨 둔 뒤 서버 주소를 틀리게 한 실행이 종료 코드 0, 결과 파일 씀, `3건은 규칙만` 줄, 기준 실행(서버 켬·모두 보관)과 시간 차 10초 이하(SC-009). 옮긴 답을 되돌린다. `KINGO_LLM_MODEL=no-such-model` 실행도 종료 코드 0과 연결 실패 줄
  - 결과(2026-11-09): 기준 실행 3.1초. 주소 틀림(`127.0.0.1:11999`, 3건 옮김)은 종료 코드 0, 결과 파일 씀, `LLM 판정 3(보관 3 · …)` 다음 줄 `LLM에 연결하지 못해 3건은 규칙만 썼어요 (gemma-4-longctx:latest)`, 3.0초.
  - 없는 모델은 종료 코드 0, `6건은 규칙만 썼어요 (no-such-model)`, 2.5초, 보관 폴더가 생기지 않음. 옮긴 답을 되돌리고 기본 실행으로 결과 파일을 다시 썼다.

**Checkpoint**: LLM이 없는 컴퓨터에서도 스펙 1과 같은 결과가 나온다

---

## Phase 5: User Story 2 - 후보 모델과 방식을 정답셋으로 비교해 고르고 한 번 잰다 (Priority: P2)

**Goal**: 모델과 조합을 개발용으로 고르고, 처음 보는 평가용으로 한 번 잰다 (FR-018~FR-024)

**Independent Test**: research R12에 조합별 지표와 글당 시간, 고른 조합이 있고, R13에 최종 평가 성적이 있다

- [X] T018 [US2] 개발용 501건 CSV를 만든다: etl/gold/dev-2025-09-01-2026-11-06.csv(401건)와 etl/gold/draft-2025-05-01-2025-08-31.csv(100건)를 합쳐 etl/gold/dev-501.csv(로컬 전용). 두 원본은 그대로 둔다
  - 결과: 501줄, 글 번호 겹침 없음, `.git/info/exclude`의 `etl/gold/`로 git에 안 잡힌다.
- [X] T019 [US2] 후보 모델을 정한다(FR-019): Claude가 Ollama 모델 목록에서 한국어에 강한 7~14B급 1~2개를 골라 크기·메모리·라이선스와 함께 제안하고, (사용자) 확인을 받은 뒤에 Claude가 `ollama pull`한다. Gemma 4 E4B는 이미 있으니 후보 하나로 센다
  - 결과(2026-11-10): 제안 qwen3.5:9b(6.6GB, Apache 2.0), gemma4:12b(8.0GB, Apache 2.0), exaone3.5:7.8b(4.8GB, 비상업 라이선스), qwen3:14b(9.3GB). 사용자가 qwen3.5:9b와 gemma4:12b를 골랐고 둘 다 받았다(M5 Pro 24GB). 개발용 글 2건 시험에서 둘 다 스키마대로 답했다.
- [X] T020 [US2] 모델마다 개발용 전체 답을 보관한다: etl/notices/llm.ts의 `LLM_ROUTE`를 잠시 `all`로 두고, 후보 모델마다 `time KINGO_LLM_MODEL=<모델> node etl/notices/eval.ts etl/gold/dev-501.csv`를 돌린다. 걸린 시간과 글당 평균을 research R12 메모에 적는다. 끝나면 그 모델의 보관 파일 수가 '501 − 본문 없는 글 − 실패 수'와 같은지 보고, 실패나 꺼짐이 있으면 그 수를 적고 다시 돌린다(실패한 글만 다시 묻는다)
  - 결과(2026-11-10, 판 32683933): 보관 E4B 500(실패 1), qwen3.5:9b 499(실패 2), gemma4:12b 501(실패 0). 글당 1.4초 · 2.1초 · 2.2초.
    - gemma4:12b 454건은 사용자 요청으로 부하를 제한해 받았다(GPU 평균 80%, 칩 80°C). 글당 시간은 쉰 시간을 뺀 값이다(R12).
    - 실패한 글(E4B 1, qwen 2)만 다시 물었는데 또 실패해(온도 0) 그대로 두었다. 조합 지표에서는 규칙 결과로 센다.
    - `LLM_ROUTE`는 아직 임시 `all`이다(T023에서 굳힌다).
    - 최종 평가용 내용은 T023 전까지 열지 않는다(T026 메모).
- [X] T021 [US2] scratchpad의 임시 스크립트로 조합별 지표를 계산한다: 모델 × `route`(review·all) × `low`(accept·review)마다 SC-001~SC-007. 그 모델의 보관 답만 읽는 Ask(보관함에 없으면 `'fail'`)를 만들어 run.ts의 `judgeAll(rows, lines, ask, route, low)`에 넘기고 eval.ts의 `score`로 센다. 실행과 같은 판정 경로이고 LLM에 다시 묻지 않는다(FR-020, FR-023)
  - 결과(2026-11-10): 표는 research R12 '조합별 지표'와 '주최를 어디서 가져올까'. 501·401건에서는 세 모델의 review 방식이 모두 7개를 넘는다. 규칙이 처음 본 100건에서는 gemma4:12b·all이 6개(주최만 미달)로 가장 많다. 주최를 규칙 값으로 쓰면 gemma4:12b·all이 100건에서도 7개를 넘는다.
- [X] T022 [US2] 개발용 틀린 글을 보고 지시문을 다듬는다(평가용은 보지 않는다). 지시문을 바꾸면 판이 바뀌므로 T020·T021을 다시 돌린다. 고친 이유를 research R12 메모에 적는다
  - 결과: 1차 다듬기(판 32683933)에서 멈췄다. 고른 조합이 개발용 100건에서 7개를 모두 넘었다(R12).
- [X] T023 [US2] 조합을 고르고 굳힌다(FR-021): 조합 시간 = 90일 창(지금 etl/out/cse-notices.json의 기준일 이후 글)에서 그 방식이 LLM에 보내는 글 수 × 그 모델의 글당 평균(T020). SC-001~SC-007을 모두 넘기는 조합 중 시간이 가장 짧은 것, 같으면 SC-001 → SC-003이 높은 것. 모두 넘기는 조합이 없으면 가장 많이 넘기는 것(같으면 같은 순서, 사용자에게 알림). etl/notices/llm.ts의 `LLM_ROUTE`·`LLM_LOW`·`DEFAULT_MODEL`을 그 값으로 바꾸고, research.md R12에 비교표·고른 조합·이유를 적는다
  - 결과(2026-11-10): gemma4:12b · `all` · `accept`. 사용자가 두 가지를 정했다. 고르는 기준은 규칙이 처음 본 100건이고, 주최는 제목 규칙 값이다(spec FR-001·FR-004 변경, run.ts `judge`).
    - 바꾼 코드로 다시 쟀다: 100건 7/7, 501건 7/7.
    - 기본값이 바뀌어 검사 4개(eval.test 3, run.test 1)의 기대값을 '모든 글' 방식에 맞췄다. `npm run check` 1081개 통과.
- [X] T024 [US2] 고른 `LLM_ROUTE`가 `all`이면 docs/product/decisions.md에 넣을 결정 로그 초안을 사용자에게 낸다(FR-024). 기준 문서와 같으면(`review`) 건너뛴다
  - 결과(2026-11-10): 사용자 승인으로 decisions.md에 '2026-11-10 | 공지 분류는 모든 글을 로컬 LLM이 판정한다'를 넣고(최종 평가 수치 포함), concept.md '로직' 줄도 같은 내용으로 고쳤다. Notion 원본 옮기기는 사용자 몫이다.
- [X] T025 [US2] `node etl/notices/eval.ts new 2025-01-01 2025-04-30 100`으로 최종 평가용 초안 etl/gold/draft-2025-01-01-2025-04-30.csv를 만든다(FR-022)
  - 결과(2026-11-10): 100줄, 본문 100건 모두 보관, git 제외. 지시문 다듬기(T022)가 끝나기 전에 만들었지만 코디네이터는 글 내용을 열지 않았고, 라벨러 보고는 검사 줄과 '낮음' 수만 받는다.
- [X] T026 [US2] 최종 평가용을 스펙 1 T052와 같은 교차 라벨로 확정한다: Claude 서브에이전트 2개와 codex 워커 2개가 스펙 1 specs/20261107-193624-cse-notice-opportunities/gold-guide.md로 따로 라벨, 갈린 칸은 판정 에이전트. 라벨러와 판정자는 규칙·LLM 결과를 보지 않는다(작업 기록으로 확인). 측정 전까지 누구도 이 100건에 규칙이나 LLM을 돌리지 않는다
  - 결과(2026-11-10):
    - 라벨러에게 준 기준은 gold-guide.md 사본이다(sha1 ea1ee52d, 저장소 파일과 같음). 묶음은 50건씩 둘이고, 묶음마다 Claude 1개와 codex 1개가 따로 라벨했다. 넷 다 형식 검사 OK 50건, 확신 '낮음'은 Claude 15·14건, codex 16·14건이다.
    - 두 라벨은 86건이 같고 14건이 갈렸다(기회 3, 종류 2, 마감 1, 주최 8). 갈린 14건은 누가 쓴 라벨인지 모르게 가·나 순서를 섞어 판정 에이전트가 정했다(OK 14건, '낮음' 10건, 모두 기준 해석 꼬리표).
    - 작업 기록(codex `~/.codex/sessions/2026/11/10/rollout-*`, Claude 서브에이전트 기록)으로 다섯 모두 기준·자기 입력·순서 목록·검사 스크립트·자기 결과만 연 것을 확인했다.
    - 합친 파일은 scratchpad `eval3-relabel/gold-merged.csv`(판정·낮음 10, 판정 4, 일치 86)다. 지시문을 굳히기 전이라 코디네이터는 라벨 내용을 열지 않았다. T027 뒤에 etl/gold/draft-2025-01-01-2025-04-30.csv에 쓴다.
- [X] T027 [US2] (사용자) 갈린 줄만 확인하고 고칠 줄을 알린다
  - 결과(2026-11-10): 사용자가 14줄을 판정대로 확정했다. scratchpad `relabel-build.ts`(DIR=eval3-relabel)로 etl/gold/draft-2025-01-01-2025-04-30.csv에 썼다(100줄, 오류 0, 기회 68, `gold-merged.csv`와 같음). 고치기 전 초안은 scratchpad `eval3-relabel/draft-before-t027.csv`에 있다.
- [X] T028 [US2] quickstart '준비'(Ollama가 떠 있고 고른 모델이 있는지)를 확인한 뒤 `node etl/notices/eval.ts etl/gold/draft-2025-01-01-2025-04-30.csv`를 딱 한 번 돌리고(서버에 닿지 못한 글이 있으면 점수가 나오지 않으므로 그때는 서버를 켜고 다시 돌린다) research.md에 'R13. 최종 평가'로 적는다. 기준에 못 미치면 원인을 보고하고 멈춘다. 평가용을 보고 아무것도 고치지 않는다
  - 결과(2026-11-10): 한 번 쟀다(부하 제한 실행기로 같은 `eval.ts` 경로, 실패 0). 7개 중 6개를 넘었고 SC-006 주최만 87.5%(35/40)로 미달이다. 원인은 research R13에 적었고 사용자에게 보고하고 멈췄다.

**Checkpoint**: 모델·조합이 정해지고 최종 성적이 기록된다

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T029 고른 조합으로 `node etl/notices/run.ts`를 돌려 etl/out/cse-notices.json을 다시 만들고, 바로 전 결과와 바뀐 글을 비교해 의도한 변화인지 본다. 첫 실행 시간을 재려면 고른 모델의 보관 폴더를 잠시 옮겨 두고 `time`으로 90일치를 돌린 뒤(SC-008, 40분 안), 새로 생긴 보관 폴더는 지우고 옮겨 둔 폴더를 되돌린다. 하루치(3분 안)는 T012 두 번째 실행 시간으로 본다
  - 결과(2026-11-10): 다시 만든 결과는 기회 124 → 126이다. 새로 기회 4(오늘 글 3, 규칙이 확인 필요로 보내던 교과 1), 빠진 기회 2(기준일이 밀린 1, 현장실습 수강 신청 안내 1은 정답 기준상 X), 둘 다 기회인데 바뀐 6(LLM 종류 5, 주최를 규칙 값으로 바꿔 빈 2)이고 모두 의도한 변화다.
    - 첫 실행: gemma4:12b 보관 폴더를 옮겨 두고 90일치 150건을 새로 물었다. 부하 제한(GPU 평균 80%, 칩 80°C)을 걸고 461초(7.7분), 쉰 시간을 뺀 글당 2.3초(제한 없으면 약 6분)로 SC-008(40분 안)을 넘는다. 결과는 같고(기회 126, 실패 0), 보관 폴더는 되돌렸다(607건).
- [X] T030 ponytail-review로 etl/notices/llm.ts와 run.ts·eval.ts 변경을 점검하고 과설계 지적을 고친다(전역 워크플로 3단계)
  - 결과(2026-11-10): 지적 3개(net -8줄). 셋 다 고치지 않았다. `route`·`low`의 쓰지 않는 값은 FR-001·FR-005이고 모델을 바꿀 때 다시 비교하는 데 쓴다. 지시문의 주최 칸은 판이 바뀌어 다음 지시문 수정 때 뺀다(ponytail 주석).
- [X] T031 `/code-review`로 etl/notices/llm.ts와 run.ts·eval.ts 변경의 정확성을 점검한다. 공지 본문(밖에서 온 글)이 지시문에 들어가니 `/security-review`도 돌린다. 지적을 고친다(전역 워크플로 4단계)
  - 결과(2026-11-10): `/security-review` 확정 취약점 0건. 글 번호는 숫자만 경로에 들어가고, eval·child_process가 없고, 밖에서 온 주소로 요청하지 않는다. `/code-review` 지적은 10개였다.
    - 고친 2개: 40자 넘는 주최는 답 전체를 실패로 보지 않고 주최만 버린다(FR-004 수정). 답 보관 파일 쓰기가 실패해도 실행을 멈추지 않는다. 검사 1081개 통과.
    - 알려진 한계로 둔 것: 보관 답 열쇠에 글 내용이 없어 공지가 고쳐져도 옛 답을 쓴다. Ollama가 응답 없이 멈추면 글마다 120초를 기다린다. 모델 이름 정리 규칙상 서로 다른 이름이 같은 폴더가 될 수 있다. IPv6 맨 주소 OLLAMA_HOST를 못 읽는다. `clip`의 숫자 줄 필터가 넓고 8,000자에 앞붙임을 세지 않는다(바꾸면 판이 바뀐다). 임시 파일 쓰기와 글 번호 다시 읽기가 세 곳에 겹친다.
- [X] T032 `npm run check && npm run build && npm run audit:layout`이 모두 통과하는지 확인한다
  - 결과(2026-11-10): check 1081개 통과, build 통과, audit:layout 679개 통과(경고 0).
- [X] T033 spec.md 상태와 이 파일의 마무리 줄을 적는다(성적, 고른 조합, 알려진 한계)
  - 마무리(2026-11-10): 고른 조합은 gemma4:12b · 모든 글 · 확신 낮음 그대로 · 주최는 제목 규칙이다. 최종 평가는 7개 중 6개 통과(SC-006 주최 87.5% 미달, 규칙만 5개)로, 사용자 결정에 따라 알려진 한계로 마쳤다(research R13). 남은 한계는 T031 목록과 주최 규칙(과정 이름 대괄호, 학과 줄임말)이다.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1(T001·T002)은 언제든 할 수 있다. T001은 T006의 스키마 패턴 검사보다 먼저 끝나야 한다.
- Phase 2(T003·T004)가 끝나야 세 스토리를 시작한다.
- US1(T005~T012) → US3(T013~T017): 같은 파일(llm.ts, run.ts)이라 차례로 한다.
- US2(T018~T028)는 US1과 US3가 끝난 뒤에 한다(동작하는 판정 경로와 보관이 있어야 비교한다). T018·T019는 US1과 함께 해도 된다.
- Polish(T029~T033)는 US2 뒤.

### Within Each Story

- 검사(T005·T006, T013·T014)를 먼저 쓰고 실패를 본 뒤 구현한다.
- 같은 파일 태스크는 차례로 한다: llm.ts T003 → T007 → T008 → T009 → T015 → T023, run.ts T004 → T010 → T016.
- 정답셋 작업은 T018 → T028을 순서대로 한다. 최종 평가용(T025~T028)은 T023의 조합 확정 뒤에만 한다.

### Parallel Opportunities

- T001·T002: 다른 파일
- T005·T006: 다른 검사 파일
- T013·T014: 다른 검사 파일
- T018·T019: US1·US3 구현과 함께
- T026: Claude 서브에이전트 2개와 codex 워커 2개를 함께

---

## Parallel Example: User Story 1

```text
# 검사 두 개를 함께 쓴다
Task: "T005 llm.test.ts: 지시문 입력, 답 읽기, fromLlm, 보관, 판"
Task: "T006 run.test.ts: judgeAll 보낼 글·요약 수·스키마 패턴"
```

## Parallel Example: User Story 2

```text
# 최종 평가용 교차 라벨을 함께 돌린다
Task: "T026 Claude 서브에이전트 묶음 1·2"
Task: "T026 codex 워커 묶음 1·2"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2를 마치고 `npm run check`를 통과시킨다.
2. US1을 마치고 받아 둔 Gemma 4로 90일치를 돌려 본다.
3. **멈추고 확인**: 요약의 LLM 수, 바뀐 기회 몇 건, 보관.

### Incremental Delivery

1. **US1**: LLM 판정과 보관 (정확도 수치는 아직 없음)
2. **US3**: LLM이 없어도 도는 실패 처리
3. **US2**: 모델·조합 고르기와 최종 성적
4. **Polish**: 결과 파일 갱신 → ponytail-review → `/code-review`·`/security-review` → 세 확인 명령

---

## Notes

- [P]는 다른 파일이고 끝나지 않은 앞 태스크에 기대지 않는다는 뜻이다.
- 사용자 몫(T019의 내려받기 확인, T027의 갈린 줄 확인)은 Claude가 대신하지 않는다. T019의 후보 제안과 `ollama pull`은 Claude가 한다.
- 공지 본문 문장을 결과, 근거, 보관한 답, 검사 입력에 넣지 않는다. 검사 입력은 직접 만든 짧은 줄과 공개 제목만 쓴다.
- 학교 서버 요청은 스펙 1처럼 1초에 1건이다(T025). LLM 요청은 이 컴퓨터 안이라 서버 예의 대상이 아니다.
- 커밋은 사용자가 요청할 때만 한다.
