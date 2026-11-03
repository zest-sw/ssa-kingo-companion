import type { DotItem, GridAxisItem } from '../../components';
import { semesterKey, semesterLabel } from '../../domain/interview/archive';
import type { FieldGroup, RecordItem } from '../../domain/types';
import { FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';

// 기록 지도: 가로 = 학기, 세로 = 분야 묶음, 점 = 기록.

const GROUPS: FieldGroup[] = ['dev', 'ai', 'plan', 'mentor', 'global'];
/** 한 해의 학기 순서. 겨울은 기록이 있을 때만 열로 생긴다. */
const LADDER = ['1', '여름', '2'];

const split = (s: string): [number, string] => { const [y, t = ''] = s.split('-'); return [Number(y), t]; };

/** 바로 앞 학기. '2026-1' 앞은 '2025-2' */
export function previousTerm(s: string): string {
  const [year, term] = split(s);
  const at = LADDER.indexOf(term);
  if (at > 0) return `${year}-${LADDER[at - 1]}`;
  return at === 0 ? `${year - 1}-${LADDER[LADDER.length - 1]}` : `${year}-${LADDER[0]}`;
}

/** 기록이 있는 학기 + 지금 학기 + 그 앞 두 학기를 오래된 순으로. 기록이 없어도 틀은 세 칸이다. */
export function mapTerms(records: RecordItem[], current: string): GridAxisItem[] {
  const ids = new Set(records.map(r => r.semester));
  ids.add(current);
  ids.add(previousTerm(current));
  ids.add(previousTerm(previousTerm(current)));
  return [...ids].sort((a, b) => semesterKey(a) - semesterKey(b)).map(id => ({ id, label: semesterLabel(id) }));
}

/** 다섯 분야 묶음은 늘 보이고, '기타'는 기록이 있을 때만 줄이 생긴다. */
export function mapRows(records: RecordItem[]): GridAxisItem[] {
  const groups = records.some(r => FIELD_GROUP[r.field] === 'other') ? [...GROUPS, 'other' as const] : GROUPS;
  return groups.map(id => ({ id, label: GROUP_LABEL[id] }));
}

/** 학교 확인 = 채운 점, 직접 입력 = 테두리 점. 색은 분야 묶음. */
export function mapDots(records: RecordItem[]): DotItem[] {
  return records.map(r => {
    const group = FIELD_GROUP[r.field];
    return { id: r.id, row: group, col: r.semester, filled: r.verification === 'school', label: r.title, tone: group, tip: `${r.title} · ${r.verification === 'school' ? '학교 확인' : '직접 입력'}` };
  });
}

/** 같은 분야 안에서 앞 학기의 점 → 다음 학기의 점을 잇는다. 같은 순서끼리 잇고, 남는 쪽은 상대의 마지막 점으로 모이거나 거기서 뻗는다(끊긴 점이 없게). */
export function mapLinks(items: DotItem[], cols: GridAxisItem[]): { from: string; to: string }[] {
  const order = new Map(cols.map((c, i) => [c.id, i]));
  const out: { from: string; to: string }[] = [];
  for (const row of new Set(items.map(i => i.row))) {
    const bySem = [...cols].map(c => items.filter(i => i.row === row && i.col === c.id)).filter(g => g.length);
    bySem.sort((a, b) => (order.get(a[0].col) ?? 0) - (order.get(b[0].col) ?? 0));
    for (let s = 1; s < bySem.length; s++) {
      const prev = bySem[s - 1];
      const next = bySem[s];
      next.forEach((it, k) => out.push({ from: prev[Math.min(k, prev.length - 1)].id, to: it.id }));
      prev.slice(next.length).forEach(it => out.push({ from: it.id, to: next[next.length - 1].id }));
    }
  }
  return out;
}

/** 기록이 있는 분야만 줄로 그리고, 기록 없는 분야는 아래 한 줄로 모은다(빈 줄이 화면을 차지하지 않게). */
export function splitMapRows(records: RecordItem[]): { drawn: GridAxisItem[]; empty: GridAxisItem[] } {
  const has = new Set(records.map(r => FIELD_GROUP[r.field]));
  const rows = mapRows(records);
  return { drawn: rows.filter(r => has.has(r.id as FieldGroup)), empty: rows.filter(r => !has.has(r.id as FieldGroup)) };
}
