import { useEffect, useRef } from 'react';
import { navigate, queryOf, useQuery, withQuery } from './router';

/**
 * 흐름 화면(신청 준비, 회고 인터뷰)의 단계를 주소 뒤 ?step= 에 남긴다. 브라우저 뒤로 가기가 흐름을 통째로 빠져나가지 않고 앞 단계로 간다.
 * - 화면이 단계를 바꾸면 기록을 하나 쌓는다(첫 단계는 주소에 쓰지 않는다).
 * - 주소가 바뀌면(뒤로·앞으로) onStep 으로 알린다. 화면은 그 단계를 그리거나, 이미 끝난 흐름이면 다른 곳으로 보낸다.
 * - 처음 그릴 때는 화면 단계가 이긴다(이어 하기로 되살린 단계). 주소만 그 단계로 바꿔 쓴다(기록은 쌓지 않는다).
 */
export function useStepInUrl<T extends string>(step: T, steps: readonly T[], onStep: (s: T) => void) {
  const parse = (q: URLSearchParams): T => {
    const raw = q.get('step');
    return raw !== null && (steps as readonly string[]).includes(raw) ? (raw as T) : steps[0];
  };
  const inUrl = parse(useQuery());
  // 주소에 반영된 단계. 화면 단계와 주소 단계 중 누가 바뀌었는지 가린다.
  const synced = useRef<T | null>(null);
  const handler = useRef(onStep);
  handler.current = onStep;

  useEffect(() => {
    const first = synced.current === null;
    if (!first && step === synced.current) return;
    synced.current = step;
    if (inUrl !== step) navigate(stepHref(location.hash, step === steps[0] ? undefined : step), { replace: first });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = useRef(false);
  useEffect(() => {
    // 첫 그림에서는 위 효과가 주소를 화면 단계로 맞추는 중이라 건너뛴다.
    if (!ready.current) { ready.current = true; return; }
    // 그린 뒤 주소가 이미 또 바뀌었으면(이 화면이 방금 다음 단계로 옮김) 지난 값이라 따르지 않는다.
    if (inUrl === synced.current || parse(queryOf(location.hash)) !== inUrl) return;
    synced.current = inUrl;
    handler.current(inUrl);
  }, [inUrl]);
}

/** 지금 주소에서 step 만 바꾼 경로. stepHref('#/recommend/prepare/p-1?x=1', 'draft') = 'recommend/prepare/p-1?x=1&step=draft' */
export function stepHref(hash: string, step: string | undefined): string {
  const [path] = hash.replace(/^#?\/?/, '').split('?');
  const q = Object.fromEntries(queryOf(hash));
  return withQuery(path, { ...q, step });
}
