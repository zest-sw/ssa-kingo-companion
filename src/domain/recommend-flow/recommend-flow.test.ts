import { describe, expect, it } from 'vitest';
import { dismissEffect } from '../candidates';
import { discoveriesOf, discState } from '../discoveries';
import { prog, rec } from '../fixtures.test-util';
import type { Activity, CandidateChoice } from '../types';
import { relatedRecords, runLog, writeDraft } from './draft';
import {
  candidateHref, checksOf, clockLabel, dateLabel, effectiveChoices, emptyReason, formatText, funnelSteps, isNearDeadline, laterDateLabel, laterUntilDay, mostUrgent,
  needsTeam, overlapsSchedule, parseRecommendSub, plainText, prepItemsFor, prepProgress, remainingItems, submitBlockReason, submitPatch, toggleInterest, toggleItem
} from './flow';
import { dueToday, evidenceRows, homeCounts, interestFlow, pendingDiscovery, semesterLabel, weeklyItems } from './home';

const T0 = '21:38';
const T1 = '21:45';

describe('parseRecommendSub', () => {
  it('하위 경로를 단계로 바꾼다', () => {
    expect(parseRecommendSub(undefined)).toEqual({ view: 'top' });
    expect(parseRecommendSub('compare')).toEqual({ view: 'compare' });
    expect(parseRecommendSub('prepare/p-chatbot')).toEqual({ view: 'prepare', programId: 'p-chatbot' });
  });
  it('활동 id 하나만 있으면 그 후보를 연 가장 추천 보기', () => {
    expect(parseRecommendSub('p-chatbot')).toEqual({ view: 'top', programId: 'p-chatbot' });
    expect(candidateHref('p-chatbot')).toBe('recommend/p-chatbot');
  });
  it('prepare 만 있고 활동 id 가 없으면 가장 추천 보기', () => {
    expect(parseRecommendSub('prepare')).toEqual({ view: 'top' });
  });
});

describe('관심 분야 토글', () => {
  it('최대 3개까지만 고른다', () => {
    expect(toggleInterest(['data', 'ai', 'dev'], 'research')).toEqual(['data', 'ai', 'dev']);
    expect(toggleInterest(['data', 'ai'], 'research')).toEqual(['data', 'ai', 'research']);
  });
  it('이미 고른 것을 누르면 뺀다', () => {
    expect(toggleInterest(['data', 'ai'], 'data')).toEqual(['ai']);
  });
  it('아직 모르겠어요는 다른 것과 같이 못 고른다', () => {
    expect(toggleInterest(['data', 'ai'], 'unknown')).toEqual(['unknown']);
    expect(toggleInterest(['unknown'], 'data')).toEqual(['data']);
    expect(toggleInterest(['unknown'], 'unknown')).toEqual([]);
  });
});

describe('신청 준비 체크리스트', () => {
  const plain = prog('plain', { title: '특강', level: 1 });
  const team = prog('team', { title: '데이터 해커톤', level: 2 });

  it('에이전트가 한 일은 시작한 시각으로 끝난 채, 내가 할 일은 남은 채로 시작한다', () => {
    const items = prepItemsFor(plain, 1, T0);
    const agent = items.filter(i => i.by === 'agent');
    expect(agent.every(i => i.done && i.at === T0)).toBe(true);
    expect(remainingItems(items).map(i => i.id)).toEqual(['draft']);
  });

  it('팀 활동과 2단계 이상이면 항목이 늘어난다', () => {
    expect(needsTeam(team)).toBe(true);
    expect(needsTeam(plain)).toBe(false);
    expect(remainingItems(prepItemsFor(team, 1, T0)).map(i => i.id)).toEqual(['team', 'draft', 'survey']);
  });

  it('내가 할 항목은 토글되고 끝낸 시각이 남는다. 다시 누르면 시각이 지워진다', () => {
    const items = prepItemsFor(plain, 1, T0);
    const on = toggleItem(items, 'draft', T1).find(i => i.id === 'draft');
    expect(on).toMatchObject({ done: true, at: T1 });
    const off = toggleItem(toggleItem(items, 'draft', T1), 'draft', T1).find(i => i.id === 'draft');
    expect(off?.done).toBe(false);
    expect(off?.at).toBeUndefined();
  });

  it('에이전트 항목과 없는 id 는 토글해도 그대로다', () => {
    const items = prepItemsFor(plain, 1, T0);
    expect(toggleItem(items, 'target', T1)).toEqual(items);
    expect(toggleItem(items, 'nothing', T1)).toEqual(items);
  });

  it('진행도는 끝낸 개수와 전체', () => {
    expect(prepProgress(toggleItem(prepItemsFor(plain, 1, T0), 'draft', T1))).toEqual({ done: 3, total: 3 });
  });

  it('마감이 지나도 남은 날은 0 아래로 내려가지 않는다', () => {
    expect(prepItemsFor(prog('x', { ddayW1: -3 }), 1, T0).every(i => (i.dday ?? 0) >= 0)).toBe(true);
  });
});

