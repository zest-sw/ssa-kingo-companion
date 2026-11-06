# 토스 수준 UX와 AI 티 없애기: 조사와 화면 감사 (2026-11-06)

## 결론
- 스킬 네 개를 저장소에 넣었다. 화면 작업 워커는 끝내기 전에 이 스킬로 자기 화면을 점검한다.
  - `kingo-toss-ux`: 토스 제품 원칙 10가지와 데스크톱 레퍼런스(토스증권 PC, Linear)를 우리 화면 점검표로 옮겼다.
  - `kingo-ux-writing`: 토스 라이팅 8원칙, 앱인토스 보이스톤, 한국어 AI 티 규칙(im-not-ai quick rules 사본)으로 화면 문구를 쓴다.
  - `avoid-ai-design`: AI가 만든 듯한 화면 패턴 목록과 스캐너(사본, MIT). 우리 기준(4px, Pretendard, 얇은 선)과 다르면 우리 기준이 이긴다.
  - `web-interface-guidelines`: Vercel 웹 인터페이스 기준(사본, MIT). 키보드, 포커스, 폼, 상태 설계, 레이아웃 이동, 주소 상태.
- 지금 화면(prototype-v2.5)에서 고칠 것은 여섯 갈래다. 템플릿 장식, 주인공 없는 위계, 큰 면적 색 채우기, 내부 용어와 빈 문장, 한쪽만 큰 빈 칸, 상호작용 완성도(되돌리기, 움직임, 주소 상태).

## 조사한 것
| 자료 | 가져온 것 |
|---|---|
| 토스피드 「What makes a good product?」(2025-09) https://toss.im/tossfeed/article/tossproductprinciples | 제품 원칙 10가지: Casual Concept, Simple Policy, Value First, Clear Action, Context Based, Easy to Answer, Explain Why, One Thing, No More Loading, Minimum Features |
| 토스 테크 「토스의 8가지 라이팅 원칙들」(2022-11) https://toss.tech/article/8-writing-principles-of-toss | Predictable hint, Weed cutting, Remove empty sentences, Focus on key message, Easy to speak, Suggest than force, Universal words, Find hidden emotion |
| 앱인토스 UI/UX 가이드 https://developers-apps-in-toss.toss.im/design/consumer-ux-guide | 모든 문구 해요체, 과한 높임 금지, 능동형, 안심이 필요한 곳은 부정형, 모호한 버튼 라벨과 CTA 위 중복 설명 금지 |
| 「유난한 도전」 PP 요약(에디의 만능배낭, pxd story) | One thing per one page, Tap & Scroll, Easy to Answer, Minimum Input, Clear CTA |
| 토스 테크 「토스 디자이너가 제품에만 집중할 수 있는 방법」(2024-03) https://toss.tech/article/toss-design-system | 긴 목록 위아래 흐림, 가볍게 뜨는 요소, 누름 피드백, 열고 닫을 때 초점, 아이콘 버튼은 기능 이름 |
| 토스 커리어 「PC Design Platform Team」(2025-06) https://toss.im/career/article/secu_pc_design_platform | 데스크톱에서 정보 밀도를 높이면서 가독성·직관성을 지키는 구성 규칙을 컴포넌트 가이드로 만든다 |
| Linear 「A calmer interface for a product in motion」(2026-03) https://linear.app/now/behind-the-latest-design-refresh | 모든 요소가 같은 무게가 아니다. 사이드바·탭은 옅게 물러나고 본문이 앞에 선다. 머리말·보기 조절은 모든 화면에서 같다 |
| anthropics/skills frontend-design https://github.com/anthropics/skills | 생성된 화면의 흔한 티: 머리말 한 단어만 강조, 대문자 라벨, 내용 위 불필요한 작은 라벨, 큰 숫자 + 작은 라벨 + 보조 수치 |
| funboy322/avoid-ai-design (MIT) https://github.com/funboy322/avoid-ai-design | 1차(보라 그라데이션, 세 장 카드)와 2차(크림+테라코타, 가운뎃점 메타, 01/02/03) 기본값 목록과 스캐너 |
| blader/humanizer (MIT), conorbronsdon/avoid-ai-writing (MIT) | 영어 글의 AI 티(Wikipedia Signs of AI writing). 한국어 화면에는 kingo-ux-writing을 먼저 쓴다 |
| epoko77-ai/im-not-ai (MIT) https://github.com/epoko77-ai/im-not-ai | 한국어 AI 티 규칙: 번역투, 대구 공식, 결산어, 연결어미 쉼표, 같은 종결어미 반복 |
| vercel-labs/web-interface-guidelines (MIT) | 키보드, 포커스, 폼, 모든 상태 설계(빈·희소·밀집·오류), 막다른 길 없음, 주소가 상태를 담음 |

