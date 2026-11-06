# 남은 ponytail (2026-11-06, v3.5)

코드의 `// ponytail:` 주석을 모두 훑었다(30개). v3.5 에서 고친 것은 하나다.

- 고침: `src/app/AppState.tsx` 의 '화면이 useToast 로 직접 띄운 토스트와 멈춘 시간을 모른다'. 줄 세우기를 `ToastProvider` 로 옮겨(`{ after: true }`) 지웠다.

나머지는 데이터 모양·연동·기준 문서 결정을 기다린다. 지금 고치면 예시 데이터나 공용 부품을 바꿔야 해서 남겼다.

## 데이터에 필드가 생기면

| 파일 | 한계 | 언제 고칠지 |
|---|---|---|
| `src/domain/homeStatus.ts` (weekTasks) | 모임은 일정 글이 '10.14(수) 18:30' 꼴일 때만 읽는다 | 일정이 날짜 필드가 될 때 |
| `src/domain/recommend-flow/summary.ts` (todayTasks) | 위와 같다 | 일정이 날짜 필드가 될 때 |
| `src/domain/recommend-flow/upcoming.ts` | 하는 중인 활동의 모임 날짜를 타임라인에 올리지 않는다 | 일정이 날짜 필드가 될 때 |
| `src/domain/recommend-flow/flow.ts` | 팀 활동 여부를 이름으로 짐작한다 | 기회 데이터에 팀 구성 필드가 생길 때 |
| `src/domain/recommend-flow/flow.ts` | 시간표 없이 준비·신청 중 활동과 일정이 같은지만 본다 | 시간표 데이터가 생길 때 |
| `src/domain/recommend-flow/reasons.ts` | 기록 종류가 자유 글이라 아는 낱말만 기회 종류로 읽는다 | 기록이 기회 종류(Category)를 가질 때 |
| `src/domain/social/index.ts` | 민감한 활동을 이름 키워드로 거른다 | 활동에 민감 표시가 생길 때 |
| `src/domain/challenges/rules.ts` | 처음 이용한 학교 기관을 끝낸 활동 수로 센다 | 기관 정보가 붙을 때 |
| `src/domain/challenges/rules.ts` | '다음 학기 재지원'을 학기 없이 같은 프로그램 재지원으로 본다 | 활동에 학기가 붙을 때 |
| `src/screens/activities/ActivityDrawer.tsx` | 예시 데이터의 준비 중 활동에 체크리스트(prepItems)가 없어 실행 기록이 비어 보인다 | seed 담당이 prepItems 를 넣을 때(예시 학생 화면이 바뀌어 레이아웃 검사를 다시 봐야 한다) |

## 연동·기능이 생기면

| 파일 | 한계 | 언제 고칠지 |
|---|---|---|
| `src/domain/today.ts` | '오늘'이 10월 13일(1주차 첫날)로 고정이다 | 실제 날짜·학사 일정이 붙을 때 |
| `src/screens/activities/timeline.ts` | 학기 범위가 예시 값이다 | 학사 일정이 붙을 때 |
| `src/domain/challenges/rules.ts` | 친구와 같은 활동을 했는지 모른다 | 친구 연동이 생길 때 |
| `src/domain/social/summary.ts` | 친구와 같은 활동 수가 예시 값이다 | 친구 연동이 생길 때 |
| `src/domain/challenges/rules.ts` | 학기 회고 기능이 없어 '학기 돌아보기' 기록이 있으면 달성으로 본다 | 학기 회고 기능이 생길 때 |
| `src/domain/kg/text.ts` | 규칙 어미 떼기라 활용형이 다른 낱말로 남는다 | LLM·형태소 분석기를 붙일 때 |
| `src/domain/insight/gap.ts` | 직무와 상관없이 같은 세 유형을 쓴다 | 목표를 직무 요건 데이터로 받을 때 |
| `src/domain/recommend-flow/trace.ts` | 목표 글의 낱말로 분야 묶음을 어림한다 | 목표를 직무 체계로 받을 때 |
| `src/screens/profile/RecruitView.tsx` | 내 글이 먼저 보이는 건 숫자로만 알린다 | 실제 배포(서버가 정할 일) |

## 저장 자리가 생기면

| 파일 | 한계 | 언제 고칠지 |
|---|---|---|
| `src/app/useStory.ts` | 이야기 답을 이 브라우저 localStorage 에만 둔다 | 공용 상태에 'story/answer' 액션이 생길 때 |
| `src/domain/recommend-flow/intent.ts` | 한 번 읽고 지우는 메모리 값이라 새로고침하면 사라진다 | 링크로 공유할 일이 생길 때(주소 조각으로) |
| `src/screens/recommend/prepMemory.ts` | 탭을 닫으면 준비 단계가 사라진다 | 활동에 단계 필드가 생길 때 |
| `src/screens/records/portfolioPicks.ts` | 포트폴리오 고른 것이 탭 세션에만 남는다 | 저장소가 생겨 AppState 로 옮길 때 |
| `src/screens/analysis/ExperienceMapTab.tsx` | AI 제안 이름에 한 답이 화면 안에만 있다 | AppState 에 자리가 생길 때 |
| `src/screens/analysis/DiscoveryCards.tsx` | '잘 모르겠어요'를 화면에 머무는 동안만 기억한다 | 다음 분석 때 다시 묻는 규칙이 정해질 때 |

## 기준·공용 부품이 정해지면

| 파일 | 한계 | 언제 고칠지 |
|---|---|---|
| `src/domain/vocab.ts` | 보드 상태 이름이 기준 문서에서 미정이다(concept·decisions 에 아직 없음) | 기준 문서에 이름이 정해질 때 |
| `src/domain/vocab.ts` | 세부 분야를 색 묶음 5개(+기타)로 접는 기준이 임시다 | 테크 트리 분야 기준이 정해질 때 |
| `src/domain/recommend-flow/load.ts` | '빠듯' 기준 개수가 예시값이다 | 학생 피드백을 받을 때 |
| `src/screens/analysis/ProofList.tsx` | 공용 ProofPic 의 강점 그림이 점 막대라 화면 안에서 감쌌다 | 공용 부품(story/ProofPic)이 막대로 바뀔 때. 공용 부품이라 이번엔 손대지 않았다 |

## 지나가며 본 것 (보고)

- `clock()`(일정 글에서 'HH:MM' 뽑기)이 `src/domain/homeStatus.ts` 와 `src/domain/recommend-flow/summary.ts` 에 똑같이 두 번 있다. 일정이 날짜 필드가 될 때 `upcoming.ts` 의 `whenOffset` 옆으로 함께 모으면 된다.
