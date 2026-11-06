import { Drawer } from '../../components';
import { FRIEND_PROFILES, FRIENDS } from '../../data/friends';
import { FIELD_GROUP } from '../../domain/vocab';

/** 친구 프로필 서랍: 그 친구가 공개한 한 활동. 친구가 공개한 것만 보이고, 비교하거나 순위를 매기지 않는다. */
export function FriendDrawer({ friendId, onClose }: { friendId: string | null; onClose: () => void }) {
  const friend = FRIENDS.find(f => f.id === friendId);
  const profile = friendId ? FRIEND_PROFILES[friendId] : undefined;
  return (
    <Drawer open={!!friend} onClose={onClose} eyebrow={friend && `${friend.dept} ${friend.year}학년`} title={friend ? `${friend.name} 님` : ''}>
      <h3 className="ui-subhead fr-sub-title fr-sub-title--first">한 활동</h3>
      {profile ? (
        <ul className="fr-chips"><li className="fr-path"><span className={`ui-field__dot ui-field__dot--${FIELD_GROUP[profile.activity.field]}`} aria-hidden="true" /><span>{profile.activity.title}</span></li></ul>
      ) : <p className="fr-empty">공개한 활동이 아직 없어요.</p>}
    </Drawer>
  );
}
