# Goldfish Review — 공지 판정에 로컬 LLM 더하기

- 날짜: 2026-11-09
- 리뷰어 상태: comprehension 완료 · readiness GO

## Comprehension의 다시 쓰기

스펙 1의 소프트웨어학과 공지 ETL은 제목 단어 규칙과 게시판 기본값으로 글을 기회, 기회 아님, 확인 필요로 나눈다. 그런데 처음 보는 평가용 100건에서 기회 여부, 종류, 주최, 확인 필요 비율이 기준에 못 미쳤다. 그래서 판정 단계에 이 컴퓨터에서 도는 Ollama 로컬 LLM을 더한다. 고른 방식(규칙이 확인 필요로 보낸 글만, 또는 본문을 받은 모든 글)에 해당하는 글의 제목, 게시판, 잘라 낸 본문을 보내 기회 O/X, 종류(11종), 주최, 확신을 받고, 이 답을 규칙 판정 대신 쓴다. 마감은 계속 규칙이 뽑되 LLM이 정한 종류로 다시 계산한다.
성공한 답은 글, 모델, 지시문 해시마다 보관해 다시 묻지 않는다. 서버가 꺼졌거나 답이 틀리면 그 글은 규칙 결과로 내고 실행은 멈추지 않는다. 본문은 컴퓨터 밖으로 나가지 않는다.
후보 모델 2~3개 × 보낼 글 방식 2가지 × 확신 '낮음' 처리 2가지를 개발용 501건으로 비교해, 기준을 넘는 조합 중 가장 빠른 것을 고른다. 그 조합으로 2025년 1~4월 새 평가용 100건을 한 번만 잰다.

### 기존 시스템

- `node etl/notices/run.ts [기준일]`이 공지 목록을 기준일(기본값은 90일 전)까지 읽는다. 본문은 보관함(`etl/.cache/cse`)에 없는 것만 1초에 한 건씩 받는다.
- 판정은 제목과 게시판 분류만 보고, 기회 아님 단어 → 우선순위가 있는 종류 단어 → 게시판 기본값 순서로 정한다. 채용/모집·취업 글처럼 아무 단어도 안 걸리면 확인 필요('규칙에 안 걸림')다. 본문을 못 받은 글도 확인 필요('본문 못 받음')다.
- 기회로 정한 글에는 다음을 붙인다.
  - 마감: 본문 신청 줄 → 제목의 마감 표시 → 특강만 행사 날 순서로 찾는다.
  - 주최: 제목 맨 앞 대괄호 → '○○ 주최' 순서로 찾는다.
  - 분류 근거(`제목: <단어>`, `게시판: <분류>`)와 마감 근거.
- 날짜 표기만 다르고 마감이 같은 재게시 글은 최근 글 하나만 남긴다.
- 결과는 `etl/out/cse-notices.json`에 통째로 쓴다. 기회와 확인 필요만 담고, 요약 한 줄을 출력한다.
- `eval.ts`는 SHA-1 순서 표본으로 정답셋 초안을 만들고, run과 같은 judge 함수로 SC-001~SC-007을 잰다. 본문이 빠진 줄이 있으면 점수를 내지 않는다.
- LLM은 어디에도 없다. 2차 평가용에서 마감은 기준을 넘었다. 기회 여부 93.3%, 종류 88.6%, 주최 88.6%, 확인 필요 11.0%는 미달이었고, 알려진 한계로 두고 스펙 1을 마쳤다.

## 지적과 처리

