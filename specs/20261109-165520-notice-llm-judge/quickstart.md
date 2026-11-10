# Quickstart: 공지 판정에 로컬 LLM 더하기

**Feature**: [spec.md](./spec.md) · 계약: [contracts/llm.md](./contracts/llm.md) · 스펙 1 [quickstart.md](../20261107-193624-cse-notice-opportunities/quickstart.md)

## 준비

- Ollama가 떠 있는지: `curl -s http://127.0.0.1:11434/api/version` → `{"version":"0.32.0"}` 꼴.
- 판정 모델이 있는지: `ollama list`에 `KINGO_LLM_MODEL`(없으면 기본 모델)이 보인다.

## 1. 자동 검사 (Ollama 없이)

```sh
npm run check
```

- `etl/notices/llm.test.ts`와 run.test.ts의 LLM 사례가 통과한다(가짜 LLM 함수).

## 2. LLM을 켜고 90일치 실행 (US1)

```sh
node etl/notices/run.ts
```

- 요약 끝에 `LLM 판정 L(보관 A · 새로 B · 실패 C)`가 붙는다. 처음에는 B가 크고, 바로 다시 돌리면 A가 커지고 B는 첫 실행의 실패 수(C) 이하다(실패한 글만 다시 묻는다, SC-010).
- 첫 실행에 걸린 시간을 적는다(`time node etl/notices/run.ts`, SC-008).
- `etl/out/cse-notices.json`에서 LLM이 정한 기회는 `rule`이 `LLM: <모델>`이고, 마감은 규칙이 정한 값(`deadlineRule`이 스펙 1의 말)이다.
- `etl/.cache/llm/<모델>/<판>/`에 글마다 답 파일이 생긴다. `git status --short`에 나오지 않는다.

## 3. LLM을 끄고 실행 (US3)

§2 뒤에는 보낼 글의 답이 모두 보관돼 있어서, 그대로 끄고 돌리면 서버를 한 번도 부르지 않는다. 그래서 답 몇 개를 잠시 옮겨 두고 확인한다.

```sh
time node etl/notices/run.ts                      # 기준 실행: 서버 켬, 모두 보관됨
D=etl/.cache/llm/<모델>/<판>; mkdir -p /tmp/llm-aside && ls -t $D | head -3 | xargs -I{} mv $D/{} /tmp/llm-aside/
time OLLAMA_HOST=http://127.0.0.1:11999 node etl/notices/run.ts
mv /tmp/llm-aside/* $D/                            # 되돌림
```

- 종료 코드 0, 결과 파일을 쓴다. 보관한 답이 있는 글은 그 답을 쓰고, 옮겨 둔 3건은 규칙 결과다.
- 요약 다음 줄에 `LLM에 연결하지 못해 3건은 규칙만 썼어요 (<모델>)`. 실행 시간이 기준 실행보다 10초 넘게 늘지 않는다(SC-009).
- 없는 모델: 같은 방법으로 답 몇 개를 옮겨 두고 `KINGO_LLM_MODEL=no-such-model node etl/notices/run.ts` → 그 모델 이름의 보관 답이 없으니 보낼 글 모두가 K에 들어가고, 같은 연결 실패 줄이 나온다.

## 4. 정답셋 비교 (US2)

```sh
node etl/notices/eval.ts etl/gold/dev-501.csv
```

- 실행과 같은 판정 경로(규칙, LLM, 보관한 답)로 SC-001~SC-007을 보인다(FR-023).
- 모델 비교는 `KINGO_LLM_MODEL=<후보>`로 개발용 전체 답을 보관한 뒤, 임시 스크립트로 조합별 지표를 계산한다(research R10·R12).

## 5. 최종 평가 (US2, 딱 한 번)

```sh
node etl/notices/eval.ts new 2025-01-01 2025-04-30 100   # 평가용 초안
# 교차 라벨로 확정(스펙 1 FR-032와 같은 방법, 사용자는 갈린 줄만 확인)
node etl/notices/eval.ts etl/gold/draft-2025-01-01-2025-04-30.csv
```

- 결과를 research에 'R13. 최종 평가'로 적는다. 평가용을 보고 아무것도 고치지 않는다.

## 6. 마무리 확인

```sh
npm run check && npm run build && npm run audit:layout
```
