import { useState, type ReactNode } from 'react';
import { Button, Card, Icon, type IconName } from '../../components';
import { CHALLENGES } from '../../data/challenges';
import { useFriends } from './useFriends';
import { toggled } from '../../domain/social';
import { initialOf } from '../../domain/social/glance';
import type { FeedKind } from '../../domain/social/summary';
import { feedTag } from '../../domain/social/visual';
import { FriendDrawer } from './FriendDrawer';

const KIND_ICON: Record<FeedKind, IconName> = { achieved: 'check', hidden: 'sparkle', applied: 'flag', shared: 'doc' };

/** 친구 소식 처음 3개: 아바타 + 과제 배지 + 짧은 라벨. 행을 누르면 그 친구의 프로필 서랍이 열린다. footer 는 다음 단계로 가는 길. */
const SHOWN = 3;

export function FriendFeed({ footer }: { footer?: ReactNode }) {
  const { feed } = useFriends();
  const [cheered, setCheered] = useState<string[]>([]);
  const [friend, setFriend] = useState<string | null>(null);
  return (
    <Card padding="md" title="친구 소식" className="os-card">
      {feed.length === 0 ? <p className="fr-empty">친구를 맺으면 친구 소식이 여기에 보여요.</p> : (
        <ul className="pf-feed os-scroll">
          {feed.slice(0, SHOWN).map(f => {
            const on = cheered.includes(f.id);
            const icon = CHALLENGES.find(c => c.name === f.subject)?.icon ?? KIND_ICON[f.kind];
            return (
              <li key={f.id} className="pf-feed__row">
                <button type="button" className="pf-feed__open" onClick={() => setFriend(f.friendId)} aria-label={`${f.who} 님 프로필 보기. ${feedTag(f.kind, f.subject)}`}>
                  <span className="pf-face">{initialOf(f.who)}</span>
                  <span className="pf-feed__badge" aria-hidden="true"><Icon name={icon} size={18} /></span>
                  <span className="pf-feed__text"><b>{f.who}</b><span>{feedTag(f.kind, f.subject)}</span></span>
                </button>
                {/* 응원은 보냈는지만 보인다. 몇 명이 응원했는지는 세지 않는다(숫자 경쟁 없음). */}
                <Button size="sm" icon={on ? 'check' : undefined} aria-pressed={on} aria-label={`${f.who} 님 응원`} className="pf-cheer" onClick={() => setCheered(c => toggled(c, f.id))}>{on ? '응원함' : '응원하기'}</Button>
              </li>
            );
          })}
        </ul>
      )}
      {footer}
      <FriendDrawer friendId={friend} onClose={() => setFriend(null)} />
    </Card>
  );
}
