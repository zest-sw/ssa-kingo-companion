import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf, navigate, PROFILE } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, Button, Card, Drawer, Icon, PageHeader, type IconName } from '../../components';
import { canUseSocial } from '../../domain/social';
import { myTopGroup } from '../../domain/social/summary';
import { friendsKeyword, hallKeyword, hallRoute, recruitKeyword } from '../../domain/social/visual';
import { HALL, SEED_POSTS } from '../../data/friends';
import { interestLine } from '../../app/student';
import { useFriends } from './useFriends';
import { ChallengeList } from './ChallengeList';
import { ChallengeProgress } from './ChallengeProgress';

const LOCKED: { icon: IconName; label: string }[] = [
  { icon: 'friends', label: '친구' }, { icon: 'flag', label: '팀원 모집' }, { icon: 'trophy', label: '명예의 전당' }
];

/**
 * 프로필 요약: 덩어리 셋. ① 나(이름·학과·학년·공개 상태) ② 도전 과제 진행(다음 3개, 전체는 서랍) ③ 친구·팀원 모집·명예의 전당 링크 한 줄씩(공개할 때) 또는 '공개하면 열려요'.
 * 비공개여도 내 도전 과제는 보인다. 최근 활동은 내 활동 화면에 있어 여기서는 뺐다.
 */
export function ProfileHome() {
  const { state } = useApp();
  const { friends, incoming } = useFriends();
  useOverviewState<null>('profile', null);
  const open = canUseSocial(state.visibility);
  const [all, setAll] = useState(false);

  const interests = interestLine(state.profile);
  const sub = state.demo ? `소프트웨어학과 3학년${interests && ` · ${interests}`}` : interests || '관심 분야는 설정에서 고를 수 있어요';
  const posts = [...state.recruitPosts, ...SEED_POSTS];
  const route = hallRoute(HALL, myTopGroup(state.records));
  const toVisibility = () => navigate('settings/visibility');
  const links: { to: string; icon: IconName; title: string; keyword: string }[] = [
    { to: 'profile/friends', icon: 'friends', title: '친구', keyword: friendsKeyword(friends.length, incoming.length) },
    { to: 'profile/recruit', icon: 'flag', title: '팀원 모집', keyword: recruitKeyword(posts) },
    { to: 'profile/hall', icon: 'trophy', title: '명예의 전당', keyword: route ? hallKeyword(HALL) : '아직 길이 없어요' }
  ];

  return (
    <div className="os">
      <PageHeader title={PROFILE.label} actions={open ? <Button icon="pencil" onClick={toVisibility}>공개 범위 설정</Button> : undefined} />
      <div className="os__body pf-cols">
        <div className="pf-left">
          <Card aria-label="나" padding="md">
            <div className="pf-head">
              <div className="fr-me">
                <span className="fr-avatar fr-avatar--lg" aria-hidden="true">나</span>
                <div>
                  <p className="fr-me__name">나</p>
                  <p className="fr-me__sub">{sub}</p>
                </div>
              </div>
              {open ? <Badge tone="green" icon="friends">공개 중</Badge> : <Badge icon="lock">나만 보기</Badge>}
            </div>
          </Card>

          <Card title="도전 과제" padding="md" action={<Button variant="ghost" icon="chevron" onClick={() => setAll(true)}>전체 목록</Button>}>
            <ChallengeProgress />
          </Card>
        </div>

        <div className="pf-right">
          {open ? (
            <Card title="함께하기" padding="md">
              <ul className="pf-links" aria-label="함께하기">
                {links.map(l => (
                  <li key={l.to}>
                    <a className="pf-link" href={hrefOf(l.to)}>
                      <Icon name={l.icon} size={18} />
                      <span className="pf-link__title">{l.title}</span>
                      <span className="pf-link__keyword">{l.keyword}</span>
                      <Icon name="chevron" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card title="공개하면 열려요" className="pf-locked" padding="md">
              <p className="fr-empty">지금은 내 기록을 나만 봐요. 공개하면 아래를 쓸 수 있어요.</p>
              <ul className="pf-locked__list">
                {LOCKED.map(l => (
                  <li key={l.label} className="pf-locked__item">
                    <Icon name={l.icon} size={16} />
                    <span className="pf-locked__name">{l.label}</span>
                    <Icon name="lock" size={14} />
                  </li>
                ))}
              </ul>
              <Button variant="primary" onClick={toVisibility}>설정에서 공개하기</Button>
            </Card>
          )}
        </div>
      </div>
      <Drawer open={all} onClose={() => setAll(false)} eyebrow="도전 과제" title="전체 목록">
        <ChallengeList />
      </Drawer>
    </div>
  );
}
