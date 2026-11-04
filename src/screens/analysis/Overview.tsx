import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Card, ErrorState, GhostPic, Icon, LoadingState, PageHeader, Radar, SummaryCard } from '../../components';
import { TREE_COLUMNS, TREE_GROUPS } from '../../domain/analysis/techtree';
import { AXES, GROUP_LABEL } from '../../domain/vocab';
import { buildFlow } from '../../domain/analysis/flow';
import { recentFlow, treeGlance } from '../../domain/analysis/glance';
import { buildGraph } from '../../domain/analysis/graph';
import { semesterAxis } from '../../domain/analysis/semester';
import { buildStrengths, withAnswers } from '../../domain/analysis/strengths';
import { flowHeadline, mapHeadline, strengthGlance, treeHeadline, treeValue } from '../../domain/analysis/visual';
import { SEMESTER_FROM, SEMESTER_NOW } from '../../data/analysis';
import { DiscoveryCards } from './DiscoveryCards';
import { FlowPic, MapPic, StrengthPic, TreePic } from './Glance';
import type { useAnalysis } from './useAnalysis';
import { useTechTree } from './useTechTree';

/**
 * 나의 분석 요약: 덩어리 둘. 하위 화면 넷의 그림을 한 판(2×2)에 작게 모으고(누르면 그 하위 화면), 확인할 발견은 한 장씩 답한다.
 * 같은 곳으로 가는 다른 버튼은 두지 않는다.
 */
export function Overview({ analysis }: { analysis: ReturnType<typeof useAnalysis> }) {
  const { state } = useApp();
  useOverviewState<null>('analysis', null);
  const { records } = analysis;
  const tree = useTechTree(records);
  const glance = useMemo(() => treeGlance(tree), [tree]);
  const flow = useMemo(() => recentFlow(buildFlow(records, semesterAxis(records, SEMESTER_FROM, SEMESTER_NOW)), 5), [records]);
  const strengths = useMemo(() => buildStrengths(withAnswers(records, state.records)), [records, state.records]);
  const none = records.length === 0;
  const clusters = useMemo(() => buildGraph(records, state.edgeAnswers).clusters.length, [records, state.edgeAnswers]);
  const confirmedEv = strengths.reduce((n, r) => n + r.confirmed, 0);
  const strengthKw = strengthGlance(strengths);
  const hasStrength = (strengths[0]?.evidence.length ?? 0) > 0;

  return (
    <div className="os">
      <PageHeader title="나의 분석" actions={<p className="an-private"><Icon name="eye" size={16} />여기 있는 분석은 나에게만 보여요.</p>} />
      <div className="os__body an-sum">
        {analysis.status === 'loading' && <Card><LoadingState message="새 기록을 분석하는 중이에요" lines={5} /></Card>}
        {analysis.status === 'error' && <Card><ErrorState message="새 기록을 분석하지 못했어요. 지난 분석은 그대로예요." onRetry={analysis.retry} /></Card>}
        {analysis.status === 'ready' && (
          <>
            <section className="an-board" aria-label="내 기록 그림 넷">
              <SummaryCard href={hrefOf('analysis/techtree')} title="테크 트리" headline={treeHeadline(tree)} value={treeValue(tree)} visual={none ? <GhostPic kind="branches" labels={TREE_GROUPS.slice(0, 3).map(g => GROUP_LABEL[g])} cols={[...TREE_COLUMNS]} /> : <TreePic rows={glance.rows} />} />
              <SummaryCard href={hrefOf('analysis/map')} title="경험 지도" headline={mapHeadline(records, state.edgeAnswers)} value={none ? undefined : `묶음 ${clusters}개`} visual={none ? <GhostPic kind="network" /> : <MapPic records={records} answers={state.edgeAnswers} />} />
              <SummaryCard href={hrefOf('analysis/flow')} title="관심 흐름" headline={flowHeadline(flow)} value={flow.length ? `기록 있는 학기 ${flow.length}개` : undefined} visual={none ? <GhostPic kind="bars" labels={[SEMESTER_NOW.replace(/^20/, '')]} /> : <FlowPic rows={flow} />} />
              <SummaryCard href={hrefOf('analysis/strengths')} title="나의 강점" headline={<span className={strengthKw.estimated ? 'an-kw is-est' : 'an-kw'}>{strengthKw.text}</span>} value={confirmedEv ? `확인한 근거 ${confirmedEv}개` : undefined} visual={hasStrength ? <StrengthPic rows={strengths} /> : <span className="an-spic an-spic--ghost"><Radar empty vertices={AXES.map(a => ({ key: a.id, name: a.label, solid: 0, dashed: 0, sub: '' }))} max={4} ticks={[2, 4]} label="역량 여섯 개의 빈 육각형" radius={36} mini /></span>} />
            </section>
            <DiscoveryCards />
          </>
        )}
      </div>
    </div>
  );
}
