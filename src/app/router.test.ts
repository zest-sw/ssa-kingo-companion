import { describe, expect, it } from 'vitest';
import { movedPath, NAV, navMatch, parentLink, parseHash } from './router';

describe('메뉴 트리', () => {
  it('메인 5개, 하위 9개', () => {
    expect(NAV.map(n => n.label)).toEqual(['홈', '추천', '내 활동', '나의 분석', '프로필']);
    expect(NAV.flatMap(n => n.children ?? []).length).toBe(9);
  });
  it('하위 경로는 부모 경로 아래에 있다', () => {
    for (const n of NAV) for (const c of n.children ?? []) expect(c.path.startsWith(n.path + '/')).toBe(true);
  });
  it('지금 위치: 하위 화면, 흐름 화면, 메인 화면', () => {
    expect(navMatch(parseHash('#/analysis/map'))).toMatchObject({ item: { id: 'analysis' }, child: { path: 'analysis/map' }, exact: true });
    expect(navMatch(parseHash('#/activities/records/interview/a-1'))).toMatchObject({ item: { id: 'activities' }, child: { path: 'activities/records' }, exact: false });
    expect(navMatch(parseHash('#/recommend/prepare/p-ai'))).toMatchObject({ item: { id: 'recommend' }, child: undefined, exact: false });
    expect(navMatch(parseHash('#/profile'))).toMatchObject({ item: { id: 'profile' }, child: undefined, exact: true });
    expect(navMatch(parseHash('#/settings/data')).item).toBeUndefined();
  });
  it('빵부스러기 첫 칸', () => {
    expect(parentLink('activities/records')).toEqual({ label: '기록', href: '#/activities/records' });
    expect(parentLink('recommend')).toEqual({ label: '추천', href: '#/recommend' });
  });
});

describe('parseHash', () => {
  it('화면 이름과 하위 경로를 나눈다', () => {
    expect(parseHash('#/analysis/techtree')).toEqual({ name: 'analysis', sub: 'techtree' });
    expect(parseHash('#/activities/records/interview/a-hackathon')).toEqual({ name: 'activities', sub: 'records/interview/a-hackathon' });
    expect(parseHash('#/profile')).toEqual({ name: 'profile', sub: undefined });
    expect(parseHash('#/profile/')).toEqual({ name: 'profile', sub: undefined });
  });
  it('빈 경로·모르는 경로는 홈, 하위 경로도 버린다', () => {
    expect(parseHash('')).toEqual({ name: 'home', sub: undefined });
    expect(parseHash('#/nope/x')).toEqual({ name: 'home', sub: undefined });
  });
  it('컴포넌트 목록과 설정', () => {
    expect(parseHash('#/_kit')).toEqual({ name: '_kit', sub: undefined });
    expect(parseHash('#/settings/data')).toEqual({ name: 'settings', sub: 'data' });
  });
});

describe('옛 경로 넘김', () => {
  const cases: [string, string][] = [
    ['#/records', 'activities/records'],
    ['#/records/archive', 'activities/records'],
    ['#/records/interview', 'activities/records/interview'],
    ['#/records/interview/a-hackathon', 'activities/records/interview/a-hackathon'],
    ['#/activities/board', 'activities/schedule'],
    ['#/activities/list', 'activities/schedule'],
    ['#/challenges', 'profile'],
    ['#/challenges/list', 'profile'],
    ['#/friends', 'profile'],
    ['#/friends/profile', 'profile/friends'],
    ['#/friends/recruit', 'profile/recruit'],
    ['#/friends/hall', 'profile/hall'],
    ['#/friends/visibility', 'settings/visibility'],
    ['#/friends/visibility/', 'settings/visibility'],
    ['#/recommend/list', 'recommend'],
    ['#/recommend/compare', 'recommend']
  ];
  it.each(cases)('%s → %s', (from, to) => {
    expect(movedPath(from)).toBe(to);
    const [name, ...sub] = to.split('/');
    expect(parseHash(from)).toEqual({ name, sub: sub.join('/') || undefined });
  });
  it('새 경로와 비슷한 이름은 넘기지 않는다', () => {
    for (const p of ['#/friendsx', '#/recordsx', '#/challengesx', '#/activities/records', '#/activities/schedule', '#/recommend/p-ai', '#/recommend/prepare/p-ai', '#/profile/friends']) {
      expect(movedPath(p)).toBeUndefined();
    }
  });
});
