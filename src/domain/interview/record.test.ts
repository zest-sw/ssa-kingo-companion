import { describe, expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import { buildManualRecord, buildRecord, cardOf, editedRecord, evidenceOf, inferDid, savedSummary, usesRecord, type NewRecordInput } from './record';

const input: NewRecordInput = {
  activityId: 'a-hackathon', title: '가을 데이터 해커톤', field: 'data', kind: '교내 해커톤', verification: 'school', date: '2학기 · 10월', semester: '2026-2',
  card: { situation: '교내 해커톤에 참여한 활동', role: '데이터 전처리, 발표', action: '결측치 정리 코드를 만들어 팀이 함께 썼다', learned: '데이터 품질이 먼저다' },
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

describe('buildManualRecord', () => {
  const m = buildManualRecord({ id: 'm-1', title: ' 학과 스터디 ', note: ' 발표 자료를 만들어 설명했다 ', quote: ' ', energy: 'same', date: '2학기 · 10월', semester: '2026-2' });
  it('직접 입력·나만 보기·추천에 씀으로 만들고 글은 다듬어 담는다', () => {
    expect(m).toMatchObject({ id: 'm-1', title: '학과 스터디', note: '발표 자료를 만들어 설명했다', quote: '', source: 'manual', verification: 'self', visibility: 'me', useForRecommend: true, energy: 'same' });
    expect(m.card).toEqual({ action: '발표 자료를 만들어 설명했다' });
  });
  it('한마디가 있으면 배운 점으로 담는다', () => {
    expect(buildManualRecord({ id: 'm-2', title: 't', note: '글을 썼다', quote: '쓰면서 정리됐다', energy: 'up', date: 'd', semester: 's' }).card?.learned).toBe('쓰면서 정리됐다');
  });
});

describe('cardOf', () => {
  it('회고 카드가 없으면 메모는 한 일, 한마디는 배운 점', () => {
    expect(cardOf(rec('s', { note: '메모', quote: '한마디' }))).toEqual({ action: '메모', learned: '한마디' });
    expect(cardOf(rec('s', { note: '', quote: '' }))).toEqual({});
    expect(cardOf(rec('c', { card: { role: '역할' } }))).toEqual({ role: '역할' });
  });
});

describe('editedRecord', () => {
  const base = rec('r1', { did: 'listen', note: 'old', card: { action: '인터뷰를 하고 들은 내용을 정리했다' } });
  it('고친 글로 무엇을 했는지 다시 어림하고, 빈 칸은 지우며, 제목이 비면 그대로 둔다', () => {
    const e = editedRecord(base, '  ', { role: '개발 담당', action: '코드를 만들고 구현했다', result: ' ' });
    expect(e.did).toBe('make');
    expect(e.title).toBe(base.title);
    expect(e.card).toEqual({ role: '개발 담당', action: '코드를 만들고 구현했다' });
    expect(e.note).toBe('코드를 만들고 구현했다');
    expect(e.quote).toBe('');
  });
});

describe('usesRecord', () => {
  const confirm = { 'up:make': { status: 'yes' as const, sig: ['e1@1', 'e10@2'] } };
  it('기록 id 가 정확히 같을 때만 근거로 본다(e1 과 e10 을 헷갈리지 않는다)', () => {
    expect(usesRecord(confirm, 'e1')).toBe(true);
    expect(usesRecord(confirm, 'e10')).toBe(true);
    expect(usesRecord(confirm, 'e2')).toBe(false);
    expect(usesRecord({ k: { status: 'no', sig: ['e10@2'] } }, 'e1')).toBe(false);
    expect(usesRecord({}, 'e1')).toBe(false);
  });
});
