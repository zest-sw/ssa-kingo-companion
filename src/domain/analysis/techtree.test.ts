import { describe, expect, it } from 'vitest';
import { prog, rec } from '../fixtures.test-util';
import type { Activity } from '../types';
import { buildTechTree, CANDIDATE_ROW_SLOTS, NODES_PER_STAGE, recordOfActivity, relatedRecords, rootTargets, skippedStages, splitTreeRows, TREE_COLUMNS, treeHeadline } from './techtree';

const act = (id: string, over: Partial<Activity> = {}): Activity => ({ id, title: id, field: 'dev', status: 'ongoing', schedule: '', ...over });
const tree = (over: Partial<Parameters<typeof buildTechTree>[0]>) => buildTechTree({ records: [], activities: [], candidates: [], ...over });
const row = (t: ReturnType<typeof buildTechTree>, g: string) => t.rows.find(r => r.group === g)!;

describe('테크 트리: 난이도 단계', () => {
  it('단계는 입문·중급·심화 셋이고, 기록은 그 난이도 칸에 놓인다', () => {
    expect([...TREE_COLUMNS]).toEqual(['입문', '중급', '심화']);
    const t = tree({ records: [rec('a', { field: 'dev', level: 2 })] });
    expect(row(t, 'dev').cells.filter(c => c.kind === 'done')).toMatchObject([{ id: 'r:a', col: 1 }]);
    expect(row(t, 'dev').top).toBe(1);
  });
  it('내가 한 가장 높은 단계보다 아래인데 한 활동이 없으면 회색 건너뜀 노드가 생긴다', () => {
    const t = tree({ records: [rec('a', { field: 'global', level: 1, semester: '2025-1' }), rec('b', { field: 'global', level: 3 })] });
    const g = row(t, 'global');
    expect(g.cells.map(c => [c.kind, c.col])).toEqual([['done', 0], ['skipped', 1], ['done', 2]]);
    expect(g.cells[1]).toMatchObject({ label: '중급 활동' });
    expect(skippedStages(g)).toEqual(['중급']);
    // 선은 입문 → 건너뜀 → 심화로 지나간다
    expect(t.links).toContainEqual({ from: 'r:a', to: 's:global:1', cross: false });
    expect(t.links).toContainEqual({ from: 's:global:1', to: 'r:b', cross: false });
  });
  it('건너뛴 단계 이름은 지금 열린 기회 → 카탈로그 기회 순서이고, 열린 기회는 서랍용으로 모은다', () => {
    const records = [rec('a', { field: 'dev', level: 1 }), rec('b', { field: 'dev', level: 3 })];
    const open = tree({ records, candidates: [{ program: prog('p1', { field: 'dev', level: 2, title: '해커톤' }), dday: 3 }] });
    expect(row(open, 'dev').cells[1]).toMatchObject({ kind: 'skipped', label: '해커톤', open: [expect.objectContaining({ programId: 'p1', dday: 3 })] });
    const cat = tree({ records, programs: [prog('p2', { field: 'dev', level: 2, title: '동아리 프로젝트' })] });
    expect(row(cat, 'dev').cells[1]).toMatchObject({ kind: 'skipped', label: '동아리 프로젝트', examples: [expect.objectContaining({ id: 'p2' })] });
  });
  it('한 활동이 심화 하나뿐이면 입문·중급이 모두 건너뜀', () => {
    const t = tree({ records: [rec('a', { field: 'mentor', level: 3 })] });
    expect(row(t, 'mentor').cells.map(c => c.kind)).toEqual(['skipped', 'skipped', 'done']);
    expect(rootTargets(row(t, 'mentor'))).toEqual(['s:mentor:0']);
  });
  it('할 수 있는 활동은 내가 한 가장 높은 단계와 그 위에만 놓는다', () => {
    const t = tree({
      records: [rec('a', { field: 'dev', level: 2 })],
      candidates: [1, 2, 3].map(level => ({ program: prog(`p${level}`, { field: 'dev', level: level as 1 | 2 | 3 }), dday: level }))
    });
    // 입문은 넘어선 단계라 건너뜀 노드가 되고, 그 단계의 열린 기회는 그 노드 서랍으로 간다.
    expect(row(t, 'dev').cells.map(c => `${c.kind}:${c.col}`)).toEqual(['skipped:0', 'done:1', 'candidate:1', 'candidate:2']);
    expect(t.candidates).toHaveLength(3);
  });
  it('기록이 없는 분야는 ? 로 남고, 후보만 있으면 그 난이도 자리에 점선으로 그린다', () => {
    const t = tree({ candidates: [{ program: prog('p1', { field: 'data', level: 2 }), dday: 9 }] });
    expect(row(t, 'ai')).toMatchObject({ unknown: true, top: -1, cells: [{ kind: 'candidate', col: 1, programId: 'p1', dday: 9 }] });
    expect(row(t, 'global').unknown).toBe(true);
  });
  it('하는 중·끝난 활동은 이름 규칙으로 단계를 정하고, 신청 전·결과 대기는 노드가 되지 않는다', () => {
    const t = tree({ activities: [act('AI 프로젝트 학회'), act('y', { status: 'preparing' }), act('z', { status: 'applied' }), act('w', { status: 'declined' })] });
    expect(row(t, 'dev').cells.filter(c => c.kind === 'ongoing')).toMatchObject([{ id: 'a:AI 프로젝트 학회', col: 1 }]);
    expect(row(t, 'dev').cells.filter(c => c.activityId)).toHaveLength(1);
  });
  it('기록으로 옮겨진 활동은 두 번 세지 않는다', () => {
    const t = tree({ records: [rec('r', { programId: 'p' })], activities: [act('x', { status: 'recorded', programId: 'p' })] });
    expect(t.rows.flatMap(r => r.cells).filter(c => c.kind === 'done')).toHaveLength(1);
  });
  it('다른 분야로 이어진 경로는 분야마다 한 줄(같은 일을 한 그 분야 첫 기록으로 들어온 선)', () => {
    const t = tree({
      records: [rec('a', { field: 'research', did: 'listen', semester: '2025-1' }), rec('c', { field: 'dev', did: 'listen', semester: '2025-2' }),
        rec('d', { field: 'research', did: 'listen', semester: '2026-1' }), rec('e', { field: 'global', did: 'listen', semester: '2026-2' })]
    });
    expect(t.links.filter(l => l.cross).map(l => `${l.from}>${l.to}`)).toEqual(['r:a>r:c', 'r:d>r:e']);
  });
  it('노드도 후보도 없는 분야만 한 줄로 모은다', () => {
    const t = tree({ records: [rec('a', { field: 'dev' })], candidates: [{ program: prog('p1', { field: 'data' }), dday: 9 }] });
    const { drawn, untried } = splitTreeRows(t.rows);
    expect(drawn.map(r => r.group)).toEqual(['ai', 'dev']);
    expect(untried.map(r => r.group)).toEqual(['plan', 'mentor', 'global', 'other']);
  });
});

