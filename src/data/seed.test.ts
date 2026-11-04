import { describe, expect, it } from 'vitest';
import { buildCandidates } from '../domain/candidates';
import { evaluate } from '../domain/challenges';
import { discoveriesOf, discState } from '../domain/discoveries';
import { buildStrengths } from '../domain/analysis/strengths';
import { buildFlow } from '../domain/analysis/flow';
import { semesterAxis } from '../domain/analysis/semester';
import { FIELD_GROUP } from '../domain/vocab';
import { CATALOG, PROGRAM_BY_ID } from './catalog';
import { CHALLENGES } from './challenges';
import { FRIENDS, HALL, SEED_POSTS } from './friends';
import { EXAMPLE_CHALLENGE_AT, EXAMPLE_CONFIRM, EXAMPLE_PROFILE, SEED_ACTIVITIES, SEED_RECORDS } from './seed';
import { PROTOTYPE_TODAY } from '../domain/today';
import { DEFAULT_SETTINGS, INITIAL_STATE } from '../app/state';

// 예시 학생이 '3년 쓴 학생'으로 보이게 하는 조건. 데이터를 고치다 이야기가 무너지면 여기서 걸린다.

const TERMS = ['2024-1', '2024-여름', '2024-2', '2024-겨울', '2025-1', '2025-여름', '2025-2', '2026-1', '2026-여름', '2026-2'];

describe('예시 학생 기록', () => {
  it('20~26개, 학기마다 1~4개', () => {
    expect(SEED_RECORDS.length).toBeGreaterThanOrEqual(20);
    expect(SEED_RECORDS.length).toBeLessThanOrEqual(26);
    for (const t of TERMS) {
      const n = SEED_RECORDS.filter(r => r.semester === t).length;
      expect(n, t).toBeGreaterThanOrEqual(1);
      expect(n, t).toBeLessThanOrEqual(4);
    }
  });
  it('분야 묶음 6개 중 기타를 뺀 다섯 곳과 단계 네 칸이 모두 채워진다', () => {
    const groups = new Set(SEED_RECORDS.map(r => FIELD_GROUP[r.field]));
    for (const g of ['dev', 'ai', 'plan', 'mentor', 'global'] as const) expect(groups.has(g), g).toBe(true);
    const dids = new Set(SEED_RECORDS.map(r => r.did));
    expect(dids.has('present')).toBe(true);
    expect(SEED_RECORDS.some(r => r.did === 'listen' || r.did === 'ask')).toBe(true);
  });
  it('이야기: 1학년은 개발, 2학년은 AI·데이터, 3학년은 기획이 가장 많다', () => {
    const top = (year: string) => {
      const n = new Map<string, number>();
      for (const r of SEED_RECORDS.filter(x => x.semester.startsWith(year))) n.set(FIELD_GROUP[r.field], (n.get(FIELD_GROUP[r.field]) ?? 0) + 1);
      return [...n].sort((a, b) => b[1] - a[1])[0][0];
    };
    expect(top('2024')).toBe('dev');
    expect(top('2025')).toBe('ai');
    expect(top('2026')).toBe('plan');
  });
  it('관심 흐름은 기록이 있는 모든 학기를 그린다', () => {
    const rows = buildFlow(SEED_RECORDS, semesterAxis(SEED_RECORDS, '2025-1', '2026-2'));
    expect(rows[0].semester).toBe('2024-1');
    expect(rows.filter(r => r.total > 0).length).toBe(TERMS.length);
  });
  it('기록 id 가 겹치지 않는다', () => expect(new Set(SEED_RECORDS.map(r => r.id)).size).toBe(SEED_RECORDS.length));
});

describe('예시 학생 강점', () => {
  const rows = buildStrengths(SEED_RECORDS);
  it('역량 6개 모두 근거가 있다', () => expect(rows.every(r => r.evidence.length > 0)).toBe(true));
  it('확인한 근거가 역량마다 3~10개로 다르게 퍼지고, 소통·문제해결이 가장 많다', () => {
    const by = Object.fromEntries(rows.map(r => [r.axis, r.confirmed]));
    expect(Math.min(...rows.map(r => r.confirmed))).toBeGreaterThanOrEqual(3);
    expect(Math.max(...rows.map(r => r.confirmed))).toBeLessThanOrEqual(10);
    expect(new Set(rows.map(r => r.confirmed)).size).toBeGreaterThanOrEqual(4);
    expect(by.problem).toBeGreaterThanOrEqual(8);
    expect(by.communication).toBeGreaterThanOrEqual(8);
    expect(by.collaboration).toBeLessThan(by.communication);
    expect(by.self).toBeLessThanOrEqual(5);
    expect(by.creative).toBeLessThanOrEqual(5);
    // 맨 앞 강점은 하나로 갈린다
    expect(rows[0].confirmed).toBeGreaterThan(rows[1].confirmed);
  });
  it('역량마다 근거의 절반 넘게 확인했고 추정이 남아 있다', () => {
    for (const r of rows) {
      expect(r.confirmed / r.evidence.length, r.axis).toBeGreaterThanOrEqual(0.5);
      expect(r.confirmed / r.evidence.length, r.axis).toBeLessThanOrEqual(0.8);
    }
  });
  it('최근 학기(2026-2)에는 추정이 남고, 아니에요 한 기록도 있다', () => {
    expect(SEED_RECORDS.filter(r => r.semester === '2026-2').some(r => !r.confirmedAxes?.length)).toBe(true);
    expect(SEED_RECORDS.filter(r => r.rejectedAxes?.length).length).toBeGreaterThanOrEqual(2);
  });

});

