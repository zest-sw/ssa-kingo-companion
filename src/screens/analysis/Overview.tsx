import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Card, ErrorState, LoadingState, PageHeader, SummaryCard } from '../../components';
import { buildFlow } from '../../domain/analysis/flow';
import { recentFlow, seenAxes, treeGlance } from '../../domain/analysis/glance';
import { flowInsight, mapInsight, strengthInsight, treeInsight } from '../../domain/analysis/insight';
import { buildMap } from '../../domain/analysis/map';
import { semesterAxis } from '../../domain/analysis/semester';
import { buildStrengths } from '../../domain/analysis/strengths';
import { SEMESTER_FROM, SEMESTER_NOW } from '../../data/analysis';
import { DiscoveryCards } from './DiscoveryCards';
import { FlowPic, MapPic, StrengthPic, TreePic } from './Glance';
import type { useAnalysis } from './useAnalysis';
import { useTechTree } from './useTechTree';

/**
 * 나의 분석 요약: 하위 화면 넷마다 그 학생의 기록에서 계산한 한 줄 통찰 카드(누르면 그 하위 화면).
 * 확인할 발견은 여기서 질문 카드로 바로 답한다. 같은 곳으로 가는 다른 버튼은 두지 않는다.
 */
export function Overview({ analysis }: { analysis: ReturnType<typeof useAnalysis> }) {
  const { state } = useApp();
  useOverviewState<null>('analysis', null);
  const { records } = analysis;
  const tree = useTechTree(records);
  const glance = useMemo(() => treeGlance(tree), [tree]);
  const map = useMemo(() => buildMap(records), [records]);
  const flow = useMemo(() => recentFlow(buildFlow(records, semesterAxis(records, SEMESTER_FROM, SEMESTER_NOW)), 5), [records]);
  const strengths = useMemo(() => buildStrengths(records, state.selfLevels), [records, state.selfLevels]);
  const none = records.length === 0;

  const t = treeInsight(tree);
  const m = mapInsight(map, state.edgeAnswers);
  const f = flowInsight(flow);
  const s = strengthInsight(strengths);

  return (
    <>
      <PageHeader title="나의 분석" />
      {analysis.status === 'loading' && <Card><LoadingState message="새 기록을 분석하는 중이에요" lines={5} /></Card>}
      {analysis.status === 'error' && <Card><ErrorState message="새 기록을 분석하지 못했어요. 지난 분석은 그대로예요." onRetry={analysis.retry} /></Card>}
      {analysis.status === 'ready' && (
        <div className="an-stack an-stack--lg">
          <div className="an-tiles">
            <SummaryCard href={hrefOf('analysis/techtree')} title="테크 트리" sentence={t.sentence} value={t.value} aid={none ? undefined : <span className="an-aid"><TreePic rows={glance.rows} /></span>} />
            <SummaryCard href={hrefOf('analysis/map')} title="경험 지도" sentence={m.sentence} value={m.value} aid={none ? undefined : <span className="an-aid"><MapPic records={records} answers={state.edgeAnswers} /></span>} />
            <SummaryCard href={hrefOf('analysis/flow')} title="관심 흐름" sentence={f.sentence} value={f.value} aid={none ? undefined : <span className="an-aid"><FlowPic rows={flow} /></span>} />
            <SummaryCard href={hrefOf('analysis/strengths')} title="나의 강점" sentence={s.sentence} value={s.value} aid={seenAxes(strengths) ? <span className="an-aid"><StrengthPic rows={strengths} /></span> : undefined} />
          </div>
          <DiscoveryCards />
        </div>
      )}
    </>
  );
}
