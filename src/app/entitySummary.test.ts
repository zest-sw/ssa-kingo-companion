import { describe, expect, it } from 'vitest';
import { PROGRAM_BY_ID, PROGRAMS } from '../data/catalog';
import { SEED_ACTIVITIES, SEED_RECORDS } from '../data/seed';
import { entitySummary } from './entitySummary';

const src = { programs: PROGRAM_BY_ID, activities: SEED_ACTIVITIES, records: SEED_RECORDS };

describe('공용 서랍 기본 내용', () => {
  it('기회·활동·기록을 같은 모양으로 요약하고 상세 경로를 단다', () => {
    const p = PROGRAMS[0];
    expect(entitySummary({ kind: 'opportunity', id: p.id }, src)).toMatchObject({ eyebrow: '기회', title: p.title, href: `recommend/${p.id}` });
    const a = SEED_ACTIVITIES[0];
    expect(entitySummary({ kind: 'activity', id: a.id }, src)).toMatchObject({ eyebrow: '내 활동', title: a.title, href: 'activities/list' });
    const r = SEED_RECORDS[0];
    const rs = entitySummary({ kind: 'record', id: r.id }, src);
    expect(rs).toMatchObject({ eyebrow: '기록', title: r.title, note: r.quote, href: 'records/archive' });
    expect(rs?.facts.map(f => f[0])).toEqual(['학기', '종류', '확인']);
  });
  it('마감이 있는 활동은 남은 날을 함께', () => {
    const a = SEED_ACTIVITIES.find(x => x.due)!;
    const facts = Object.fromEntries(entitySummary({ kind: 'activity', id: a.id }, src)!.facts);
    expect(facts[a.due!.label]).toBe(a.due!.dday === 0 ? '오늘' : `D-${a.due!.dday}`);
  });
  it('없는 id 는 undefined', () => {
    expect(entitySummary({ kind: 'record', id: 'nope' }, src)).toBeUndefined();
    expect(entitySummary({ kind: 'opportunity', id: 'nope' }, src)).toBeUndefined();
  });
});
