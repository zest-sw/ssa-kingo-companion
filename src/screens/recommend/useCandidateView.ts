import { useApp } from '../../app/AppState';
import { CATALOG } from '../../data/catalog';
import { buildCandidates, type CandidateView } from '../../domain/candidates';
import { effectiveChoices } from '../../domain/recommend-flow/flow';
import { laterUntil } from './laterStore';

/** 전역 후보(view)에서, 나중에 보기로 고른 날이 된 활동을 다시 후보에 넣은 것. 만료가 없으면 전역 값을 그대로 쓴다. */
export function useCandidateView(): CandidateView {
  const { state, view } = useApp();
  const choices = effectiveChoices(state.choices, laterUntil, state.week);
  if (Object.keys(choices).length === Object.keys(state.choices).length) return view;
  return buildCandidates({
    catalog: CATALOG, week: state.week, profile: state.profile, records: state.records, confirm: state.confirm, settings: state.settings,
    choices, dislikedFields: state.dislikedFields, preferEasier: state.preferEasier, last: state.lastDone
  });
}
