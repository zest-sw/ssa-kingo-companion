import { describe, expect, it } from 'vitest';
import type { Activity } from '../../domain/types';
import { canQuit, dueText, dueView, metaView, quitPatch } from './helpers';

const a = (over: Partial<Activity> = {}): Activity => ({ id: 'a', title: 't', field: 'dev', status: 'preparing', schedule: '11월부터 매주', ...over });

describe('마감 표시', () => {
  it('신청 마감은 앞의 신청을 떼고 D-day 를 붙인다', () => {
    expect(dueText({ label: '신청 마감', dday: 5 })).toBe('마감 D-5');
    expect(dueText({ label: '결과 발표', dday: 2 })).toBe('결과 발표 D-2');
  });
  it('오늘이면 배지 분기, 아니면 글', () => {
    expect(dueView({ label: '사전 설문 마감 18:00', dday: 0 })).toEqual({ kind: 'today', label: '사전 설문 마감 18:00' });
    expect(dueView({ label: '신청 마감', dday: 1 })).toEqual({ kind: 'text', text: '마감 D-1' });
  });
});

describe('metaView', () => {
  it('준비와 마감을 · 로 잇는다', () => {
    expect(metaView(a({ prep: { done: 2, total: 3 }, due: { label: '신청 마감', dday: 5 } }))).toEqual({ kind: 'text', text: '준비 2/3 · 마감 D-5' });
  });
  it('오늘 마감이면 준비 개수는 빼고 오늘 배지만', () => {
    expect(metaView(a({ prep: { done: 0, total: 1 }, due: { label: '사전 설문 마감 18:00', dday: 0 } }))).toEqual({ kind: 'today', label: '사전 설문 마감 18:00' });
  });
  it('마감도 준비도 없으면 일정', () => {
    expect(metaView(a())).toEqual({ kind: 'text', text: '11월부터 매주' });
    expect(metaView(a({ prep: { done: 1, total: 2 } }))).toEqual({ kind: 'text', text: '준비 1/2' });
  });
});

describe('그만두기', () => {
  it('끝난 것(이번엔 안 됨)으로 옮기고 마감·준비를 비운다', () => {
    const next = { ...a({ prep: { done: 1, total: 2 }, due: { label: '신청 마감', dday: 3 } }), ...quitPatch() };
    expect(next).toMatchObject({ status: 'declined', schedule: '직접 그만뒀어요', due: undefined, prep: undefined });
  });
  it('기록됐거나 이미 안 된 활동은 그만둘 수 없다', () => {
    expect(canQuit(a())).toBe(true);
    expect(canQuit(a({ status: 'ongoing' }))).toBe(true);
    expect(canQuit(a({ status: 'recorded' }))).toBe(false);
    expect(canQuit(a({ status: 'declined' }))).toBe(false);
  });
});
