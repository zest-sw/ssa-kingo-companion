import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { hrefOf, navigate } from '../../app/router';
import { Badge, Button, Card, CountBadge, Icon, PageHeader, SummaryCard, type IconName } from '../../components';
import { showcaseable } from '../../domain/challenges';
import { canUseSocial, publicActivities, publicRecords } from '../../domain/social';
import { FIELD_GROUP, FIELD_LABEL } from '../../domain/vocab';
import { FEED, FRIENDS, HALL, INCOMING, SEED_POSTS } from '../../data/friends';
import { ChallengeList } from './ChallengeList';
import { ChallengeWall } from './ChallengeWall';

const LOCKED: { icon: IconName; label: string }[] = [
  { icon: 'friends', label: '친구' }, { icon: 'flag', label: '팀원 모집' }, { icon: 'trophy', label: '명예의 전당' }
];

/**
 * 프로필 요약(스팀 프로필처럼): 나 → 전시한 도전 과제 → 도전 과제 → 친구·모집·전당 요약과 친구 소식.
 * 비공개여도 내 도전 과제는 보인다. 소셜 영역만 잠기고 '설정에서 공개하기' 한 곳으로 연다.
 * ponytail: 요약 카드의 문장은 지금 있는 숫자를 그대로 쓴다. 학생 맞춤 문장은 v1.0 2단계에서 채운다.
 */
export function ProfileHome() {
  const { state } = useApp();
  const challenges = useChallenges();
  const v = state.visibility;
  const open = canUseSocial(v);
  const [all, setAll] = useState(false);
  const [cheered, setCheered] = useState<string[]>([]);

  const shown = showcaseable(challenges, v.showcaseChallengeIds).map(id => challenges.find(c => c.def.id === id)!);
  const acts = publicActivities(state.activities, v);
  const retros = publicRecords(state.records, v);
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
            ) : <p className="fr-empty">아래 도전 과제에서 칸을 눌러 전시할 과제를 골라 보세요.</p>}
            {open && (
              <>
                <h3 className="fr-sub-title">공개한 활동 경로</h3>
                {acts.length ? (
                  <ul className="fr-chips">
                    {acts.map(a => <li key={a.id} className="fr-path"><span className={`ui-field__dot ui-field__dot--${FIELD_GROUP[a.field]}`} aria-hidden="true" /><span>{a.title}</span></li>)}
                  </ul>
                ) : <p className="fr-empty">공개 범위 설정에서 보일 활동을 고르면 여기에 보여요.</p>}
                {retros.length > 0 && (
                  <ul className="fr-retros">
                    {retros.map(r => <li key={r.id} className="fr-retro"><p className="fr-retro__label">{r.title} 회고</p><p>“{r.quote}”</p></li>)}
                  </ul>
                )}
              </>
            )}
          </Card>

          <Card title="도전 과제">
            <ChallengeWall />
            <div className="pf-more">
              <Button variant="ghost" icon={all ? 'down' : 'chevron'} aria-expanded={all} aria-controls="pf-all" onClick={() => setAll(x => !x)}>
                {all ? '전체 목록 접기' : '전체 목록 펼치기'}
              </Button>
            </div>
            {all && <div id="pf-all" className="pf-all"><ChallengeList /></div>}
          </Card>
        </div>

        <div className="fr-stack">
          {open ? (
            <>
              <SummaryCard href={hrefOf('profile/friends')} title="친구" sentence={`친구 ${FRIENDS.length}명`} badge={<CountBadge count={INCOMING.length} label="받은 친구 요청" />} />
              <SummaryCard href={hrefOf('profile/recruit')} title="팀원 모집" sentence={`모집 글 ${posts.length}개`} />
              <SummaryCard href={hrefOf('profile/hall')} title="명예의 전당" sentence={`걸어온 길 ${HALL.length}개`} />
              <Card padding="md" title="친구 소식">
                {FEED.length === 0 ? <p className="fr-empty">친구를 맺으면 친구 소식이 여기에 보여요.</p> : (
                  <ul className="fr-people">
                    {FEED.map(f => {
                      const on = cheered.includes(f.id);
                      const n = f.cheers + (on ? 1 : 0);
                      return (
                        <li key={f.id} className="fr-feed">
                          <p className="fr-feed__text">{f.text}</p>
                          <Button size="sm" aria-pressed={on} onClick={() => setCheered(c => (on ? c.filter(x => x !== f.id) : [...c, f.id]))}>응원{n > 0 ? ` ${n}` : '하기'}</Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
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
