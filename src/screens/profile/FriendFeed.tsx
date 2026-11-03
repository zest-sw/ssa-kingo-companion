import { useState } from 'react';
import { Button, Card, Icon, type IconName } from '../../components';
import { CHALLENGES } from '../../data/challenges';
import { FEED } from '../../data/friends';
import { initialOf } from '../../domain/social/glance';
import type { FeedKind } from '../../domain/social/summary';
import { feedTag } from '../../domain/social/visual';
import { FriendDrawer } from './FriendDrawer';

const KIND_ICON: Record<FeedKind, IconName> = { achieved: 'check', hidden: 'sparkle', applied: 'flag', shared: 'doc' };

/** 친구 소식: 아바타 + 과제 배지 + 짧은 라벨. 행을 누르면 그 친구의 프로필 서랍이 열린다. */
export function FriendFeed() {
  const [cheered, setCheered] = useState<string[]>([]);
  const [friend, setFriend] = useState<string | null>(null);
  return (
    <Card padding="md" title="친구 소식" className="os-card">
      {FEED.length === 0 ? <p className="fr-empty">친구를 맺으면 친구 소식이 여기에 보여요.</p> : (
        <ul className="pf-feed os-scroll">
          {FEED.map(f => {
            const on = cheered.includes(f.id);
            const n = f.cheers + (on ? 1 : 0);
            const icon = CHALLENGES.find(c => c.name === f.subject)?.icon ?? KIND_ICON[f.kind];
            return (
              <li key={f.id} className="pf-feed__row">
                <button type="button" className="pf-feed__open" onClick={() => setFriend(f.friendId)} aria-label={`${f.who} 님 프로필 보기. ${feedTag(f.kind, f.subject)}`}>
                  <span className="pf-face">{initialOf(f.who)}</span>
                  <span className="pf-feed__badge" aria-hidden="true"><Icon name={icon} size={18} /></span>
                  <span className="pf-feed__text"><b>{f.who}</b><span>{feedTag(f.kind, f.subject)}</span></span>
                </button>
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