| # | 리뷰어 | 심각도 | 위치 | 요지 | 처리 | 근거·변경 |
|---|---|---|---|---|---|---|
| 1 | comprehension | Major | research R4, spec FR-003 | 지시문 재료(종류 뜻 표, 예시, 덤프 꼴)가 저장소 어디에도 없다 | 수정 | 브레인스토밍 1부("확정한 정답 기준 5가지와 종류 표를 줄여 넣고, 예시 몇 개")에서 정한 재료가 저장소 밖에만 있었다. 라벨러 기준을 스펙 1 `gold-guide.md`로 옮기고 FR-003·R3·R4·contracts '요청'·T007·T026이 가리키게 했다 |
| 2 | comprehension | Major | spec FR-020·FR-021 | 조합을 고르는 '실행 시간'을 무엇으로 재는지 없다 | 수정(사용자 결정) | 사용자 결정(2026-11-09): 조합 시간 = 90일 창에서 그 방식이 보내는 글 수 × 모델의 글당 평균, 같으면 SC-001 → SC-003. FR-020·FR-021·T023에 반영 |
| 3 | comprehension | Major | data-model LlmOutcome·LlmStats | 'down' 뒤 보관 답을 쓰는지, 처음 'down' 글을 어디에 세는지 두 가지로 읽힌다 | 수정 | 브레인스토밍 2부("보관해 둔 LLM 답은 그대로 쓰고, 새 글만 규칙 결과"). Ask가 보관함을 먼저 읽고 끊긴 뒤 서버를 부르지 않으며, 'down' 글은 처음 것까지 K로 센다고 data-model·contracts·FR-015에 적었다 |
| 4 | comprehension | Major | plan Structure Decision, research R10 | 상수만으로는 조합 비교가 실행과 같은 경로(FR-023)를 따를 수 없다 | 수정 | 브레인스토밍 3부("방식별 지표는 그 답으로 계산")와 4부(비교 계산은 임시 스크립트). 두 상수를 `judgeAll`·`fromLlm`의 기본값 인자로 두고 스크립트가 같은 함수에 네 조합을 넘긴다(R10, plan Complexity Tracking, T021) |
| 5 | comprehension | Major | contracts/llm.md 실행 명령 | 정답셋 비교에서 LLM 꺼짐·실패를 어떻게 다루는지 없다 | 수정(사용자 결정) | 사용자 결정(2026-11-09): 서버에 닿지 못한 글이 있으면 점수를 내지 않고 코드 1, 글 실패는 규칙 결과로 넣고 수를 보임. FR-023·contracts '정답셋 비교의 바뀐 곳'·T011·T028에 반영 |
| 6 | comprehension | Major | research R2 | `gemma-4-longctx:latest`가 무엇인지, 후보가 몇 개인지 갈린다 | 수정 | `~/.ollama/models/manifests/registry.ollama.ai/library/gemma-4-longctx/latest`: 모델 층이 E4B GGUF와 같고 매개변수(num_ctx 16384, stop)만 다르다. R2·FR-019에 같은 가중치라 후보 하나로 센다고 적었다 |
| 7 | comprehension | Nit | spec FR-003 | 판을 손으로 올리는 것처럼 읽힌다(R4는 해시) | 수정 | 문서끼리의 사실 불일치(research R4). FR-003을 '판은 요청 내용으로 저절로 정해진다'로 고쳤다 |
| 8 | comprehension | Nit | spec FR-012·FR-016 | 같은 글자 N을 두 뜻으로 쓴다 | 수정 | 문서끼리의 사실 불일치(contracts는 L·K). FR-012와 US3 시나리오 1을 K로 바꿨다 |
| 9 | comprehension | Nit | spec SC-009 | 비교 기준인 'LLM 없이 돌 때'를 만드는 법이 없다 | 기록 | 22번 처리로 SC-009가 함께 바뀌었다 |
| 10 | comprehension | Nit | spec Edge Cases | 본문 못 받은 글을 보내지 않는다는 말이 data-model에만 있다 | 기록 | 15번 처리로 FR-002에 함께 적혔다 |
| 11 | comprehension | Nit | data-model fromLlm | 판정 결과 꼴에 주최·모델 이름 자리가 없다 | 기록 | 12·14번 처리로 `LlmJudged`와 함수 꼴이 함께 적혔다 |
| 12 | readiness | Major | data-model Ask·fromLlm | run.ts가 근거와 연결 실패 줄에 쓸 모델 이름을 받을 길이 없다 | 수정 | 브레인스토밍 1부(근거 `LLM: <모델 이름>`)·2부(연결 실패 줄)에서 정한 출력을 내려면 필요한 자리다. Ask에 `model` 속성, `fromLlm(answer, model, low)`을 data-model·T003·T009·T010에 적었다 |
| 13 | readiness | Major | plan Complexity Tracking, tasks T005·T006·T021 | 상수뿐이면 검사와 비교 스크립트가 두 값을 다 돌릴 수 없다 | 수정 | 4번과 같은 변경. T006·T021을 인자로 넘기는 꼴로 고쳤다 |
| 14 | readiness | Major | tasks T010·T011·T016, plan Source Code | run.ts·eval.ts의 함수 꼴, 순서, ask 넣는 자리가 비어 있다 | 수정 | FR-025(검사는 LLM 서버 없이)와 코드 위치(`etl/notices/run.ts:66`·`:115`, `run.test.ts:229`, `eval.ts:219`·`:237`). data-model '함수 꼴' 표를 더하고, 실제 ask는 `import.meta.main` 줄에서만 만들며, ask 없이 부르는 기존 검사는 기대값을 바꾸지 않는다고 T010·T011에 적었다 |
| 15 | readiness | Major | contracts/llm.md 요청, research R2·R3 | 문맥 길이(`num_ctx`)가 정해지지 않아 긴 글이 잘리고 후보 조건이 다르다 | 수정 | 승인한 입력 크기(1부, R3)를 담으려면 필요하다. `num_ctx: 16384`를 요청에 고정하고 판에 넣었으며, 본문을 합쳐 8,000자로 잘랐다(R1·R3·contracts·FR-002·T005·T009) |
| 16 | readiness | Major | research R4, tasks T007·T022 | 판이 지시문·스키마만 덮어, 다른 요청 요소를 바꾸면 옛 답을 쓴다 | 수정 | 브레인스토밍 1부("모델이나 지시문을 바꾸면 새로 물어요")와 FR-009·FR-010. 판을 글 내용만 뺀 요청 전체의 해시로 정했다(R4, contracts '판', data-model, T005·T007) |
| 17 | readiness | Major | contracts/llm.md 실패 구분, tasks T013·T015 | 연결 거부가 아닌 네트워크 오류가 어느 쪽에도 없다 | 수정 | 브레인스토밍 2부(꺼지면 규칙으로, 멈추지 않음)와 SC-009. 응답 전 `fetch` 오류 전부와 404를 'down'으로 적고 검사 줄을 더했다(R7, contracts, FR-012·FR-013, T013·T015) |
| 18 | readiness | Major | research R9, tasks T009 | `OLLAMA_HOST` 읽기 규칙이 Ollama와 다르다 | 수정 | Ollama 클라이언트는 포트가 없으면 11434를 붙인다(`OLLAMA_HOST=0.0.0.0` 관례). R9·contracts '설정'을 '스킴이 없으면 http://, 포트가 없으면 :11434'로 고치고 T005에 검사를 더했다 |
| 19 | readiness | Major | tasks T020·T028, quickstart §4·§5 | eval이 LLM 꺼짐·실패를 어떻게 다루는지 없다 | 수정(사용자 결정) | 5번과 같은 결정. T020 끝의 보관 수 확인과 T028 앞의 준비 확인도 함께 둠 |
| 20 | readiness | Major | tasks T023, spec FR-020·FR-021 | 시간 기준이 두 가지로 읽히고 동점 규칙이 없다 | 수정(사용자 결정) | 2번과 같은 결정 |
| 21 | readiness | Major | tasks T007·T026, research R4 | 지시문과 교차 라벨이 기대는 기준 문서(guide-v3)가 저장소에 없다 | 수정 | 1번과 같은 변경(스펙 1 `gold-guide.md`) |
| 22 | readiness | Major | quickstart §3, tasks T017·T012 | 적힌 순서대로 하면 연결 실패 줄이 나오지 않고 SC-009의 비교 기준이 없다 | 수정 | 문서 안의 사실(T009·T015의 보관 우선 동작). 보관 답 3개를 옮겨 두고 확인하는 순서, 기준 실행(서버 켬·모두 보관), K=0이면 줄 없음을 quickstart·SC-009·T012·T017·FR-012에 적었다 |
| 23 | readiness | Major | tasks T005·T009, Phase 6 | 깨진 보관 파일, 설정 분기, SC-008에 검증이 없다 | 수정 | FR-025의 검사 범위와 SC-008. T005에 두 검사를, T012·T029에 시간 재기를 더했다 |
| 24 | readiness | Nit | plan Project Structure | 'tasks.md 아직 없음'이 지금과 다르다 | 수정 | 사실 오류(같은 폴더에 tasks.md가 있다). 주석을 고쳤다 |
| 25 | readiness | Nit | tasks T019·Notes | 누가 무엇을 하는지 T019와 Notes가 어긋난다 | 수정 | 브레인스토밍 3부("받을 모델은 비교를 시작하기 전에 여쭤볼게요"): Claude가 제안하고 사용자가 확인한다. T019·Notes를 나눠 적었다 |

## 집계

지적 25개 중 문서를 바꾼 것 22개
