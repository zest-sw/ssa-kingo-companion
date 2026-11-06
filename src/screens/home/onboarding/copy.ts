// 가입 인터뷰 화면 전용 문구. 활동 예는 예시 목록(catalog)의 활동을 짧게 부른 이름이다.
import type { FieldGroup } from '../../../domain/types';

/** 관심 분야 카드 아래 '이런 활동' 두 개. 고르는 근거가 이름 하나만이 되지 않게 */
export const INTEREST_EXAMPLES: Record<FieldGroup, [string, string]> = {
  dev: ['앱 만들기 스터디', '해커톤'],
  ai: ['챗봇 설계 체험', '데이터 특강'],
  plan: ['아이디어톤', '창업 동아리'],
  mentor: ['선배 커피챗', '동문 멘토링'],
  global: ['유학생 교류', '버디 프로그램'],
  other: ['봉사 활동', '활동 수기 공모전']
};
export const UNKNOWN_SUB = '안 해 본 분야부터 골라 드려요';

/** 질문과 왜 묻는지 한 줄 */
export const QUESTIONS = [
  { q: '요즘 관심 가는 걸 골라 주세요', why: '이 분야 활동부터 먼저 찾아요' },
  { q: '한 주에 쓸 수 있는 시간과 방식은요?', why: '이보다 긴 활동은 추천에서 빼 둘게요' },
  { q: '이루고 싶은 목표가 있나요?', why: '목표와 이어지는 활동을 앞에 둬요. 비워 둬도 돼요' }
] as const;
