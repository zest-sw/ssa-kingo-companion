# Data Model: 소프트웨어학과 공지 수집·분류

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

타입 표기는 TypeScript로 쓴다. 날짜는 모두 `YYYY-MM-DD` 문자열이다(게시판 날짜가 한국 날짜라 시간대 변환을 하지 않는다).

## 종류 (Kind)

```ts
import type { Category } from '../../src/domain/types.ts';
type Kind = Category | 'scholarship' | 'course'; // 11종
```

| 식별자 | 한글 이름(정답셋 CSV) | 비고 |
|---|---|---|
| `job` | 채용 | 화면에 있음 |
| `lecture` | 특강 | 화면에 있음 |
| `hackathon` | 해커톤 | 화면에 있음 |
| `contest` | 대회·공모전 | 화면에 있음 |
| `edu` | 교육·캠프 | 화면에 있음 |
| `club` | 동아리·학회 | 화면에 있음 |
| `volunteer` | 봉사 | 화면에 있음 |
| `mentoring` | 멘토링 | 화면에 있음 |
| `global` | 글로벌 | 화면에 있음 |
| `scholarship` | 장학 | ETL에만 있음(스펙 2에서 공용 타입에 추가) |
| `course` | 교과 | ETL에만 있음(화면 노출은 스펙 2 팀 결정) |

- 앞 9개 한글 이름은 화면의 `CATEGORY_LABEL`(`src/domain/recommend-flow/opportunities.ts`)과 같아야 한다.
- 그 모듈은 확장자 없는 import(`'../recommend'`)를 써서 Node로 직접 가져올 수 없다. 그래서 ETL은 이름표를 따로 두고, 둘이 같은지는 vitest 검사로 확인한다(vitest는 Vite처럼 확장자 없는 경로를 찾는다).

## 내부 값 (파일로 남지 않음)

```ts
/** 목록 한 줄 */
type NoticeRow = {
  no: number;          // 글 번호(articleNo)
  title: string;       // 공백 정리한 제목
  board: string;       // 게시판 분류, 대괄호 뺀 값(예: '채용/모집')
  postedAt: string;    // YYYY-MM-DD
  pinned: boolean;     // 정보 첫 칸이 '공지'면 고정글
};

/** 본문. 받지 못했거나 본문 영역이 없으면 null */
type BodyLines = string[] | null;

/** 판정 */
type Judged =
  | { verdict: 'opportunity'; kind: Kind; rule: string }
  | { verdict: 'not'; rule: string }
  | { verdict: 'review'; why: string };
```

## 결과 파일 (`etl/out/cse-notices.json`)

계약은 [contracts/cse-notices.schema.json](./contracts/cse-notices.schema.json)에 있다.

```ts
type ResultFile = {
  source: 'https://cse.skku.edu/cse/notice.do';
  collectedAt: string;          // ISO 시각, 예: '2026-11-07T11:30:00.000Z'
  since: string;                // 기준일(그날 포함)
  opportunities: Opportunity[]; // 글 번호 큰 순
  review: ReviewItem[];         // 글 번호 큰 순
};

type Opportunity = {
  id: string;                   // 'cse:<글번호>'
  title: string;
  url: string;                  // 'https://cse.skku.edu/cse/notice.do?mode=view&articleNo=<글번호>'
  postedAt: string;
  host: string | null;
  kind: Kind;
  deadline: string | null;
  rule: string;                 // 분류 근거
  deadlineRule: string | null;  // 마감 근거. deadline이 null이면 null
};

type ReviewItem = { id: string; title: string; url: string; postedAt: string; why: string };
```

### 검증 규칙

- `id`는 `^cse:\d+$`, `url`의 글 번호와 같다.
- `postedAt`, `since`, `deadline`은 실제 달력에 있는 `YYYY-MM-DD`다. `postedAt >= since`다.
- `deadline`이 있으면 `deadline >= postedAt`(FR-016)이고 `deadlineRule`도 있다. 없으면 둘 다 null이다.
- `host`는 앞뒤 공백을 지운 빈 문자열이 아닌 값이거나 null이다.
- 근거(`rule`, `deadlineRule`, `why`)에는 아래 정해진 말과 걸린 단어만 들어간다. 본문 문장은 넣지 않는다(FR-011, FR-033).
- 한 파일 안에서 `id`는 한 번만 나온다. 기회와 확인 필요에 같은 글이 함께 있지 않다.

### 근거에 쓰는 말

