---
version: alpha
name: 킹고 컴패니언
description: 성균관대 학생이 자기 기록으로 교과 밖 활동을 고르는 데스크톱 웹. 업무 도구처럼 조용하고, 주인공 하나만 또렷하게 남는다.
colors:
  ground: "#f8f9fa"      # --bg 페이지·사이드바 바탕
  surface: "#ffffff"     # --surface 카드·패널·서랍·모달
  ink: "#111418"         # --text 본문
  muted: "#5e6570"       # --text-sub 보조 글자
  faint: "#8a909a"       # --text-faint 옅은 글자·단위·개수(본문에는 쓰지 않는다)
  line: "#e6e8eb"        # --line 면을 나누는 1px 선
  line-strong: "#d3d7dc" # --line-strong 입력·보조 버튼 테두리, 그림 틀
  primary: "#1e3b2e"     # --primary 성균관대 초록: 주 버튼 하나, 확인·완료
  navy: "#1d2b4f"        # --navy-900 포커스 링, AI·데이터 분야
  accent: "#d4682c"      # --accent 성균관대 주황: 오늘·마감 임박(D-3 이하)
  accent-ink: "#a24e1f"  # --accent-ink 주황 글자(대비 확보)
typography:
  page:
    fontFamily: Pretendard Variable
    fontSize: 24px
    fontWeight: 700
    letterSpacing: -0.02em
  lead:
    fontFamily: Pretendard Variable
    fontSize: 18px
    fontWeight: 700
  title:
    fontFamily: Pretendard Variable
    fontSize: 16px
    fontWeight: 600
  body:
    fontFamily: Pretendard Variable
    fontSize: 15px
    lineHeight: 1.55
  sub:
    fontSize: 13px
  min:
    fontSize: 12px
rounded:
  control: 4px   # 버튼, 입력, 칩, 배지, 탭, 행, 보기 전환
  surface: 6px   # 카드, 패널, 서랍, 모달, 토스트
  bar: 2px       # 진행 막대, 그림 속 막대
  dot: 999px     # 상태 점, 아바타에만
spacing:
  unit: 4px
  card-pad: 20px     # 낮은 화면(높이 760 아래) 16px
  card-gap: 16px     # 카드 사이(낮은 화면 12px)
  head-gap: 12px     # 카드 머리와 내용 사이
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: 36px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.line-strong}"
    rounded: "{rounded.control}"
    height: 36px
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line}"
    rounded: "{rounded.surface}"
    padding: "{spacing.card-pad}"
---

# DESIGN.md: 킹고 컴패니언 디자인 계약

이 파일이 화면 모양의 기준이다. 값의 실체는 `src/styles/tokens.css`, 부품은 `src/components`(쓰는 법은 `#/_kit`). 화면 구조·경로·목업 대응은 `docs/design/web-desktop.md`, 문구는 `.claude/skills/kingo-ux-writing`. 겹치면 이 파일이 이긴다. 새 화면, 새 부품, 화면 손질 모두 이 파일을 먼저 읽는다.

## Overview

성균관대 학생이 자기 기록(활동, 회고, 학교 확인)으로 지금 할 수 있는 교과 밖 활동을 고르고, 자기를 이해하는 데스크톱 웹이다. 2026-10-29 '둥글고 유아틱하다'는 피드백 뒤로 업무 도구(Linear, 토스증권 PC)처럼 정돈된 톤을 쓴다.

모양은 학교와 기록에서 온다. 바탕은 무채색 종이처럼 조용하고, 색은 성균관대 UI 색(초록·네이비·주황)을 채도를 낮춰 **의미가 있을 때만** 쓴다. 데이터는 글보다 그림(간트, 지도, 트리, 육각형)으로 보이고, 화면마다 그림이 달라 실루엣만으로도 어느 화면인지 안다. 한 화면에 주인공은 하나다(가장 크고 진한 것 하나, 나머지는 조연).

## Colors

