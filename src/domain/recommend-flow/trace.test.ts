import { describe, expect, it } from 'vitest';
import type { Program, Reason, RecordItem } from '../types';
import { deadlineRatio, traceNodes } from './trace';

const p = { id: 'p1', field: 'research' } as Program;
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
