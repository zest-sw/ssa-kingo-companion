import { describe, expect, it } from 'vitest';
import { catalog, prog, profile, rec } from '../fixtures.test-util';
import { buildCandidates } from '../candidates';
import { buildGraph } from '../analysis/graph';
import { buildStrengths, leadStrengths } from '../analysis/strengths';
import { onboardingResult } from '../onboarding';
import { FIELD_GROUP } from '../vocab';
import { AXIS_DOING, CLUSTER_DOING, identityLine } from './phrases';
import { buildStory, clusterDoing, storyLineFor, type StoryInput } from './story';

const programs = [
  prog('p-ask', { field: 'research', did: ['ask'], level: 2 }),
  prog('p-global', { field: 'global', did: ['listen'], level: 1 }),
  prog('p-make', { field: 'dev', did: ['make'], level: 2 })
];
const records = [
  rec('a', { semester: '2025-1', field: 'dev', did: 'make', axes: ['problem', 'creative'], confirmedAxes: ['problem'], title: '해커톤', level: 1 }),
  rec('b', { semester: '2026-1', field: 'research', did: 'ask', axes: ['problem', 'communication'], confirmedAxes: ['problem'], title: '인터뷰' }),
  rec('c', { semester: '2026-2', field: 'research', did: 'listen', axes: ['communication', 'expertise'], title: '사용성 테스트' })
];
const input = (over: Partial<StoryInput> = {}): StoryInput => {
  const p = over.profile ?? profile({ interests: ['plan'], goal: '서비스 기획' });
  const view = buildCandidates({
    catalog: catalog(programs), week: 1, profile: p, records: over.records ?? records, confirm: {}, settings: { discover: false, career: false },
    choices: {}, dislikedFields: [], preferEasier: false, last: null
  });
  return { records, profile: p, activities: [], edgeAnswers: {}, scored: view.scored, week: 1, programs, semesters: ['2025-1', '2025-여름', '2025-2', '2025-겨울', '2026-1', '2026-여름', '2026-2'], ...over };
};

describe('buildStory', () => {
  it('정체성은 묶음이 하는 일 + 가장 확실한 강점, 확인 전에는 추정', () => {
    const s = buildStory(input());
    // 규칙: 지금 모이는 분야(가장 최근 기록의 분야)가 든 지식 그래프 묶음의 사전 주제가 하는 일 + 가장 확실한 강점이 하는 일
    const end = FIELD_GROUP[records[records.length - 1].field];
    const cluster = buildGraph(records, {}).clusters.find(c => c.recordIds.some(id => FIELD_GROUP[records.find(r => r.id === id)!.field] === end))!;
    expect(cluster.source).toBe('taxonomy');
    expect(clusterDoing(cluster, records)).toBe(CLUSTER_DOING[cluster.topic!]);
    const top = leadStrengths(buildStrengths(records)).rows[0];
    expect(s.identity.text).toBe(identityLine(CLUSTER_DOING[cluster.topic!], AXIS_DOING[top.axis]));
    expect(s.identity.status).toBe('estimate');
    expect(s.identity.alternatives.length).toBeGreaterThanOrEqual(2);
    expect(s.identity.alternatives.length).toBeLessThanOrEqual(3);
    const confirmed = buildStrengths(records).reduce((n, x) => n + x.confirmed, 0);
    expect(s.identity.basis).toBe(`기록 ${records.length}개·확인 근거 ${confirmed}개를 읽고`);
  });

  it('AI 제안 이름 묶음(사전 주제 없음)은 그 묶음에 가장 많은 분야의 말을 쓴다', () => {
    const doing = clusterDoing({ id: 'c-x', name: 'x', recordIds: ['b', 'c'], source: 'llm', keywords: [] }, records);
    expect(doing).toBe(clusterDoing({ id: 'c-y', name: 'y', recordIds: ['b'], source: 'llm', keywords: [] }, records));
  });

  it('고른 문장이 후보 중 하나면 확인으로 바뀌고, 모르는 문장이면 무시한다', () => {
    const alt = buildStory(input()).identity.alternatives[0];
    const s = buildStory(input({ answer: alt }));
    expect(s.identity).toMatchObject({ text: alt, status: 'confirmed' });
    expect(s.identity.alternatives).not.toContain(alt);
    expect(buildStory(input({ answer: '다른 문장' })).identity.status).toBe('estimate');
  });

  it('근거는 강점 → 묶음 → 흐름 → 깊이, 각자 그 분석 화면으로', () => {
    const s = buildStory(input());
    expect(s.proofs.map(p => p.route)).toEqual(['analysis/strengths', 'analysis/map', 'analysis/flow', 'analysis/techtree']);
    expect(s.proofs[0]).toMatchObject({ line: '문제해결이 가장 확실해요', value: '확인 근거 2개' });
    expect(s.proofs[2].line).toBe('개발에서 창업·기획으로 모였어요');
  });

  it('목표 분야를 안 해 봤으면 그 빈 곳을 말하고, 다음 한 걸음은 그 분야 후보', () => {
    const s = buildStory(input({ profile: profile({ interests: ['global'], goal: '' }) }));
    expect(s.gap).toMatchObject({ kind: 'untried', filled: true, line: '아직 글로벌 활동은 해 본 적이 없어요 · 다음 한 걸음이 여기를 채워요' });
    expect(s.next?.programId).toBe('p-global');
    expect(s.next?.why).toBe('처음으로 글로벌을 해 봐요');
  });

  it('빈 곳이 분야가 아니면 가장 확실한 강점을 쓰는 후보를 고르고 이야기 말로 이유를 단다', () => {
    const s = buildStory(input());
    expect(s.next?.programId).toBe('p-ask');
    expect(s.next?.why).toBe('질문을 짜며 문제해결을 한 번 더 써요');
    expect(s.next?.guide).toBeUndefined();
    expect(s.perScreen.recommend.soWhat).toBe('가장 확실한 문제해결을 한 단계 깊게 써 봐요');
    // 분석 화면 머리는 결론 한 줄: 둘을 가운뎃점으로 잇지 않는다
    for (const k of ['techtree', 'map', 'flow', 'strengths'] as const) expect(s.perScreen[k].soWhat).not.toContain(' · ');
  });

  it('가장 추천과 다른 후보를 고르면 이유를 밝힌다', () => {
    const s = buildStory(input({ profile: profile({ interests: ['global', 'plan'], goal: '' }) }));
    if (s.next && !s.next.same) expect(s.next.note).toMatch(/가장 추천은/);
  });

  it('storyLineFor: 이 활동이 이야기에서 뜻하는 것', () => {
    const s = buildStory(input());
    expect(storyLineFor(s, 'p-ask', programs)).toBe('가장 확실한 문제해결을 한 단계 깊게 써 봐요');
    expect(storyLineFor(s, 'p-global', programs)).toBe('뒤따르는 강점 소통을 함께 키워요');
    expect(storyLineFor(s, 'nope', programs)).toBe('');
  });

  it('점수·순위 말을 쓰지 않는다', () => {
    const text = JSON.stringify(buildStory(input()));
    expect(text).not.toMatch(/점수|순위|레벨|등급|상위/);
  });
});

