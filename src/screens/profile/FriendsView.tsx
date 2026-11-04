import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { Badge, Button, Card, useToast } from '../../components';
import { friendsLine } from '../../domain/social/summary';
import { canFollow } from '../../domain/social/path';
import { DONE_BY, SENIORS, SIMILAR_PEERS, type DoneByPerson, type Peer } from '../../data/friends';
import { FriendDrawer } from './FriendDrawer';
import { SeniorDrawer } from './SeniorDrawer';
import { useFriends } from './useFriends';

const Avatar = ({ name }: { name: string }) => <span className="fr-avatar" aria-hidden="true">{name.slice(0, 1)}</span>;

/** 친구는 친구 프로필 서랍, 경로를 공개한 선배는 경로 서랍을 연다. 공개하지 않은 선배는 이름만. */
function DoneByChip({ person: p, onFriend, onSenior }: { person: DoneByPerson; onFriend: (id: string) => void; onSenior: (id: string) => void }) {
  const senior = p.seniorId ? SENIORS[p.seniorId] : undefined;
  const open = p.friendId ? () => onFriend(p.friendId!) : senior && canFollow(senior) ? () => onSenior(senior.id) : undefined;
  const text = <><b>{p.name}</b><span>{p.label}</span></>;
  if (!open) return <span className="fr-who fr-who--closed" title="경로를 공개하지 않았어요">{text}<span className="fr-who__note">경로 비공개</span></span>;
  return <button type="button" className="fr-who" aria-haspopup="dialog" onClick={open}>{text}</button>;
}
/** 친구 칸에 처음 보이는 친구 수. 받은 요청과 합쳐 덩어리 안 항목이 5개를 넘지 않게 하고, 나머지는 '더 보기'로 연다 */
const FRIENDS_SHOWN = 4;
const peerLine =(p: Peer) => `${p.dept} ${p.year}학년 · ${p.note}`;

/** 프로필 › 친구: 받은 요청, 친구 목록, 비슷한 학생, 내 활동을 해 본 사람. 공개한 학생만 본다. */
export function FriendsView() {
  const { state } = useApp();
  const toast = useToast();
  const start = useFriends();
  const [friends, setFriends] = useState<Peer[]>(start.friends);
  const [incoming, setIncoming] = useState<Peer[]>(start.incoming);
  const [sent, setSent] = useState<string[]>([]);
  const [allFriends, setAllFriends] = useState(false);
  const [friend, setFriend] = useState<string | null>(null);
  const [senior, setSenior] = useState<string | null>(null);
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
    <div className="fr-cols os-scroll os-scroll--page">
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
            <>
              <ul className="fr-people">
                {(allFriends ? friends : friends.slice(0, FRIENDS_SHOWN)).map(p => <li key={p.id} className="fr-person"><Avatar name={p.name} /><div className="fr-person__text"><p className="fr-person__name">{p.name}</p><p className="fr-person__sub">{peerLine(p)}</p></div></li>)}
              </ul>
              {friends.length > FRIENDS_SHOWN && (
                <Button size="sm" variant="ghost" icon={allFriends ? 'down' : 'chevron'} aria-expanded={allFriends} onClick={() => setAllFriends(v => !v)}>
                  {allFriends ? '접기' : `친구 ${friends.length - FRIENDS_SHOWN}명 더 보기`}
                </Button>
              )}
            </>
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
            <>
              <p className="fr-empty">이름을 누르면 공개한 경로를 따라 볼 수 있어요.</p>
              <ul className="fr-people">
                {doneBy.map(d => (
                  <li key={d.activityTitle} className="fr-doneby">
                    <p className="fr-person__name">{d.activityTitle}</p>
                    <ul className="fr-doneby__people">
                      {d.people.map(p => <li key={p.name}><DoneByChip person={p} onFriend={setFriend} onSenior={setSenior} /></li>)}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="fr-empty">내 활동을 해 본 사람이 아직 없어요. 활동을 추가하면 찾아 줘요.</p>}
        </Card>
      </div>
    </div>
    <FriendDrawer friendId={friend} onClose={() => setFriend(null)} />
    <SeniorDrawer seniorId={senior} onClose={() => setSenior(null)} />
    </>
  );
}
