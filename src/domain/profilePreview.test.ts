import { describe, expect, it } from 'vitest';
import { DEFAULT_VISIBILITY } from '../app/state';
import { rec } from './fixtures.test-util';
import { friendsCount, hallCount, profilePreview, recruitCount } from './profilePreview';
import type { Activity } from './types';

const act = (id: string, over: Partial<Activity> = {}): Activity => ({ id, title: id, field: 'dev', status: 'ongoing', schedule: '', ...over });
const open = { ...DEFAULT_VISIBILITY, profilePublic: true };

describe('친구에게 보이는 프로필 미리보기', () => {
  it('비공개면 나만 본다고 말하고, 카드는 공개했을 때 모습으로 미리 계산한다', () => {
    const p = profilePreview([act('a')], [rec('r')], { ...DEFAULT_VISIBILITY, sharedRecordIds: ['r'] });
    expect(p.open).toBe(false);
    expect(p.status).toBe('나만 봐요');
    expect(p.card.activityCount).toBe(1);
    expect(p.card.records.map(r => r.id)).toEqual(['r']);
  });
  it('공개하면 한 활동 수와 고른 회고만 보이고, 숨긴 것은 한 줄씩 남는다', () => {
    const acts = [act('a'), act('b'), act('c', { status: 'preparing' }), act('d', { title: '대학 선교 동아리' })];
    const recs = [rec('r1', { title: '첫 기록' }), rec('r2'), rec('r3')];
    const p = profilePreview(acts, recs, { ...open, hiddenActivityIds: ['b'], sharedRecordIds: ['r1'] });
    expect(p.status).toBe('친구에게만 보여요');
    expect(p.card.activityCount).toBe(1);
    expect(p.card.records).toEqual([{ id: 'r1', title: '첫 기록', field: 'research' }]);
    expect(p.card.hidden).toEqual(['뺀 활동 1개', '민감한 활동 1개', '고르지 않은 회고 2개', '발견과 역량 근거']);
  });
  it('회고는 limit 장까지 그리고 나머지는 수로 센다', () => {
    const recs = ['a', 'b', 'c', 'd'].map(id => rec(id));
    const p = profilePreview([], recs, { ...open, sharedRecordIds: ['a', 'b', 'c', 'd'] }, 2);
    expect(p.card.records.map(r => r.id)).toEqual(['a', 'b']);
    expect(p.card.moreRecords).toBe(2);
    expect(p.card.hidden).toEqual(['발견과 역량 근거']);
  });
  it('발견·역량 근거는 미리보기 값에 들어오지 않는다', () => {
    const p = profilePreview([], [rec('a', { axes: ['problem'], confirmedAxes: ['problem'] })], { ...open, sharedRecordIds: ['a'] });
    expect(Object.keys(p.card.records[0])).toEqual(['id', 'title', 'field']);
  });
});

describe('함께하기 행 숫자', () => {
  it('행마다 숫자 하나, 새 요청이 먼저', () => {
    expect(friendsCount(6, 1)).toBe('요청 1');
    expect(friendsCount(6, 0)).toBe('친구 6');
    expect(friendsCount(0, 0)).toBe('친구 찾기');
    expect(recruitCount([{ mine: true }, { mine: false }])).toBe('내 글 1');
    expect(recruitCount([{ mine: false }])).toBe('모집 글 1');
    expect(recruitCount([])).toBe('첫 글 쓰기');
    expect(hallCount(4)).toBe('4명');
    expect(hallCount(0)).toBe('아직 없어요');
  });
});