describe('새 학생(기록 없음)', () => {
  it('관심·목표로 시작점 문장, 근거·빈 곳 없음, 다음은 첫 추천', () => {
    const s = buildStory(input({ records: [], profile: profile({ interests: ['ai', 'dev'], goal: '데이터 분석가' }) }));
    expect(s.newStudent).toBe(true);
    expect(s.identity.text).toBe('데이터 분석가를 향해 AI·데이터와 개발에서 첫걸음을 떼요');
    expect(s.proofs).toEqual([]);
    expect(s.gap).toBeUndefined();
    expect(s.next?.why).toMatch(/^처음에 고른 관심 ‘(AI·데이터|개발)’과 맞아요$/);
    // 학생이 고른 답에서 나온 이유라서 AI 추정 표시를 붙이지 않는다
    expect(s.next?.guide).toBe(true);
  });
  it('다음 한 걸음은 가입 끝 장면과 같은 기회, 같은 이유 문장', () => {
    const over = { records: [], profile: profile({ interests: ['ai', 'dev'], goal: '' }) };
    const s = buildStory(input(over));
    const end = onboardingResult({ primary: input(over).scored[0], newCount: 1 }).top;
    expect(s.next?.programId).toBe(end?.programId);
    expect(s.next?.why).toBe(end?.reason);
  });
  it('관심을 정하지 않았으면 넓게 둘러보는 문장', () => {
    const s = buildStory(input({ records: [], profile: profile({ interests: ['unknown'], goal: '' }) }));
    expect(s.identity.text).toBe('넓게 둘러보며 나에게 맞는 쪽을 찾기 시작해요');
  });
  it('분석 화면 머리 한 줄은 화면마다 다르고 가운뎃점으로 잇지 않는다', () => {
    const s = buildStory(input({ records: [], profile: profile({ interests: ['ai'], goal: '' }) }));
    const lines = (['techtree', 'map', 'flow', 'strengths'] as const).map(k => s.perScreen[k].soWhat);
    expect(new Set(lines).size).toBe(4);
    for (const l of lines) expect(l).not.toContain(' · ');
  });
});
