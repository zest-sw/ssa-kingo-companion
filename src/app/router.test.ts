import { describe, expect, it } from 'vitest';
import { canonicalPath, inProfile, movedPath, NAV, navMatch, parentLink, parseHash, screenLabel } from './router';

describe('메뉴 트리', () => {
  it('메인 4개, 하위 6개 (프로필은 메뉴가 아니라 학생 카드)', () => {
    expect(NAV.map(n => n.label)).toEqual(['홈', '추천', '내 활동', '나의 분석']);
    expect(NAV.flatMap(n => n.children ?? []).length).toBe(6);
  });
  it('프로필 화면 전체에서 학생 카드가 활성이고 메뉴는 활성이 없다', () => {
    for (const h of ['#/profile', '#/profile/friends', '#/profile/recruit', '#/profile/hall']) {
      expect(inProfile(parseHash(h))).toBe(true);
      expect(navMatch(parseHash(h)).item).toBeUndefined();
    }
    expect(inProfile(parseHash('#/settings'))).toBe(false);
  });
  it('문서 제목 이름', () => {
    expect(screenLabel(parseHash('#/profile'))).toBe('내 프로필');
    expect(screenLabel(parseHash('#/profile/hall'))).toBe('명예의 전당');
    expect(screenLabel(parseHash('#/analysis/map'))).toBe('경험 지도');
  });
  it('하위 경로는 부모 경로 아래에 있다', () => {
    for (const n of NAV) for (const c of n.children ?? []) expect(c.path.startsWith(n.path + '/')).toBe(true);
  });
  it('지금 위치: 하위 화면, 흐름 화면, 메인 화면', () => {
    expect(navMatch(parseHash('#/analysis/map'))).toMatchObject({ item: { id: 'analysis' }, child: { path: 'analysis/map' }, exact: true });
    expect(navMatch(parseHash('#/activities/records/interview/a-1'))).toMatchObject({ item: { id: 'activities' }, child: { path: 'activities/records' }, exact: false });
    expect(navMatch(parseHash('#/recommend/prepare/p-ai'))).toMatchObject({ item: { id: 'recommend' }, child: undefined, exact: false });
    expect(navMatch(parseHash('#/settings/data')).item).toBeUndefined();
  });
  it('빵부스러기 첫 칸', () => {
    expect(parentLink('activities/records')).toEqual({ label: '기록', href: '#/activities/records' });
    expect(parentLink('recommend')).toEqual({ label: '추천', href: '#/recommend' });
    expect(parentLink('profile')).toEqual({ label: '내 프로필', href: '#/profile' });
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
    ['#/activities/board', 'activities/schedule/board'],
    ['#/activities/list', 'activities/schedule/list'],
    ['#/activities/interview', 'activities/records/interview'],
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

describe('모르는 하위 경로는 주소를 맞는 자리로 바꾼다', () => {
  it.each([
    ['#/settings/notify', 'settings/profile'],
    ['#/settings/x/y', 'settings/profile'],
    ['#/analysis/nope', 'analysis'],
    ['#/analysis/map/x', 'analysis/map'],
    ['#/activities/schedule/x', 'activities/schedule'],
    ['#/activities/records/interview/a-1/x', 'activities/records/interview/a-1'],
    ['#/activities/zzz', 'activities'],
    ['#/profile/zzz', 'profile'],
    ['#/home/x', 'home'],
    ['#/recommend/prepare', 'recommend'],
    ['#/nowhere', 'home'],
    ['#/records/archive', 'activities/records']
  ])('%s → %s', (from, to) => {
    expect(canonicalPath(from)).toBe(to);
  });
  it('아는 경로는 그대로 둔다', () => {
    for (const p of ['', '#/', '#/home', '#/recommend', '#/recommend/p-ai', '#/recommend/prepare/p-ai', '#/activities/schedule/board', '#/activities/records/interview',
      '#/activities/records/interview/a-1', '#/analysis/flow', '#/profile/hall', '#/settings', '#/settings/notifications', '#/_kit/detail']) {
      expect(canonicalPath(p)).toBeUndefined();
    }
  });
});
