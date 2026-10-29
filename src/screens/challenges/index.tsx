import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges, type ChallengeView } from '../../app/challenges';
import { navigate, type ScreenProps } from '../../app/router';
import { Button, Card, EmptyState, Icon, PageHeader, Stat, TabPanel, Tabs, type TabItem } from '../../components';
import { isInProgress } from '../../domain/challenges';
import { toggled } from '../../domain/social';
import { ChallengeCard } from './ChallengeCard';
import './challenges.css';

type Tab = 'all' | 'done' | 'doing' | 'hidden';

const FILTER: Record<Tab, (c: ChallengeView) => boolean> = {
  all: () => true,
  done: c => c.achieved,
  doing: isInProgress,
  hidden: c => c.def.hidden
};

const EMPTY: Record<Exclude<Tab, 'all'>, { icon: 'trophy' | 'flag' | 'sparkle'; message: string; action: string; to: string }> = {
  done: { icon: 'trophy', message: '아직 달성한 과제가 없어요. 활동 하나를 끝내고 회고를 써 보세요.', action: '내 활동 보기', to: 'activities' },
  doing: { icon: 'flag', message: '진행 중인 과제가 없어요. 새 활동을 신청하면 막대가 차기 시작해요.', action: '추천 보기', to: 'recommend' },
  hidden: { icon: 'sparkle', message: '숨은 과제는 활동하다 보면 찾게 돼요. 힌트가 있는 과제부터 살펴보세요.', action: '전체 보기', to: 'challenges' }
};

export default function ChallengesScreen(_props: ScreenProps) {
  const { state, run } = useApp();
  const items = useChallenges();
  const [tab, setTab] = useState<Tab>('all');

  const done = items.filter(c => c.achieved).length;
  const doing = items.filter(isInProgress).length;
  const hiddenLeft = items.filter(c => c.def.hidden && !c.achieved).length;
  const tabs: TabItem<Tab>[] = [{ id: 'all', label: '전체' }, { id: 'done', label: '달성' }, { id: 'doing', label: '진행 중' }, { id: 'hidden', label: '숨은 도전 과제' }];
  const shown = items.filter(FILTER[tab]);
  const empty = tab === 'all' ? null : EMPTY[tab];

  const showcase = (id: string) =>
    run({ type: 'visibility/set', patch: { showcaseChallengeIds: toggled(state.visibility.showcaseChallengeIds, id) } });

  return (
    <>
      <PageHeader eyebrow="나의 성장" title="도전 과제" />
      <div className="ch-stats">
        <Card padding="md"><Stat label="달성" value={done} unit="개" /></Card>
        <Card padding="md"><Stat label="진행 중" value={doing} unit="개" /></Card>
        <Card padding="md" className="ch-stats__dark"><Stat label="숨은 도전 과제" value={hiddenLeft} unit="개 남음" /></Card>
      </div>
      <Tabs id="challenges" label="도전 과제 보기" items={tabs} value={tab} onChange={setTab} />
      <TabPanel id="challenges" active={tab}>
        {shown.length > 0 ? (
          <ul className="ch-grid">
            {shown.map(item => (
              <ChallengeCard key={item.def.id} item={item} showcased={state.visibility.showcaseChallengeIds.includes(item.def.id)} onShowcase={() => showcase(item.def.id)} />
            ))}
          </ul>
        ) : empty && (
          <Card>
            <EmptyState icon={empty.icon} message={empty.message} action={<Button variant="primary" onClick={() => navigate(empty.to)}>{empty.action}</Button>} />
          </Card>
        )}
      </TabPanel>
      <p className="ch-note"><Icon name="check" size={16} />레벨, 점수, 순위는 없어요. 전시한 과제는 프로필을 공개했을 때만 친구에게 보여요.</p>
    </>
  );
}