describe('submitBlockReason · 승인 게이트', () => {
  const p = prog('p', { title: '특강' });
  const items = prepItemsFor(p, 1, T0);
  const done = toggleItem(items, 'draft', T1);

  it('활동이 없으면 먼저 신청 준비를 하라고 알린다(주소로 바로 연 경우)', () => {
    expect(submitBlockReason(done, true, undefined)).toContain('신청 준비');
  });
  it('이미 신청했거나 진행 중인 활동은 다시 신청하지 못한다', () => {
    for (const s of ['applied', 'ongoing', 'ended', 'recorded', 'declined'] as const) expect(submitBlockReason(done, true, s)).toBe('이미 신청했어요');
  });
  it('초안을 쓰는 중이면 막는다', () => {
    expect(submitBlockReason(done, false, 'preparing')).toBe('신청서 초안을 쓰는 중이에요');
  });
  it('남은 준비 개수를 알리며 막는다', () => {
    expect(submitBlockReason(items, true, 'preparing')).toBe('남은 준비 1개를 끝내면 누를 수 있어요');
  });
  it('준비 상태이고 다 끝났고 초안이 있으면 연다', () => {
    expect(submitBlockReason(done, true, 'preparing')).toBeUndefined();
  });
  it('활동 상태 검사가 다른 사유보다 먼저다', () => {
    expect(submitBlockReason(done, false, undefined)).toContain('신청 준비');
  });
});

describe('mostUrgent', () => {
  it('남은 항목 중 마감이 가장 빠른 것', () => {
    const items = prepItemsFor(prog('t', { title: '해커톤', ddayW1: 5, level: 2 }), 1, T0);
    expect(mostUrgent(items)?.id).toBe('team');
  });
  it('마감이 같으면 목록 앞의 것, 모두 끝나면 없다', () => {
    const items = prepItemsFor(prog('t', { title: '해커톤', ddayW1: 5, level: 2 }), 1, T0);
    expect(mostUrgent(items)?.dday).toBe(4);
    expect(mostUrgent(['team', 'draft', 'survey'].reduce((acc, id) => toggleItem(acc, id, T1), items))).toBeUndefined();
  });
  it('마감이 없는 항목은 뒤로 간다', () => {
    const items = prepItemsFor(prog('t'), 1, T0).map(i => (i.id === 'draft' ? { ...i, dday: undefined } : i));
    expect(mostUrgent(items)?.id).toBe('draft');
  });
});