describe('테크 트리: 접기', () => {
  it('후보만 있는 줄은 낮게: 한 단계에 후보 하나 + +n, 목록용은 전부 남는다', () => {
    const candidates = ['p1', 'p2', 'p3', 'p4'].map((id, i) => ({ program: prog(id, { field: 'data', level: 2 }), dday: i }));
    const t = tree({ candidates });
    expect(row(t, 'ai').cells.map(c => c.id)).toEqual(['p:p1']);
    expect(row(t, 'ai').folds[0].cells).toHaveLength(3);
    expect(CANDIDATE_ROW_SLOTS).toBe(2);
    expect(t.candidates).toHaveLength(4);
  });
  it('후보만 둘이면 접지 않는다', () => {
    const candidates = ['p1', 'p2'].map((id, i) => ({ program: prog(id, { field: 'data' }), dday: 3 - i }));
    const ai = row(tree({ candidates }), 'ai');
    expect(ai.cells.map(c => c.id)).toEqual(['p:p2', 'p:p1']);
    expect(ai.folds).toEqual([]);
  });
  it('내 활동이 있는 단계는 자리 셋: 추천 하나 + 최근 활동 + +n. 오래된 한 활동부터 접는다', () => {
    const candidates = ['p1', 'p2'].map((id, i) => ({ program: prog(id, { field: 'data', level: 2 }), dday: i }));
    const records = ['a', 'b', 'c'].map((id, i) => rec(id, { field: 'data', level: 2, semester: `2026-${i ? 2 : 1}` }));
    const ai = row(tree({ records, candidates }), 'ai');
    expect(ai.cells.filter(c => c.col === 1).map(c => c.id)).toEqual(['r:c', 'p:p1']);
    expect(ai.folds).toEqual([{ col: 1, cells: ['r:a', 'r:b', 'p:p2'].map(id => expect.objectContaining({ id })) }]);
    expect(NODES_PER_STAGE).toBe(ai.cells.filter(c => c.col === 1).length + 1);
  });
  it('추천이 많아도 하는 중이 있으면 내 활동 하나는 늘 보인다', () => {
    const candidates = ['p1', 'p2', 'p3'].map((id, i) => ({ program: prog(id, { field: 'dev', level: 2 }), dday: i }));
    const dev = row(tree({ activities: [act('팀 프로젝트')], records: ['a', 'b'].map(id => rec(id, { field: 'dev', level: 2 })), candidates }), 'dev');
    expect(dev.cells.filter(c => c.col === 1).map(c => c.kind)).toEqual(['ongoing', 'candidate']);
  });
});

