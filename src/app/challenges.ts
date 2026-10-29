import { useEffect, useMemo } from 'react';
import { useToast } from '../components';
import { evaluate, newlyAchieved, type ChallengeResult } from '../domain/challenges';
import { CHALLENGES, type ChallengeInfo } from '../data/challenges';
import { PROGRAM_BY_ID } from '../data/catalog';
import { useApp } from './AppState';

export type ChallengeView = ChallengeResult<ChallengeInfo> & { achievedAt?: Date };

/** 전역 상태에서 계산한 도전 과제 달성. 도전 과제·친구 화면이 함께 쓴다. */
export function useChallenges(): ChallengeView[] {
  const { state } = useApp();
  const results = useMemo(
    () => evaluate(CHALLENGES, { records: state.records, activities: state.activities, programs: PROGRAM_BY_ID }),
    [state.records, state.activities]
  );
  return useMemo(
    () => results.map(r => {
      const at = r.achieved ? state.challengeAt[r.def.id] : undefined;
      return { ...r, achievedAt: at === undefined ? undefined : new Date(at) };
    }),
    [results, state.challengeAt]
  );
}

/** 앱 틀에서 부른다: 어느 화면에 있든 처음 달성한 과제를 한 줄 토스트로 알린다. 한 번 알린 과제는 다시 알리지 않는다. */
export function useChallengeToasts() {
  const { state, run } = useApp();
  const toast = useToast();
  const items = useChallenges();
  useEffect(() => {
    const fresh = newlyAchieved(items, new Set(Object.keys(state.challengeAt)));
    if (!fresh.length) return;
    run({ type: 'challenge/achieve', ids: fresh.map(r => r.def.id), at: Date.now() });
    const first = fresh[0].def;
    toast(fresh.length === 1 ? `‘${first.name}’을 달성했어요. ${first.praise}` : `‘${first.name}’ 외 ${fresh.length - 1}개를 달성했어요.`);
  }, [items, state.challengeAt, run, toast]);
}
