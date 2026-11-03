import { useApp } from '../../app/AppState';
import type { ScreenProps } from '../../app/router';
import { Detail, TABS } from './Detail';
import { Overview } from './Overview';
import { useAnalysis } from './useAnalysis';
import '../fit.css';
import './analysis.css';

/** '#/analysis/map/x' 의 'map/x' 에서 첫 토막만 본다. 모르는 값이면 undefined(L1). */
const tabOf = (sub?: string) => TABS.find(t => t.id === sub?.split('/')[0])?.id;

export default function AnalysisScreen({ sub }: ScreenProps) {
  const { state } = useApp();
  const analysis = useAnalysis(state.records);
  const tab = tabOf(sub);
  return tab ? <Detail tab={tab} analysis={analysis} /> : <Overview analysis={analysis} />;
}
