import { describe, expect, it } from 'vitest';
import { DEFAULT_VISIBILITY } from '../../app/state';
import { rec } from '../fixtures.test-util';
import type { Activity } from '../types';
import { canUseSocial, isSensitive, orderPosts, publicActivities, publicRecords, toggled, validatePost, type RecruitPost } from './index';

const act = (id: string, over: Partial<Activity> = {}): Activity => ({ id, title: id, field: 'dev', status: 'ongoing', schedule: '', ...over });
const open = { ...DEFAULT_VISIBILITY, profilePublic: true };

describe('공개 범위', () => {
  it('비공개면 소셜 기능을 쓸 수 없고 아무것도 보이지 않는다', () => {
    expect(canUseSocial(DEFAULT_VISIBILITY)).toBe(false);
    expect(publicActivities([act('a')], DEFAULT_VISIBILITY)).toEqual([]);
    expect(publicRecords([rec('r')], { ...DEFAULT_VISIBILITY, sharedRecordIds: ['r'] })).toEqual([]);
  });
  it('공개하면 한 활동만 보이고 신청 준비·떨어진 활동은 빠진다', () => {
    const list = [act('a'), act('b', { status: 'ended' }), act('c', { status: 'preparing' }), act('d', { status: 'declined' }), act('e', { status: 'recorded' })];
    expect(publicActivities(list, open).map(a => a.id)).toEqual(['a', 'b', 'e']);
  });
  it('활동마다 뺄 수 있다', () => {
    expect(publicActivities([act('a'), act('b')], { ...open, hiddenActivityIds: ['a'] }).map(a => a.id)).toEqual(['b']);
  });
  it('민감한 활동은 기본으로 빠진다', () => {
    expect(isSensitive({ title: '대학 선교 동아리' })).toBe(true);
    expect(publicActivities([act('a', { title: '정치 토론 동아리' }), act('b')], open).map(a => a.id)).toEqual(['b']);
  });
  it('회고는 고른 것만 보인다', () => {
    expect(publicRecords([rec('a'), rec('b')], { ...open, sharedRecordIds: ['b'] }).map(r => r.id)).toEqual(['b']);
  });
  it('항목을 켜고 끈다', () => {
    expect(toggled(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggled(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('팀원 모집', () => {
  const p = (id: string, opportunityId: string): RecruitPost => ({ id, opportunityId, author: 'x', slots: 1, note: 'n', mine: false });
  it('내가 관심 표시한 기회의 글이 먼저 오고 나머지는 올린 순서를 지킨다', () => {
    expect(orderPosts([p('1', 'a'), p('2', 'b'), p('3', 'a'), p('4', 'c')], ['b', 'c']).map(x => x.id)).toEqual(['2', '4', '1', '3']);
  });
  it('입력을 검사한다', () => {
    expect(validatePost({ opportunityId: '', slots: 2, note: 'x' })).toMatch(/기회/);
    expect(validatePost({ opportunityId: 'a', slots: 0, note: 'x' })).toMatch(/인원/);
    expect(validatePost({ opportunityId: 'a', slots: 2, note: '  ' })).toMatch(/한 줄/);
    expect(validatePost({ opportunityId: 'a', slots: 2, note: 'x'.repeat(61) })).toMatch(/60자/);
    expect(validatePost({ opportunityId: 'a', slots: 2, note: '데이터 분석 같이 해요' })).toBeNull();
  });
});
