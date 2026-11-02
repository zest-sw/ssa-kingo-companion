import { semesterLabel } from '../domain/interview/archive';
import { candidateHref } from '../domain/recommend-flow/flow';
import type { Activity, Field, Program, RecordItem } from '../domain/types';
import { STATUS_LABEL } from '../domain/vocab';

/** 어디서 눌러도 같은 서랍이 열리는 대상 */
export type EntityKind = 'opportunity' | 'activity' | 'record';
export type EntityRef = { kind: EntityKind; id: string };

export const ENTITY_LABEL: Record<EntityKind, string> = { opportunity: '기회', activity: '내 활동', record: '기록' };

export type EntitySummary = {
  eyebrow: string;
  title: string;
  field: Field;
  /** 짧은 사실 줄(라벨, 값) */
  facts: [string, string][];
  /** 한 줄 인용·요약 */
  note?: string;
  /** '자세히 보기'가 가는 L2 */
  href: string;
};

type Sources = { programs: Record<string, Program>; activities: Activity[]; records: RecordItem[] };

/**
 * 화면이 자기 서랍을 아직 등록하지 않았을 때 쓰는 기본 서랍 내용. 못 찾으면 undefined.
 */
export function entitySummary(ref: EntityRef, src: Sources): EntitySummary | undefined {
  const eyebrow = ENTITY_LABEL[ref.kind];
  if (ref.kind === 'opportunity') {
    const p = src.programs[ref.id];
    return p && { eyebrow, title: p.title, field: p.field, facts: [['주최', p.host], ['일정', p.when], ['장소', p.place]], note: p.summary, href: candidateHref(p.id) };
  }
  if (ref.kind === 'activity') {
    const a = src.activities.find(x => x.id === ref.id);
    if (!a) return undefined;
    const facts: [string, string][] = [['상태', STATUS_LABEL[a.status]], ['일정', a.schedule]];
    if (a.due) facts.push([a.due.label, a.due.dday === 0 ? '오늘' : `D-${a.due.dday}`]);
    if (a.prep) facts.push(['준비', `${a.prep.done} / ${a.prep.total}`]);
    return { eyebrow, title: a.title, field: a.field, facts, href: 'activities/list' };
  }
  const r = src.records.find(x => x.id === ref.id);
  return r && {
    eyebrow, title: r.title, field: r.field,
    facts: [['학기', semesterLabel(r.semester)], ['종류', r.kind], ['확인', r.verification === 'school' ? '학교 확인' : '직접 입력']],
    note: r.quote, href: 'records/archive'
  };
}
