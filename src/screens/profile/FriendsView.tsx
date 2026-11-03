import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { Badge, Button, Card, useToast } from '../../components';
import { friendsLine } from '../../domain/social/summary';
import { DONE_BY, FRIENDS, INCOMING, SIMILAR_PEERS, type Peer } from '../../data/friends';

const Avatar = ({ name }: { name: string }) => <span className="fr-avatar" aria-hidden="true">{name.slice(0, 1)}</span>;
const peerLine = (p: Peer) => `${p.dept} ${p.year}학년 · ${p.note}`;

/** 프로필 › 친구: 받은 요청, 친구 목록, 비슷한 학생, 내 활동을 해 본 사람. 공개한 학생만 본다. */
export function FriendsView() {
  const { state } = useApp();
  const toast = useToast();
  const [friends, setFriends] = useState<Peer[]>(FRIENDS);
  const [incoming, setIncoming] = useState<Peer[]>(INCOMING);
  const [sent, setSent] = useState<string[]>([]);
  const mine = new Set(state.activities.map(a => a.title));
  const doneBy = DONE_BY.filter(d => mine.has(d.activityTitle));

  const accept = (p: Peer) => {
    setIncoming(list => list.filter(x => x.id !== p.id));
    setFriends(list => [...list, p]);
    toast(`${p.name}님과 친구가 됐어요.`);
  };

  return (
    <>
    <p className="fr-headline">{friendsLine(friends.length, incoming.length)}</p>
    <div className="fr-cols fit__scroll fit__scroll--page">
      <div className="fr-col-main fr-stack">
        <Card padding="md" title="친구">
          {incoming.length > 0 && (
            <ul className="fr-people fr-people--requests">
              {incoming.map(p => (
                <li key={p.id} className="fr-person">
                  <Avatar name={p.name} />
                  <div className="fr-person__text"><p className="fr-person__name">{p.name}</p><p className="fr-person__sub">친구 요청 · {peerLine(p)}</p></div>
                  <Button size="sm" variant="primary" onClick={() => accept(p)}>수락</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIncoming(list => list.filter(x => x.id !== p.id))}>다음에</Button>
                </li>
              ))}
            </ul>
          )}
          {friends.length ? (
            <ul className="fr-people">
              {friends.map(p => <li key={p.id} className="fr-person"><Avatar name={p.name} /><div className="fr-person__text"><p className="fr-person__name">{p.name}</p><p className="fr-person__sub">{peerLine(p)}</p></div></li>)}
            </ul>
          ) : <p className="fr-empty">아직 친구가 없어요. 비슷한 친구에게 신청해 보세요.</p>}
        </Card>

        <Card padding="md" title="나와 비슷한 친구">
          <ul className="fr-people">
            {SIMILAR_PEERS.map(p => (
              <li key={p.id} className="fr-person">
                <Avatar name={p.name} />
                <div className="fr-person__text"><p className="fr-person__name">{p.name}</p><p className="fr-person__sub">{peerLine(p)}</p></div>
                {sent.includes(p.id)
                  ? <Badge tone="neutral">요청 보냄</Badge>
                  : <Button size="sm" variant="primary" onClick={() => { setSent(s => [...s, p.id]); toast(`${p.name}님에게 친구 요청을 보냈어요.`); }}>친구 신청</Button>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="fr-col-side fr-stack">
        <Card padding="md" title="이 활동을 해 본 친구·선배">
          {doneBy.length ? (
            <ul className="fr-people">
              {doneBy.map(d => (
                <li key={d.activityTitle} className="fr-doneby">
                  <p className="fr-person__name">{d.activityTitle}</p>
                  <p className="fr-person__sub">{d.people.map(p => `${p.name} · ${p.label}`).join(', ')}</p>
                </li>
              ))}
            </ul>
          ) : <p className="fr-empty">내 활동을 해 본 사람이 아직 없어요. 활동을 추가하면 찾아 줘요.</p>}
        </Card>
      </div>
    </div>
    </>
  );
}
