# Data Model: 공지 판정에 로컬 LLM 더하기

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · 스펙 1 [data-model.md](../20261107-193624-cse-notice-opportunities/data-model.md)

스펙 1의 타입(NoticeRow, Judged, Judgement, Opportunity, ReviewItem, ResultFile, Summary)은 그대로 두고 아래를 더한다.

## LlmAnswer (검사를 통과한 LLM 답)

| 칸 | 타입 | 규칙 |
|---|---|---|
| `verdict` | `'O' \| 'X'` | 답의 '기회' |
| `kind` | `Kind \| null` | 답의 '종류'. 11종 한글 이름을 `Kind`로 바꾼 값. `verdict`가 X면 null |
| `host` | `string \| null` | 답의 '주최'. 앞뒤 공백을 정리하고 '없음'·빈 값은 null. 40자를 넘으면 null(답은 받는다). X면 null. 판정에는 쓰지 않는다(결과의 주최는 제목 규칙 값, spec FR-001) |
| `sure` | `boolean` | 답의 '확신'이 '높음'이면 true |

- LLM이 낸 원래 글자(JSON)는 이 꼴로 바뀐 뒤에만 쓴다. 바꾸지 못하면 실패다(contracts/llm.md '답 검사').

## LlmOutcome (글 하나를 물은 결과)

`{ answer: LlmAnswer, cached: boolean }` | `'fail'` | `'down'`

- `cached`: 보관함에서 읽었으면 true, 이번에 서버에서 받았으면 false.
- `'fail'`: 서버에 닿은 뒤 이 글만 실패(시간 초과, 404가 아닌 HTTP 오류, 답 검사 실패). 보관하지 않는다.
- `'down'`: 서버에 닿지 못했거나 모델이 없다(contracts/llm.md '실패 구분').

## Ask

`type Ask = ((row: NoticeRow, lines: string[]) => Promise<LlmOutcome>) & { readonly model: string }`

- `makeAsk({ model?, host?, dir?, post? })`가 만든다. `model`·`host`가 없으면 설정(`KINGO_LLM_MODEL`, `OLLAMA_HOST`)과 기본값을 쓴다. `dir`은 보관 폴더(기본 `etl/.cache/llm`), `post`는 HTTP 함수(기본 내장 `fetch`)로 검사가 바꿔 넣는다.
- 묻는 순서: 보관함을 먼저 읽는다(있으면 `cached: true`). 없으면 서버에 묻는다. 한 번 `'down'`을 받은 Ask는 그 뒤로 서버를 부르지 않고, 보관함에 없는 글에는 바로 `'down'`을 준다. 보관함은 계속 읽는다.
- 근거 `LLM: <모델>`과 연결 실패 줄의 모델 이름은 `ask.model`에서 온다. 모델 이름은 설정 한 곳에서만 정해진다(FR-011).
- 실제 Ask는 `run.ts`·`eval.ts`의 `import.meta.main` 줄에서만 `makeAsk()`로 만든다. `main`의 기본값으로 만들지 않아, 검사가 실제 Ollama를 부르거나 실제 보관 폴더에 쓰지 않는다.

## 판정에 넣는 LLM 결과

스펙 1 `Judged`(classify.ts) 그대로다. 처음에는 기회일 때 주최를 더한 `LlmJudged`였지만, 주최를 제목 규칙 값으로 정한 뒤(2026-11-10) 뺐다.

## 함수 꼴

| 함수 | 꼴 | 메모 |
|---|---|---|
| `fromLlm` (llm.ts) | `(answer: LlmAnswer, model: string, low = LLM_LOW) => Judged` | 아래 표 |
| `judge` (run.ts) | `(row, lines, llm?: Judged) => Judgement` | `llm`이 있으면 규칙 판정 대신 쓴다. 기회면 마감은 `llm.kind`로 `deadlineOf`. 주최는 늘 `hostOf(제목)` |
| `judgeAll` (run.ts) | `(rows: NoticeRow[], lines: (string[] \| null)[], ask?: Ask, route = LLM_ROUTE, low = LLM_LOW) => Promise<{ judged: Judgement[]; llm: LlmStats \| null }>` | `lines[i]`는 `rows[i]`의 본문. `judged`는 `rows` 순서. `ask`가 없으면 규칙만 쓰고 `llm`은 null |
| `formatSummary` (run.ts) | `(s: Summary, llm?: LlmStats \| null) => string` | `llm`이 없으면 스펙 1과 같은 한 줄. 있으면 끝에 LLM 수, K>0이면 다음 줄에 연결 실패 줄 |
| `main` (run.ts) | `(args, get, out = OUT_FILE, dir = CACHE_DIR, ask?: Ask) => Promise<number>` | `import.meta.main`에서 `makeAsk()`를 넣는다 |
| `main`·`compare` (eval.ts) | 끝 인자 `ask?: Ask`를 더한다 | `import.meta.main`에서 `makeAsk()`를 넣는다 |

