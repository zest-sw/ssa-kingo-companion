import { didsByState, discoveriesOf } from './discoveries';
import { pickAlternatives, rank } from './recommend';
import type { Catalog, CandidateChoice, Confirm, Discovery, DislikeKind, Field, Funnel, LastDone, Mode, Profile, Program, RecordItem, Scored, Settings } from './types';

export type CandidateInput = {
  catalog: Catalog;
  week: number;
  profile: Profile;
  records: RecordItem[];
  confirm: Record<string, Confirm>;
  settings: Settings;
  choices: Record<string, CandidateChoice>;
  dislikedFields: Field[];
  preferEasier: boolean;
  last: LastDone | null;
};

export type CandidateView = {
  /** 추천과 발견에 쓰는 기록('추천에 쓰지 않기'를 고른 기록은 뺀다) */
  usable: RecordItem[];
  discoveries: Discovery[];
  mode: Mode;
  /** score 는 정렬용이다. 화면에 내지 않는다 */
  primary: Scored | undefined;
  alternatives: Scored[];
  later: Program[];
  /** 사이드바 '추천' 배지: 아직 고르지 않은 후보 수 */
  newCount: number;
  funnel: Funnel;
  scored: Scored[];
};

/** 기록·확인한 발견·선택을 모아 지금 보여 줄 후보를 정한다. */
export function buildCandidates(input: CandidateInput): CandidateView {
  const usable = input.records.filter(r => r.useForRecommend);
  const discoveries = input.settings.discover ? discoveriesOf(usable) : [];
  const focusDids = didsByState(discoveries, input.confirm, 'yes');
  const rejectedDids = didsByState(discoveries, input.confirm, 'no');
  const mode: Mode = focusDids.length ? 'focus' : 'explore';
  const doneIds = input.records.map(r => r.programId).filter((x): x is string => !!x);
  const { scored, funnel } = rank({
    catalog: input.catalog, week: input.week, profile: input.profile, records: usable, doneIds,
    excluded: Object.keys(input.choices), dislikedFields: input.dislikedFields, preferEasier: input.preferEasier,
    mode, focusDids, rejectedDids, careerOn: input.settings.career, reflectOn: input.settings.discover, last: input.last
  });
  const primary = scored[0];
  const alternatives = primary ? pickAlternatives(scored, primary.p) : [];
  const later = input.catalog.programs.filter(p => input.choices[p.id] === 'later');
  return { usable, discoveries, mode, primary, alternatives, later, newCount: (primary ? 1 : 0) + alternatives.length, funnel, scored };
}

/** '관심 없음'의 이유가 다음 추천에 남기는 것 */
export function dismissEffect(kind: DislikeKind, p: Program): { dislikedField?: Field; preferEasier?: boolean } {
  if (kind === 'field') return { dislikedField: p.field };
  if (kind === 'hard') return { preferEasier: true };
  return {};
}
