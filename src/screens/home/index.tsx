import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, Button, Card, EmptyState, FieldTag, PageHeader } from '../../components';
import { EXAMPLE_PROFILE } from '../../data/seed';
import { ddayOf } from '../../domain/recommend';
import { candidateHref, isNearDeadline, prepareHref } from '../../domain/recommend-flow/flow';
import { upcomingItems } from '../../domain/recommend-flow/upcoming';
import { ddayText } from '../../domain/text';
import { TopPick } from '../recommend/TopPick';
import { AskBar } from './AskBar';
import { Onboarding } from './Onboarding';
import { Upcoming } from './Upcoming';
import './home.css';

export default function HomeScreen(_props: ScreenProps) {
  const { state, view, run } = useApp();
  // 선택할 값은 없고, 아래 흐름 화면에서 돌아왔을 때 스크롤만 되살린다.
  useOverviewState('home', null);

  const upcoming = useMemo(
    () => upcomingItems(state.activities, view.primary ? [view.primary, ...view.alternatives] : [], state.week),
    [state.activities, view.primary, view.alternatives, state.week]
  );

  if (!state.onboarded) {
    return (
      <Onboarding
        onDone={profile => run({ type: 'profile/complete', profile })}
        onExample={() => run({ type: 'profile/complete', profile: EXAMPLE_PROFILE }, { toast: '예시 프로필로 둘러보고 있어요. 프로필은 언제든 바꿀 수 있어요.' })}
      />
    );
  }

  const top = view.primary;
  const prepare = () => {
    if (!top) return;
    run({ type: 'candidate/choose', programId: top.p.id, choice: 'preparing' });
    navigate(prepareHref(top.p.id));
  };
  const pending = state.activities.filter(a => a.status === 'ended').length;

  return (
    <>
      <PageHeader title="나의 상태창" actions={pending > 0 && <Button variant="primary" icon="pencil" onClick={() => navigate('activities/records/interview')}>회고 쓰기</Button>} />
      <AskBar />
      <div className="home-l1">
        <div className="home-l1__main">
          <Card className="home-top" aria-label="이번에 할 것">
            {top ? (
              <TopPick pick={top} week={state.week} onPrepare={prepare} href={candidateHref(top.p.id)} />
            ) : (
              <EmptyState icon="compass" message="지금은 맞는 후보가 없어요. 관심 분야나 시간을 바꿔 보세요." action={<Button size="sm" onClick={() => navigate('settings/profile')}>관심 분야·시간 바꾸기</Button>} />
            )}
          </Card>
          <ul className="home-alts" aria-label="다른 대안">
            {view.alternatives.slice(0, 2).map(a => {
              const d = ddayOf(a.p, state.week);
              return (
                <li key={a.p.id}>
                  <button type="button" className="home-alt" onClick={() => navigate(candidateHref(a.p.id))}>
                    <FieldTag field={a.p.field} />
                    <span className="home-alt__title">{a.p.title}</span>
                    <Badge tone={isNearDeadline(d) ? 'orange' : 'neutral'}>{ddayText(d)}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="home-l1__side">
          <Upcoming items={upcoming} week={state.week} />
        </div>
      </div>
    </>
  );
}
