import { describe, expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import type { Activity } from '../types';
import { usedCount } from './discovery';
import { buildFlow, clampRange, defaultRange, legendGroups, moveRange, summarizeFlow } from './flow';
import { answerEdge, buildMap, clearRejected, edgeState, edgesOf, layoutMap, parseAnswers, pruneAnswers, visibleEdges } from './map';
import { recordsSig } from './refresh';
import { sigOf, discoveriesOf } from '../discoveries';
import { semesterAxis, semesterKey, semesterLabel, sortRecords } from './semester';
import { recordOfActivity, relatedRecords } from './techtree';

const act = (id: string, over: Partial<Activity> = {}): Activity => ({ id, title: id, field: 'dev', status: 'ongoing', schedule: '', ...over });

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

describe('경험 지도 배치', () => {
  it('학기는 가로, 분야는 세로, 겹친 기록은 아래로 쌓는다', () => {
    const m = buildMap([rec('a', { semester: '2026-1' }), rec('b', { semester: '2026-1' }), rec('c', { semester: '2026-2', field: 'dev' })]);
    const l = layoutMap(m, { padLeft: 0, padTop: 10, colW: 100, rowH: 50, slotH: 20, padRight: 0, padBottom: 0 });
    expect(l.pos.a).toEqual({ x: 50, y: 60 });
    expect(l.pos.b).toEqual({ x: 50, y: 80 });
    expect(l.pos.c).toEqual({ x: 150, y: 10 });
    expect(l.width).toBe(200);
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

describe('분석 갱신 기준', () => {
  it('기록이 더해지거나 고쳐지면 달라지고, 순서가 바뀌어도 같다', () => {
    const a = rec('a');
    const b = rec('b');
    expect(recordsSig([a, b])).toBe(recordsSig([b, a]));
    expect(recordsSig([a])).not.toBe(recordsSig([a, b]));
    expect(recordsSig([a])).not.toBe(recordsSig([{ ...a, v: 2 }]));
  });
});

describe('재작업: 화면에서 옮긴 계산', () => {
  const rs = [rec('a', { did: 'listen', field: 'research', semester: '2026-1' }), rec('b', { did: 'listen', field: 'dev', semester: '2026-2' })];

  it('다시 보이기는 아니에요만 지운다', () => {
    expect(clearRejected({ 'a~b': 'no', 'b~c': 'yes' })).toEqual({ 'b~c': 'yes' });
    expect(clearRejected({})).toEqual({});
  });
  it('보이는 연결은 거절한 것을 뺀다', () => {
    const m = buildMap(rs);
    expect(visibleEdges(m, {})).toHaveLength(1);
    expect(visibleEdges(m, { 'a~b': 'no' })).toHaveLength(0);
    expect(visibleEdges(m, { 'a~b': 'yes' })).toHaveLength(1);
  });
  it('지워진 기록을 가리키는 답은 버리고, 바뀐 게 없으면 같은 객체', () => {
    const answers = { 'a~b': 'yes', 'b~c': 'no' } as const;
    expect(pruneAnswers({ ...answers }, ['a', 'b'])).toEqual({ 'a~b': 'yes' });
    const same = { ...answers };
    expect(pruneAnswers(same, ['a', 'b', 'c'])).toBe(same);
    expect(pruneAnswers(same, [])).toEqual({});
  });
  it('저장소 값은 모양이 맞을 때만 쓴다', () => {
    expect(parseAnswers({ 'a~b': 'yes', 'b~c': 'maybe' })).toEqual({ 'a~b': 'yes' });
    expect(parseAnswers(null)).toBeNull();
    expect(parseAnswers([1])).toBeNull();
    expect(parseAnswers('x')).toBeNull();
  });
  it('같은 분야 기록은 자기 자신을 빼고 개수 제한', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map(id => rec(id, { field: 'research' }));
    expect(relatedRecords(many, many[0]).map(r => r.id)).toEqual(['b', 'c', 'd']);
    expect(relatedRecords(many, many[0], 1)).toHaveLength(1);
    expect(relatedRecords([rec('x', { field: 'dev' }), rec('y')], rec('y'))).toEqual([]);
  });
  it('활동에 이어진 기록을 찾는다', () => {
    expect(recordOfActivity([rec('r', { programId: 'p' })], act('x', { programId: 'p' }))?.id).toBe('r');
    expect(recordOfActivity([rec('r')], act('x', { recordId: 'r' }))?.id).toBe('r');
    expect(recordOfActivity([rec('r')], act('x'))).toBeUndefined();
  });
  it('구간은 축 밖으로 나가지 않고 뒤집히지 않는다', () => {
    expect(clampRange([0, 9], 4)).toEqual([0, 4]);
    expect(clampRange([7, 3], 4)).toEqual([3, 3]);
    expect(clampRange([-2, -1], 4)).toEqual([0, 0]);
    expect(moveRange([1, 3], 'from', 5, 6)).toEqual([5, 5]);
    expect(moveRange([2, 3], 'to', 0, 6)).toEqual([0, 0]);
    expect(moveRange([2, 3], 'to', 6, 6)).toEqual([2, 6]);
  });
  it('처음 구간은 첫 기록 학기부터 끝까지', () => {
    const axis = ['2025-1', '2025-여름', '2025-2', '2025-겨울', '2026-1', '2026-여름', '2026-2'];
    expect(defaultRange(buildFlow([rec('a', { semester: '2026-1' }), rec('b', { semester: '2026-2' })], axis))).toEqual([4, 6]);
    // 첫 기록 뒤의 빈 학기는 구간 안에 그대로 둔다(쉬어 간 학기도 흐름의 일부)
    expect(defaultRange(buildFlow([rec('a', { semester: '2025-2' }), rec('b', { semester: '2026-2' })], axis))).toEqual([2, 6]);
    expect(defaultRange(buildFlow([], axis))).toEqual([0, 6]);
  });
  it('범례는 기록이 있는 분야만 고정 순서로', () => {
    const rows = buildFlow([rec('a', { field: 'mentor' }), rec('b', { field: 'dev' })], ['2026-2']);
    expect(legendGroups(rows)).toEqual(['dev', 'mentor']);
    expect(legendGroups(buildFlow([], ['2026-2']))).toEqual([]);
  });
  it('반영 중인 발견 수는 맞아요만 세고 근거가 바뀐 것은 뺀다', () => {
    const records = [rec('a', { did: 'make' }), rec('b', { did: 'make' }), rec('c', { did: 'ask' }), rec('d', { did: 'ask' })];
    const [d1, d2] = discoveriesOf(records);
    expect(usedCount([d1, d2], {})).toBe(0);
    expect(usedCount([d1, d2], { [d1.key]: { status: 'yes', sig: d1.sig }, [d2.key]: { status: 'no', sig: d2.sig } })).toBe(1);
    expect(usedCount([d1], { [d1.key]: { status: 'yes', sig: sigOf([rec('zzz')]) } })).toBe(0);
  });
});
