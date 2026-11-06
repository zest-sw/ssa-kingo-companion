import { cardOf } from '../interview/record';
import { josa } from '../text';
import type { Axis, Did, FieldGroup, Program, RecordItem } from '../types';
import { AXES, DID_AXES, FIELD_GROUP } from '../vocab';
import { semesterKey } from './semester';

// 나의 강점: 기록에서 어떤 역량이 드러났고, 그 근거가 무엇이며, 어디에 쓸 수 있나.
// 점수가 아니라 근거가 된 기록의 실제 개수만 센다.

/** 근거 하나 = 기록 하나. confirmed 는 학생이 '맞아요'로 확인한 것, 아니면 AI 추정이다. */
export type StrengthEvidence = { recordId: string; title: string; semester: string; group: FieldGroup; text: string; confirmed: boolean };
export type Strength = {
  axis: Axis;
  label: string;
  /** 확인한 것 먼저, 그다음 최근 학기 순 */
  evidence: StrengthEvidence[];
  confirmed: number;
};

const recent = (a: StrengthEvidence, b: StrengthEvidence) => semesterKey(b.semester) - semesterKey(a.semester);

/** 기록의 '한 일' 문장(근거 문장). 없으면 메모, 그것도 없으면 제목 */
export const textOf = (r: RecordItem) => (cardOf(r).action ?? r.note ?? '').trim() || r.title;

/** 역량마다 근거 기록을 모은다. '아니에요'라고 한 근거는 뺀다. 학생이 확인한 근거 많은 순, 같으면 전체 근거 많은 순, 같으면 역량 순서. */
export function buildStrengths(records: RecordItem[]): Strength[] {
  const rows = AXES.map(({ id, label }, order) => {
    const evidence = records
      .filter(r => liveAxes(r).includes(id))
      .map(r => ({ recordId: r.id, title: r.title, semester: r.semester, group: FIELD_GROUP[r.field], text: textOf(r), confirmed: !!r.confirmedAxes?.includes(id) }))
      .sort((a, b) => Number(b.confirmed) - Number(a.confirmed) || recent(a, b));
    return { order, row: { axis: id, label, evidence, confirmed: evidence.filter(e => e.confirmed).length } };
  });
  return rows
    .sort((a, b) => b.row.confirmed - a.row.confirmed || b.row.evidence.length - a.row.evidence.length || a.order - b.order)
    .map(x => x.row);
}

/** 그림에 줄로 그릴 강점(근거가 있는 것 중 앞에서 max 개)과, 근거가 아직 적어 한 줄로 모을 나머지 */
export function splitStrengths(rows: Strength[], max: number): { shown: Strength[]; few: Strength[] } {
  const shown = rows.filter(r => r.evidence.length > 0).slice(0, max);
  return { shown, few: rows.filter(r => !shown.includes(r)) };
}

/**
 * 머리에 내세울 강점(최대 2개). 학생이 확인한 근거가 가장 많은 것들이 사실로 말할 강점이다(confirmed).
 * 확인한 강점이 하나도 없으면 근거 수가 가장 많은 것들을 'AI 가 본 후보'로 돌려준다.
 */
export type LeadStrengths = { rows: Strength[]; confirmed: boolean };
export function leadStrengths(rows: Strength[]): LeadStrengths {
  const maxConfirmed = Math.max(0, ...rows.map(r => r.confirmed));
  if (maxConfirmed > 0) return { rows: rows.filter(r => r.confirmed === maxConfirmed).slice(0, 2), confirmed: true };
  const maxAll = Math.max(0, ...rows.map(r => r.evidence.length));
  return { rows: maxAll > 0 ? rows.filter(r => r.evidence.length === maxAll).slice(0, 2) : [], confirmed: false };
}

const names = (rs: Strength[]) => rs.map(r => r.label).join('·');

/** 머리 키워드 한 줄. 확인한 근거로만 단정한다: '협업이 가장 확실히 드러나요 · 확인 2개'. 확인한 것이 없으면 추정임을 밝힌다. estimated 면 점선 톤으로 그린다. */
export function strengthHeadline(rows: Strength[]): { text: string; estimated: boolean } {
  const lead = leadStrengths(rows);
  if (lead.rows.length === 0) return { text: '회고를 쓰면 강점이 보여요', estimated: false };
  if (!lead.confirmed) { const t = names(lead.rows); return { text: `AI가 본 강점 후보는 ${t}${josa(t, '이에요', '예요')}. 근거를 확인해 주세요`, estimated: true }; }
  const last = lead.rows[lead.rows.length - 1].label;
  const n = lead.rows[0].confirmed;
  return { text: `${names(lead.rows)}${josa(last, '이', '가')} 가장 확실히 드러나요 · 확인 ${lead.rows.length > 1 ? '각 ' : ''}${n}개`, estimated: false };
}

