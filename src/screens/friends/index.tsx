import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { Button, PageHeader, TabPanel, Tabs, type TabItem } from '../../components';
import { canUseSocial, type RecruitPost } from '../../domain/social';
import { SEED_POSTS } from '../../data/friends';
import { Gate } from './Gate';
import { HallView } from './HallView';
import { ProfileView } from './ProfileView';
import { RecruitView } from './RecruitView';
import { VisibilityView } from './VisibilityView';
import './friends.css';

type Sub = 'profile' | 'visibility' | 'recruit' | 'hall';

const TABS: TabItem<Sub>[] = [
  { id: 'profile', label: '프로필' },
  { id: 'visibility', label: '공개 설정' },
  { id: 'recruit', label: '팀원 모집' },
  { id: 'hall', label: '명예의 전당' }
];
const TITLE: Record<Sub, string> = { profile: '내 프로필', visibility: '공개 설정', recruit: '팀원 모집', hall: '명예의 전당' };

const OPENS: Record<Exclude<Sub, 'visibility'>, { icon: 'friends' | 'flag' | 'trophy' | 'doc'; title: string; sub: string }[]> = {
  profile: [
    { icon: 'doc', title: '친구에게 이렇게 보여요', sub: '한 활동 목록과 고른 회고, 전시할 도전 과제' },
    { icon: 'friends', title: '친구 찾기', sub: '비슷한 학생과 서로 수락해서 친구 맺기' },
    { icon: 'flag', title: '이 활동을 해 본 친구·선배', sub: '내 활동을 먼저 해 본 사람 보기' }
  ],
  recruit: [
    { icon: 'flag', title: '모집 글 올리기', sub: '대회·해커톤·공모전에 함께할 팀원 구하기' },
    { icon: 'friends', title: '관심 있는 학생에게 먼저', sub: '같은 기회에 관심을 표시한 공개 학생에게 먼저 보여요' }
  ],
  hall: [
    { icon: 'trophy', title: '활동 경로 보기', sub: '먼저 걸어온 학생의 거쳐 온 활동' },
    { icon: 'doc', title: '올라가는 건 따로 동의', sub: '공개한 학생 중 한 번 더 동의한 학생만 올라가요' }
  ]
};

export default function FriendsScreen({ sub }: ScreenProps) {
  const { state } = useApp();
  const current: Sub = TABS.some(t => t.id === sub) ? (sub as Sub) : 'profile';
  const open = canUseSocial(state.visibility);
  // 모집 글은 탭을 옮겨도 남게 이 화면에서 들고 있다. 이번 세션 동안만이다.
  const [posts, setPosts] = useState<RecruitPost[]>(SEED_POSTS);

  const body = current === 'visibility' ? <VisibilityView />
    : !open ? <Gate opens={OPENS[current]} />
    : current === 'profile' ? <ProfileView />
    : current === 'recruit' ? <RecruitView posts={posts} onPost={p => setPosts(list => [p, ...list])} />
    : <HallView />;

  return (
    <>
      <PageHeader
        eyebrow="친구"
        title={TITLE[current]}
        actions={current === 'profile' && open ? <Button icon="pencil" onClick={() => navigate('friends/visibility')}>공개 범위 설정</Button> : undefined}
      />
      <Tabs id="friends" label="친구 화면" items={TABS} value={current} onChange={id => navigate(`friends/${id}`)} />
      <TabPanel id="friends" active={current}>{body}</TabPanel>
    </>
  );
}
