import { discoveriesOf } from '../discoveries';
import type { Axis, Confirm, Did, Discovery, Energy, Field, FieldGroup, Interest, RecordCard, RecordItem, RecordVisibility } from '../types';
import { AXES, DID_AXES } from '../vocab';

/** 말한 단어로 '무엇을 했는지'를 어림한다. 학생이 고른 값이 아니라 추정이라, 기록을 고치면 다시 어림한다. */
const DID_WORDS: [Did, string[]][] = [
  ['make', ['만들', '개발', '코드', '구현', '제작', '짜서', '디자인']],
  ['present', ['발표', '설명', '강의', '피칭', '시연']],
  ['idea', ['아이디어', '제안', '기획']],
  ['ask', ['질문', '물어']],
  ['listen', ['듣', '인터뷰', '청취', '관찰']],
  ['organize', ['정리', '조율', '묶', '취합', '역할 나']]
];

export function inferDid(text: string): Did {
  let best: Did = 'make';
  let bestN = 0;
  for (const [did, words] of DID_WORDS) {
    const n = words.reduce((sum, w) => sum + text.split(w).length - 1, 0);
    if (n > bestN) { best = did; bestN = n; }
  }
  return best;
}

export type EvidenceRow = { axis: Axis; label: string; text: string };

/** 역량 근거 문장. 학생이 쓴 '한 일' 문장에 역량 이름표만 붙인다. 학생이 확인하기 전까지는 AI 추정이다. */
export function evidenceOf(axes: Axis[], text: string | undefined): EvidenceRow[] {
  const t = text?.trim();
  if (!t) return [];
  return axes.map(axis => ({ axis, label: AXES.find(a => a.id === axis)?.label ?? axis, text: t }));
}

export type NewRecordInput = {
  activityId: string;
  title: string;
  field: Field;
  programId?: string;
  /** 기관 활동 유형. 예: '교내 해커톤' */
  kind: string;
  verification: 'school' | 'self';
  date: string;
  semester: string;
  card: RecordCard;
  energy: Energy;
  visibility: RecordVisibility;
  useForRecommend: boolean;
};

/** 인터뷰 결과 → 기록. 카드의 글은 학생이 말한 것 그대로 둔다. */
export function buildRecord(i: NewRecordInput): RecordItem {
  const did = inferDid(`${i.card.role ?? ''} ${i.card.action ?? ''}`);
  return {
    id: `r-${i.activityId}`, v: 1, title: i.title, kind: i.kind, date: i.date, semester: i.semester, field: i.field, did, energy: i.energy,
    quote: i.card.learned ?? '', note: i.card.action ?? '', axes: DID_AXES[did], source: 'agent', verification: i.verification,
    visibility: i.visibility, useForRecommend: i.useForRecommend, card: i.card, programId: i.programId
  };
}

/**
 * 회고를 건너뛴 기록: 확인된 사실(활동명·분야·학기·상황)만 남긴다. 학생이 답한 내용이 없으니 역량 근거를 만들지 않고 추천에도 쓰지 않는다.
 * 나중에 기록 서랍에서 칸을 채우고 '추천에 쓰기'를 켤 수 있다.
 */
export function skippedRecord(i: Omit<NewRecordInput, 'energy' | 'visibility' | 'useForRecommend'>): RecordItem {
  return { ...buildRecord({ ...i, energy: 'same', visibility: 'me', useForRecommend: false }), axes: [] };
}

export type SavedSummary = {
  /** 이 기록 덕분에 새로 생긴 발견 후보. 학생이 확인하기 전에는 추천에 쓰지 않는다 */
  newDiscoveries: Discovery[];
  usedForRecommend: boolean;
};

export function savedSummary(before: RecordItem[], record: RecordItem): SavedSummary {
  const keys = new Set(discoveriesOf(before.filter(r => r.useForRecommend)).map(d => d.key));
  const after = discoveriesOf([...before.filter(r => r.id !== record.id), record].filter(r => r.useForRecommend));
  return { newDiscoveries: after.filter(d => !keys.has(d.key)), usedForRecommend: record.useForRecommend };
}

/**
 * 기록 카드 칸. 메모는 '한 일', 한마디는 '배운 점' 자리다. 카드에 그 칸이 비어 있으면 메모·한마디로 채운다
 * (예시 기록처럼 역할만 카드에 있고 한 일은 메모에 있는 경우가 있어서). 인터뷰·고치기는 둘을 늘 같이 적는다.
 */
export const cardOf = (r: RecordItem): RecordCard => ({ ...(r.note && { action: r.note }), ...(r.quote && { learned: r.quote }), ...r.card });

export type ManualInput = { id: string; title: string; note: string; quote: string; energy: Energy; date: string; semester: string; group?: FieldGroup };

/** 직접 기록에서 고른 분야 묶음을 기록의 분야로. 고르지 않으면 기타. */
const MANUAL_FIELD: Record<FieldGroup, Field> = { dev: 'dev', ai: 'data', plan: 'product', mentor: 'mentor', global: 'global', other: 'etc' };

/** 직접 기록 창이 처음 고른 분야: 가입 때 고른 관심 중 첫 분야, 없으면('아직 모르겠어요') 기타. */
export const defaultManualGroup = (interests: readonly Interest[]): FieldGroup =>
  interests.find((g): g is FieldGroup => g !== 'unknown') ?? 'other';

/** 직접 기록 추가. 학교가 확인하지 않았으니 '직접 입력'이고, 공개 범위는 나만 보기다. */
export function buildManualRecord(i: ManualInput): RecordItem {
  const note = i.note.trim();
  const quote = i.quote.trim();
  const did = inferDid(note);
  return {
    id: i.id, v: 1, title: i.title.trim(), kind: '직접 기록', date: i.date, semester: i.semester, field: MANUAL_FIELD[i.group ?? 'other'], did, energy: i.energy,
    quote, note, axes: DID_AXES[did], source: 'manual', verification: 'self', visibility: 'me', useForRecommend: true,
    card: { action: note, ...(quote ? { learned: quote } : {}) }
  };
}

/** 기록 고치기. 칸이 바뀌었을 수 있어 '무엇을 했는지'를 다시 어림한다(역량 근거도 따라 바뀐다). */
export function editedRecord(r: RecordItem, title: string, draft: RecordCard): RecordItem {
  const card: RecordCard = {};
  for (const k of Object.keys(draft) as (keyof RecordCard)[]) {
    const v = draft[k]?.trim();
    if (v) card[k] = v;
  }
  return { ...r, title: title.trim() || r.title, card, note: card.action ?? '', quote: card.learned ?? '', did: inferDid(`${card.role ?? ''} ${card.action ?? ''}`) };
}

/** 학생이 확인한 발견 중 이 기록을 근거로 쓴 것이 있는지. 근거 표시는 '기록id@버전' 이다. */
export const usesRecord = (confirm: Record<string, Confirm>, recordId: string): boolean =>
  Object.values(confirm).some(c => c.sig.some(s => s.slice(0, s.lastIndexOf('@')) === recordId));
