import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, EmptyState, PageHeader } from '../../components';
import { EXAMPLE_PROFILE } from '../../data/seed';
import { agentLine, todayTasks } from '../../domain/recommend-flow/summary';
import { upcomingItems } from '../../domain/recommend-flow/upcoming';
import { useTriage } from '../recommend/useTriage';
import { AskBar } from './AskBar';
import { HomePick } from './HomePick';
import { Onboarding } from './Onboarding';
import { TodayList } from './TodayList';
import { Upcoming } from './Upcoming';
import './home.css';

export default function HomeScreen(_props: ScreenProps) {
  const { state, view, run } = useApp();
  // 선택할 값은 없고, 아래 흐름 화면에서 돌아왔을 때 스크롤만 되살린다.
  useOverviewState('home', null);
  const { actions, dialogs } = useTriage();

  const tasks = useMemo(() => todayTasks(state.activities, state.week), [state.activities, state.week]);
  const upcoming = useMemo(
    () => upcomingItems(state.activities, view.primary ? [view.primary, ...view.alternatives] : [], state.week),
    [state.activities, view.primary, view.alternatives, state.week]
  );

  if (!state.onboarded) {
    return (
      <div className="os">
        <div className="os__body home-onbwrap">
          <Onboarding
            onDone={profile => run({ type: 'profile/complete', profile, demo: false })}
            onExample={() => run({ type: 'profile/complete', profile: EXAMPLE_PROFILE, demo: true }, { toast: '예시 프로필로 둘러보고 있어요. 프로필은 언제든 바꿀 수 있어요.' })}
          />
        </div>
      </div>
    );
  }

  const top = view.primary;
  return (
    <div className="os">
      <PageHeader title="홈" actions={<AskBar />} />
      <div className="os__body home-grid">
        <TodayList tasks={tasks} fresh={state.activities.length === 0} agent={agentLine(view.funnel, state.activities)} />
        <Card className="home-top" aria-label="가장 추천">
          {top ? (
            <HomePick pick={top} alternatives={view.alternatives} week={state.week} records={state.records} actions={actions} />
          ) : (
            <EmptyState icon="compass" message="지금은 맞는 후보가 없어요. 관심 분야나 시간을 바꿔 보세요." action={<Button size="sm" onClick={() => navigate('settings/profile')}>관심 분야·시간 바꾸기</Button>} />
          )}
        </Card>
        <Upcoming items={upcoming} week={state.week} />
      </div>
      {dialogs}
    </div>
  );
}
