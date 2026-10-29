import type { Catalog, Profile, Program, RecordItem } from './types';

// 테스트용 최소 데이터. 예시 데이터(src/data)가 바뀌어도 규칙 테스트가 흔들리지 않게 따로 둔다.

export const prog = (id: string, over: Partial<Program> = {}): Program => ({
  id, title: id, host: 'h', field: 'research', format: 'offline', when: '10.14(수)', hours: 2, durationLabel: '2시간',
  ddayW1: 10, weeks: [1], place: 'p', target: '전 학년', eligible: true, seatsKnown: true, did: ['listen'], level: 1, summary: 's', ...over
});

export const rec = (id: string, over: Partial<RecordItem> = {}): RecordItem => ({
  id, v: 1, title: id, kind: '비교과', date: 'd', semester: '2026-2', field: 'research', did: 'listen', energy: 'same', quote: '', note: '',
  axes: [], source: 'seed', verification: 'self', visibility: 'me', useForRecommend: true, ...over
});

export const profile = (over: Partial<Profile> = {}): Profile => ({ interests: [], time: 3, format: 'any', goal: '', importCS: false, ...over });

export const catalog = (programs: Program[], extra: Partial<Catalog> = {}): Catalog => ({ programs, jobs: [], reqs: [], directions: [], ...extra });
