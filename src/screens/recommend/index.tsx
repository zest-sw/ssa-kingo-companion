import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { Button, PageHeader, SegmentedControl } from '../../components';
import { DISLIKES } from '../../data/options';
import { pickAlternatives } from '../../domain/recommend';
import { laterUntilDay, parseRecommendSub, prepareHref } from '../../domain/recommend-flow/flow';
import type { DislikeKind, Program } from '../../domain/types';
import { CompareView } from './CompareView';
import { DismissModal, LaterDrawer, LaterModal, ProfileDrawer } from './Dialogs';
import { PrepareView } from './PrepareView';
import { TopView } from './TopView';
import './recommend.css';

const VIEWS = [{ id: 'top', label: '가장 추천' }, { id: 'compare', label: '비교해서 고르기' }] as const;

export default function RecommendScreen({ sub }: ScreenProps) {
  const { state, view, run } = useApp();
  const route = parseRecommendSub(sub);
  const [dismissing, setDismissing] = useState<Program>();
  const [postponing, setPostponing] = useState<Program>();
  const [laterOpen, setLaterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const prepare = (p: Program) => {
    run({ type: 'candidate/choose', programId: p.id, choice: 'preparing' });
    navigate(prepareHref(p.id));
  };
  const dismiss = (p: Program, kind: DislikeKind) => {
    setDismissing(undefined);
    run({ type: 'candidate/choose', programId: p.id, choice: 'dismissed', reason: kind }, { toast: DISLIKES.find(d => d.id === kind)?.toast, undoable: true });
  };
  const postpone = (p: Program, days: number) => {
    setPostponing(undefined);
    run({ type: 'candidate/choose', programId: p.id, choice: 'later', until: laterUntilDay(state.week, days) }, { toast: '나중에 다시 보여 드릴게요.', undoable: true });
  };
  const actions = { onPrepare: prepare, onLater: setPostponing, onDismiss: setDismissing };

  if (route.view === 'prepare') return <PrepareView key={route.programId} programId={route.programId} />;

  const compare = route.view === 'compare';
  // #/recommend/<활동 id> 로 열면 그 후보를 가장 추천 자리에 보여 준다. 후보가 아니면 원래 가장 추천을 보여 준다.
  const focus = route.view === 'top' && route.programId ? view.scored.find(s => s.p.id === route.programId) : undefined;
  return (
    <>
      <PageHeader
        eyebrow="이번 주 추천"
        title="추천"
        actions={
          <>
            <Button variant="ghost" onClick={() => setLaterOpen(true)}>나중에 보기 <span className="rec-count num">{view.later.length}</span></Button>
            <SegmentedControl label="보기 전환" items={[...VIEWS]} value={compare ? 'compare' : 'top'} onChange={id => navigate(id === 'compare' ? 'recommend/compare' : 'recommend')} />
          </>
        }
      />
      {compare
        ? <CompareView scored={view.scored} week={state.week} records={state.records} interests={state.profile.interests} activities={state.activities} actions={actions} />
        : <TopView primary={focus ?? view.primary} isPrimary={!focus || focus.p.id === view.primary?.p.id} alternatives={focus ? pickAlternatives(view.scored, focus.p) : view.alternatives} week={state.week} funnel={view.funnel} records={state.records} activities={state.activities} actions={actions} onChangeProfile={() => setProfileOpen(true)} />}

      <DismissModal program={dismissing} onPick={dismiss} onClose={() => setDismissing(undefined)} />
      <LaterModal week={state.week} program={postponing} onPick={postpone} onClose={() => setPostponing(undefined)} />
      <LaterDrawer
        open={laterOpen}
        programs={view.later}
        laterUntil={state.laterUntil}
        onClose={() => setLaterOpen(false)}
        onBack={p => { run({ type: 'candidate/clear', programId: p.id }, { toast: '추천 목록으로 돌려놨어요.' }); }}
        onPrepare={p => { setLaterOpen(false); prepare(p); }}
      />
      {profileOpen && (
        <ProfileDrawer
          open
          profile={state.profile}
          onClose={() => setProfileOpen(false)}
          onSave={profile => { setProfileOpen(false); run({ type: 'profile/save', profile }, { toast: '바뀐 조건으로 다시 골랐어요.' }); }}
        />
      )}
    </>
  );
}
