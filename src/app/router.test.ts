import { describe, expect, it } from 'vitest';
import { l1Of, matchSub, movedPath, parseHash, SUB_LABEL, SUB_ROUTES } from './router';

describe('L2 하위 경로', () => {
  it('ia-navigation 2절의 경로가 라우터를 지나 sub 로 간다', () => {
    for (const path of ['activities/board', 'activities/list', 'records/archive', 'recommend/list', 'challenges/list', 'friends/hall', 'analysis/map']) {
      const [name, sub] = path.split('/');
      expect(parseHash('#/' + path)).toEqual({ name, sub });
      expect(matchSub(name as 'activities', sub)?.pattern).toBe(path);
    }
  });
  it('id 자리를 뽑는다. 고정 이름이 먼저 맞는다', () => {
    expect(matchSub('recommend', 'prepare/p-ai')).toEqual({ pattern: 'recommend/prepare/:id', id: 'p-ai' });
    expect(matchSub('recommend', 'p-ai')).toEqual({ pattern: 'recommend/:id', id: 'p-ai' });
    expect(matchSub('recommend', 'list')).toEqual({ pattern: 'recommend/list', id: undefined });
    expect(matchSub('records', 'interview/a-hackathon')).toEqual({ pattern: 'records/interview/:id', id: 'a-hackathon' });
  });
  it('L1 이거나 모르는 경로는 undefined', () => {
    expect(matchSub('activities', undefined)).toBeUndefined();
    expect(matchSub('activities', 'nope')).toBeUndefined();
    expect(matchSub('home', 'list')).toBeUndefined();
    expect(matchSub('recommend', 'prepare')).toBeUndefined();
  });
  it('모든 하위 경로에 빵부스러기 이름이 있다', () => {
    for (const [menu, subs] of Object.entries(SUB_ROUTES)) for (const s of subs) expect(SUB_LABEL[`${menu}/${s}` as keyof typeof SUB_LABEL]).toBeTruthy();
  });
  it('L1 링크', () => expect(l1Of('activities')).toEqual({ label: '내 활동', href: '#/activities' }));
});

describe('parseHash', () => {
  it('화면 이름과 하위 경로를 나눈다', () => {
    expect(parseHash('#/analysis/techtree')).toEqual({ name: 'analysis', sub: 'techtree' });
    expect(parseHash('#/records/interview/a-hackathon')).toEqual({ name: 'records', sub: 'interview/a-hackathon' });
    expect(parseHash('#/friends')).toEqual({ name: 'friends', sub: undefined });
    expect(parseHash('#/friends/')).toEqual({ name: 'friends', sub: undefined });
  });
  it('빈 경로·모르는 경로는 홈, 하위 경로도 버린다', () => {
    expect(parseHash('')).toEqual({ name: 'home', sub: undefined });
    expect(parseHash('#/nope/x')).toEqual({ name: 'home', sub: undefined });
  });
  it('컴포넌트 목록과 설정', () => {
    expect(parseHash('#/_kit')).toEqual({ name: '_kit', sub: undefined });
    expect(parseHash('#/settings/data')).toEqual({ name: 'settings', sub: 'data' });
  });
  it('공개 설정은 친구 화면에서 설정으로 옮겼다', () => {
    expect(movedPath('#/friends/visibility')).toBe('settings/visibility');
    expect(movedPath('#/friends/visibility/')).toBe('settings/visibility');
    expect(movedPath('#/friends/visibilityx')).toBeUndefined();
    expect(movedPath('#/friends/profile')).toBeUndefined();
    expect(parseHash('#/friends/visibility')).toEqual({ name: 'settings', sub: 'visibility' });
  });
});
