import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { hrefOf } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, CountBadge, Icon, MiniTile, PageHeader } from '../../components';
import { showcaseable } from '../../domain/challenges';
import { faceRow, initialOf } from '../../domain/social/glance';
import { FIELD_GROUP } from '../../domain/vocab';
import { FRIENDS, HALL, INCOMING, SEED_POSTS } from '../../data/friends';

const FACES = 4;
const POSTS_SHOWN = 4;

/** 친구 L1(공개): 내 프로필 미리보기 + 세 갈래 타일. 타일마다 해당 L2 로 간다. */
export function Overview() {
  const { state } = useApp();
  const challenges = useChallenges();
  useOverviewState<null>('friends', null);
  const shown = showcaseable(challenges, state.visibility.showcaseChallengeIds).map(id => challenges.find(c => c.def.id === id)!);
  const faces = faceRow(FRIENDS, FACES);
  const posts = [...state.recruitPosts, ...SEED_POSTS];
  const route = HALL[0]?.path ?? [];

  return (
    <>
      <PageHeader title="친구" />
      <div className="fr-tiles">
        <MiniTile href={hrefOf('friends/profile')} title="내 프로필" line={shown.length ? `전시 중인 도전 과제 ${shown.length}개` : '전시할 도전 과제를 골라요'} badge={<Badge tone="green" icon="friends">공개 중</Badge>}>
          <span className="fr-glance fr-glance--me">
            <span className="fr-avatar fr-avatar--lg">나</span>
            {shown.slice(0, 3).map(c => <span key={c.def.id} className="fr-glance__badge"><Icon name={c.def.icon} size={20} /></span>)}
          </span>
        </MiniTile>
        <MiniTile
          href={hrefOf('friends/profile')} title="친구" line={`친구 ${FRIENDS.length}명`}
          badge={<CountBadge count={INCOMING.length} label="받은 친구 요청" />}
        >
          <span className="fr-glance fr-glance--faces">
            {faces.shown.map(p => <span key={p.id} className="fr-avatar">{initialOf(p.name)}</span>)}
            {faces.more > 0 && <span className="fr-avatar fr-avatar--more num">+{faces.more}</span>}
          </span>
        </MiniTile>
        <MiniTile href={hrefOf('friends/recruit')} title="팀원 모집" line={`모집 글 ${posts.length}개`}>
          <span className="fr-glance fr-glance--posts">
            {posts.slice(0, POSTS_SHOWN).map(p => (
              <span key={p.id} className="fr-slots">{Array.from({ length: p.slots }, (_, i) => <span key={i} className="fr-slots__dot" />)}</span>
            ))}
          </span>
        </MiniTile>
        <MiniTile href={hrefOf('friends/hall')} title="명예의 전당" line={`걸어온 길 ${HALL.length}개`}>
          <span className="fr-glance fr-glance--route">
            {route.map(step => <span key={step.title} className={`ui-field__dot ui-field__dot--${FIELD_GROUP[step.field]} fr-route__dot`} />)}
          </span>
        </MiniTile>
      </div>
    </>
  );
}
