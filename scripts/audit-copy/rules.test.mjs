import { describe, expect, it } from 'vitest';
import { findCopyIssues } from './rules.mjs';

describe('findCopyIssues', () => {
  it('반짝이 기호와 글자 화살표를 찾는다', () => {
    expect(findCopyIssues('✧ 내 기록과 이어져요').map(i => i.hit)).toEqual(['✧']);
    expect(findCopyIssues('2024→2026').map(i => i.hit)).toEqual(['→']);
  });
  it('금지어를 찾는다', () => {
    expect(findCopyIssues('노드를 누르면 경로가 보여요').map(i => i.hit)).toEqual(['노드']);
    expect(findCopyIssues('내 활동에서 볼 수 있어요').map(i => i.hit)).toEqual(['볼 수 있어요']);
  });
  it('앞뒤 공백 가운뎃점이 두 개 이상이면 사슬로 본다', () => {
    expect(findCopyIssues('교육·캠프 · 학생성장 비교과 · 여유')).toEqual([{ kind: 'dots', hit: '가운뎃점 2개' }]);
    expect(findCopyIssues('확인 10 · 전체 14')).toEqual([]);
  });
  it('이름 속 가운뎃점은 세지 않는다', () => {
    expect(findCopyIssues('창업·기획, AI·데이터, 교육·캠프')).toEqual([]);
  });
  it('빈 글자는 그냥 지나간다', () => {
    expect(findCopyIssues('   ')).toEqual([]);
  });
});
