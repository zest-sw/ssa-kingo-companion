import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { EMPTY_PROFILE, EXAMPLE_CONFIRM, EXAMPLE_PROFILE, SEED_RECORDS } from '../../data/seed';
import { buildCandidates } from '../candidates';
import { prog, rec } from '../fixtures.test-util';
import type { Confirm, Profile, RecordItem } from '../types';
import { pickLines, triedCategories, usedSources, type LineInput } from './reasons';
import { newcomerOf, traceNodes, type TraceNode } from './trace';

/** 화면(Overview)과 같은 방법으로 이번 주 목록의 이유 줄을 만든다 */
function listOf(profile: Profile, records: RecordItem[], confirm: Record<string, Confirm>) {
  const v = buildCandidates({
    catalog: CATALOG, week: 1, profile, records, confirm, settings: { discover: true, career: true },
    choices: {}, dislikedFields: [], preferEasier: false, last: null
  });
  const who = newcomerOf(profile, v.scored.map(s => s.p));
  const inputs: LineInput[] = v.scored.map(s => ({ p: s.p, nodes: traceNodes(s.reasons, v.usable, s.p, who) }));
  const [top, ...rows] = inputs;
  return pickLines(top, rows, { newcomer: v.usable.length === 0, records: v.usable });
}

const STATES = {
  '예시 학생': () => listOf(EXAMPLE_PROFILE, SEED_RECORDS, EXAMPLE_CONFIRM),
  '새 학생(멘토링)': () => listOf({ ...EMPTY_PROFILE, interests: ['mentor'] }, [], {}),
  '새 학생(관심 모름)': () => listOf({ ...EMPTY_PROFILE, interests: ['unknown'] }, [], {}),
  '새 학생(목표 있음)': () => listOf({ ...EMPTY_PROFILE, interests: ['plan'], goal: '서비스 기획' }, [], {})
};

describe.each(Object.entries(STATES))('%s 추천 목록', (_, make) => {
  const lines = make();
  const texts = lines.rows.map(l => l?.text).filter((t): t is string => !!t);
  it('행마다 이유가 있고, 한 목록 안에 같은 이유 문장이 없다', () => {
    expect(lines.rows.length).toBeGreaterThan(3);
    expect(texts.length).toBe(lines.rows.length);
    expect(new Set(texts).size).toBe(texts.length);
  });
  it("'넓게 둘러보려고 섞은 ○○ 분야예요' 틀은 분야만 바꿔 두 번 나오지 않는다", () => {
    const all = [lines.top, ...lines.rows].map(l => l?.text ?? '');
    expect(all.filter(t => t.startsWith('넓게 둘러보려고 섞')).length).toBeLessThanOrEqual(1);
  });
  it('가장 추천 카드의 이유는 행에 다시 나오지 않는다', () => {
    expect(lines.top).toBeDefined();
    expect(texts).not.toContain(lines.top!.text);
  });
  it('어떻게 골랐나는 실제로 쓴 이유 종류만 말한다', () => {
    const used = usedSources(lines);
    expect(used.length).toBeGreaterThan(1);
    expect(used.length).toBeLessThanOrEqual(new Set([lines.top, ...lines.rows].map(l => l?.source)).size);
  });
});

