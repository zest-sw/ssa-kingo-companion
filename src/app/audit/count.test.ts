import { describe, expect, it } from 'vitest';
import { duplicates, groupEntries } from './count';

describe('진입점 세기 규칙', () => {
  it('지금 페이지를 가리키는 링크(aria-current="page")끼리는 하나로 센다', () => {
    const found = groupEntries([
      { dest: 'analysis', name: '나의 분석', current: true },
      { dest: 'analysis', name: '한눈에', current: true },
      { dest: 'analysis/map', name: '경험 지도' }
    ]);
    expect(found.get('analysis')).toEqual(['나의 분석']);
    expect(duplicates(found)).toEqual([]);
  });
  it('지금 페이지 링크라도 표시 없는 같은 목적지 링크가 더 있으면 중복이다', () => {
    const found = groupEntries([
      { dest: 'analysis', name: '한눈에', current: true },
      { dest: 'analysis', name: '전체 이야기로' }
    ]);
    expect(duplicates(found)).toEqual(['analysis ← 한눈에 / 전체 이야기로']);
  });
  it('하위 화면의 구역 요약 짝(사이드바 구역 항목 + 한눈에)은 하나로 센다', () => {
    const found = groupEntries([
      { dest: 'activities', name: '내 활동', sectionHome: true },
      { dest: 'activities', name: '한눈에', sectionHome: true },
      { dest: 'activities/schedule', name: '일정', current: true }
    ]);
    expect(duplicates(found)).toEqual([]);
  });
  it('다른 목적지 중복은 지금처럼 잡는다', () => {
    const found = groupEntries([
      { dest: 'activities/schedule', name: '일정' },
      { dest: 'activities/schedule', name: '6월 일정' },
      { dest: 'recommend', name: '추천' }
    ]);
    expect(duplicates(found)).toEqual(['activities/schedule ← 일정 / 6월 일정']);
  });
});
