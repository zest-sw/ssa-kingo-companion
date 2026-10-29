import { describe, expect, it } from 'vitest';
import { discoveriesOf, discState } from '../discoveries';
import { prog, rec } from '../fixtures.test-util';
import type { Activity } from '../types';
import { relatedRecords, runLog, writeDraft } from './draft';
import { dateLabel, emptyReason, funnelSteps, mostUrgent, needsTeam, overlapsSchedule, parseRecommendSub, prepItemsFor, prepProgress, remainingItems, submitBlockReason, toggleItem } from './flow';
import { dueToday, evidenceRows, homeCounts, interestFlow, semesterLabel } from './home';

describe('parseRecommendSub', () => {
  it('하위 경로를 단계로 바꾼다', () => {
    expect(parseRecommendSub(undefined)).toEqual({ view: 'top' });
    expect(parseRecommendSub('compare')).toEqual({ view: 'compare' });
    expect(parseRecommendSub('prepare/p-chatbot')).toEqual({ view: 'prepare', programId: 'p-chatbot' });
  });
  it('활동 id 가 없거나 모르는 값이면 가장 추천 보기', () => {
    expect(parseRecommendSub('prepare')).toEqual({ view: 'top' });
    expect(parseRecommendSub('x/y')).toEqual({ view: 'top' });
  });
});

describe('신청 준비 체크리스트', () => {
  const plain = prog('plain', { title: '특강', level: 1 });
  const team = prog('team', { title: '데이터 해커톤', level: 2 });

  it('에이전트가 한 일은 끝난 채, 내가 할 일은 남은 채로 시작한다', () => {
    const items = prepItemsFor(plain, 1);
    expect(items.filter(i => i.by === 'agent').every(i => i.done)).toBe(true);
    expect(remainingItems(items).map(i => i.id)).toEqual(['draft']);
  });

  it('팀 활동과 2단계 이상이면 항목이 늘어난다', () => {
    expect(needsTeam(team)).toBe(true);
    expect(needsTeam(plain)).toBe(false);
    expect(remainingItems(prepItemsFor(team, 1)).map(i => i.id)).toEqual(['team', 'draft', 'survey']);
  });

  it('내가 할 항목만 토글되고 에이전트 항목은 그대로다', () => {
    const items = prepItemsFor(plain, 1);
    expect(toggleItem(items, 'draft').find(i => i.id === 'draft')?.done).toBe(true);
    expect(toggleItem(items, 'target')).toEqual(items);
    const twice = toggleItem(toggleItem(items, 'draft'), 'draft');
    expect(twice).toEqual(items);
  });

  it('진행도는 끝낸 개수와 전체', () => {
    expect(prepProgress(toggleItem(prepItemsFor(plain, 1), 'draft'))).toEqual({ done: 3, total: 3 });
  });

  it('남은 준비가 있으면 승인이 막히고 이유를 준다', () => {
    const items = prepItemsFor(team, 1);
    expect(submitBlockReason(items, true)).toBe('남은 준비 3개를 끝내면 누를 수 있어요');
    expect(submitBlockReason(items, false)).toBe('신청서 초안을 쓰는 중이에요');
    const done = ['team', 'draft', 'survey'].reduce(toggleItem, items);
    expect(submitBlockReason(done, true)).toBeUndefined();
  });

  it('가장 급한 것은 마감이 가장 빠른 남은 항목', () => {
    const items = prepItemsFor(prog('t', { title: '해커톤', ddayW1: 5, level: 2 }), 1);
    expect(mostUrgent(items)?.id).toBe('team');
    expect(mostUrgent(['team', 'draft', 'survey'].reduce(toggleItem, items))).toBeUndefined();
  });

  it('마감이 지나도 남은 날은 0 아래로 내려가지 않는다', () => {
    expect(prepItemsFor(prog('x', { ddayW1: -3 }), 1).every(i => (i.dday ?? 0) >= 0)).toBe(true);
  });
});

describe('겹침·날짜·고른 방법', () => {
  const act = (over: Partial<Activity>): Activity => ({ id: 'a', title: 't', field: 'research', status: 'preparing', schedule: '10.14(수)', ...over });
  it('준비·신청 중인 다른 활동과 일정이 같을 때만 겹친다', () => {
    const p = prog('p', { when: '10.14(수)' });
    expect(overlapsSchedule(p, [act({})])).toBe(true);
    expect(overlapsSchedule(p, [act({ status: 'ongoing' })])).toBe(false);
    expect(overlapsSchedule(p, [act({ programId: 'p' })])).toBe(false);
  });
  it('남은 날을 날짜로 바꾼다', () => {
    expect(dateLabel(2)).toBe('10월 15일');
    expect(dateLabel(0, 2)).toBe('10월 20일');
  });
  it('고른 방법은 다섯 단계 개수를 그대로 낸다', () => {
    const s = funnelSteps({ pool: 10, open: 9, eligible: 8, fit: 5, fresh: 3 });
    expect(s.map(x => x.count)).toEqual([10, 9, 8, 5, 3]);
  });
});

