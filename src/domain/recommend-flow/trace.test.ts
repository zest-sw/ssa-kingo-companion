import { describe, expect, it } from 'vitest';
import { prog } from '../fixtures.test-util';
import type { Reason, RecordItem } from '../types';
import { deadlineRatio, goalGroups, newcomerOf, traceLine, traceNodes } from './trace';

const p = prog('p1', { field: 'research', did: [] });
const rec = { id: 'r1', title: '사용성 테스트', date: '2학기 · 10월' } as RecordItem;

describe('traceNodes', () => {
  it('기록에 이어진 이유는 기록 이름과 날짜를 쓴다', () => {
    const rs: Reason[] = [{ kind: 'energy', text: '문장', recordId: 'r1' }];
    expect(traceNodes(rs, [rec], p)).toEqual([{ kind: 'energy', label: '내 기록', detail: '사용성 테스트', recordId: 'r1', date: '2학기 · 10월' }]);
  });
  it('기록이 없으면 문장 속 낱말, 그것도 없으면 분야 이름', () => {
    const rs: Reason[] = [{ kind: 'interest', text: '처음에 고른 관심 ‘UX·리서치’와 맞아요.' }, { kind: 'bridge', text: '문장만' }];
    const nodes = traceNodes(rs, [], p);
    expect(nodes.map(n => n.detail)).toEqual(['UX·리서치', '창업·기획']);
    expect(nodes.every(n => n.recordId === undefined)).toBe(true);
  });
  it('확인한 강점이 이 기회가 쓰는 역량이면 첫 이유 뒤에 강점 점을 넣는다', () => {
    const asks = prog('p1', { field: 'research', did: ['ask'] });
    const r = { ...rec, axes: ['problem'], useForRecommend: true, semester: '2026-2', field: 'research', note: 'n' } as RecordItem;
    const rs: Reason[] = [{ kind: 'interest', text: '‘UX·리서치’' }, { kind: 'bridge', text: '' }];
    expect(traceNodes(rs, [r], asks).map(n => n.kind)).toEqual(['interest', 'bridge']);
    const nodes = traceNodes(rs, [{ ...r, confirmedAxes: ['problem'] }], asks);
    expect(nodes.map(n => n.kind)).toEqual(['interest', 'strength', 'bridge']);
    expect(nodes[1]).toMatchObject({ label: '강점', detail: '문제해결' });
    expect(traceNodes(rs, [{ ...r, confirmedAxes: ['problem'], rejectedAxes: ['problem'] }], asks)).toHaveLength(2);
    expect(traceNodes(rs, [{ ...r, confirmedAxes: ['problem'], useForRecommend: false }], asks)).toHaveLength(2);
  });
  it('이유는 최대 4개', () => {
    const kinds = ['energy', 'focus', 'career', 'novelty', 'interest', 'bridge'] as const;
    expect(traceNodes(kinds.map(kind => ({ kind, text: '' })), [], p)).toHaveLength(4);
  });
});

describe('deadlineRatio', () => {
  it('남은 날이 14일 이상이면 가득, 지난 마감은 최소 길이', () => {
    expect(deadlineRatio(14)).toBe(1);
    expect(deadlineRatio(30)).toBe(1);
    expect(deadlineRatio(7)).toBe(0.5);
    expect(deadlineRatio(-1)).toBe(0.04);
  });
});

describe('traceNodes: 기록이 없는 새 학생', () => {
  const plan = prog('p2', { field: 'product' });
  const novelty: Reason = { kind: 'novelty', text: '아직 해 보지 않은 ‘창업·기획’ 분야예요.' };
  it('목표 글이 이 분야를 가리키면 목표 점을 맨 앞에 둔다', () => {
    const nodes = traceNodes([novelty], [], plan, { goal: '서비스 기획 직무', interests: ['plan'], interestOpen: true });
    expect(nodes.map(n => n.kind)).toEqual(['goal', 'novelty']);
    expect(nodes[0]).toMatchObject({ label: '목표', detail: '서비스 기획 직무', text: '가입할 때 적은 목표 ‘서비스 기획 직무’와 같은 창업·기획 분야예요.' });
    expect(nodes[1].detail).toBe('처음 해 보는 창업·기획');
  });
  it('목표가 다른 분야거나 비어 있으면 목표 점을 지어내지 않는다', () => {
    expect(traceNodes([novelty], [], plan, { goal: '데이터 분석 직무', interests: [], interestOpen: true }).map(n => n.kind)).toEqual(['novelty']);
    expect(traceNodes([novelty], [], plan, { goal: '', interests: [], interestOpen: true }).map(n => n.kind)).toEqual(['novelty']);
  });
  it('고른 관심 분야 모집이 이번 주 없으면 그 사실을 한 점으로 알린다(모르겠어요는 빼고)', () => {
    const nodes = traceNodes([novelty], [], plan, { goal: '', interests: ['mentor'], interestOpen: false });
    expect(nodes.at(-1)).toMatchObject({ kind: 'interest-miss', label: '관심', detail: '멘토링 쪽은 이번 주 맞는 게 없어요' });
    expect(traceNodes([novelty], [], plan, { goal: '', interests: ['unknown'], interestOpen: false }).map(n => n.kind)).toEqual(['novelty']);
  });
  it('기록이 있으면 새 학생 규칙을 쓰지 않는다', () => {
    expect(traceNodes([novelty], [rec], plan, { goal: '서비스 기획', interests: [], interestOpen: true }).map(n => n.kind)).toEqual(['novelty']);
  });
  it('newcomerOf: 이번 주 후보에 고른 관심 분야가 있는지', () => {
    expect(newcomerOf({ goal: '', interests: ['mentor'] }, [plan]).interestOpen).toBe(false);
    expect(newcomerOf({ goal: '', interests: ['plan'] }, [plan]).interestOpen).toBe(true);
  });
  it('goalGroups: 목표 글의 낱말로 분야를 어림한다', () => {
    expect(goalGroups('데이터 분석 직무')).toEqual(['ai']);
    expect(goalGroups('대학원 진학')).toEqual([]);
  });
});

describe('traceLine', () => {
  it('기호·가운뎃점 없이 학생 말 한 문장으로 쓴다', () => {
    expect(traceLine({ kind: 'energy', label: '내 기록', detail: '사용성 테스트' })).toBe('내 기록 ‘사용성 테스트’와 이어져요');
    expect(traceLine({ kind: 'strength', label: '강점', detail: '문제해결 · 소통' })).toBe('확인한 강점 문제해결·소통을 써요');
    expect(traceLine({ kind: 'novelty', label: '탐색', detail: 'AI·데이터' })).toBe('아직 안 해 본 AI·데이터 분야예요');
    expect(traceLine({ kind: 'novelty', label: '탐색', detail: '처음 해 보는 AI·데이터' })).toBe('넓게 둘러보려고 섞은 AI·데이터 분야예요');
    expect(traceLine({ kind: 'novelty', label: '탐색', detail: '처음 해 보는 기타' })).toBe('넓게 둘러보려고 섞었어요');
    const all = (['energy', 'focus', 'career', 'strength', 'goal', 'interest', 'bridge', 'novelty'] as const).map(kind => traceLine({ kind, label: '', detail: '문장' }));
    // avoid-ai-design-ignore: I3, CP3 (기호가 화면 문구에 없는지 확인하는 검사)
    expect(all.some(t => /✧|→| · /.test(t))).toBe(false);
  });
});
