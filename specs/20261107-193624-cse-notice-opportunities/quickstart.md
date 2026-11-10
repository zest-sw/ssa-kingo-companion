# Quickstart: 소프트웨어학과 공지 수집·분류 확인 절차

**Feature**: [spec.md](./spec.md) · 명령 계약은 [contracts/cli.md](./contracts/cli.md), 결과 모양은 [contracts/cse-notices.schema.json](./contracts/cse-notices.schema.json)에 있다.

## 준비

```sh
node -v          # v22.18.0 이상이어야 한다 (.ts 파일을 바로 실행)
npm ci           # 처음 한 번. jsdom·vitest·typescript가 여기서 깔린다
```

- `cse.skku.edu`에 접속할 수 있어야 한다. 학교 서버에는 1초에 한 건만 요청한다.
- 받은 원문은 `etl/.cache/`에 쌓이고 커밋되지 않는다.

## 1. 자동 검사 (네트워크 없음)

```sh
npm run check
```

**기대**: 기존 검사와 `etl/**/*.test.ts`가 모두 통과한다. 다음 경우가 검사에 들어 있다:
- 오래된 고정글이 있어도 목록 읽기가 멈추지 않는다.
- 이전글·다음글의 날짜를 가져오지 않는다.
- 분류 함정 사례.
- 날짜 표기들.
- 제목줄 다음 줄의 마감.
- 자격 줄 제외.
- 중복 정리.
- 지표 분모.
- CSV(따옴표·BOM·EUC-KR·엑셀 날짜 꼴).
- 앞 9종 한글 이름이 화면 `CATEGORY_LABEL`과 같다.

## 2. 첫 실행 (US1, SC-008)

```sh
time node etl/notices/run.ts
```

**기대**:
- 5분 안에 끝나고, 표준 출력에 요약 한 줄이 나온다(`새 글 N · 기회 X · …`).
- `etl/out/cse-notices.json`이 생기고 `since`가 실행일 90일 전이다.
- 기회마다 `id`, `title`, `url`, `postedAt`, `kind`, `rule`이 있다. 마감이 있는 기회는 `deadlineRule`도 있다(SC-011).
- 2026-11-06 글 `cse:228201`은 `kind: job`, `host: 동진쎄미켐`, `deadline: 2026-11-15`, `deadlineRule: 본문: 접수기간`으로 나온다.

## 3. 다시 실행 (US3, SC-008, SC-009)

```sh
time node etl/notices/run.ts
```

**기대**:
- 1분 안에 끝나고 `새 글`이 0이거나 그사이 새로 올라온 수만큼이다.
- `collectedAt`만 빼면 결과 파일이 같다. 새 글이 없을 때 `git diff --no-index`로 비교해 확인한다.

## 4. 기준일 지정 (US1 시나리오 5, 정답셋 준비)

```sh
node etl/notices/run.ts 2026-04-01
```

**기대**:
- `since`가 `2026-04-01`이고, 2026-04-01 글부터 들어간다.
- 처음이면 본문 약 300건을 받느라 5분 남짓 걸린다.

## 5. 실패 보호 (US3 시나리오 2, 4)

```sh
shasum etl/out/cse-notices.json
# 네트워크를 끊고
node etl/notices/run.ts; echo "exit=$?"
shasum etl/out/cse-notices.json
```

**기대**: `목록을 받지 못했어요 …` 한 줄이 나오고 `exit=1`이다. 해시가 실행 전과 같다.

## 6. 원문 보호 (FR-033, FR-034, SC-010)

```sh
git check-ignore -v etl/.cache/cse/228201.html   # .gitignore 규칙이 나와야 한다
git status --short                               # etl/.cache, etl/gold 가 보이면 안 된다
```

**기대**: 결과 파일에는 계약에 있는 키만 있고, 근거 칸에는 정해진 말만 있다(자동 검사가 확인한다).

## 7. 정답셋 (US2, SC-001~SC-007)

```sh
node etl/notices/eval.ts new 2026-04-01 2026-11-06        # 개발용 초안 약 301줄
# Claude가 라벨 초안을 채우고, 사용자가 엑셀·Numbers에서 고쳐 저장한다
node etl/notices/eval.ts etl/gold/draft-2026-04-01-2026-11-06.csv
```

**기대**:
- 지표 표와 틀린 글 목록이 나온다.
- 규칙을 맞춰 모든 기준을 넘기면 종료 코드가 0이다.
- 값을 잘못 적은 줄이 있으면 줄 번호와 함께 코드 2로 끝난다.

규칙을 확정한 다음에만 평가용을 만든다.

```sh
node etl/notices/eval.ts new 2025-09-01 2025-12-31 100     # 평가용 100건 (해시 순서로 고정 표본)
node etl/notices/eval.ts etl/gold/draft-2025-09-01-2025-12-31.csv
```

**기대**: 이 결과를 최종 성적으로 기록한다. 미달이면 원인을 보고하고, 다음 단계는 사용자가 정한다.

## 8. 끝내기 전에 (팀 규칙)

```sh
npm run check && npm run build && npm run audit:layout
```

**기대**: 셋 다 통과한다. ETL은 화면을 건드리지 않지만, 팀 `CLAUDE.md`는 세 명령이 모두 통과해야 끝났다고 본다.