| 역할 | 토큰 | 쓰는 곳 | 쓰지 않는 곳 |
|---|---|---|---|
| 바탕 | `--bg` | 페이지·사이드바 | 카드 |
| 면 | `--surface` | 카드, 패널, 서랍, 모달 | |
| 면 hover / 눌림 | `--surface-hover` / `--surface-press` | 누를 수 있는 행·카드·버튼 | 정적인 면. `--surface-alt` 는 hover 로 쓰지 않는다(흰 바탕과 거의 같아 안 보인다) |
| 옅은 면 | `--surface-alt` | 패널 행동 막대, 표의 묶음 줄 | hover |
| 글자 | `--text` / `--text-sub` / `--text-faint` | 본문 / 보조·작은 묶음 제목·범례 / 단위·개수·그림 틀 이름 | `--text-faint` 를 읽어야 하는 문장에 쓰지 않는다 |
| 선 | `--line` / `--line-strong` | 면 나누기 / 입력·보조 버튼 테두리, hover 테두리, 그림 틀 | 두꺼운 선(2px 이상)은 지금 위치 표시와 진행 막대뿐 |
| 초록 `--primary` (`--green-900`) | 주 버튼(화면당 하나), 확인한 것(채운 점, 실선), 완료 체크, 개발 분야 | 눈썹 라벨, 넓은 면, 장식 |
| 네이비 `--navy-900` | 포커스 링, AI·데이터 분야, 학교 확인 | 링크 글자 |
| 주황 `--accent` / `--accent-ink` | 오늘 선, D-3 이하 마감, 멘토링 분야 점, '오늘' 배지 | 경고·오류, 넓은 면 |
| 라임 `--lime-500` | 창업·기획 분야 점·선, 토스트 버튼 글자(`--lime-100`) | 카드 띠, 강조 |
| 글로벌 `--field-global` | 글로벌 분야 점 | |
| 회색 `--grey-500` | 학생이 **안 한 것**(건너뛴 단계, 안 해 본 분야) | 학생이 한 것 |
| 상태 `--state-*` | 할 일 한 줄 막대와 그 열쇠에만 | 다른 그림 |

- 분야 색은 의미가 고정이고 색만으로 구분하지 않는다(점 옆에 이름).
- 큰 색 면은 칠하지 않는다. 면이 필요하면 옅은 틴트(`--tint` 14%) + 1px 진한 테두리.
- 대비(흰 바탕): `--text` 18.5:1, `--text-sub` 5.9:1, `--accent-ink` 5.8:1. `--text-faint` 3.2:1 은 AA 밑이라 단위·개수·자리 표시에만 쓴다.

## Typography

Pretendard Variable 한 가족(`index.html`, 실패하면 시스템 한글 글꼴). 자리마다 다른 글꼴을 들이지 않는다.

| 역할 | 토큰 | 크기/굵기 | 낮은 화면 |
|---|---|---|---|
| 페이지 제목 | `--fs-page` | 24 / 700 | 20 |
| 결론형 제목(카드가 말하는 한 문장), 서랍·모달 제목, 화면 주인공 문장 | `--fs-lead` | **18 / 700** | 16 |
| 카드 제목(이름형) | `--fs-title` | 16 / 600 | 15 |
| 본문, 목록 행 이름(600) | `--fs-body` | 15 / 400·600 | 그대로 |
| 보조, 작은 묶음 제목(600), 글 속 링크 | `--fs-sub` | 13 | 그대로 |
| 최소(범례, 배지, 그림 이름표) | `--fs-min` | 12 | 그대로 |

- 굵기는 700 / 600 / 400 세 단계. **18 은 언제나 700**, 16 은 600. 18/600 같은 중간값을 만들지 않는다.
- 주인공(가장 큰 것)은 화면에 하나. 화면 주인공 문장만 24/700 을 쓸 수 있다(추천 '가장 추천' 이름, 분석 정체성 문장).
- 숫자는 전역 `tabular-nums`. 제목 자간 `-0.02em`.

### 숫자 표기
- 마감: `D-n`. **D-3 이하**는 `--accent-ink` 600(`.ui-dday[data-near]` 또는 화면의 `--near` 클래스). 오늘이면 '오늘 18:00'.
- 날짜: '10월 15일', 좁은 칸은 '10.14(수)', 기간은 '2025-2학기'.
- 개수: 'n개', '3명'. 부분/전체는 '확인 10 / 전체 14'.
- 제목·묶음 옆 개수는 같은 크기의 옅은 숫자(`--text-faint`, 400). 메뉴·탭 옆 새 개수만 `CountBadge`(회색 칸).

## Layout

- 사이드바 220px(좁으면 176·148px) + 본문. 본문은 가로를 채우고, 읽을 단락만 72ch.
- 모든 화면이 `.os` 틀 하나: 머리(제목 + 오른쪽 주 행동 하나) → 구역 탭(있으면 같은 자리) → 본문. **1440×900·1280×640 에서 페이지 스크롤 0**, 넘치면 칸 하나만 안에서 스크롤.
- 카드는 내용 높이. 남은 높이를 채우는 칸(목록, 지도, 보드 열)만 `data-fill`.
- 간격은 4의 배수. 카드 안 20(낮은 화면 16), 카드 사이 16(12), 머리와 내용 사이 12.
- 정보량: 첫 화면 덩어리 3개, 덩어리 안 항목 5개, 버튼은 주 1 + 보조 2.
- 진입점 하나: 사이드바와 구역 탭이 길 찾기다. 같은 목적지 링크를 본문에 또 두지 않는다.
- 상세는 오른쪽 서랍(480px)이 기본, 짧은 확인과 넓은 비교만 가운데 모달.

