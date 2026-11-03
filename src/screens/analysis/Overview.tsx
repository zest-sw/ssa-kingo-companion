import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Card, ErrorState, GhostPic, LoadingState, PageHeader, SummaryCard } from '../../components';
import { TREE_COLUMNS, TREE_GROUPS } from '../../domain/analysis/techtree';
import { AXES, GROUP_LABEL } from '../../domain/vocab';
import { buildFlow } from '../../domain/analysis/flow';
import { recentFlow, seenAxes, treeGlance } from '../../domain/analysis/glance';
import { buildMap } from '../../domain/analysis/map';
import { semesterAxis } from '../../domain/analysis/semester';
import { buildStrengths } from '../../domain/analysis/strengths';
import { flowHeadline, mapHeadline, strengthHeadline, treeHeadline, treeValue } from '../../domain/analysis/visual';
import { edgeState } from '../../domain/analysis/map';
import { SEMESTER_FROM, SEMESTER_NOW } from '../../data/analysis';
import { DiscoveryCards } from './DiscoveryCards';
import { FlowPic, MapPic, StrengthPic, TreePic } from './Glance';
import type { useAnalysis } from './useAnalysis';
import { useTechTree } from './useTechTree';

/**
 * 나의 분석 요약: 하위 화면 넷마다 그 학생의 기록을 그린 그림(카드 대부분) + 키워드 한 줄. 누르면 그 하위 화면.
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
  const confirmed = map.edges.filter(e => edgeState(e, state.edgeAnswers) === 'confirmed').length;
  const seen = strengths.filter(r => r.count > 0).length;

  return (
    <div className="os">
      <PageHeader title="나의 분석" />
      <div className="os__body an-sum">
        {analysis.status === 'loading' && <Card><LoadingState message="새 기록을 분석하는 중이에요" lines={5} /></Card>}
        {analysis.status === 'error' && <Card><ErrorState message="새 기록을 분석하지 못했어요. 지난 분석은 그대로예요." onRetry={analysis.retry} /></Card>}
        {analysis.status === 'ready' && (
          <>
            <div className="an-tiles">
              <SummaryCard href={hrefOf('analysis/techtree')} title="테크 트리" headline={treeHeadline(tree)} value={treeValue(tree)} visual={none ? <GhostPic kind="grid" labels={TREE_GROUPS.slice(0, 3).map(g => GROUP_LABEL[g])} cols={[...TREE_COLUMNS]} /> : <TreePic rows={glance.rows} />} />
              <SummaryCard href={hrefOf('analysis/map')} title="경험 지도" headline={mapHeadline(records)} value={none ? undefined : `확인한 연결 ${confirmed}개`} visual={none ? <GhostPic kind="network" /> : <MapPic records={records} answers={state.edgeAnswers} />} />
              <SummaryCard href={hrefOf('analysis/flow')} title="관심 흐름" headline={flowHeadline(flow)} value={flow.length ? `기록 있는 학기 ${flow.length}개` : undefined} visual={none ? <GhostPic kind="bars" labels={[SEMESTER_NOW.replace(/^20/, '')]} /> : <FlowPic rows={flow} />} />
              <SummaryCard href={hrefOf('analysis/strengths')} title="나의 강점" headline={strengthHeadline(strengths)} value={seen ? `기록에서 보인 역량 ${seen}개` : undefined} visual={seenAxes(strengths) ? <StrengthPic rows={strengths} /> : <GhostPic kind="bars" labels={AXES.slice(0, 3).map(a => a.label)} />} />
            </div>
            <DiscoveryCards />
          </>
        )}
      </div>
    </div>
  );
}
