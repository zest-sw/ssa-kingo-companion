import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { Button, PageHeader, TabPanel, Tabs, type TabItem } from '../../components';
import { canUseSocial } from '../../domain/social';
import { SEED_POSTS } from '../../data/friends';
import { Gate } from './Gate';
import { HallView } from './HallView';
import { ProfileView } from './ProfileView';
import { RecruitView } from './RecruitView';
import './friends.css';

// 공개 설정은 설정(#/settings/visibility)으로 옮겼다. 예전 경로는 router 가 넘겨 준다.
type Sub = 'profile' | 'recruit' | 'hall';

const TABS: TabItem<Sub>[] = [
  { id: 'profile', label: '프로필' },
  { id: 'recruit', label: '팀원 모집' },
  { id: 'hall', label: '명예의 전당' }
];
const TITLE: Record<Sub, string> = { profile: '내 프로필', recruit: '팀원 모집', hall: '명예의 전당' };

const OPENS: Record<Sub, { icon: 'friends' | 'flag' | 'trophy' | 'doc'; title: string; sub: string }[]> = {
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
  const { state, run } = useApp();
  const current: Sub = TABS.some(t => t.id === sub) ? (sub as Sub) : 'profile';
  const open = canUseSocial(state.visibility);
  // 내가 올린 모집 글은 전역 상태에 둔다(새로고침하면 사라진다). 예시 글 앞에 새 글이 온다.
  const posts = useMemo(() => [...state.recruitPosts, ...SEED_POSTS], [state.recruitPosts]);

  const body = !open ? <Gate opens={OPENS[current]} />
    : current === 'profile' ? <ProfileView />
    : current === 'recruit' ? <RecruitView posts={posts} onPost={post => run({ type: 'recruit/post', post })} />
    : <HallView />;

  return (
    <>
      <PageHeader
        eyebrow="친구"
        title={TITLE[current]}
        actions={current === 'profile' && open ? <Button icon="pencil" onClick={() => navigate('settings/visibility')}>공개 범위 설정</Button> : undefined}
      />
      <Tabs id="friends" label="친구 화면" items={TABS} value={current} onChange={id => navigate(`friends/${id}`)} />
      <TabPanel id="friends" active={current}>{body}</TabPanel>
    </>
  );
}
