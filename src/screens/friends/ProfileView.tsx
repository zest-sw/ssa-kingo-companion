import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { navigate } from '../../app/router';
import { Badge, Button, Card, EmptyState, Icon, useToast } from '../../components';
import { showcaseable } from '../../domain/challenges';
import { publicActivities, publicRecords } from '../../domain/social';
import { FIELD_GROUP, FIELD_LABEL } from '../../domain/vocab';
import { DONE_BY, FEED, FRIENDS, INCOMING, SIMILAR_PEERS, type Peer } from '../../data/friends';

const Avatar = ({ name }: { name: string }) => <span className="fr-avatar" aria-hidden="true">{name.slice(0, 1)}</span>;
const peerLine = (p: Peer) => `${p.dept} ${p.year}학년 · ${p.note}`;

export function ProfileView() {
  const { state } = useApp();
  const toast = useToast();
  const challenges = useChallenges();
  const v = state.visibility;
  const [friends, setFriends] = useState<Peer[]>(FRIENDS);
  const [incoming, setIncoming] = useState<Peer[]>(INCOMING);
  const [sent, setSent] = useState<string[]>([]);
  const [cheered, setCheered] = useState<string[]>([]);

  const acts = publicActivities(state.activities, v);
  const retros = publicRecords(state.records, v);
  const shown = showcaseable(challenges, v.showcaseChallengeIds).map(id => challenges.find(c => c.def.id === id)!);
  const interests = state.profile.interests.filter(i => i !== 'unknown').map(i => FIELD_LABEL[i]).join(', ');
  const mine = new Set(state.activities.map(a => a.title));
  const doneBy = DONE_BY.filter(d => mine.has(d.activityTitle));

  const accept = (p: Peer) => {
    setIncoming(list => list.filter(x => x.id !== p.id));
    setFriends(list => [...list, p]);
    toast(`${p.name}님과 친구가 됐어요.`);
  };

  return (
    <div className="fr-cols">
      <div className="fr-col-main fr-stack">
        <Card title="친구에게 이렇게 보여요" action={<Badge tone="green" icon="friends">공개 중</Badge>}>
          <div className="fr-me">
            <span className="fr-avatar fr-avatar--lg" aria-hidden="true">성</span>
            <div>
              <p className="fr-me__name">나</p>
              <p className="fr-me__sub">소프트웨어학과 3학년{interests && ` · ${interests}`}</p>
            </div>
          </div>
          <h3 className="fr-sub-title">전시한 도전 과제</h3>
          {shown.length ? (
            <ul className="fr-tiles">
              {shown.map(c => <li key={c.def.id} className="fr-tile"><Icon name={c.def.icon} size={22} /><span>{c.def.name}</span></li>)}
            </ul>
          ) : (
            <EmptyState icon="trophy" message="전시할 도전 과제를 고르면 친구에게 보여요." action={<Button size="sm" onClick={() => navigate('challenges')}>도전 과제 보기</Button>} />
          )}
        </Card>

        <Card title="공개한 활동 경로">
          {acts.length ? (
            <ul className="fr-chips">
              {acts.map(a => <li key={a.id} className="fr-path"><span className={`ui-field__dot ui-field__dot--${FIELD_GROUP[a.field]}`} aria-hidden="true" /><span>{a.title}</span></li>)}
            </ul>
          ) : (
            <EmptyState icon="flag" message="보여 줄 활동이 없어요. 공개 범위 설정에서 보일 활동을 골라 보세요." action={<Button size="sm" onClick={() => navigate('settings/visibility')}>공개 범위 설정</Button>} />
          )}
          {retros.length > 0 && (
            <ul className="fr-retros">
              {retros.map(r => <li key={r.id} className="fr-retro"><p className="fr-retro__label">{r.title} 회고</p><p>“{r.quote}”</p></li>)}
            </ul>
          )}
          {retros.length === 0 && acts.length > 0 && <p className="fr-empty">공개할 회고를 고르면 여기에 보여요.</p>}
        </Card>
      </div>

      <div className="fr-col-side fr-stack">
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

        <Card padding="md" title="친구 소식">
          {FEED.length === 0 ? <p className="fr-empty">친구 소식이 아직 없어요. 친구를 맺으면 여기에 보여요.</p> : (<ul className="fr-people">
            {FEED.map(f => {
              const on = cheered.includes(f.id);
              return (
                <li key={f.id} className="fr-feed">
                  <p className="fr-feed__text">{f.text}</p>
                  <Button size="sm" aria-pressed={on} onClick={() => setCheered(c => (on ? c.filter(x => x !== f.id) : [...c, f.id]))}>응원{f.cheers + (on ? 1 : 0) > 0 ? ` ${f.cheers + (on ? 1 : 0)}` : '하기'}</Button>
                </li>
              );
            })}
          </ul>)}
        </Card>
      </div>
    </div>
  );
}
