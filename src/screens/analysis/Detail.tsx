import { useApp } from '../../app/AppState';
import { Card, ErrorState, Icon, LoadingState, PageHeader, type TabItem } from '../../components';
import type { EdgeAnswers } from '../../domain/analysis/map';
import type { Level } from '../../domain/analysis/strengths';
import type { Axis } from '../../domain/types';
import ExperienceMapTab from './ExperienceMapTab';
import FlowTab from './FlowTab';
import StrengthsTab from './StrengthsTab';
import TechTreeTab from './TechTreeTab';
import type { useAnalysis } from './useAnalysis';

export type TabId = 'techtree' | 'map' | 'flow' | 'strengths';
export const TABS: TabItem<TabId>[] = [
  { id: 'techtree', label: '테크 트리' }, { id: 'map', label: '경험 지도' }, { id: 'flow', label: '관심 흐름' }, { id: 'strengths', label: '나의 강점' }
];

/** 나의 분석 하위 화면 하나. 위치와 옆 화면 이동은 사이드바가 맡아서 탭·뒤로 버튼을 두지 않는다. */
export function Detail({ tab, analysis }: { tab: TabId; analysis: ReturnType<typeof useAnalysis> }) {
  const { state, run } = useApp();
  // 연결 확인과 '내 생각'은 전역 상태에 둔다. 기록을 지우면 그 기록의 연결 답도 reducer 가 함께 지운다.
  const setAnswers = (next: (prev: EdgeAnswers) => EdgeAnswers) => run({ type: 'analysis/answers', answers: next(state.edgeAnswers) });
  const setSelf = (next: (prev: Record<Axis, Level>) => Record<Axis, Level>) => run({ type: 'analysis/self', self: next(state.selfLevels) });
  const label = TABS.find(t => t.id === tab)?.label ?? '';

  return (
    <div className="os">
      {/* 공개 범위는 요약 머리에서 한 번 말한다. 하위 화면은 같은 말 대신 아이콘만 둔다. */}
      <PageHeader title={label} actions={<span className="an-private an-private--icon" role="img" aria-label="나에게만 보여요" title="나에게만 보여요"><Icon name="eye" size={16} /></span>} />
      <div className="os__body an-detail">
        {analysis.status === 'loading' && <Card><LoadingState message="새 기록을 분석하는 중이에요" lines={5} /></Card>}
        {analysis.status === 'error' && <Card><ErrorState message="새 기록을 분석하지 못했어요. 지난 분석은 그대로예요." onRetry={analysis.retry} /></Card>}
        {analysis.status === 'ready' && tab === 'techtree' && <TechTreeTab records={analysis.records} />}
        {analysis.status === 'ready' && tab === 'map' && <ExperienceMapTab records={analysis.records} answers={state.edgeAnswers} setAnswers={setAnswers} />}
        {analysis.status === 'ready' && tab === 'flow' && <FlowTab records={analysis.records} />}
        {analysis.status === 'ready' && tab === 'strengths' && <StrengthsTab records={analysis.records} self={state.selfLevels} setSelf={setSelf} />}
      </div>
    </div>
  );
}
