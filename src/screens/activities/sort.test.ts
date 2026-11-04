import { describe, expect, it } from 'vitest';
import type { Activity } from '../../domain/types';
import { listGroups } from './sort';

const a = (id: string, over: Partial<Activity> = {}): Activity => ({ id, title: id, field: 'dev', status: 'preparing', schedule: '', ...over });
const ids = (l: Activity[]) => l.map(x => x.id);

describe('listGroups', () => {
  const list = [
    a('x'), a('far', { due: { label: '마감', dday: 9 } }), a('today', { due: { label: '마감', dday: 0 } }), a('y'),
    a('late', { status: 'ongoing', schedule: '10월 5일 ~ 12월 1일' }), a('early', { status: 'ongoing', schedule: '9월 4일 ~ 12월 10일' }), a('undated', { status: 'ongoing' }),
    a('rec', { status: 'recorded' }), a('retro', { status: 'ended' }), a('no', { status: 'declined' })
  ];
  const g = listGroups(list);
  it('보드와 같은 세 칸 이름으로 묶는다', () => expect(g.map(x => x.label)).toEqual(['할 것', '하는 중', '끝난 것']));
  it('할 것: 가까운 마감 먼저, 마감 없는 활동은 뒤에 입력 순서대로', () => expect(ids(g[0].items)).toEqual(['today', 'far', 'x', 'y']));
  it('하는 중: 시작이 이른 순, 날짜 없는 활동은 뒤', () => expect(ids(g[1].items)).toEqual(['early', 'late', 'undated']));
  it('끝난 것: 회고 대기가 먼저, 떨어진 신청도 여기에 둔다', () => expect(ids(g[2].items)).toEqual(['retro', 'rec', 'no']));
  it('원본을 바꾸지 않는다', () => {
    expect(ids(list)[0]).toBe('x');
  });
});
