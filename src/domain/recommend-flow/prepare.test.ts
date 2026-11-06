import { describe, expect, it } from 'vitest';
import { prog } from '../fixtures.test-util';
import type { Activity } from '../types';
import { prepItemsFor } from './flow';
import { agentLog, agentSummary, markChanged, parsePrepMemory, primaryAction, PRIMARY_LABEL, resumeStep, sentences } from './prepare';

const T0 = '21:38';

describe('parsePrepMemory', () => {
  it('맞는 모양만 되살린다', () => {
    expect(parsePrepMemory({ step: 'draft', revisions: [{ kind: 'shorter' }], sent: true })).toEqual({ step: 'draft', revisions: [{ kind: 'shorter' }], sent: true });
    expect(parsePrepMemory({ step: 'nope' })).toBeUndefined();
    expect(parsePrepMemory(null)).toBeUndefined();
  });
  it('틀린 고친 요청은 버리고 나머지는 살린다', () => {
    expect(parsePrepMemory({ step: 'apply', revisions: [{ kind: 'x' }, { kind: 'other', note: '팀장' }, 3] })).toEqual({ step: 'apply', revisions: [{ kind: 'other', note: '팀장' }], sent: false });
  });
});

describe('resumeStep', () => {
  const items = prepItemsFor(prog('p'), 1, T0);
  it('시작 전이면 늘 준비할 것', () => {
    expect(resumeStep({ step: 'apply', revisions: [], sent: false }, items, false)).toBe('todo');
  });
  it('남겨 둔 단계로 돌아간다', () => {
    expect(resumeStep({ step: 'draft', revisions: [], sent: false }, items, true)).toBe('draft');
  });
  it('남긴 게 없으면 초안을 확인한 활동은 신청 단계부터', () => {
    expect(resumeStep(undefined, items, true)).toBe('todo');
    expect(resumeStep(undefined, items.map(i => (i.id === 'draft' ? { ...i, done: true } : i)), true)).toBe('apply');
  });
});

describe('primaryAction', () => {
  it('주 버튼은 단계마다 이름만 바뀐다', () => {
    expect(primaryAction('todo', false, false)).toBe('start');
    expect(primaryAction('todo', true, false)).toBe('toDraft');
    expect(primaryAction('draft', true, false)).toBe('toApply');
    expect(primaryAction('apply', true, false)).toBe('openSite');
    expect(primaryAction('apply', true, true)).toBe('confirmSent');
  });
  it('신청 버튼은 학교 사이트에서 직접 한다는 걸 이름에 담는다', () => {
    expect(PRIMARY_LABEL.openSite).toContain('학교 사이트');
  });
});

describe('agentSummary', () => {
  const p = prog('p', { title: '데이터 해커톤', when: '11월 1일', level: 2 });
  const items = prepItemsFor(p, 1, T0);
  it('확인한 것을 한 줄로 말한다', () => {
    expect(agentSummary(p, [], 1, items).text).toBe('신청 대상, 일정 겹침, 팀 구성, 준비할 것 3개를 확인했어요');
    expect(agentSummary(p, [], 1, items).warn).toBeUndefined();
  });
  it('일정이 겹치면 따로 짚는다', () => {
    const busy: Activity = { id: 'a', title: '다른 활동', field: 'dev', status: 'preparing', schedule: '11월 1일', programId: 'q' } as Activity;
    expect(agentSummary(p, [busy], 1, items).warn).toBe('내 일정과 겹쳐요');
    expect(agentLog(p, [busy], 1, items).some(l => !l.ok && l.text === '내 일정과 겹쳐요')).toBe(true);
  });
  it('펼친 기록에 같은 말을 두 번 쓰지 않는다', () => {
    const texts = agentLog(p, [], 1, items).map(l => l.text);
    expect(texts).toContain('신청 대상이에요');
    expect(texts).not.toContain('신청 대상을 확인했어요');
  });
});

describe('markChanged', () => {
  it('문장으로 자른다', () => {
    expect(sentences('하나입니다. 둘입니다.  셋?')).toEqual(['하나입니다.', '둘입니다.', '셋?']);
  });
  it('고치기 전에 없던 문장만 표시한다', () => {
    expect(markChanged('가입니다. 나입니다.', '가입니다. 다입니다.')).toEqual([{ text: '가입니다.', changed: false }, { text: '다입니다.', changed: true }]);
  });
  it('처음 쓴 초안은 바뀐 것이 없다', () => {
    expect(markChanged(undefined, '가입니다.').every(s => !s.changed)).toBe(true);
  });
});
