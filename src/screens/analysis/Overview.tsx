import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Card, CountBadge, ErrorState, Icon, LoadingState, MiniTile, PageHeader } from '../../components';
import { buildFlow } from '../../domain/analysis/flow';
import { pendingCount, recentFlow, seenAxes, treeGlance } from '../../domain/analysis/glance';
import { buildMap } from '../../domain/analysis/map';
import { semesterAxis } from '../../domain/analysis/semester';
import { buildStrengths } from '../../domain/analysis/strengths';
import { SEMESTER_FROM, SEMESTER_NOW } from '../../data/analysis';
import { EmptyPic, FlowPic, MapPic, StrengthPic, TreePic } from './Glance';
import type { useAnalysis } from './useAnalysis';
import { useTechTree } from './useTechTree';

/** 나의 분석 L1: 네 개의 작은 그림. 누르면 해당 L2 탭으로 간다. */
export function Overview({ analysis }: { analysis: ReturnType<typeof useAnalysis> }) {
  const { state, view } = useApp();
  useOverviewState<null>('analysis', null);
  const { records } = analysis;
  const tree = useTechTree(records);
  const glance = useMemo(() => treeGlance(tree), [tree]);
  const map = useMemo(() => buildMap(records), [records]);
  const flow = useMemo(() => recentFlow(buildFlow(records, semesterAxis(records, SEMESTER_FROM, SEMESTER_NOW)), 5), [records]);
  const strengths = useMemo(() => buildStrengths(records, state.selfLevels), [records, state.selfLevels]);
  const pending = pendingCount(view.discoveries, state.confirm);
  const none = records.length === 0;

  return (
    <>
      <PageHeader title="나의 분석" />
      {analysis.status === 'loading' && <Card><LoadingState message="새 기록을 분석하는 중이에요" lines={5} /></Card>}
      {analysis.status === 'error' && <Card><ErrorState message="새 기록을 분석하지 못했어요. 지난 분석은 그대로예요." onRetry={analysis.retry} /></Card>}
      {analysis.status === 'ready' && (
        <>
          {pending > 0 && (
            <a className="an-strip" href={hrefOf('analysis/map')}>
              <Icon name="sparkle" size={16} />
              <span>확인할 발견 <b className="num">{pending}</b>개</span>
              <Icon name="chevron" size={16} />
            </a>
          )}
          <div className="an-tiles">
            <MiniTile href={hrefOf('analysis/techtree')} title="테크 트리" line={none ? '회고를 쓰면 칸이 채워져요' : `해 본 칸 ${glance.filled}개 · 안 해 본 분야 ${glance.blankRows}개`}>
              <TreePic rows={glance.rows} />
            </MiniTile>
            <MiniTile
              href={hrefOf('analysis/map')} title="경험 지도" badge={<CountBadge count={pending} label="확인할 발견" />}
              line={none ? '회고를 쓰면 점이 이어져요' : `기록 ${map.nodes.length}개 · 연결 ${map.edges.length}개`}
            >
              {none ? <EmptyPic text="아직 기록이 없어요" /> : <MapPic records={records} answers={state.edgeAnswers} />}
            </MiniTile>
            <MiniTile href={hrefOf('analysis/flow')} title="관심 흐름" line={none ? '학기마다 쓴 시간이 보여요' : `기록이 있는 학기 ${flow.length}개`}>
              {none ? <EmptyPic text="아직 기록이 없어요" /> : <FlowPic rows={flow} />}
            </MiniTile>
            <MiniTile href={hrefOf('analysis/strengths')} title="나의 강점" line={none ? '내 생각과 기록을 견줘 봐요' : `기록에서 보인 역량 ${seenAxes(strengths)}개`}>
              <StrengthPic rows={strengths} />
            </MiniTile>
          </div>
        </>
      )}
    </>
  );
}