## LLM 답 → 판정 (`fromLlm`)

| 답 | `low` | 판정(`Judged`) | 근거·이유 |
|---|---|---|---|
| O, 확신 높음 | 상관없음 | 기회, 종류 = `kind` | `LLM: <모델>` |
| O, 확신 낮음 | `accept` | 위와 같다 | `LLM: <모델>` |
| O, 확신 낮음 | `review` | 확인 필요 | `LLM 확신 낮음` |
| X, 확신 높음 | 상관없음 | 기회 아님 | `LLM: <모델>` |
| X, 확신 낮음 | `accept` | 기회 아님 | `LLM: <모델>` |
| X, 확신 낮음 | `review` | 확인 필요 | `LLM 확신 낮음` |

- 기회가 된 글의 마감은 `deadlineOf(본문, 제목, 게시일, LLM 종류)`로 다시 정한다(FR-007).

## 보낼 글 (`LLM_ROUTE`)

| 값 | 보내는 글 |
|---|---|
| `review` | 규칙이 확인 필요로 낸 글(본문을 받은 글만) |
| `all` | 본문을 받은 모든 글 |

- 두 상수의 최종 값은 US2 비교로 정하고 research R12에 적는다.

## LlmCacheFile (`etl/.cache/llm/<모델>/<판>/<글번호>.json`)

```json
{ "model": "gemma-4-longctx:latest", "prompt": "1a2b3c4d", "at": "2026-11-09T08:00:00.000Z", "answer": { "verdict": "O", "kind": "edu", "host": "SK그룹", "sure": true } }
```

- `<모델>`은 모델 이름에서 `[^A-Za-z0-9._-]`를 `_`로 바꾼 것이다. `<판>`은 글 내용만 뺀 요청 전체(지시문, 답 스키마, 사용자 메시지 틀, 자르기 한도, `think`·`options`)의 SHA-1 앞 8자리다(research R4).
- 읽을 때 꼴이 틀리면(손으로 고친 파일 등) 없는 것으로 보고 다시 묻는다.

## LlmStats (요약에 쓰는 수)

| 칸 | 뜻 |
|---|---|
| `model` | `ask.model` |
| `cached` (A) | 보관한 답을 쓴 글 |
| `fresh` (B) | 이번에 새로 받은 답을 쓴 글 |
| `failed` (C) | `'fail'`이라 규칙 결과를 쓴 글 |
| `skipped` (K) | `'down'`이라 규칙 결과를 쓴 글. 처음 `'down'`을 받은 글도 여기에 센다 |

- 요약: `… · LLM 판정 {A+B}(보관 A · 새로 B · 실패 C)`. K>0이면 다음 줄에 `LLM에 연결하지 못해 {K}건은 규칙만 썼어요 ({모델})`. K=0이면 그 줄은 없다.
- LLM에 보내지 않은 글(`review` 방식에서 규칙이 정한 글, 본문을 받지 못한 글)은 어디에도 세지 않는다.

## 근거에 쓰는 말 (스펙 1에 더함)

| 칸 | 값 | 뜻 |
|---|---|---|
| `rule` | `LLM: <모델 이름>` | LLM이 기회로 정함(예: `LLM: gemma-4-longctx:latest`) |
| `why` | `LLM 확신 낮음` | LLM 답의 확신이 낮아 확인 필요로 둠(`LLM_LOW`가 `review`일 때) |

- 기회 아님은 결과 파일에 남지 않아 근거가 밖으로 나가지 않는다(스펙 1과 같다).
- 결과 파일 스키마의 `rule` 패턴은 `^(제목|게시판|LLM): .+$`가 된다.
