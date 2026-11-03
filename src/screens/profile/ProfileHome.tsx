import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { openEntity } from '../../app/entity';
import { hrefOf, navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, Button, Card, GhostPic, Icon, PageHeader, SummaryCard, type IconName } from '../../components';
import { showcaseable } from '../../domain/challenges';
import { canUseSocial, publicActivities, publicRecords } from '../../domain/social';
import { myTopGroup } from '../../domain/social/summary';
import { friendsKeyword, hallKeyword, hallRoute, recruitBars, recruitKeyword } from '../../domain/social/visual';
import { FIELD_GROUP, STATUS_LABEL } from '../../domain/vocab';
import { HALL, OPPORTUNITY_BY_ID, SEED_POSTS } from '../../data/friends';
import { interestLine } from '../../app/student';
import { useFriends } from './useFriends';
import { ChallengeList } from './ChallengeList';
import { ChallengeProgress } from './ChallengeProgress';
import { FriendFeed } from './FriendFeed';
import { FacesPic, HallPic, RecruitPic } from './SocialPics';

const LOCKED: { icon: IconName; label: string }[] = [
  { icon: 'friends', label: '친구 소식' }, { icon: 'flag', label: '팀원 모집' }, { icon: 'trophy', label: '명예의 전당' }
];
const RECENT = 3;
const RETROS = 2;

/**
 * 프로필 요약(스팀 프로필처럼): 나 → 도전 과제 진행(막대, 전체는 펼치기) → 최근 활동 / 친구 소식 → 소셜 카드 셋.
 * 비공개여도 내 도전 과제는 보인다. 친구 소식·모집·전당 영역만 잠기고 '설정에서 공개하기' 한 곳으로 연다. 한 화면 틀(스크롤은 펼친 목록 칸 하나뿐).
 */
export function ProfileHome() {
  const { state } = useApp();
  const challenges = useChallenges();
  useOverviewState<null>('profile', null);
  const v = state.visibility;
  const open = canUseSocial(v);
  const [all, setAll] = useState(false);

  const shown = showcaseable(challenges, v.showcaseChallengeIds).map(id => challenges.find(c => c.def.id === id)!);
  const publicIds = new Set(publicActivities(state.activities, v).map(a => a.id));
  const retros = publicRecords(state.records, v).slice(0, RETROS);
  const recent = state.activities.filter(a => a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded').slice(0, RECENT);
  const { friends, incoming } = useFriends();
  const interests = interestLine(state.profile);
  const sub = state.demo ? `소프트웨어학과 3학년${interests && ` · ${interests}`}` : interests || '관심 분야는 설정에서 고를 수 있어요';
  const posts = [...state.recruitPosts, ...SEED_POSTS];
  const route = hallRoute(HALL, myTopGroup(state.records));
  const toVisibility = () => navigate('settings/visibility');

  return (
    <div className="os">
      <PageHeader title="프로필" actions={open ? <Button icon="pencil" onClick={toVisibility}>공개 범위 설정</Button> : undefined} />
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
            {shown.length ? (
              <ul className="fr-tiles pf-showcase" aria-label="전시한 도전 과제">
                {shown.map(c => <li key={c.def.id} className="fr-tile"><Icon name={c.def.icon} size={22} /><span>{c.def.name}</span></li>)}
              </ul>
            ) : <p className="fr-empty pf-showcase">{challenges.some(c => c.achieved) ? '전체 목록에서 전시할 과제를 골라 보세요.' : '과제를 달성하면 여기에 전시할 수 있어요.'}</p>}
          </Card>

          <Card className="os-card" title="도전 과제" padding="md" action={
            <Button variant="ghost" icon={all ? 'down' : 'chevron'} aria-expanded={all} onClick={() => setAll(x => !x)}>{all ? '접기' : '전체 목록'}</Button>
          }>
            <div className={all ? 'os-scroll pf-all' : 'pf-prog'}>{all ? <ChallengeList /> : <ChallengeProgress />}</div>
          </Card>

          <Card title="최근 활동" padding="md">
            {recent.length ? (
              <ul className="pf-recent">
                {recent.map(a => (
                  <li key={a.id}>
                    <button type="button" className="pf-recent__item" onClick={() => openEntity({ kind: 'activity', id: a.id })}>
                      <span className={`ui-field__dot ui-field__dot--${FIELD_GROUP[a.field]}`} aria-hidden="true" />
                      <span className="pf-recent__title">{a.title}</span>
                      {open && publicIds.has(a.id) && <Badge tone="green">공개</Badge>}
                      <span className="pf-recent__state">{STATUS_LABEL[a.status]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <GhostPic kind="rows" labels={['', '']} message="활동을 시작하면 여기에 모여요" />}
            {open && retros.length > 0 && (
              <ul className="fr-retros">
                {retros.map(r => <li key={r.id} className="fr-retro"><p className="fr-retro__label">{r.title} 회고</p><p>“{r.quote}”</p></li>)}
              </ul>
            )}
          </Card>
        </div>

        <div className="pf-right">
          {open ? (
            <>
              <FriendFeed />
              <div className="pf-social">
                <SummaryCard href={hrefOf('profile/friends')} title="친구" headline={friendsKeyword(friends.length, incoming.length)} visual={<FacesPic friends={friends.map(f => f.name)} incoming={incoming.map(f => f.name)} />} />
                <SummaryCard href={hrefOf('profile/recruit')} title="팀원 모집" headline={recruitKeyword(posts)} visual={<RecruitPic bars={recruitBars(posts, id => OPPORTUNITY_BY_ID[id]?.kind)} />} />
                <SummaryCard href={hrefOf('profile/hall')} title="명예의 전당" headline={hallKeyword(HALL)} visual={route ? <HallPic route={route} /> : undefined} />
              </div>
            </>
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
    </div>
  );
}
