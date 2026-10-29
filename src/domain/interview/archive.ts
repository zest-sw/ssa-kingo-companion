import type { FieldGroup, RecordItem } from '../types';
import { cardOf } from './record';
import { FIELD_GROUP } from '../vocab';

// 기록 보관함: 학기별로 묶고 분야·확인 방식으로 거른다.

const TERM_ORDER: Record<string, number> = { '1': 1, 여름: 1.5, '2': 2, 겨울: 2.5 };

/** '2026-2' → 2026.2. 같은 해 안에서 1학기 < 여름 < 2학기 < 겨울 */
export function semesterKey(s: string): number {
  const [year, term = ''] = s.split('-');
  return Number(year) + (TERM_ORDER[term] ?? 0) / 10;
}

/** '2026-2' → '2026-2학기', '2026-여름' → '2026 여름' */
export function semesterLabel(s: string): string {
  const [year, term = ''] = s.split('-');
  return /^\d$/.test(term) ? `${year}-${term}학기` : `${year} ${term}`.trim();
}

export type SemesterGroup = { semester: string; label: string; items: RecordItem[] };

/** 최근 학기부터. 한 학기 안에서는 나중에 쓴 기록(입력 순서의 뒤)이 먼저 */
export function groupBySemester(records: RecordItem[]): SemesterGroup[] {
  const map = new Map<string, RecordItem[]>();
  for (const r of [...records].reverse()) map.set(r.semester, [...(map.get(r.semester) ?? []), r]);
  return [...map.entries()]
    .sort(([a], [b]) => semesterKey(b) - semesterKey(a))
    .map(([semester, items]) => ({ semester, label: semesterLabel(semester), items }));
}

export type ArchiveFilter = { group: FieldGroup | 'all'; verification: RecordItem['verification'] | 'all' };

export function filterRecords(records: RecordItem[], f: ArchiveFilter): RecordItem[] {
  return records.filter(r => (f.group === 'all' || FIELD_GROUP[r.field] === f.group) && (f.verification === 'all' || r.verification === f.verification));
}

/** 보관함에 실제로 있는 분야 묶음만, 보이는 순서대로 */
export function groupsPresent(records: RecordItem[]): FieldGroup[] {
  const order: FieldGroup[] = ['dev', 'ai', 'plan', 'mentor', 'global', 'other'];
  const have = new Set(records.map(r => FIELD_GROUP[r.field]));
  return order.filter(g => have.has(g));
}

/** 카드에 보여 줄 최대 두 줄. 회고를 거친 기록은 역할·배운 점·다음·결과 순, 아니면 한 일·한마디. 빈 칸은 건너뛴다. */
export function previewOf(r: RecordItem): [label: string, text: string][] {
  const c = cardOf(r);
  const rows: [string, string | undefined][] = r.card
    ? [['역할', c.role], ['배운 점', c.learned], ['다음', c.next], ['결과', c.result]]
    : [['한 일', c.action], ['한마디', c.learned]];
  return rows.filter((x): x is [string, string] => !!x[1]).slice(0, 2);
}
