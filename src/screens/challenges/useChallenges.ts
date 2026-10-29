import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { useToast } from '../../components';
import { evaluate, newlyAchieved, type ChallengeResult } from '../../domain/challenges';
import { CHALLENGES, type ChallengeInfo } from '../../data/challenges';
import { PROGRAM_BY_ID } from '../../data/catalog';

// 달성 시각과 알림 여부는 이번 세션 동안만 기억한다(저장소가 없는 프로토타입).
// ponytail: 도전 과제 화면이 열려 있을 때만 알린다. 어느 화면에서든 알리려면 앱 틀에서 이 훅을 불러야 한다.
const achievedAt = new Map<string, Date>();

export type ChallengeView = ChallengeResult<ChallengeInfo> & { achievedAt?: Date };

export const formatWhen = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** 전역 상태에서 도전 과제 달성을 계산하고, 새로 달성하면 한 줄 토스트를 띄운다. */
export function useChallenges(): ChallengeView[] {
  const { state } = useApp();
  const toast = useToast();
  const [, bump] = useState(0);

  const results = useMemo(
    () => evaluate(CHALLENGES, { records: state.records, activities: state.activities, programs: PROGRAM_BY_ID }),
    [state.records, state.activities]
  );

  useEffect(() => {
    const fresh = newlyAchieved(results, new Set(achievedAt.keys()));
    // 달성이 풀린 과제(기록 삭제 등)는 시각을 지워 다시 달성하면 새로 알린다.
    results.filter(r => !r.achieved && achievedAt.has(r.def.id)).forEach(r => achievedAt.delete(r.def.id));
    if (!fresh.length) return;
    const now = new Date();
    fresh.forEach(r => achievedAt.set(r.def.id, now));
    const first = fresh[0].def;
    toast(fresh.length === 1 ? `‘${first.name}’을 달성했어요. ${first.praise}` : `‘${first.name}’ 외 ${fresh.length - 1}개를 달성했어요.`);
    bump(n => n + 1);
  }, [results, toast]);

  return results.map(r => ({ ...r, achievedAt: achievedAt.get(r.def.id) }));
}