describe('예시 학생 발견', () => {
  const ds = discoveriesOf(SEED_RECORDS);
  it('확인 전 3~4개, 맞아요 한 것 1~2개', () => {
    const yes = ds.filter(d => discState(d, EXAMPLE_CONFIRM) === 'yes').length;
    const open = ds.filter(d => discState(d, EXAMPLE_CONFIRM) === 'none').length;
    expect(yes).toBeGreaterThanOrEqual(1);
    expect(yes).toBeLessThanOrEqual(2);
    expect(open).toBeGreaterThanOrEqual(3);
    expect(open).toBeLessThanOrEqual(4);
  });
});

describe('예시 학생 보드·추천·과제·친구', () => {
  it('보드 10~14개, 모든 상태가 있고 회고 대기 2~3개', () => {
    expect(SEED_ACTIVITIES.length).toBeGreaterThanOrEqual(10);
    expect(SEED_ACTIVITIES.length).toBeLessThanOrEqual(14);
    for (const s of ['preparing', 'applied', 'ongoing', 'ended', 'recorded', 'declined'] as const) expect(SEED_ACTIVITIES.some(a => a.status === s), s).toBe(true);
    const ended = SEED_ACTIVITIES.filter(a => a.status === 'ended').length;
    expect(ended).toBeGreaterThanOrEqual(2);
    expect(ended).toBeLessThanOrEqual(3);
  });
  it('기록함 활동은 남아 있는 기록을 가리킨다', () => {
    const ids = new Set(SEED_RECORDS.map(r => r.id));
    for (const a of SEED_ACTIVITIES.filter(x => x.status === 'recorded')) expect(ids.has(a.recordId ?? ''), a.id).toBe(true);
  });
  it('추천 후보 7~10개', () => {
    const v = buildCandidates({
      catalog: CATALOG, week: 1, profile: EXAMPLE_PROFILE, records: SEED_RECORDS, confirm: EXAMPLE_CONFIRM, settings: DEFAULT_SETTINGS,
      choices: {}, dislikedFields: [], preferEasier: false, last: null
    });
    expect(v.scored.length).toBeGreaterThanOrEqual(7);
    expect(v.scored.length).toBeLessThanOrEqual(10);
    expect(v.mode).toBe('focus');
  });
  it('도전 과제 달성 3~5개, 숨은 과제가 남아 있다', () => {
    const rs = evaluate(CHALLENGES, { records: SEED_RECORDS, activities: SEED_ACTIVITIES, programs: PROGRAM_BY_ID });
    const done = rs.filter(r => r.achieved);
    expect(done.length).toBeGreaterThanOrEqual(3);
    expect(done.length).toBeLessThanOrEqual(5);
    expect(rs.some(r => r.def.hidden && !r.achieved)).toBe(true);
    // 들어오자마자 달성 토스트가 뜨지 않게 달성 시각을 미리 둔다
    for (const r of done) expect(INITIAL_STATE.challengeAt[r.def.id], r.def.id).toBeDefined();
    // 달성 시각은 프로토타입의 오늘보다 앞이어야 한다(미래에 달성한 과제가 전시되지 않게)
    const today = Date.parse(`${PROTOTYPE_TODAY}T23:59:59+09:00`);
    for (const [id, t] of Object.entries(EXAMPLE_CHALLENGE_AT)) expect(t, id).toBeLessThanOrEqual(today);
    // 전시 과제는 달성한 것만
    for (const id of INITIAL_STATE.visibility.showcaseChallengeIds) expect(done.some(r => r.def.id === id), id).toBe(true);
  });
  it('친구 5~7명, 모집 글 3~4개(내 글 1개), 명예의 전당 3~4명', () => {
    expect(FRIENDS.length).toBeGreaterThanOrEqual(5);
    expect(FRIENDS.length).toBeLessThanOrEqual(7);
    const posts = [...INITIAL_STATE.recruitPosts, ...SEED_POSTS];
    expect(posts.length).toBeGreaterThanOrEqual(3);
    expect(posts.length).toBeLessThanOrEqual(4);
    expect(posts.filter(p => p.mine)).toHaveLength(1);
    expect(HALL.length).toBeGreaterThanOrEqual(3);
    expect(HALL.length).toBeLessThanOrEqual(4);
  });
});

describe('예시 학생 경험 지도', () => {
  it('맞아요 한 연결은 지도에 있는 연결이다', async () => {
    const { buildMap } = await import('../domain/analysis/map');
    const { EXAMPLE_EDGE_ANSWERS } = await import('./seed');
    const ids = new Set(buildMap(SEED_RECORDS).edges.map(e => e.id));
    for (const id of Object.keys(EXAMPLE_EDGE_ANSWERS)) expect(ids.has(id), id).toBe(true);
  });
});