| 칸 | 값 | 뜻 |
|---|---|---|
| `rule` | `제목: <단어>` | 2단계에서 종류 단어로 정함(예: `제목: 채용`) |
| `rule` | `게시판: <분류>` | 3단계 게시판 기본값(예: `게시판: 행사/세미나`) |
| `deadlineRule` | `본문: <라벨>` | 본문 신청 줄(예: `본문: 접수기간`) |
| `deadlineRule` | `제목` | 제목의 날짜 |
| `deadlineRule` | `본문·제목` | 본문 신청 줄 날짜가 엇갈렸지만 그중 하나가 제목의 마감 표시와 같음 |
| `deadlineRule` | `행사 날: 제목` / `행사 날: 본문` | 특강의 행사 날 |
| `why` | `규칙에 안 걸림 (<분류>)` | 채용/모집·취업에서 단어 없음 |
| `why` | `모집 단어 있음 (<분류>)` | 학사·일반인데 모집·신청·참가가 있음 |
| `why` | `처음 보는 게시판 (<분류>)` | 표에 없는 게시판 분류 |
| `why` | `게시판 분류 없음` | 분류 없이 올라온 글(표본 목록 300줄 중 7줄) |
| `why` | `본문 못 받음` | 받기 실패 또는 본문 영역 없음 |
| `rule` | `LLM: <모델 이름>` | 스펙 2: 로컬 LLM이 기회로 정함(예: `LLM: gemma-4-longctx:latest`) |
| `why` | `LLM 확신 낮음` | 스펙 2: LLM 답의 확신이 낮아 확인 필요로 둠 |

'기회 아님'의 근거(`기회 아님: <단어>`)는 파일에 남지 않고 요약 수와 정답셋 비교에서만 쓴다.

## 실행 요약 (표준 출력)

```ts
type Summary = { fetched: number; opportunity: number; not: number; review: number; merged: number; deadlineBlank: number };
```

- 출력 꼴: `새 글 {fetched} · 기회 {opportunity} · 기회 아님 {not} · 확인 필요 {review} · 합친 중복 {merged} · 마감 빈칸 {deadlineBlank}`
- 늘 맞아야 하는 식: `opportunity + not + review + merged` = 기준일 안 글 수. `deadlineBlank <= opportunity`.

## 정답 라벨 (`etl/gold/*.csv`, 로컬 전용)

형식은 [contracts/gold-csv.md](./contracts/gold-csv.md)에 있다.

```ts
type GoldRow = {
  id: string;                                    // 링크의 글 번호에서 만든 'cse:<글번호>'
  board: string;
  title: string;
  postedAt: string;                              // 게시일. 마감 연도 추정에 쓴다
  opportunity: boolean;                          // O/X
  kind: Kind | null;                             // 기회일 때만
  deadline: string | 'none' | 'image' | null;    // 날짜·'없음'·'그림·첨부'. 기회일 때만
  host: string | null;                           // '없음'이면 null
};
```

- 확신·메모 칸은 사람이 보려고 두는 칸이다. 머리글만 확인하고 값은 읽지 않는다(어느 지표도 쓰지 않음).

- 기회가 X면 종류·마감은 비어 있어야 한다. 기회가 O면 종류와 마감 칸이 반드시 있다.
- 같은 `id`가 두 줄에 나오면 오류다.

## 지표 (정답셋 비교 결과)

정의는 spec의 SC-001~SC-007 그대로다. G는 정답, R은 규칙이다.

| 지표 | 분자 / 분모 |
|---|---|
| 기회 여부 | R이 확인 필요가 아닌 글 중 기회 여부가 G와 같은 글 / R이 확인 필요가 아닌 글 |
| 기회 놓침 | G가 기회인데 R이 기회 아님 / G가 기회인 글 |
| 종류 | 둘 다 기회이고 종류가 같은 글 / 둘 다 기회인 글 |
| 마감 정확 | 둘 다 기회이고 R 마감 = G 날짜 / 둘 다 기회이고 R이 마감을 채운 글 |
| 마감 채움 | 둘 다 기회이고 G가 날짜이며 R이 채운 글 / 둘 다 기회이고 G가 날짜인 글 |
| 주최 | 둘 다 기회이고 R 주최 = G 주최(공백 정리 후) / 둘 다 기회이고 R이 주최를 채운 글 |
| 확인 필요 | R이 확인 필요인 글 / 전체 |
| 주최 채움(참고) | 둘 다 기회이고 R이 주최를 채운 글 / 둘 다 기회이고 G 주최가 있는 글 |

분모가 0이면 그 지표는 '해당 없음'이다.

## 상태 변화 (본문 보관)

```text
보관 없음 ──받기 성공 + 본문 영역 있음──▶ 보관됨 (다음 실행부터 다시 받지 않음)
    │
    └──받기 실패 또는 본문 영역 없음──▶ 보관 없음 그대로 (확인 필요 '본문 못 받음', 다음 실행에서 다시 받음)
```

제목과 게시판 분류는 보관하지 않고 실행할 때마다 목록에서 새로 읽는다.
