import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import type { ScreenProps } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { PageHeader } from '../../components';
import { EXAMPLE_PROFILE } from '../../data/seed';
import { todayTasks } from '../../domain/recommend-flow/summary';
import { Onboarding } from './Onboarding';
import { Plaza } from './Plaza';
import { StatusCard } from './StatusCard';
import { TodayList } from './TodayList';
import './home.css';

/**
 * 홈 = 상태창 + 광장. 덩어리 셋: 왼쪽 상태창(내가 가진 것과 지금 상황), 오른쪽 위 광장(들어가는 곳 셋), 오른쪽 아래 오늘의 퀘스트.
 * 곧 있어요 타임라인과 묻기 칸은 일정·추천에 있어 홈에서 뺐다.
 */
export default function HomeScreen(_props: ScreenProps) {
  const { state, view, run } = useApp();
  // 선택할 값은 없고, 아래 흐름 화면에서 돌아왔을 때 스크롤만 되살린다.
  useOverviewState('home', null);
  const tasks = useMemo(() => todayTasks(state.activities, state.week), [state.activities, state.week]);

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

  return (
    <div className="os">
      <PageHeader title="홈" />
      <div className="os__body home-grid">
        <StatusCard />
        <Plaza />
        <TodayList tasks={tasks} first={state.activities.length === 0 ? view.primary ?? undefined : undefined} week={state.week} />
      </div>
    </div>
  );
}