describe('겹침·확인·마감 임박', () => {
  const act = (over: Partial<Activity>): Activity => ({ id: 'a', title: 't', field: 'research', status: 'preparing', schedule: '10.14(수)', ...over });
  const p = prog('p', { when: '10.14(수)' });

  it('준비·신청 중인 다른 활동과 일정이 같을 때만 겹친다', () => {
    expect(overlapsSchedule(p, [act({})])).toBe(true);
    expect(overlapsSchedule(p, [act({ status: 'applied' })])).toBe(true);
    expect(overlapsSchedule(p, [act({ status: 'ongoing' })])).toBe(false);
    expect(overlapsSchedule(p, [act({ programId: 'p' })])).toBe(false);
  });

  it('신청하면 일정 문자열을 그대로 둬서 겹침 판정이 원래 기간을 계속 쓴다', () => {
    const other = prog('other', { when: '10.14(수)', title: '특강' });
    const t = submitPatch(other, prepItemsFor(other, 1, T0));
    expect(t.status).toBe('applied');
    expect(t.patch.schedule).toBe('10.14(수)');
    expect(overlapsSchedule(p, [act({ programId: 'other', status: t.status, ...t.patch })])).toBe(true);
  });

  it('신청 전이는 마감을 비우고 준비 진행도를 남긴다', () => {
    const items = toggleItem(prepItemsFor(p, 1, T0), 'draft', T1);
    expect(submitPatch(p, items).patch).toEqual({ prep: { done: 3, total: 3 }, due: undefined, schedule: '10.14(수)' });
  });

  it('checksOf 는 대상·겹침·팀을 한 번에 낸다', () => {
    expect(checksOf(p, [])).toEqual({ eligible: true, overlap: false, team: false });
    expect(checksOf(prog('t', { title: '해커톤', eligible: false, when: '10.14(수)' }), [act({})])).toEqual({ eligible: false, overlap: true, team: true });
  });

  it('마감 임박은 3일 안', () => {
    expect(isNearDeadline(0)).toBe(true);
    expect(isNearDeadline(3)).toBe(true);
    expect(isNearDeadline(4)).toBe(false);
  });
});

describe('날짜·고른 방법·시각', () => {
  it('남은 날을 날짜로 바꾼다', () => {
    expect(dateLabel(2)).toBe('10월 15일');
    expect(dateLabel(0, 2)).toBe('10월 20일');
  });
  it('시각은 두 자리로', () => {
    expect(clockLabel(new Date(2026, 9, 13, 9, 5))).toBe('09:05');
  });
  it('고른 방법은 다섯 단계 개수를 그대로 낸다', () => {
    expect(funnelSteps({ pool: 10, open: 9, eligible: 8, fit: 5, fresh: 3 }).map(x => x.count)).toEqual([10, 9, 8, 5, 3]);
  });
  it('예시 꼬리표를 화면에서 뺀다', () => {
    expect(plainText('학생성장 비교과 (예시)')).toBe('학생성장 비교과');
    expect(plainText('온라인')).toBe('온라인');
    expect(formatText(prog('o', { format: 'offline', place: '인문사회과학캠퍼스 (예시)' }))).toEqual({ main: '직접 만나서', sub: '인문사회과학캠퍼스' });
    expect(formatText(prog('o', { format: 'online' }))).toEqual({ main: '온라인' });
  });
});

describe('나중에 보기 만료', () => {
  const choices: Record<string, CandidateChoice> = { a: 'later', b: 'later', c: 'dismissed', d: 'preparing', e: 'later' };
  const until = { a: laterUntilDay(1, 1), b: laterUntilDay(1, 7) };

  it('1주차에는 고른 날이 아직 안 와서 모두 숨긴다', () => {
    expect(effectiveChoices(choices, until, 1)).toEqual(choices);
  });
  it('주차가 지나 고른 날이 되면 다시 후보에 나온다', () => {
    const out = effectiveChoices(choices, until, 2);
    expect(out.a).toBeUndefined();
    expect(out.b).toBeUndefined();
    expect(out).toEqual({ c: 'dismissed', d: 'preparing', e: 'later' });
  });
  it('날짜를 안 골랐으면 계속 숨기고, 관심 없음·신청 준비는 건드리지 않는다', () => {
    expect(effectiveChoices(choices, until, 5)).toEqual({ c: 'dismissed', d: 'preparing', e: 'later' });
  });
  it('고른 날 번호와 날짜 표시', () => {
    expect(laterUntilDay(1, 3)).toBe(3);
    expect(laterUntilDay(2, 1)).toBe(8);
    expect(laterDateLabel(3)).toBe('10월 16일');
  });
});