describe('emptyReason', () => {
  const f = { pool: 5, open: 5, eligible: 5, fit: 5, fresh: 0 };
  it('처음 0이 되는 단계를 짚는다', () => {
    expect(emptyReason({ ...f, pool: 0, open: 0, eligible: 0, fit: 0 })).toContain('모집 중인 활동이 없어요');
    expect(emptyReason({ ...f, eligible: 0, fit: 0 })).toContain('신청할 수 있는');
    expect(emptyReason({ ...f, fit: 0 })).toContain('시간·방식');
    expect(emptyReason(f)).toContain('나중에 보기');
  });
});

describe('신청서 초안', () => {
  const records = [rec('a', { field: 'research', quote: '다시 물어보니 달라졌다', title: '인터뷰 과제', energy: 'up' }), rec('b', { field: 'club', did: 'make' })];
  it('같은 분야 기록을 근거로 삼고 없는 경험은 쓰지 않는다', () => {
    const p = prog('p', { field: 'research', did: ['listen'], title: '워크숍' });
    expect(relatedRecords(p, records).map(r => r.id)).toEqual(['a']);
    const d = writeDraft(p, records, '서비스 기획 직무');
    expect(d.motivation).toContain('인터뷰 과제');
    expect(d.motivation).toContain('서비스 기획 직무를 목표로');
  });
  it('관련 기록이 없으면 분야를 경험하고 싶다는 문장만 쓴다', () => {
    const d = writeDraft(prog('p', { field: 'data', did: ['make'] }), [], '');
    expect(d.related).toEqual([]);
    expect(d.motivation).toContain('직접 경험해 보고 싶습니다');
  });
  it('고쳐 달라고 하면 문장이 달라진다', () => {
    const p = prog('p');
    expect(writeDraft(p, records, '', 1).motivation).not.toBe(writeDraft(p, records, '', 0).motivation);
  });
  it('실행 기록에는 못 한 일도 남는다', () => {
    expect(runLog(false, false).every(l => l.ok)).toBe(true);
    expect(runLog(true, true).filter(l => !l.ok)).toHaveLength(2);
  });
});

describe('홈 계산', () => {
  const a = (status: Activity['status'], due?: Activity['due']): Activity => ({ id: status + String(due?.dday), title: 't', field: 'dev', status, schedule: '', due });
  const records = [
    rec('1', { did: 'listen', energy: 'up', axes: ['communication'], semester: '2026-2' }),
    rec('2', { did: 'listen', energy: 'up', axes: ['communication', 'problem'], semester: '2026-1', verification: 'school' }),
    rec('3', { field: 'dev', axes: [], semester: '2026-여름' })
  ];
  const discoveries = discoveriesOf(records);

  it('숫자 4개는 활동·발견 상태에서 계산한다', () => {
    const acts = [a('ongoing'), a('ended'), a('recorded'), a('preparing'), a('declined')];
    const c = homeCounts(acts, 3, discoveries, d => discState(d, {}));
    expect(c).toEqual({ semesterActivities: 3, reviewWaiting: 1, newRecommend: 3, toConfirm: 1 });
  });
  it('확인한 발견은 확인할 발견에서 빠지고 바뀐 근거는 다시 센다', () => {
    expect(homeCounts([], 0, discoveries, () => 'yes').toConfirm).toBe(0);
    expect(homeCounts([], 0, discoveries, () => 'changed').toConfirm).toBe(1);
  });

  it('역량 근거: 학교 확인이나 맞다고 한 발견의 기록은 채운 점, 나머지는 AI 추정', () => {
    const before = evidenceRows(records, discoveries, () => 'none');
    expect(before.find(r => r.axis === 'communication')?.dots.map(d => d.state)).toEqual(['estimated', 'confirmed']);
    const after = evidenceRows(records, discoveries, () => 'yes');
    expect(after.find(r => r.axis === 'communication')?.dots.every(d => d.state === 'confirmed')).toBe(true);
    expect(after.find(r => r.axis === 'creative')?.dots).toEqual([]);
  });

  it('관심 흐름은 학기 순서로 분야 묶음 개수를 센다', () => {
    const flow = interestFlow(records);
    expect(flow.map(f => f.label)).toEqual(['26-1', '26 여름', '26-2']);
    expect(flow[1].groups).toEqual([{ group: 'dev', count: 1 }]);
    expect(semesterLabel('2026-2')).toBe('26-2');
    expect(interestFlow([])).toEqual([]);
  });

  it('오늘 마감인 준비 중 활동만 오늘 칩에 쓴다', () => {
    expect(dueToday([a('preparing', { label: 'x', dday: 3 })])).toBeUndefined();
    expect(dueToday([a('preparing', { label: 'x', dday: 0 })])?.due?.label).toBe('x');
    expect(dueToday([a('applied', { label: 'x', dday: 0 })])).toBeUndefined();
  });
});
