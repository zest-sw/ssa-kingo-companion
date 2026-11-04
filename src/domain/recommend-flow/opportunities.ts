import { ddayOf } from '../recommend';
import type { Category, Gain, GainKind, Program } from '../types';

// 전체 기회 탭: 지금 열린 기회, 종류(카테고리)별 개수, 정렬, 행에 보일 '얻는 것'. 순수 함수만 둔다.

export const CATEGORY_ORDER: Category[] = ['job', 'lecture', 'hackathon', 'contest', 'edu', 'club', 'volunteer', 'mentoring', 'global'];
export const CATEGORY_LABEL: Record<Category, string> = {
  job: '채용', lecture: '특강', hackathon: '해커톤', contest: '대회·공모전', edu: '교육·캠프', club: '동아리·학회', volunteer: '봉사', mentoring: '멘토링', global: '글로벌'
};
export const categoryOf = (p: Program): Category => p.category ?? 'edu';

/** 지금(이 주차) 모집 중이고 마감이 안 지난 기회. 신청 대상이 아니어도 보여 준다(모달에서 알린다). */
export const openPrograms = (programs: Program[], week: number) => programs.filter(p => p.weeks.includes(week) && ddayOf(p, week) >= 0);

export type CategoryFilter = Category | 'all';
export type CategoryCount = { id: CategoryFilter; label: string; count: number };
/** 칩 줄: 전체 + 데이터에 있는 종류만, 정해진 순서로 */
export function categoryCounts(list: Program[]): CategoryCount[] {
  const used = CATEGORY_ORDER.map(id => ({ id, label: CATEGORY_LABEL[id], count: list.filter(p => categoryOf(p) === id).length })).filter(c => c.count > 0);
  return [{ id: 'all', label: '전체', count: list.length }, ...used];
}
export const inCategory = (p: Program, c: CategoryFilter) => c === 'all' || categoryOf(p) === c;

export type OpenSort = 'deadline' | 'new';
export const SORT_LABEL: Record<OpenSort, string> = { deadline: '마감순', new: '새로 열린 순' };
/** 마감순: 마감 가까운 것부터. 새로 열린 순: 모집을 연 지 얼마 안 된 것부터(같으면 마감순). */
export function sortOpen(list: Program[], week: number, sort: OpenSort): Program[] {
  const byDue = (a: Program, b: Program) => ddayOf(a, week) - ddayOf(b, week) || a.title.localeCompare(b.title);
  const opened = (p: Program) => (p.openedW1 ?? 99) + 7 * (week - 1);
  return [...list].sort(sort === 'deadline' ? byDue : (a, b) => opened(a) - opened(b) || byDue(a, b));
}

export const GAIN_ORDER: GainKind[] = ['money', 'job', 'cert', 'output', 'mentor', 'people', 'skill'];
export const GAIN_LABEL: Record<GainKind, string> = {
  money: '상금·장학금', job: '채용·인턴 연계', cert: '수료·증명', output: '결과물', mentor: '멘토·피드백', people: '사람', skill: '기르는 역량'
};
export const gainsOf = (p: Program): Gain[] => p.gains ?? [];

/** 행에 보일 얻는 것 최대 n개: 종류가 겹치지 않게, 학생이 먼저 묻는 것(상금·채용·증명)부터 */
export function rowGains(p: Program, n = 3): Gain[] {
  const out: Gain[] = [];
  for (const kind of GAIN_ORDER) {
    const g = gainsOf(p).find(x => x.kind === kind);
    if (g) out.push(g);
    if (out.length >= n) break;
  }
  return out;
}

/** 모달: 종류별로 묶은 얻는 것 전부 */
export function groupedGains(p: Program): { kind: GainKind; label: string; items: string[] }[] {
  return GAIN_ORDER.map(kind => ({ kind, label: GAIN_LABEL[kind], items: gainsOf(p).filter(g => g.kind === kind).map(g => g.label) })).filter(x => x.items.length > 0);
}
