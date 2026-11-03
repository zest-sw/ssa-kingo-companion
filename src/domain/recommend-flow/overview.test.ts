import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { buildCandidates } from '../candidates';
import { prog } from '../fixtures.test-util';
import { PROTOTYPE_TODAY } from '../today';
import type { Activity, Scored } from '../types';
import { filterLabels, isEmptyFilter, matchesAsk, parseAsk, withoutKey } from './ask';
import { funnelDrops, STEP_IDS } from './drops';
import { parseRecommendSub } from './flow';
import { setListIntent, takeListIntent } from './intent';
import { pickingLine, semesterLine, todayTasks, withoutTasks } from './summary';
import { upcomingItems, upcomingRange, whenOffset } from './upcoming';

const act = (over: Partial<Activity>): Activity => ({ id: 'a', title: 'A', field: 'dev', status: 'preparing', schedule: '', ...over });
const pick = (id: string, over = {}): Scored => ({ p: prog(id, over), score: 1, reasons: [] });

describe('parseAsk', () => {
  it('예시 칩 세 개를 조건으로 바꾼다', () => {
    expect(parseAsk('이번 주 저녁에 할 수 있는 것')).toEqual({ evening: true });
    expect(parseAsk('팀으로 하는 대회')).toEqual({ team: true });
    expect(parseAsk('안 해 본 분야')).toEqual({ fresh: true });
  });
  it('모르는 낱말은 검색어로 쓴다', () => {
    expect(parseAsk('데이터 특강').words).toEqual(['데이터', '특강']);
    expect(isEmptyFilter(parseAsk(''))).toBe(true);
  });
  it('칩 이름과 지우기', () => {
    const f = parseAsk('저녁 온라인 데이터');
    expect(filterLabels(f).map(l => l.label)).toEqual(['저녁', '온라인', '‘데이터’']);
    expect(isEmptyFilter(withoutKey(withoutKey(withoutKey(f, 'evening'), 'online'), 'word:데이터'))).toBe(true);
  });
});

describe('matchesAsk', () => {
  const none = new Set<never>();
  it('저녁은 17시 이후 시작만', () => {
    expect(matchesAsk(prog('a', { when: '10.14(수) 18:30' }), { evening: true }, none)).toBe(true);
    expect(matchesAsk(prog('b', { when: '10.15(목) 15:00' }), { evening: true }, none)).toBe(false);
    expect(matchesAsk(prog('c', { when: '10.20(화)부터 4주' }), { evening: true }, none)).toBe(false);
  });
  it('팀·안 해 본 분야·방식', () => {
    expect(matchesAsk(prog('a', { title: '아이디어톤' }), { team: true }, none)).toBe(true);
    expect(matchesAsk(prog('b', { target: '전 학년 · 3인 팀' }), { team: true }, none)).toBe(true);
    expect(matchesAsk(prog('c'), { team: true }, none)).toBe(false);
    expect(matchesAsk(prog('d', { field: 'ai' }), { fresh: true }, new Set(['ai' as const]))).toBe(false);
    expect(matchesAsk(prog('e', { format: 'online' }), { online: true }, none)).toBe(true);
  });
  it('조건이 여럿이면 모두 맞아야 한다', () => {
    expect(matchesAsk(prog('a', { when: '10.14(수) 19:00', format: 'offline' }), { evening: true, online: true }, none)).toBe(false);
  });
});

describe('upcomingItems', () => {
  it('준비 중 활동의 마감과 끝난 활동의 회고를 올린다', () => {
    const items = upcomingItems([
      act({ id: 'a1', title: '튜터', due: { label: '마감', dday: 0 } }),
      act({ id: 'a2', title: '해커톤', status: 'ended' }),
      act({ id: 'a3', title: '먼 마감', due: { label: '마감', dday: 30 } }),
      act({ id: 'a4', title: '하는 중', status: 'ongoing', due: { label: '마감', dday: 1 } })
    ], [], 1);
    expect(items.map(i => [i.id, i.date, i.kind])).toEqual([['due:a1', PROTOTYPE_TODAY, 'deadline'], ['review:a2', PROTOTYPE_TODAY, 'review']]);
    expect(items.find(i => i.kind === 'review')?.target).toEqual({ path: 'activities/records/interview/a2' });
  });
  it('후보는 마감과 활동 날짜를 올리고 이미 활동이 된 후보는 건너뛴다', () => {
    const items = upcomingItems([act({ id: 'a1', programId: 'p2', status: 'applied' })], [pick('p1', { ddayW1: 2, when: '10.14(수) 18:30' }), pick('p2')], 1);
    expect(items.map(i => [i.id, i.date])).toEqual([['due:p1', '2026-10-15'], ['on:p1', '2026-10-14']].sort((a, b) => a[1].localeCompare(b[1])));
  });
  it('범위와 날짜 읽기', () => {
    expect(upcomingRange(1)).toEqual({ start: PROTOTYPE_TODAY, end: '2026-10-27' });
    expect(upcomingRange(2).start).toBe('2026-10-20');
    expect(whenOffset('10.16(금) 16:00', 1)).toBe(3);
    expect(whenOffset('매주 목', 1)).toBeUndefined();
    expect(upcomingItems([], [pick('p', { ddayW1: -1, when: '10.12' })], 1)).toEqual([]);
  });
});

