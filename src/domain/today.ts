// ponytail: 프로토타입의 '오늘'은 예시 데이터 기준 10월 13일(1주차 첫날)로 고정이다. 실제 날짜·학사 일정이 붙으면 이 파일 하나만 바꾼다.
export const PROTOTYPE_TODAY = '2026-10-13';

const [Y, M, D] = PROTOTYPE_TODAY.split('-').map(Number);
export const TODAY_YEAR = Y;
export const TODAY_MONTH = M;
export const TODAY_DAY = D;

/** 오늘에서 offset 일 뒤 0시(UTC)의 ms. 날짜끼리 빼서 일수를 셀 때 쓴다. */
export const todayUtc = (offset = 0) => Date.UTC(Y, M - 1, D + offset);
