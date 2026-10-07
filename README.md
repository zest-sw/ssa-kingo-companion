# 킹고 컴패니언 · 비주얼 MVP v0.4

예시 데이터와 React 메모리 상태만 사용하는 6화면 인터랙티브 프로토타입입니다.

## 실행

Node.js 22.12 이상 권장.

```sh
npm ci
npm run dev
```

검사: `npm run check`
빌드: `npm run build`
배포 확인: `npm run preview`

## 화면과 검수

내 성장 홈, 경험 지도, 활동 탐색, 활동 아카이브, 회고 도우미, 데이터·분석.

관계 확인·수정·제거, 경험 추가·편집·삭제와 지도 반영, 3단계 회고 초안·편집·저장, 비공개 분석 상태 시뮬레이션, 활동 필터·상세·저장, 관심사 변경을 Figma Make에서 클릭 검수했습니다. 2026-10-07 타입 검사와 빌드 통과.

## 경계

실제 AI, 학교 계정, 운영 API, 크롤러, DB, 영구 저장은 연결하지 않았습니다. 회고 초안은 입력한 사실의 문자열 조합이고 분석 버튼은 상태만 변경합니다. 추천은 관심 태그 데모입니다. 새로고침/초기화 시 기록·관계·저장이 사라집니다. 역량 점수·순위·성격·직업 판정은 없습니다.

## 버전

기존 Notion v0.1 및 Figma v0.3는 보존했습니다.

Figma Make v0.4: https://www.figma.com/make/zvVRhVM5vfblZJG2m778i3/%25ED%2582%25B9%25EA%25B3%25A0-%25EC%25BB%25B4%25ED%258C%25A8%25EB%258B%2588%25EC%2596%25B8-%25C2%25B7-%25EB%25B9%2584%25EC%25A3%25BC%25EC%2596%25BC-MVP-v0.4?code-node-id=0-9&p=f&t=GnbIscbByHtoe9go-0&fullscreen=1

Notion 기획서 v0.2: https://app.notion.com/p/v0-2-AI-bfbc3ca1244a48019df6fe7037b57dd0

Figma에서는 App 파일 위치가 src/app/App.tsx이고 스타일은 src/styles/index.css입니다. 이 독립 소스에서는 src/App.tsx와 src/index.css를 사용하므로 CSS 상대 경로만 다릅니다. Figma 사본에 남은 기본 예제의 과거 AI 대화는 본 프로젝트의 모델 실행 기록이 아닙니다.
