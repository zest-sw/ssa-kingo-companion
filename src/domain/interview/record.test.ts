import { describe, expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import { buildRecord, evidenceOf, inferDid, savedSummary, type NewRecordInput } from './record';

const input: NewRecordInput = {
  activityId: 'a-hackathon', title: '가을 데이터 해커톤', field: 'data', kind: '교내 해커톤', verification: 'school', date: '2학기 · 10월', semester: '2026-2',
  card: { situation: '24시간 교내 해커톤, 4인 팀', role: '데이터 전처리, 발표', action: '결측치 정리 코드를 만들어 팀이 함께 썼다', learned: '데이터 품질이 먼저다' },
  energy: 'up', visibility: 'me', useForRecommend: true
};

describe('inferDid', () => {
  it('말한 단어가 가장 많이 걸린 활동으로 어림한다', () => {
    expect(inferDid('데이터 전처리, 발표 결측치 정리 코드를 만들어 팀이 함께 썼다')).toBe('make');
    expect(inferDid('발표와 설명을 맡았다')).toBe('present');
    expect(inferDid('참가자 인터뷰를 하고 들은 내용을 정리했다')).toBe('listen');
  });
  it('단서가 없으면 만들기로 둔다', () => {
    expect(inferDid('')).toBe('make');
  });
});

describe('buildRecord', () => {
  it('카드의 글을 그대로 담고 직접 확인 표시와 기본 공개 범위를 지킨다', () => {
    const r = buildRecord(input);
    expect(r).toMatchObject({ id: 'r-a-hackathon', v: 1, source: 'agent', verification: 'school', visibility: 'me', note: input.card.action, quote: '데이터 품질이 먼저다', did: 'make' });
    expect(r.card).toBe(input.card);
    expect(r.axes.length).toBeGreaterThan(0);
  });
});

describe('evidenceOf', () => {
  it('역량마다 한 줄, 글이 없으면 빈 목록', () => {
    const rows = evidenceOf(['problem', 'creative'], '코드를 만들었다');
    expect(rows.map(r => r.label)).toEqual(['문제해결', '창의성']);
    expect(evidenceOf(['problem'], ' ')).toEqual([]);
  });
});

describe('savedSummary', () => {
  it('같은 일을 하고 에너지가 오른 기록이 둘이 되면 새 발견이 생긴다', () => {
    const before = [rec('x', { did: 'make', energy: 'up' })];
    const s = savedSummary(before, buildRecord(input));
    expect(s.newDiscoveries.map(d => d.key)).toEqual(['up:make']);
  });
  it('추천에 쓰지 않는 기록은 발견을 만들지 않는다', () => {
    const before = [rec('x', { did: 'make', energy: 'up' })];
    const s = savedSummary(before, buildRecord({ ...input, useForRecommend: false }));
    expect(s.newDiscoveries).toEqual([]);
    expect(s.usedForRecommend).toBe(false);
  });
});
