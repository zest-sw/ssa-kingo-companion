import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import type { ScreenProps } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { PageHeader } from '../../components';
import { EXAMPLE_PROFILE } from '../../data/seed';
import { weekTasks } from '../../domain/homeStatus';
import { NextCard } from './NextCard';
import { Onboarding } from './Onboarding';
import { OnboardingResult } from './onboarding/Result';
import { Plaza } from './Plaza';
import { StatusCard } from './StatusCard';
import { TodayList } from './TodayList';
import './home.css';
import '../sizes.css';

/**
 * 홈은 층 셋 + 광장. 위: 내 상태(낮은 띠). 아래 왼쪽: 제안(다음 한 걸음)과 광장. 아래 오른쪽: 할 일(오늘의 퀘스트).
 * 역할이 다른 것을 한 카드에 섞지 않는다(토스뱅크 「방해하지 않고, 눈에 띌 수 있을까」). 두 열의 아래 끝은 같다.
 */
export default function HomeScreen(_props: ScreenProps) {
  const { state, run } = useApp();
  // 선택할 값은 없고, 아래 흐름 화면에서 돌아왔을 때 스크롤만 되살린다.
  useOverviewState('home', null);
  // 가입 인터뷰를 막 마쳤으면 홈 대신 끝 장면 한 번. 프로필은 이미 저장했다(다른 곳으로 가도 남는다).
  const [justDone, setJustDone] = useState(false);
  const groups = useMemo(() => weekTasks(state.activities, state.week), [state.activities, state.week]);

  if (!state.onboarded || justDone) {
    return (
      <div className="os">
        <div className="os__body home-onbwrap">
          {justDone ? <OnboardingResult onHome={() => setJustDone(false)} /> : (
            <Onboarding
              onDone={profile => { run({ type: 'profile/complete', profile, demo: false }); setJustDone(true); }}
              onExample={() => run({ type: 'profile/complete', profile: EXAMPLE_PROFILE, demo: true }, { toast: '예시 학생으로 둘러보고 있어요.' })}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="os" data-width="cap">
      <PageHeader title="홈" />
      <div className="os__body home-grid" data-new={state.records.length === 0 || undefined}>
        <StatusCard />
        <div className="home-side">
          <NextCard />
          <Plaza />
        </div>
        <TodayList groups={groups} />
      </div>
    </div>
  );
}
