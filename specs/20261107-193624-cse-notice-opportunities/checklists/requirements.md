# Specification Quality Checklist: 소프트웨어학과 공지 수집·분류 → 기회 데이터

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-07 (2차 개정 후 다시 검사)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- 2차 개정(제목 294건·본문 49건 표본)으로 다시 검사해 1회에 모두 통과했다. 확인 질문 표시는 없다.
- 구현 세부(폴더 구조, 본문을 읽는 방식, 검사 도구, 실행 환경, 팀 코드 규칙)는 spec에서 빼고 plan 단계로 넘겼다. 'JSON'은 사용자 설명을 옮긴 Input 줄에만 있다.
- '등'으로 열려 있는 단어 목록(FR-007 기회 아님 단어, FR-017 꼬리표 단어)은 개발용 정답셋으로 맞추고, SC-001~SC-006으로 잰다.
- 1차와 달라진 요구: 고정글 멈춤 예외(FR-002), 본문 영역이 있는 페이지만 보관(FR-005), 판정은 제목·게시판 분류만(FR-007), 처음 보는 게시판 분류(FR-009), 마감 근거(FR-011), 신청 줄 다듬기(FR-013), 날짜 표기(FR-014), 행사 날은 특강만(FR-013), 주최는 제목에서만(FR-017), 중복 정리(FR-018), 기준일·정렬·같은 입력 같은 결과(FR-019, FR-023), 구조 변경 판단 기준(FR-026), 정답 마감 값 3종과 확신 칸(정답 기준, FR-030), 스프레드시트 저장 형식 수용(FR-031), 기회 놓침 기준(SC-002).
- plan 단계(research R6)에서 표본 제목 2건('4/20(월)~24(금)')을 보고 FR-014와 Edge Cases에 '끝에 일만 적은 기간'을 더했다. 다시 검사해도 모든 항목이 통과한다.
- 설계 대화에 없던 세부로 사용자 검토가 필요한 것: 기준일 당일 포함(FR-001), 요약 항목 정의(FR-024), 평가용 미달 시 보고(US2 시나리오 4), 시간 기준(SC-008), 구조 변경 판단의 '2건 이상'(FR-026).
