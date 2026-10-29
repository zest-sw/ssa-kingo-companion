import { describe, expect, it } from 'vitest';
import { prog, rec } from '../fixtures.test-util';
import type { Activity } from '../types';
import { buildFlow, summarizeFlow } from './flow';
import { answerEdge, buildMap, edgeState, edgesOf } from './map';
import { recordsSig } from './refresh';
import { semesterAxis, semesterKey, semesterLabel, sortRecords } from './semester';
import { buildStrengths, differences, seenOf } from './strengths';
import { buildTechTree } from './techtree';

const act = (id: string, over: Partial<Activity>): Activity => ({ id, title: id, field: 'dev', status: 'ongoing', schedule: '', ...over });

describe('학기', () => {
  it('학기 이름을 순서로 바꾼다', () => {
    expect(semesterKey('2026-1')).toBeLessThan(semesterKey('2026-여름'));
    expect(semesterKey('2026-여름')).toBeLessThan(semesterKey('2026-2'));
    expect(semesterKey('2026-겨울')).toBeLessThan(semesterKey('2027-1'));
    expect(semesterKey('몰라')).toBeNaN();
    expect(semesterLabel('2026-2')).toBe('2026-2학기');
    expect(semesterLabel('2026-여름')).toBe('2026 여름');
  });
  it('기록 순서는 학기, 같으면 들어온 순서', () => {
    const rs = [rec('b', { semester: '2026-2' }), rec('a', { semester: '2026-1' }), rec('c', { semester: '2026-2' })];
    expect(sortRecords(rs).map(r => r.id)).toEqual(['a', 'b', 'c']);
  });
  it('축은 빈 학기도 포함하고 기록이 바깥이면 늘어난다', () => {
    expect(semesterAxis([], '2026-1', '2026-2')).toEqual(['2026-1', '2026-여름', '2026-2']);
    expect(semesterAxis([rec('a', { semester: '2027-1' })], '2026-1', '2026-2').at(-1)).toBe('2027-1');
  });
});

describe('테크 트리', () => {
  const candidates = [{ program: prog('p1', { field: 'data', did: ['make'] }), dday: 9 }];
  it('기록은 분야 줄 · 한 일 칸에 한 칸씩 놓인다', () => {
    const t = buildTechTree({ records: [rec('a', { field: 'dev', did: 'make' })], activities: [], candidates: [] });
    const dev = t.rows.find(r => r.group === 'dev')!;
    expect(dev.cells).toMatchObject([{ id: 'r:a', kind: 'done', col: 2 }]);
    expect(dev.unknown).toBe(false);
  });
  it('기록이 없는 분야는 ? 로 남는다. 후보만 있어도 안 해 본 분야다', () => {
    const t = buildTechTree({ records: [], activities: [], candidates });
    const ai = t.rows.find(r => r.group === 'ai')!;
    expect(ai.unknown).toBe(true);
    expect(ai.cells).toMatchObject([{ kind: 'candidate', col: 2, programId: 'p1', dday: 9 }]);
    expect(t.rows.find(r => r.group === 'global')!.unknown).toBe(true);
  });
  it('하는 중 활동은 해 보기 칸, 신청 전·결과 대기는 칸이 되지 않는다', () => {
    const t = buildTechTree({
      records: [],
      activities: [act('x'), act('y', { status: 'preparing' }), act('z', { status: 'applied' }), act('w', { status: 'declined' })],
      candidates: []
    });
    expect(t.rows.find(r => r.group === 'dev')!.cells).toMatchObject([{ id: 'a:x', kind: 'ongoing', col: 1 }]);
  });
  it('기록으로 옮겨진 활동은 두 번 세지 않는다', () => {
    const t = buildTechTree({ records: [rec('r', { programId: 'p' })], activities: [act('x', { status: 'recorded', programId: 'p' })], candidates: [] });
    expect(t.rows.flatMap(r => r.cells)).toHaveLength(1);
  });
  it('줄 안은 앞 칸에서 뒤 칸으로 잇고, 다른 줄로 이어지는 같은 일은 점선', () => {
    const t = buildTechTree({
      records: [rec('a', { field: 'research', did: 'listen', semester: '2026-1' }), rec('b', { field: 'research', did: 'make', semester: '2026-2' }),
        rec('c', { field: 'dev', did: 'listen', semester: '2026-2' })],
      activities: [], candidates: []
    });
    expect(t.links).toContainEqual({ from: 'r:a', to: 'r:b', cross: false });
    expect(t.links).toContainEqual({ from: 'r:a', to: 'r:c', cross: true });
    expect(t.links.filter(l => l.cross)).toHaveLength(1);
  });
});

