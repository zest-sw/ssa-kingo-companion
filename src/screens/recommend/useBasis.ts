import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { newcomerOf, type Newcomer } from '../../domain/recommend-flow/trace';
import type { RecordItem } from '../../domain/types';

/** 추천 근거에 쓰는 것: '추천에 쓰기'를 켠 기록과, 기록이 없을 때 설명에 쓰는 목표·관심. 고르기 카드·자세히·비교 표가 같이 쓴다. */
export function useBasis(): { records: RecordItem[]; newcomer: Newcomer } {
  const { state, view } = useApp();
  const newcomer = useMemo(() => newcomerOf(state.profile, view.scored.map(s => s.p)), [state.profile, view.scored]);
  return { records: view.usable, newcomer };
}
