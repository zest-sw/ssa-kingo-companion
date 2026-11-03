import { useState } from 'react';
import { Button, Card } from '../../components';
import { FEED } from '../../data/friends';
import { feedLine } from '../../domain/social/summary';
import { FriendDrawer } from './FriendDrawer';

/** 친구 소식. 문장을 누르면 그 친구의 프로필 서랍이 열린다. */
export function FriendFeed() {
  const [cheered, setCheered] = useState<string[]>([]);
  const [friend, setFriend] = useState<string | null>(null);
  return (
    <Card padding="md" title="친구 소식">
      {FEED.length === 0 ? <p className="fr-empty">친구를 맺으면 친구 소식이 여기에 보여요.</p> : (
        <ul className="fr-people">
          {FEED.map(f => {
            const on = cheered.includes(f.id);
            const n = f.cheers + (on ? 1 : 0);
            return (
              <li key={f.id} className="fr-feed">
                <button type="button" className="fr-feed__text fr-feed__open" onClick={() => setFriend(f.friendId)}>{feedLine(f)}</button>
                <Button size="sm" aria-pressed={on} onClick={() => setCheered(c => (on ? c.filter(x => x !== f.id) : [...c, f.id]))}>응원{n > 0 ? ` ${n}` : '하기'}</Button>
              </li>
            );
          })}
        </ul>
      )}
      <FriendDrawer friendId={friend} onClose={() => setFriend(null)} />
    </Card>
  );
}