describe('경험 지도', () => {
  const rs = [
    rec('a', { did: 'listen', field: 'research', semester: '2026-1' }),
    rec('b', { did: 'listen', field: 'dev', semester: '2026-2' }),
    rec('c', { did: 'make', field: 'research', semester: '2026-2' })
  ];
  it('같은 일·같은 분야의 이웃끼리만 잇고, 같은 쌍은 이유를 합친다', () => {
    const m = buildMap(rs);
    expect(m.edges.map(e => e.id).sort()).toEqual(['a~b', 'a~c']);
    expect(m.edges.find(e => e.id === 'a~b')!.reasons).toEqual(['did']);
    const same = buildMap([rec('a', { did: 'listen' }), rec('b', { did: 'listen' })]);
    expect(same.edges[0].reasons).toEqual(['did', 'field']);
  });
  it('기록이 없으면 빈 지도', () => {
    expect(buildMap([])).toMatchObject({ nodes: [], edges: [] });
  });
  it('답이 없으면 AI 추정, 맞아요는 확인, 아니에요는 거절. 같은 답을 다시 누르면 거둔다', () => {
    const e = buildMap(rs).edges[0];
    expect(edgeState(e, {})).toBe('estimated');
    const yes = answerEdge({}, e.id, 'yes');
    expect(edgeState(e, yes)).toBe('confirmed');
    expect(edgeState(e, answerEdge(yes, e.id, 'no'))).toBe('rejected');
    expect(answerEdge(yes, e.id, 'yes')).toEqual({});
  });
  it('거절한 연결은 기록의 연결 목록에서 빠진다', () => {
    const m = buildMap(rs);
    expect(edgesOf(m, 'a', {})).toHaveLength(2);
    expect(edgesOf(m, 'a', { 'a~b': 'no' }).map(e => e.id)).toEqual(['a~c']);
  });
  it('같은 학기 같은 분야 기록은 겹치지 않게 slot 을 다르게', () => {
    const m = buildMap([rec('a'), rec('b')]);
    expect(m.nodes.map(n => n.slot)).toEqual([0, 1]);
  });
});

describe('관심 흐름', () => {
  const rs = [rec('a', { field: 'dev', semester: '2026-1' }), rec('b', { field: 'dev', semester: '2026-1' }), rec('c', { field: 'mentor', semester: '2026-1' })];
  const axis = ['2025-2', '2026-1', '2026-여름'];
  it('학기별 분야 비율을 모으고, 기록 없는 학기는 비운다', () => {
    const rows = buildFlow(rs, axis);
    expect(rows[0]).toEqual({ semester: '2025-2', total: 0, segments: [] });
    expect(rows[1].segments.map(s => [s.group, s.count])).toEqual([['dev', 2], ['mentor', 1]]);
    expect(rows[1].segments[0].share).toBeCloseTo(2 / 3);
    expect(rows[2].total).toBe(0);
  });
  it('구간을 합친다. 순서가 뒤집혀도 같다', () => {
    const rows = buildFlow(rs, axis);
    expect(summarizeFlow(rows, 0, 2).total).toBe(3);
    expect(summarizeFlow(rows, 2, 0).total).toBe(3);
    expect(summarizeFlow(rows, 0, 0)).toEqual({ total: 0, segments: [] });
  });
});

describe('나의 강점', () => {
  const self = { expertise: 'mid', problem: 'mid', communication: 'mid', collaboration: 'mid', self: 'mid', creative: 'mid' } as const;
  it('기록 수를 수준으로 바꾼다', () => {
    expect([0, 1, 2, 3, 4].map(seenOf)).toEqual(['none', 'low', 'mid', 'mid', 'high']);
  });
  it('내 생각과 기록이 다른 것만 모은다', () => {
    const rs = [rec('a', { axes: ['problem'] }), rec('b', { axes: ['problem'] }), rec('c', { axes: ['problem'] }), rec('d', { axes: ['problem'] })];
    const rows = buildStrengths(rs, { ...self, expertise: 'high' });
    const diff = differences(rows);
    expect(diff.find(r => r.axis === 'problem')!.gap).toBe('seen-more');
    expect(diff.find(r => r.axis === 'expertise')!.gap).toBe('self-more');
    expect(rows.find(r => r.axis === 'problem')!.evidence).toHaveLength(4);
    expect(rows.find(r => r.axis === 'creative')).toMatchObject({ seen: 'none', gap: 'self-more' });
  });
  it('기록이 없으면 내 생각이 모두 기록보다 앞선다', () => {
    expect(differences(buildStrengths([], self))).toHaveLength(6);
  });
});

describe('분석 갱신 기준', () => {
  it('기록이 더해지거나 고쳐지면 달라지고, 순서가 바뀌어도 같다', () => {
    const a = rec('a');
    const b = rec('b');
    expect(recordsSig([a, b])).toBe(recordsSig([b, a]));
    expect(recordsSig([a])).not.toBe(recordsSig([a, b]));
    expect(recordsSig([a])).not.toBe(recordsSig([{ ...a, v: 2 }]));
  });
});