describe('관심 없음 사유별 효과', () => {
  const p = prog('p', { field: 'data' });
  it('분야 사유는 그 분야를 덜 추천한다', () => expect(dismissEffect('field', p)).toEqual({ dislikedField: 'data' }));
  it('어려움 사유는 입문 선호로 바꾼다', () => expect(dismissEffect('hard', p)).toEqual({ preferEasier: true }));
  it('시간·이미 함 사유는 이 활동만 뺀다', () => {
    expect(dismissEffect('time', p)).toEqual({});
    expect(dismissEffect('done', p)).toEqual({});
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
});

describe('실행 기록', () => {
  const p = prog('p', { title: '해커톤', level: 2 });
  it('항목이 실행된(체크한) 시각을 쓴다', () => {
    const items = toggleItem(prepItemsFor(p, 1, T0), 'draft', T1);
    const log = runLog(items, '21:40');
    expect(log.find(l => l.text.includes('신청 대상'))?.time).toBe(T0);
    expect(log.find(l => l.text.includes('초안을 썼어요'))?.time).toBe('21:40');
    expect(log.find(l => l.text.includes('신청서 초안 확인'))?.time).toBe(T1);
  });
  it('못 한 일은 시작한 시각에 남고 끝내면 사라진다', () => {
    const items = prepItemsFor(p, 1, T0);
    const fails = runLog(items).filter(l => !l.ok);
    expect(fails.map(l => l.time)).toEqual([T0, T0]);
    const after = ['team', 'survey'].reduce((acc, id) => toggleItem(acc, id, T1), items);
    expect(runLog(after).some(l => !l.ok)).toBe(false);
  });
  it('초안을 다 쓰기 전에는 초안 줄이 없고 시각 순서로 정렬된다', () => {
    const log = runLog(toggleItem(prepItemsFor(prog('q'), 1, T0), 'draft', T1));
    expect(log.some(l => l.text.includes('초안을 썼어요'))).toBe(false);
    expect(log.map(l => l.time)).toEqual([...log.map(l => l.time)].sort());
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
    expect(homeCounts(acts, 3, discoveries, d => discState(d, {}))).toEqual({ semesterActivities: 3, reviewWaiting: 1, newRecommend: 3, toConfirm: 1 });
  });
  it('확인한 발견은 확인할 발견에서 빠지고 바뀐 근거는 다시 센다', () => {
    expect(homeCounts([], 0, discoveries, () => 'yes').toConfirm).toBe(0);
    expect(homeCounts([], 0, discoveries, () => 'changed').toConfirm).toBe(1);
  });

  it('확인할 발견 하나는 확인 전·근거 바뀜인 첫 발견', () => {
    expect(pendingDiscovery(discoveries, () => 'none')?.did).toBe('listen');
    expect(pendingDiscovery(discoveries, () => 'changed')?.did).toBe('listen');
    expect(pendingDiscovery(discoveries, () => 'yes')).toBeUndefined();
    expect(pendingDiscovery(discoveries, () => 'no')).toBeUndefined();
    expect(pendingDiscovery([], () => 'none')).toBeUndefined();
  });

  it('이번 주 추천 줄은 가장 추천 뒤에 대안을 잇는다', () => {
    const s = (id: string) => ({ p: prog(id), score: 0, reasons: [] });
    expect(weeklyItems(s('a'), [s('b'), s('c')]).map(x => x.p.id)).toEqual(['a', 'b', 'c']);
    expect(weeklyItems(undefined, [s('b')])).toEqual([]);
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
