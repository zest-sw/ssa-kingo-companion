import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { Badge, Button, PageHeader, Stat } from '../../components';
import { EXAMPLE_PROFILE } from '../../data/seed';
import { dueToday, evidenceRows, homeCounts, interestFlow, pendingDiscovery, weeklyItems } from '../../domain/recommend-flow/home';
import { useCandidateView } from '../recommend/useCandidateView';
import { Onboarding } from './Onboarding';
import { DiscoveryPanel, EvidencePanel, FlowPanel, WeeklyPanel } from './Panels';
import './home.css';

export default function HomeScreen(_props: ScreenProps) {
  const { state, discStateOf, run } = useApp();
  const view = useCandidateView();

  const counts = useMemo(() => homeCounts(state.activities, view.newCount, view.discoveries, discStateOf), [state.activities, view.newCount, view.discoveries, discStateOf]);
  const rows = useMemo(() => evidenceRows(state.records, view.discoveries, discStateOf), [state.records, view.discoveries, discStateOf]);
  const flow = useMemo(() => interestFlow(state.records), [state.records]);
  const pending = pendingDiscovery(view.discoveries, discStateOf);

  if (!state.onboarded) {
    return (
      <Onboarding
        onDone={profile => run({ type: 'profile/complete', profile })}
        onExample={() => run({ type: 'profile/complete', profile: EXAMPLE_PROFILE }, { toast: '예시 프로필로 둘러보고 있어요. 프로필은 언제든 바꿀 수 있어요.' })}
      />
    );
  }

  const today = dueToday(state.activities);
  const weekly = weeklyItems(view.primary, view.alternatives);

  return (
    <>
      <PageHeader
        eyebrow="2026-2학기"
        title="나의 상태창"
        actions={
          <>
            {today?.due && <span className="home-today"><Badge tone="solid-orange">오늘</Badge>{today.title} {today.due.label}</span>}
            <Button variant="primary" icon="pencil" onClick={() => navigate('records')}>회고 쓰기</Button>
          </>
        }
      />
      <div className="home-grid">
        <section className="home-stats" aria-label="이번 학기 숫자">
          <div className="home-stat"><Stat label="이번 학기 활동" value={counts.semesterActivities} unit="개" /></div>
          <div className="home-stat"><Stat label="회고 대기" value={counts.reviewWaiting} unit="개" tone={counts.reviewWaiting > 0 ? 'accent' : 'default'} /></div>
          <div className="home-stat"><Stat label="새 추천" value={counts.newRecommend} unit="개" /></div>
          <div className="home-stat"><Stat label="확인할 발견" value={counts.toConfirm} unit="개" /></div>
        </section>
        <EvidencePanel rows={rows} records={state.records} />
        <FlowPanel rows={flow} />
        <DiscoveryPanel
          discovery={pending}
          state={pending ? discStateOf(pending) : 'none'}
          onAnswer={(d, status) => run({ type: 'discovery/confirm', discovery: d, status }, {
            toast: status === 'yes' ? '맞다고 한 발견을 추천에 반영할게요.' : '이 발견은 추천에 쓰지 않을게요.',
            undoable: true
          })}
          onWrite={() => navigate('records')}
        />
        <WeeklyPanel items={weekly} week={state.week} />
      </div>
    </>
  );
}