## 화면 감사 (예시 학생, 1440×900, 2026-11-06 배포본)
스캐너(avoid-ai-design detect v0.4.0, src 331개 파일): P0 0개, P1 3개(→ 글자, 대부분 주석), P2는 가운뎃점 사슬(SD4d)이 데이터·도메인 문구 전반에 있다. 아래는 렌더를 보고 판단한 것이다.

### 공통
- 가운뎃점 사슬: '교육·캠프 · 학생성장 비교과 · 여유', '확인 10 · 전체 14', '규칙 15 · AI 1 · 확인 1', '모집 글 4 · 친구 요청 1'. 정보 층위가 다른 것을 한 줄에 이었다.
- 반짝이 기호 ✧로 AI·연결을 표시한다(추천 행 '✧ 내 기록 · …', 분석 '✧ 기록 25개·확인 근거 40개를 읽고 세운 가설이에요', 다음 걸음 '✧ 질문을 짜며 …'). 뜻이 정해지지 않은 장식이다.
- 글자 화살표: '2024→2026', '사용자 리서치 → 소통 · 근거 4'.
- 사이드바 현재 항목이 회색 면 + 왼쪽 막대다. 길 찾기가 본문만큼 진하다.
- 페이지 제목과 카드 제목이 같다(경험 지도/경험 지도). 테크 트리 페이지의 카드 제목은 '활동 지도'로 다른 이름이다.
- 머리말 오른쪽 한 줄에 해석 두세 개를 가운뎃점으로 잇는다(테크 트리, 나의 강점, 관심 흐름).

### 홈
- '상태창' 눈썹 라벨, 이니셜 칸 '예'는 정보가 없다.
- 육각형이 카드 높이의 절반을 쓰는데, 나의 강점과 같은 그림이라 홈에서 새로 알려 주는 것이 없다.
- 큰 숫자 + 작은 라벨 타일 다섯 칸(기록 25, 경험 카드 25, 학교 확인 14, 도전 과제 5, 가장 깊이 간 분야)은 템플릿 모양이고, 기록과 경험 카드가 같은 25다.
- 오른쪽 열은 565px에서 끝나 아래 절반이 비고 왼쪽 열만 길다.
- '외 1개 · 내 활동에서 볼 수 있어요'는 빈 문장이다. 명예의 전당 문의 '시 지 도' 동그라미는 뜻을 알 수 없다.

### 추천
- 행마다 제목, 가운뎃점 메타, ✧ 연결 줄, 상자 꼬리표 2~3개, D-n이 있어 한 행에 요소가 7~9개다. 모든 행에 '여유'가 붙어 정보가 없다.
- '가장 추천', '대안 9개' 회색 띠 머리가 표처럼 보인다.

### 내 활동
- 할 일 상태 막대가 하늘색·청록·회색 면으로 크게 칠해졌다. 일정 막대도 초록·네이비 면이 화면 폭을 채운다.
- 회고 대기 행마다 '회고 쓰기 ›'가 세 번 반복된다. '나머지 8개는 일정에서 볼 수 있어요'는 빈 문장이다.
- 아래 3분의 1이 비었다.

### 나의 분석
- 한눈에: 흐름은 좋다. 근거 줄의 점 막대(●●●●○○)가 점수 게이지처럼 읽힌다. '2024→2026'.
- 테크 트리: 범례 '노드를 누르면 다른 분야로 이어진 경로'에 내부 용어가 있다.
- 경험 지도: 옆 패널의 '규칙 15 · AI 1 · 확인 1', '연결고리 활동', '중심 활동'은 배워야 하는 개념이다. 역량 허브와 굵은 회색 선이 그림을 무겁게 만든다.
- 관심 흐름: 그림 아래 절반이 비었다. '고른 구간 비율', '보는 구간'은 설명이 필요하다.

### 프로필
- 화면의 70%가 비었다. 내용은 이름 한 줄, 도전 과제 한 줄, 함께하기 링크 세 개다. 공개 범위를 다루는 화면인데 남에게 어떻게 보이는지가 안 보인다.

### 설정
- 무난하다. 저장 버튼이 꺼진 이유가 버튼 옆에 없다(바꾼 것이 없으면 꺼짐).

## 라운드 계획
1. 기반: 토큰(글자 단계, 회색 세 단계, 움직임), 사이드바 물러나기, 메타 줄·AI 표시·토스트(되돌리기) 공용 부품, 문구 검사 스크립트.
2. 문구: 모든 화면 문구를 kingo-ux-writing으로 다시 쓴다(빈 문장, 내부 용어, 가운뎃점 사슬, 기호).
3. 화면별 손질: 홈, 추천, 내 활동, 나의 분석, 프로필·설정을 kingo-toss-ux 점검표로 고친다.
4. 상호작용과 접근성: web-interface-guidelines로 키보드·초점·주소 상태·움직임을 점검한다.
