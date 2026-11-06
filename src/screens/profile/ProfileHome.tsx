import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf, PROFILE } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, Drawer, Icon, PageHeader, type IconName } from '../../components';
import { canUseSocial } from '../../domain/social';
import { friendsCount, hallCount, recruitCount } from '../../domain/profilePreview';
import { HALL, SEED_POSTS } from '../../data/friends';
import { useFriends } from './useFriends';
import { ChallengeList } from './ChallengeList';
import { ChallengeProgress } from './ChallengeProgress';
import { PreviewCard } from './PreviewCard';

/**
 * 프로필 첫 화면. 주인공은 왼쪽 '친구에게 보이는 내 프로필' 미리보기, 오른쪽은 함께하기와 도전 과제.
 * 비공개면 함께하기 행 대신 미리보기 자리가 '지금은 나만 봐요'를 말하므로, 오른쪽은 도전 과제만 남는다.
 */
export function ProfileHome() {
  const { state } = useApp();
  const { friends, incoming } = useFriends();
  useOverviewState<null>('profile', null);
  const open = canUseSocial(state.visibility);
  const [all, setAll] = useState(false);

  const links: { to: string; icon: IconName; title: string; count: string }[] = [
    { to: 'profile/friends', icon: 'friends', title: '친구', count: friendsCount(friends.length, incoming.length) },
    { to: 'profile/recruit', icon: 'flag', title: '팀원 모집', count: recruitCount([...state.recruitPosts, ...SEED_POSTS]) },
    { to: 'profile/hall', icon: 'trophy', title: '명예의 전당', count: hallCount(HALL.length) }
  ];

  return (
    <div className="os" data-width="cap">
      <PageHeader title={PROFILE.label} />
      <div className="os__body pf-cols">
        <PreviewCard />
        <div className="pf-side">
          {open && (
            <Card title="함께하기" padding="md">
              <ul className="pf-links">
                {links.map(l => (
                  <li key={l.to}>
                    <a className="pf-link" href={hrefOf(l.to)}>
                      <Icon name={l.icon} />
                      <span className="pf-link__title">{l.title}</span>
                      <span className="pf-link__keyword num">{l.count}</span>
                      <Icon name="chevron" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="도전 과제" padding="md" action={<Button size="sm" variant="ghost" icon="chevron" onClick={() => setAll(true)}>전체 보기</Button>}>
            <ChallengeProgress />
          </Card>
        </div>
      </div>
      <Drawer open={all} onClose={() => setAll(false)} title="도전 과제">
        <ChallengeList />
      </Drawer>
    </div>
  );
}