## Elevation & Depth

평평한 것이 기본이다. 그림자는 **떠 있는 층에만** 둔다.

| 토큰 | 쓰는 곳 |
|---|---|
| (없음) | 카드, 패널, 목록, 그림. 1px `--line` 으로만 나눈다 |
| `--shadow-raise` | 다른 층으로 보여야 하는 제안 카드 하나: 홈 '다음 한 걸음' |
| `--shadow-overlay` | 모달, 서랍, 토스트, 떠 있는 찾기 상자 |

색 있는 그림자, 카드마다 깔린 그림자, 유리(blur)는 쓰지 않는다.

## Shapes

- 4px: 버튼, 입력, 칩, 배지, 탭, 목록 행, 보기 전환(바깥 홈 포함).
- 6px: 카드, 패널, 서랍, 모달, 토스트.
- 2px: 진행 막대, 그림 속 막대, 자리 표시 줄.
- 알약(999px): 상태 점과 아바타에만.

### 선 모양의 뜻 (결정 2026-11-04)
- **실선**: 사실(학생이 한 것, 확인한 것). 그림 틀(아직 없는 것의 자리)도 옅은 실선(`--line-strong` 1px).
- **점선은 두 뜻뿐**: AI 추정(옅은 점선, 학생이 확인하기 전) / 지금 할 수 있는 활동(회색 점선, 학생이 안 한 것). 다른 뜻(비공개, 빈 자리, 강조, 구분선)에 점선을 쓰지 않는다.
- 글자에 붙는 AI 표시는 `AiMark` 하나('추정' 표지 또는 옅은 점선 밑줄).

### 지금 위치·고른 것
- 메뉴처럼 고르는 목록(사이드바, 설정 메뉴, 지도 찾기 목록)에만 왼쪽 2px `--text` 막대(`--nav-mark`).
- 구역 탭·밑줄 탭은 아래 2px `--text` 밑줄 하나가 미끄러진다.
- 카드에는 색 띠를 두지 않는다. 달성·관심 같은 상태는 배지나 글자색(초록)으로.

## Components

모든 화면이 `src/components/index.ts` 에서만 가져온다. 화면에서 같은 역할을 새로 그리지 않는다.

| 역할 | 부품 | 언제 |
|---|---|---|
| 카드 | `Card` (`title`, `lead`, `action`) | 화면의 덩어리. 이름형 16/600, 한 문장을 말하면 `lead` 18/700 |
| 칸 안 스크롤 카드 | `Panel` (`footer`, `note`) | 목록·결과 칸, 고정 행동 막대 |
| 페이지 머리 | `PageHeader` | 모든 화면. 오른쪽 주 행동 하나 |
| 구역 탭 / 화면 안 탭 / 보기 전환 | `SectionTabs` / `Tabs` / `SegmentedControl` | 하위 화면 / 같은 화면 구역 / 같은 내용 다른 보기 |
| 버튼 | `Button` (`primary` 화면당 하나, `secondary`, `ghost`), `IconButton` | 카드 머리 '더 보기' = `ghost` 작은 크기 + › |
| 글 속 링크 | `.ui-link` | 설명 열기('어떻게 골랐나'), 원문 링크. 13/400 `--text-sub` 밑줄, hover `--text` |
| 작은 묶음 제목 | `.ui-subhead` | 카드 안 묶음 이름('신청 마감', '얻는 것'). 13/600 `--text-sub` |
| 눈썹 라벨 | 같은 `.ui-subhead` 모양 | 주인공 제목 위 한 줄이 정보를 줄 때만('가장 추천', '그래서 이번 주'). 색을 넣지 않는다 |
| 꼬리표 | `Badge` | 상태(진행 중, 신청 준비), 오늘(`solid-orange`), 챙길 것(`orange`), 완료(`green`). `dashed` 는 AI 추정만 |
| 개수 | `CountBadge` | 메뉴·탭 옆 새 개수만 |
| 분야 | `FieldTag` | 분야 점 + 이름 |
| 확인/추정 점 | `ConfirmDot`, `ConfirmLegend` | 채운 점 = 확인, 점선 점 = AI 추정 |
| 진행도 | `ProgressBar` | 8px 얇은 막대 |
| 빈 상태 | `EmptyState` (+ `GhostPic`) | 모든 목록·칸. 그림 틀 + 다음 행동 한 줄 + 버튼 하나 |
| 로딩 / 오류 | `LoadingState` / `ErrorState` | 비동기로 보이는 곳(분석 갱신, 초안 작성). 로딩은 빈 상태와 모양이 다르다 |
| 서랍 / 모달 | `Drawer` / `Modal` | 상세 / 짧은 확인·넓은 비교. 제목 18/700 |
| 알림 | `Toast` (`actionLabel: '되돌리기'`) | 결과 한 줄, 되돌릴 수 있으면 버튼 하나, 5초 |
| 그림 | `diagram/*` (Legend, GanttRows, Timeline, Radar …) | 범례는 `Legend` 하나: 12px `--text-sub`, 기호 16px 칸. 자리는 카드 머리 오른쪽, 머리가 없으면 그림 아래 왼쪽 |
| 이야기 | `story/*` (StoryHero, NextStep, ProofRow …) | 분석·홈의 정체성 문장, 근거 줄, 다음 한 걸음 |

