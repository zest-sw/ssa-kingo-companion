import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { openEntity } from '../../app/entity';
import { hrefOf, navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, Button, Card, Icon, PageHeader, SummaryCard, type IconName } from '../../components';
import { showcaseable } from '../../domain/challenges';
import { canUseSocial, publicActivities, publicRecords } from '../../domain/social';
import { friendsLine, hallLine, interestedIds, myTopGroup, recruitLine } from '../../domain/social/summary';
import { FIELD_GROUP, FIELD_LABEL, STATUS_LABEL } from '../../domain/vocab';
import { FRIENDS, HALL, INCOMING, SEED_POSTS, TEAM_OPPORTUNITIES } from '../../data/friends';
import { ChallengeList } from './ChallengeList';
import { ChallengeProgress } from './ChallengeProgress';
import { FriendFeed } from './FriendFeed';

const LOCKED: { icon: IconName; label: string }[] = [
  { icon: 'friends', label: '친구 소식' }, { icon: 'flag', label: '팀원 모집' }, { icon: 'trophy', label: '명예의 전당' }
];
const RECENT = 3;

/**
 * 프로필 요약(스팀 프로필처럼): 나 → 전시한 도전 과제 → 도전 과제 진행(전체는 펼치기) → 최근 활동 → 친구 소식.
 * 비공개여도 내 도전 과제는 보인다. 친구 소식·모집·전당 영역만 잠기고 '설정에서 공개하기' 한 곳으로 연다.
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
  const retros = publicRecords(state.records, v);
  const recent = state.activities.filter(a => a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded').slice(0, RECENT);
  const interests = state.profile.interests.filter(i => i !== 'unknown').map(i => FIELD_LABEL[i]).join(', ');
  const posts = [...state.recruitPosts, ...SEED_POSTS];
  const toVisibility = () => navigate('settings/visibility');

  return (
    <>
      <PageHeader title="프로필" actions={open ? <Button icon="pencil" onClick={toVisibility}>공개 범위 설정</Button> : undefined} />
      <div className="pf-cols">
        <div className="fr-stack">
          <Card aria-label="나">
            <div className="pf-head">
              <div className="fr-me">
                <span className="fr-avatar fr-avatar--lg" aria-hidden="true">나</span>
                <div>
                  <p className="fr-me__name">나</p>
                  <p className="fr-me__sub">소프트웨어학과 3학년{interests && ` · ${interests}`}</p>
                </div>
              </div>
              {open ? <Badge tone="green" icon="friends">공개 중</Badge> : <Badge icon="lock">나만 보기</Badge>}
            </div>
            <h3 className="fr-sub-title">전시한 도전 과제</h3>
            {shown.length ? (
              <ul className="fr-tiles">
                {shown.map(c => <li key={c.def.id} className="fr-tile"><Icon name={c.def.icon} size={22} /><span>{c.def.name}</span></li>)}
              </ul>
            ) : <p className="fr-empty">{challenges.some(c => c.achieved) ? '아래 전체 목록에서 전시할 과제를 골라 보세요.' : '과제를 달성하면 여기에 전시할 수 있어요.'}</p>}
          </Card>

          <Card title="도전 과제">
            <ChallengeProgress />
            <div className="pf-more">
              <Button variant="ghost" icon={all ? 'down' : 'chevron'} aria-expanded={all} aria-controls="pf-all" onClick={() => setAll(x => !x)}>
                {all ? '전체 목록 접기' : '전체 목록 펼치기'}
              </Button>
            </div>
            {all && <div id="pf-all" className="pf-all"><ChallengeList /></div>}
          </Card>

          <Card title="최근 활동">
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
            ) : <p className="fr-empty">활동을 시작하면 최근 활동이 여기에 모여요.</p>}
            {open && retros.length > 0 && (
              <ul className="fr-retros">
                {retros.map(r => <li key={r.id} className="fr-retro"><p className="fr-retro__label">{r.title} 회고</p><p>“{r.quote}”</p></li>)}
              </ul>
            )}
          </Card>
        </div>

        <div className="fr-stack">
          {open ? (
            <>
              <FriendFeed />
              <SummaryCard href={hrefOf('profile/friends')} title="친구" sentence={friendsLine(FRIENDS.length, INCOMING.length)} />
              <SummaryCard href={hrefOf('profile/recruit')} title="팀원 모집" sentence={recruitLine(posts, interestedIds(TEAM_OPPORTUNITIES, state.activities, []))} />
              <SummaryCard href={hrefOf('profile/hall')} title="명예의 전당" sentence={hallLine(HALL, myTopGroup(state.records))} />
            </>
          ) : (
            <Card title="공개하면 열려요" className="pf-locked">
              <p className="fr-empty">지금은 내 기록을 나만 봐요. 공개하면 아래를 쓸 수 있고, 언제든 거둘 수 있어요.</p>
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
    </>
  );
}
