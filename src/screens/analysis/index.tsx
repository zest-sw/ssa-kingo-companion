import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { Card, ErrorState, Icon, LoadingState, PageHeader, TabPanel, Tabs, type TabItem } from '../../components';
import type { EdgeAnswers } from '../../domain/analysis/map';
import type { Level } from '../../domain/analysis/strengths';
import type { Axis } from '../../domain/types';
import { INITIAL_SELF, SEMESTER_NOW } from '../../data/analysis';
import { semesterLabel } from '../../domain/analysis/semester';
import ExperienceMapTab from './ExperienceMapTab';
import FlowTab from './FlowTab';
import StrengthsTab from './StrengthsTab';
import TechTreeTab from './TechTreeTab';
import { useAnalysis } from './useAnalysis';
import { useKept } from './useKept';
import './analysis.css';

type TabId = 'techtree' | 'map' | 'flow' | 'strengths';
const TABS: TabItem<TabId>[] = [
  { id: 'techtree', label: '테크 트리' }, { id: 'map', label: '경험 지도' }, { id: 'flow', label: '관심 흐름' }, { id: 'strengths', label: '나의 강점' }
];

/** '#/analysis/map/x' 의 'map/x' 에서 첫 토막만 본다. 모르는 값이면 기본 탭. */
const tabOf = (sub?: string): TabId => TABS.find(t => t.id === sub?.split('/')[0])?.id ?? 'techtree';

export default function AnalysisScreen({ sub }: ScreenProps) {
  const { state } = useApp();
  const analysis = useAnalysis(state.records);
  const tab = tabOf(sub);
  const [answers, setAnswers] = useKept<EdgeAnswers>('edge-answers', {});
  const [self, setSelf] = useKept<Record<Axis, Level>>('self-levels', INITIAL_SELF);

  return (
    <>
      <PageHeader eyebrow={`${semesterLabel(SEMESTER_NOW)} · 나의 분석`} title="나의 분석" />
      <p className="an-private"><Icon name="lock" size={16} />여기 있는 분석은 나에게만 보여요.</p>
      <Tabs id="analysis" label="나의 분석" items={TABS} value={tab} onChange={id => navigate(`analysis/${id}`)} />
      <TabPanel id="analysis" active={tab}>
        {analysis.status === 'loading' && (
          <Card><LoadingState message="새 기록을 분석하는 중이에요" lines={5} /></Card>
        )}
        {analysis.status === 'error' && (
          <Card><ErrorState message="새 기록을 분석하지 못했어요. 지난 분석은 그대로예요." onRetry={analysis.retry} /></Card>
        )}
        {analysis.status === 'ready' && tab === 'techtree' && <TechTreeTab records={analysis.records} />}
        {analysis.status === 'ready' && tab === 'map' && <ExperienceMapTab records={analysis.records} answers={answers} setAnswers={setAnswers} />}
        {analysis.status === 'ready' && tab === 'flow' && <FlowTab records={analysis.records} />}
        {analysis.status === 'ready' && tab === 'strengths' && <StrengthsTab records={analysis.records} self={self} setSelf={setSelf} />}
      </TabPanel>
    </>
  );
}
