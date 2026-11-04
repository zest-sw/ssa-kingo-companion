import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { PROGRAMS } from '../../data/catalog';
import { buildTechTree, type TechTree } from '../../domain/analysis/techtree';
import { ddayOf } from '../../domain/recommend';
import type { RecordItem } from '../../domain/types';

/**
 * 테크 트리. 지금 할 수 있는 활동은 추천 화면과 같은 목록이다(점수는 쓰지 않는다). L1 축소판과 L2 가 함께 쓴다.
 * 카탈로그는 기록의 난이도(연결된 기회)와 건너뛴 단계의 대표 기회 이름에 쓴다.
 */
export function useTechTree(records: RecordItem[]): TechTree {
  const { state, view } = useApp();
  const candidates = useMemo(() => view.scored.map(s => ({ program: s.p, dday: ddayOf(s.p, state.week) })), [view.scored, state.week]);
  return useMemo(() => buildTechTree({ records, activities: state.activities, candidates, programs: PROGRAMS }), [records, state.activities, candidates]);
}
