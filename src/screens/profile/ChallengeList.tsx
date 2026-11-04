import { useState } from 'react';
import { useChallenges, type ChallengeView } from '../../app/challenges';
import { navigate } from '../../app/router';
import { Button, Card, EmptyState, Stat, TabPanel, Tabs, type TabItem } from '../../components';
import { isInProgress } from '../../domain/challenges';
import { ChallengeCard } from './ChallengeCard';

type Tab = 'all' | 'done' | 'doing';

const FILTER: Record<Tab, (c: ChallengeView) => boolean> = {
  all: () => true,
  done: c => c.achieved,
  doing: isInProgress
};

const EMPTY: Record<Exclude<Tab, 'all'>, { icon: 'trophy' | 'flag'; message: string; action: string; to?: string }> = {
  done: { icon: 'trophy', message: '아직 달성한 과제가 없어요. 활동 하나를 끝내고 회고를 써 보세요.', action: '내 활동 보기', to: 'activities' },
  doing: { icon: 'flag', message: '진행 중인 과제가 없어요. 새 활동을 신청하면 막대가 차기 시작해요.', action: '추천 보기', to: 'recommend' }
};

/** 프로필 안 도전 과제 전체 목록(펼치기). 필터가 있는 카드 목록. */
export function ChallengeList() {
  // 숨은 과제는 달성하기 전에는 목록에 없다.
  const items = useChallenges().filter(c => !c.def.hidden || c.achieved);
  const [tab, setTab] = useState<Tab>('all');

  const done = items.filter(c => c.achieved).length;
  const doing = items.filter(isInProgress).length;
  const tabs: TabItem<Tab>[] = [{ id: 'all', label: '전체' }, { id: 'done', label: '달성' }, { id: 'doing', label: '진행 중' }];
  const shown = items.filter(FILTER[tab]);
  const empty = tab === 'all' ? null : EMPTY[tab];

  return (
    <>
      <div className="ch-stats">
        <Card padding="md"><Stat label="달성" value={done} unit="개" /></Card>
        <Card padding="md"><Stat label="진행 중" value={doing} unit="개" /></Card>
      </div>
      <Tabs id="challenges" label="도전 과제 보기" items={tabs} value={tab} onChange={setTab} />
      <TabPanel id="challenges" active={tab}>
        {shown.length > 0 ? (
          <ul className="ch-grid">
            {shown.map(item => (
              <ChallengeCard key={item.def.id} item={item} />
            ))}
          </ul>
        ) : empty && (
          <Card>
            <EmptyState icon={empty.icon} message={empty.message} action={<Button variant="primary" onClick={() => (empty.to ? navigate(empty.to) : setTab('all'))}>{empty.action}</Button>} />
          </Card>
        )}
      </TabPanel>
    </>
  );
}