describe('funnelDrops', () => {
  it('깔때기 개수와 빠진 개수가 맞는다', () => {
    const ctx = { programs: CATALOG.programs, week: 1, time: 3, format: 'any' as const, doneIds: ['p-dataviz'], excluded: ['p-talk'] };
    const d = funnelDrops(ctx);
    const view = buildCandidates({
      catalog: CATALOG, week: 1, profile: { interests: [], time: 3, format: 'any', goal: '', importCS: false }, records: [], confirm: {},
      settings: { discover: true, career: true } as never, choices: { 'p-talk': 'dismissed' }, dislikedFields: [], preferEasier: false, last: null
    });
    const f = view.funnel;
    expect(CATALOG.programs.length - d.pool.length).toBe(f.pool);
    expect(f.pool - d.open.length).toBe(f.open);
    expect(f.open - d.eligible.length).toBe(f.eligible);
    expect(f.eligible - d.fit.length).toBe(f.fit);
    expect(STEP_IDS).toHaveLength(5);
  });
  it('빠진 이유를 말한다', () => {
    const d = funnelDrops({ programs: [prog('late', { ddayW1: -1 }), prog('big', { hours: 6 }), prog('senior', { eligible: false, target: '3학년 이상' })], week: 1, time: 3, format: 'any', doneIds: [], excluded: [] });
    expect(d.open[0].why).toBe('마감이 지났어요');
    expect(d.eligible[0].why).toContain('3학년 이상');
    expect(d.fit[0].why).toContain('3시간');
  });
});

describe('목록 경로와 넘김 값', () => {
  it('list 는 목록-상세, compare 는 옛 주소로 비교 표', () => {
    expect(parseRecommendSub('list')).toEqual({ view: 'list' });
    expect(parseRecommendSub('compare')).toEqual({ view: 'compare' });
  });
  it('넘김 값은 한 번만 읽힌다', () => {
    setListIntent({ select: 'p1' });
    expect(takeListIntent()).toEqual({ select: 'p1' });
    expect(takeListIntent()).toBeUndefined();
  });
});

describe('홈 요약 문장', () => {
  const list = [
    act({ id: 'r', title: '해커톤', status: 'ended', field: 'data' }),
    act({ id: 'd1', title: '튜터', due: { label: '사전 설문 마감 18:00', dday: 0 } }),
    act({ id: 'd2', title: '연수', due: { label: '신청 마감', dday: 5 } }),
    act({ id: 'd3', title: '먼 마감', due: { label: '신청 마감', dday: 20 } }),
    act({ id: 'o', title: '학회', status: 'ongoing', field: 'ai', schedule: '10.13(화) 19:00' })
  ];
  it('오늘 할 일은 회고, 급한 마감, 오늘 활동 순으로 최대 3개', () => {
    const t = todayTasks(list, 1);
    expect(t.map(x => x.id)).toEqual(['review:r', 'due:d1', 'due:d2']);
    expect(t[1].text).toBe('튜터, 사전 설문 마감 18:00');
    expect(t[0].target).toEqual({ path: 'activities/records/interview/r' });
  });
  it('회고를 쓰면 할 일에서 빠진다', () => {
    const t = todayTasks(list.map(a => (a.id === 'r' ? { ...a, status: 'recorded' as const } : a)), 1);
    expect(t.map(x => x.id)).toEqual(['due:d1', 'due:d2', 'today:o']);
  });
  it('타임라인에서 오늘 할 일과 같은 일을 뺀다', () => {
    const tasks = todayTasks(list, 1);
    const items = upcomingItems(list, [], 1);
    expect(withoutTasks(items, tasks).map(i => i.id)).toEqual([]);
    expect(withoutTasks(items, []).length).toBe(items.length);
  });
  it('할 일이 없으면 빈 목록', () => expect(todayTasks([], 1)).toEqual([]));
  it('이번 학기 한 줄', () => {
    expect(semesterLine([])).toContain('아직 없어요');
    expect(semesterLine([act({ status: 'ongoing', field: 'ai' }), act({ status: 'ended', field: 'data' }), act({ status: 'recorded', field: 'data' })])).toBe('이번 학기 활동 3개, 데이터 분야가 가장 많아요.');
    expect(semesterLine([act({ status: 'ongoing', field: 'ai' }), act({ status: 'ended', field: 'data' })])).toBe('이번 학기 활동 2개, 분야가 모두 달라요.');
    expect(semesterLine(list)).toContain('활동 2개');
  });
  it('고른 방법 한 줄', () => {
    expect(pickingLine({ pool: 10, open: 9, eligible: 8, fit: 7, fresh: 6 })).toBe('후보 10개 중 마감·대상·시간을 맞춘 7개예요.');
    expect(pickingLine({ pool: 0, open: 0, eligible: 0, fit: 0, fresh: 0 })).toContain('모집 중인 활동이 아직 없어요');
  });
});
