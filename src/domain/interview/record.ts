import { discoveriesOf } from '../discoveries';
import type { Axis, Did, Discovery, Energy, Field, RecordCard, RecordItem, RecordVisibility } from '../types';
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
