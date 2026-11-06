import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf, parentLink, type ScreenProps } from '../../app/router';
import { PageHeader, type IconName } from '../../components';
import { canUseSocial } from '../../domain/social';
import { SEED_POSTS } from '../../data/friends';
import { FriendsView } from './FriendsView';
import { Gate } from './Gate';
import { HallView } from './HallView';
import { ProfileHome } from './ProfileHome';
import { RecruitView } from './RecruitView';
import './challenges.css';
import '../sizes.css';
import './friends.css';
import './profile.css';

// 공개 설정은 설정(#/settings/visibility)에 있다. 예전 친구·도전 과제 경로는 router 가 여기로 넘긴다.
// 전당은 광장(홈)의 문으로 들어오는 장면이라 나가는 길도 광장 하나다.
const HALL_EXIT = { label: '광장으로', href: hrefOf('home') };
type Sub = 'friends' | 'recruit' | 'hall';
const SUBS: readonly Sub[] = ['friends', 'recruit', 'hall'];
const TITLE: Record<Sub, string> = { friends: '친구', recruit: '팀원 모집', hall: '명예의 전당' };

const OPENS: Record<Sub, { icon: IconName; title: string; sub: string }[]> = {
  friends: [
    { icon: 'friends', title: '친구 찾기', sub: '비슷한 학생과 서로 수락하면 친구가 돼요' },
    { icon: 'flag', title: '이 활동을 해 본 친구·선배', sub: '내 활동을 먼저 해 본 사람의 길' }
  ],
  recruit: [
    { icon: 'flag', title: '모집 글 올리기', sub: '대회, 해커톤, 공모전에 함께할 팀원 구하기' },
    { icon: 'friends', title: '관심 있는 학생에게 먼저', sub: '같은 기회에 관심을 표시한 학생이 먼저 봐요' }
  ],
  hall: [
    { icon: 'trophy', title: '활동 경로 보기', sub: '먼저 걸어간 학생이 거쳐 온 활동' },
    { icon: 'doc', title: '올라가려면 한 번 더 동의', sub: '공개한 학생 중 따로 동의한 학생만 올라가요' }
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
    <div className="os" data-width="cap">
      <PageHeader parent={current === 'hall' ? HALL_EXIT : parentLink('profile')} crumb={TITLE[current]} title={TITLE[current]} />
      <div className="os__body pf-sub">{body}</div>
    </div>
  );
}
