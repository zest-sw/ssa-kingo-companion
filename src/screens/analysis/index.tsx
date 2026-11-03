import { useApp } from '../../app/AppState';
import type { ScreenProps } from '../../app/router';
import { Detail, TABS } from './Detail';
import { Overview } from './Overview';
import { useAnalysis } from './useAnalysis';
import './analysis.css';

/** '#/analysis/map' 의 'map'. 모르는 값이면 undefined(요약). 모르는 경로의 주소는 앱 틀이 바꿔 둔다(canonicalPath). */
const tabOf = (sub?: string) => TABS.find(t => t.id === sub?.split('/')[0])?.id;

export default function AnalysisScreen({ sub }: ScreenProps) {
  const { state } = useApp();
  const analysis = useAnalysis(state.records);
  const tab = tabOf(sub);
  return tab ? <Detail tab={tab} analysis={analysis} /> : <Overview analysis={analysis} />;
}
