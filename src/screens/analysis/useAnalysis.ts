import { useCallback, useEffect, useRef, useState } from 'react';
import { recordsSig } from '../../domain/analysis/refresh';
import type { RecordItem } from '../../domain/types';
import { ANALYSIS_DELAY_MS, ANALYSIS_FAIL_KEY } from '../../data/analysis';

export type AnalysisStatus = 'ready' | 'loading' | 'error';
type Snapshot = { sig: string; records: RecordItem[] };

// 화면을 떠났다 돌아와도 '마지막으로 분석한 기록'을 기억한다. 그 사이 기록이 바뀌었으면 돌아왔을 때 다시 분석한다.
let analyzed: Snapshot | null = null;

const shouldFail = () => {
  // 실패 확인용 스위치는 개발 중에만 읽는다.
  if (!import.meta.env.DEV) return false;
  try { return localStorage.getItem(ANALYSIS_FAIL_KEY) === '1'; } catch { return false; }
};
const clearFail = () => {
  try { localStorage.removeItem(ANALYSIS_FAIL_KEY); } catch { /* 저장소를 못 쓰면 그대로 둔다 */ }
};

/**
 * 기록이 바뀌면 '분석 중' 뒤에 갱신한다. 실제로는 대형 모델이 비동기로 분석하고 결과를 미리 저장해 둔다.
 * 돌려주는 records 는 마지막으로 분석을 마친 기록이다.
 */
export function useAnalysis(records: RecordItem[]) {
  const sig = recordsSig(records);
  const [snap, setSnap] = useState<Snapshot>(() => analyzed ?? { sig, records });
  const [status, setStatus] = useState<AnalysisStatus>(() => (analyzed && analyzed.sig !== sig ? 'loading' : 'ready'));
  const latest = useRef({ sig, records });
  latest.current = { sig, records };
  const timer = useRef<number>(0);

  const run = useCallback((ignoreFail: boolean) => {
    window.clearTimeout(timer.current);
    setStatus('loading');
    const target = latest.current;
    timer.current = window.setTimeout(() => {
      if (!ignoreFail && shouldFail()) { setStatus('error'); return; }
      clearFail();
      analyzed = { ...target };
      setSnap(analyzed);
      setStatus('ready');
    }, ANALYSIS_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!analyzed) analyzed = { sig, records };
    if (snap.sig !== sig) run(false);
    return () => window.clearTimeout(timer.current);
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  // 기록이 바뀐 바로 그 렌더부터 로딩으로 본다. 그래야 reset·restore 직후에 이전 분석이 잠깐 비치지 않는다.
  const stale = snap.sig !== sig && status === 'ready';
  return { status: stale ? ('loading' as AnalysisStatus) : status, records: snap.records, retry: () => run(true) };
}
