import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { parentLink, type ScreenProps } from '../../app/router';
import { PageHeader, type IconName } from '../../components';
import { canUseSocial } from '../../domain/social';
import { SEED_POSTS } from '../../data/friends';
import { FriendsView } from './FriendsView';
import { Gate } from './Gate';
import { HallView } from './HallView';
import { ProfileHome } from './ProfileHome';
import { RecruitView } from './RecruitView';
import './challenges.css';
import './friends.css';

// 공개 설정은 설정(#/settings/visibility)에 있다. 예전 친구·도전 과제 경로는 router 가 여기로 넘긴다.
type Sub = 'friends' | 'recruit' | 'hall';
const SUBS: readonly Sub[] = ['friends', 'recruit', 'hall'];
const TITLE: Record<Sub, string> = { friends: '친구', recruit: '팀원 모집', hall: '명예의 전당' };

const OPENS: Record<Sub, { icon: IconName; title: string; sub: string }[]> = {
  friends: [
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

/** 하위 경로: (없음) = 프로필 요약, friends·recruit·hall = 소셜 하위 화면. 비공개면 하위 화면 대신 '공개하면 열려요' 한 화면. */
export default function ProfileScreen({ sub }: ScreenProps) {
  const { state, run } = useApp();
  const open = canUseSocial(state.visibility);
  const current = SUBS.find(s => s === sub?.split('/')[0]);
  // 내가 올린 모집 글은 전역 상태에 둔다(새로고침하면 사라진다). 예시 글 앞에 새 글이 온다.
  const posts = useMemo(() => [...state.recruitPosts, ...SEED_POSTS], [state.recruitPosts]);

  if (!current) return <ProfileHome />;

  const body = !open ? <Gate opens={OPENS[current]} />
    : current === 'friends' ? <FriendsView />
    : current === 'recruit' ? <RecruitView posts={posts} onPost={post => run({ type: 'recruit/post', post })} />
    : <HallView />;

  return (
    <div className="os">
      <PageHeader parent={parentLink('profile')} crumb={TITLE[current]} title={TITLE[current]} />
      <div className="os__body pf-sub">{body}</div>
    </div>
  );
}