/** 요약 판 키워드: '협업: 확인 2개'. 확인한 것이 없으면 '강점 후보: 문제해결 · 확인 전' */
export function strengthKeyword(rows: Strength[]): { text: string; estimated: boolean } {
  const lead = leadStrengths(rows);
  const top = lead.rows[0];
  if (!top) return { text: '회고를 쓰면 강점이 보여요', estimated: false };
  return lead.confirmed ? { text: `${top.label}: 확인 ${top.confirmed}개`, estimated: false } : { text: `강점 후보: ${top.label} · 확인 전`, estimated: true };
}

/** 언제·어디서 드러났나: 학기마다 근거 수와 분야 */
export type StrengthWhen = { semester: string; items: StrengthEvidence[] };
export function whenOf(s: Strength): StrengthWhen[] {
  const by = new Map<string, StrengthEvidence[]>();
  for (const e of [...s.evidence].sort((a, b) => -recent(a, b))) by.set(e.semester, [...(by.get(e.semester) ?? []), e]);
  return [...by].map(([semester, items]) => ({ semester, items }));
}

/** 학생이 '아니에요'라고 한 역량을 뺀 이 기록의 역량. 기록 서랍과 강점 분석이 같은 기준을 쓴다 */
export const liveAxes = (r: RecordItem): Axis[] => r.axes.filter(a => !r.rejectedAxes?.includes(a));

/** 기회가 하는 일(did)로 쓰거나 기르는 역량 */
export const axesOfProgram = (p: Program): Axis[] => [...new Set(p.did.flatMap(d => DID_AXES[d]))];

/** 기록에서 학생이 확인한(아니에요는 뺀) 역량 가운데 이 기회가 쓰는 것 */
export const confirmedAxesFor = (r: RecordItem, p: Program): Axis[] =>
  (r.confirmedAxes ?? []).filter(a => r.axes.includes(a) && !r.rejectedAxes?.includes(a) && axesOfProgram(p).includes(a));

/** 이 기회가 쓰는 역량 중 확인한 근거가 있는 강점. 확인한 근거 많은 순 */
export function confirmedStrengthsFor(p: Program, records: RecordItem[]): Strength[] {
  const need = axesOfProgram(p);
  return buildStrengths(records).filter(s => s.confirmed > 0 && need.includes(s.axis)).sort((a, b) => b.confirmed - a.confirmed);
}

/** 기회 카드 한 줄: 그 기회에서 하는 일을 자연스럽게. '질문을 짜며 문제해결을 써요' */
export const DID_DOING: Record<Did, string> = {
  listen: '이야기를 듣고 정리하며', ask: '질문을 짜며', organize: '의견을 묶고 역할을 나누며',
  make: '직접 만들어 보며', idea: '아이디어를 내며', present: '설명하고 발표하며'
};

/** 이 강점을 쓰는 일(그 역량으로 이어지는 '한 일')이 있는 기회. 이미 추천 순서로 정렬된 후보에서 앞에서 n 개 */
export type StrengthChance = { program: Program; did: Did };
export function chancesFor(axis: Axis, programs: Program[], n: number): StrengthChance[] {
  return programs
    .map(p => ({ program: p, did: p.did.find(d => DID_AXES[d].includes(axis)) }))
    .filter((c): c is StrengthChance => !!c.did)
    .slice(0, n);
}

/** 신청서 초안에 쓸 수 있는 근거 문장: 학생이 확인한 것만, 같은 문장은 한 번 */
export const usableSentences = (s: Strength) => [...new Set(s.evidence.filter(e => e.confirmed).map(e => e.text))];

/** 강점 줄마다 대표 근거 하나. 줄끼리 같은 기록이 겹치지 않게 앞 줄부터 고르고, 다 겹치면 그 줄의 첫 근거 */
export function samplesOf(rows: Strength[]): Record<string, StrengthEvidence | undefined> {
  const used = new Set<string>();
  const out: Record<string, StrengthEvidence | undefined> = {};
  for (const r of rows) {
    const pick = r.evidence.find(e => !used.has(e.recordId)) ?? r.evidence[0];
    if (pick) used.add(pick.recordId);
    out[r.axis] = pick;
  }
  return out;
}

/** 분석해 둔 기록에 지금 상태의 근거 답(confirmedAxes·rejectedAxes)만 덧입힌다. 지워진 기록은 그대로 둔다(다음 분석에서 빠진다). */
export function withAnswers(analyzed: RecordItem[], current: RecordItem[]): RecordItem[] {
  const now = new Map(current.map(r => [r.id, r]));
  return analyzed.map(r => {
    const c = now.get(r.id);
    return c ? { ...r, confirmedAxes: c.confirmedAxes, rejectedAxes: c.rejectedAxes } : r;
  });
}