### 목록 행
- 높이 32px 이상(두 줄 행은 내용대로), 안쪽 여백 8~12px.
- hover `--surface-hover`, 눌림 `--surface-press`, 150ms. 포커스는 칸 안 스크롤이면 안쪽 링.
- 다른 화면으로 가는 행은 끝에 › 아이콘(14px, `--text-faint`). 같은 화면 위에 모달·서랍을 여는 행은 화살표 없음.
- 행 이름 15/600, 보조 줄 13 `--text-sub`.

### 아이콘
`Icon` 하나, 선 1.5. 크기는 14(글자 옆), 16(기본), 20(빈 상태·큰 칸)뿐. 12 는 18px 칸 안(배지·단계 번호)에만.

## Motion

- 사용자가 만든 변화에만 움직인다(열림, 펼침, 확인, 탭 밑줄 이동).
- `--dur-fast` 150ms(hover·눌림), `--dur-base` 220ms(열림·펼침), `--ease-out`. 열고 닫을 때 8px(`--enter-shift`) + 투명도.
- `prefers-reduced-motion` 이면 0. 튀는 움직임, 스크롤 따라 나타나기, 숫자 올라가기는 쓰지 않는다.

## Voice

문구는 `.claude/skills/kingo-ux-writing` 을 따른다. 요점: 해요체 한 줄, 버튼은 누르면 일어나는 일, 빈 상태는 다음 행동, 내부 용어(노드, 엣지, 클러스터, 점수) 없음, 점수·레벨·순위·비교 없음. 데이터가 예시라는 말은 설정 › 프로토타입 정보 한 곳에만.

## Do's and Don'ts

- Do: 새 값이 필요하면 `tokens.css` 와 이 파일에 먼저 넣고 쓴다. 화면 CSS 에 한 번 쓰는 값을 만들지 않는다.
- Do: 두 학생 상태(가입 인터뷰를 막 마친 새 학생, 예시 학생)를 둘 다 그린다. 새 학생은 0, 0, 0 이 아니라 그 자리가 무엇이 될지 옅은 틀 + 첫 행동 하나.
- Do: 끝내기 전에 `npm run audit:design`(P0·P1 0), `audit:copy`, `audit:layout`.
- Don't change: Pretendard, 성균관대 UI 색(초록·네이비·주황), 4px 반경, 1px 선, 육각형은 나의 강점에서만(값은 근거 기록 수).
- Don't use (1차): 보라·남색 그라데이션, Inter·시스템 글꼴만, 가운데 큰 제목 + 아이콘 카드 세 장, 그라데이션 글자, 반짝이·이모지 기호(✧ ✨), 글자 화살표(→).
- Don't use (2차): 크림 바탕 + 테라코타(SD1), 검정 + 형광 하나(SD2), 대문자·자간 넓힌 눈썹과 모노 라벨(SD4), 한 줄에 가운뎃점 두 개 이상(SD4d), 제목 한 단어만 색칠(SD5), 순서 아닌 01/02/03(SD6), 가짜 창 테두리(SD7).
- Don't use (부품): 카드 왼쪽·위 색 띠(K4), 모든 카드에 그림자(K2), 유리 흐림(K3), 안 보이는 hover(K7), 카드 안 카드(K11), 의미 없는 배지 줄(K12), 큰 숫자 + 작은 라벨 타일 줄(L4), 큰 색 면, 점수·레벨·순위표.