describe('이유 고르기', () => {
  const energy = (id: string): TraceNode => ({ kind: 'energy', label: '내 기록', detail: '사용성 테스트', recordId: id });
  const p = (id: string, over = {}) => prog(id, { gains: [{ kind: 'output', label: `${id} 결과물` }], hours: 3, durationLabel: '3시간', ...over });

  it('예시 학생: 같은 기록은 한 번만, 다음 행은 그 기회의 다음 이유(공고 요건·발견·강점)', () => {
    const lines = STATES['예시 학생']();
    const records = lines.rows.filter(l => l?.source === 'record').map(l => l!.text);
    expect(new Set(records).size).toBe(records.length);
    expect(lines.top?.source).toBe('record');
    expect(lines.rows.some(l => l?.source === 'career')).toBe(true);
  });
  it('새 학생: 고른 관심 문장은 한 번만, 같은 관심의 다른 기회는 다른 점을 쓴다', () => {
    const lines = STATES['새 학생(멘토링)']();
    const all = [lines.top, ...lines.rows];
    expect(all.filter(l => l?.source === 'interest').length).toBe(1);
    expect(all.some(l => l?.source === 'gain')).toBe(true);
    expect(all.some(l => l?.source === 'time')).toBe(true);
  });
  it('같은 기록에 이어진 다른 기회는 그 기회만의 이유로 내려간다(안 해 본 종류 → 얻는 것 → 다 썼으면 비움)', () => {
    const top = { p: p('a'), nodes: [energy('r1')] };
    const rows = [{ p: p('b'), nodes: [energy('r1')] }, { p: p('c'), nodes: [energy('r1')] }, { p: p('d', { gains: [] }), nodes: [energy('r1')] }];
    const out = pickLines(top, rows, { newcomer: false, records: [] });
    expect(out.top?.text).toBe('내 기록 ‘사용성 테스트’와 이어져요');
    expect(out.rows[0]).toMatchObject({ source: 'type', text: '아직 안 해 본 교육·캠프예요' });
    expect(out.rows[1]).toMatchObject({ source: 'gain', text: 'c 결과물' });
    expect(out.rows[2]).toBeUndefined();
  });
  it('새 학생: 넓게 둘러보기 틀은 한 번만, 다음 탐색 기회는 그 기회만의 점(시간 → 얻는 것 → 활동 종류)', () => {
    const novelty = (field: string): TraceNode => ({ kind: 'novelty', label: '탐색', detail: `처음 해 보는 ${field}` });
    const rows = [
      { p: p('a'), nodes: [novelty('AI·데이터')] },
      { p: p('b', { hours: 1, durationLabel: '1시간' }), nodes: [novelty('글로벌')] },
      { p: p('c'), nodes: [novelty('멘토링')] },
      { p: p('d', { gains: [], category: 'lecture', format: 'online' }), nodes: [novelty('창업·기획')] }
    ];
    const out = pickLines(undefined, rows, { newcomer: true, records: [] });
    expect(out.rows[0]).toMatchObject({ source: 'field', text: '넓게 둘러보려고 섞은 AI·데이터 분야예요' });
    expect(out.rows[1]).toMatchObject({ source: 'time', text: '1시간이면 돼요' });
    expect(out.rows[2]).toMatchObject({ source: 'gain', text: 'c 결과물' });
    expect(out.rows[3]).toMatchObject({ source: 'kind', text: '온라인 특강이에요' });
  });
  it('예시 학생에게는 활동 종류 줄을 쓰지 않는다(안 해 본 종류가 그 자리를 맡는다)', () => {
    const out = pickLines(undefined, [{ p: p('a', { gains: [] }), nodes: [] }], { newcomer: false, records: [rec('r', { kind: '캠프' })] });
    expect(out.rows[0]).toBeUndefined();
  });
  it('짧은 기회는 시간이 이유가 되고, 해 본 종류는 이유가 되지 않는다', () => {
    const rows = [{ p: p('a', { hours: 1, durationLabel: '1시간', format: 'online' }), nodes: [] }];
    const out = pickLines(undefined, rows, { newcomer: false, records: [rec('r', { kind: '캠프' })] });
    expect(out.rows[0]).toMatchObject({ source: 'time', text: '온라인 1시간이면 돼요' });
    expect(out.top).toBeUndefined();
  });
  it('가장 추천 카드는 얻는 것을 이유로 쓰지 않는다(카드에 따로 있다)', () => {
    expect(pickLines({ p: p('a'), nodes: [] }, [], { newcomer: true, records: [] }).top).toBeUndefined();
  });
  it('기록 종류 낱말을 기회 종류로 읽는다', () => {
    expect([...triedCategories([rec('a', { kind: '스터디' }), rec('b', { kind: '해커톤' }), rec('c', { kind: '프로젝트' })])]).toEqual(['club', 'hackathon']);
  });
});