/** 근거 답: 맞아요는 확인 목록에 넣고 아니에요는 빼는 목록에 넣는다. 반대쪽 목록에서는 지운다. */
export function answerAxis(r: RecordItem, axis: Axis, yes: boolean): Pick<RecordItem, 'confirmedAxes' | 'rejectedAxes'> {
  const without = (xs: Axis[] | undefined) => (xs ?? []).filter(a => a !== axis);
  return yes
    ? { confirmedAxes: [...without(r.confirmedAxes), axis], rejectedAxes: without(r.rejectedAxes) }
    : { confirmedAxes: without(r.confirmedAxes), rejectedAxes: [...without(r.rejectedAxes), axis] };
}

/** 줄에서 빠진 강점 한 줄. 근거가 있는데 순서에서 밀린 것과 근거가 아직 없는 것을 나눠 말한다(근거 10개를 '적다'고 하지 않게). */
export function fewLine(few: Strength[]): string {
  const next = few.filter(f => f.evidence.length > 0).map(f => f.label);
  const none = few.filter(f => f.evidence.length === 0).map(f => f.label);
  return [next.length ? `그다음 강점은 ${next.join('·')}${josa(next[next.length - 1] ?? '', '이에요', '예요')}` : '', none.length ? `${none.join('·')}${josa(none[none.length - 1] ?? '', '은', '는')} 아직 근거가 없어요` : ''].filter(Boolean).join(' ');
}

// ── 육각형 레이더: 축 6개 = 역량 6개, 값 = 근거 기록 수(점수 아님) ──

/** 레이더 꼭짓점 하나. confirmed 는 학생이 확인한 근거 수, total 은 AI 추정까지 합친 근거 수 */
export type RadarSpot = { axis: Axis; label: string; confirmed: number; total: number };
/** 보는 시점. upTo 가 null 이면 지금까지, 아니면 그 학기(키)까지 */
export type RadarMoment = { id: string; label: string; upTo: number | null };

/** 역량 순서(AXES)대로 한 바퀴. upTo 가 있으면 그 학기까지 쓴 기록의 근거만 센다(그때의 확인 상태가 아니라 지금 확인한 것 중 그때까지 쓴 것). */
export function radarSpots(rows: Strength[], upTo: number | null = null): RadarSpot[] {
  const within = (e: StrengthEvidence) => upTo === null || semesterKey(e.semester) <= upTo;
  return AXES.map(({ id, label }) => {
    const ev = (rows.find(r => r.axis === id)?.evidence ?? []).filter(within);
    return { axis: id, label, confirmed: ev.filter(e => e.confirmed).length, total: ev.length };
  });
}

/** 동심 육각형 눈금: 2개 단위(바깥이 8을 넘으면 4개 단위). 바깥 눈금은 가장 많은 전체 근거 수를 덮고 최소 4 */
export function radarScale(spots: RadarSpot[]): { max: number; ticks: number[] } {
  const peak = Math.max(0, ...spots.map(s => s.total));
  const step = peak > 8 ? 4 : 2;
  const max = Math.max(4, Math.ceil(peak / step) * step);
  return { max, ticks: Array.from({ length: max / step }, (_, i) => (i + 1) * step) };
}

/** 지난 나와 비교하는 시점: 지금 + 기록이 있는 지난 해 말(최근 두 해). 다른 학생과는 비교하지 않는다. */
export function radarMoments(rows: Strength[]): RadarMoment[] {
  const years = [...new Set(rows.flatMap(r => r.evidence.map(e => Number(e.semester.slice(0, 4)))).filter(y => !Number.isNaN(y)))].sort((a, b) => b - a);
  const past = years.slice(1, 3).map(y => ({ id: `y${y}`, label: `${y}년 말`, upTo: semesterKey(`${y}-겨울`) }));
  return [{ id: 'now', label: '지금', upTo: null }, ...past];
}

/** 처음 보여 줄 꼭짓점: 확인한 근거가 가장 많은 역량, 없으면 전체 근거가 가장 많은 역량. 근거가 하나도 없으면 null */
export function defaultRadarAxis(rows: Strength[]): Axis | null {
  const lead = leadStrengths(rows).rows[0];
  return lead ? lead.axis : null;
}

/** 꼭짓점 이름표 한 줄: '확인 2 · 전체 5' */
export const radarSub = (s: RadarSpot) => `확인 ${s.confirmed} · 전체 ${s.total}`;