describe('테크 트리: 머리 키워드', () => {
  it('가장 높은 단계까지 간 분야와 건너뛴 단계를 말한다', () => {
    const t = tree({
      records: [rec('a', { field: 'product', level: 1 }), rec('b', { field: 'product', level: 2 }), rec('c', { field: 'product', level: 3 }),
        rec('d', { field: 'global', level: 1 }), rec('e', { field: 'global', level: 3 }), rec('f', { field: 'dev', level: 1 })]
    });
    expect(treeHeadline(t)).toBe('창업·기획 심화까지 · 글로벌은 중급을 건너뜀');
  });
  it('건너뛴 단계가 없으면 안 해 본 분야, 기록이 없으면 다음 할 일', () => {
    expect(treeHeadline(tree({ records: [rec('a', { field: 'dev', level: 1 })] }))).toBe('개발 입문까지 · AI·데이터 미경험');
    expect(treeHeadline(tree({}))).toBe('회고를 쓰면 가지가 자라요');
  });
  it('같은 단계면 접힌 노드까지 세어 활동이 많은 분야가 앞선다', () => {
    const plan = Array.from({ length: 6 }, (_, i) => rec(`p${i}`, { field: 'product', level: 2 }));
    const dev = [1, 2].map(l => rec(`d${l}`, { field: 'dev', level: l as 1 | 2 }));
    const t = tree({ records: [...dev, ...plan] });
    expect(row(t, 'plan').folds.length).toBeGreaterThan(0);
    expect(treeHeadline(t)).toMatch(/^창업·기획 중급까지/);
  });
});

describe('테크 트리: 서랍 도우미', () => {
  it('같은 분야 다른 기록과 활동에 이어진 기록', () => {
    const rs = [rec('a', { field: 'dev' }), rec('b', { field: 'dev' }), rec('c', { field: 'ai' })];
    expect(relatedRecords(rs, rs[0]).map(r => r.id)).toEqual(['b']);
    expect(recordOfActivity([rec('r', { programId: 'p' })], act('x', { programId: 'p' }))?.id).toBe('r');
  });
});
