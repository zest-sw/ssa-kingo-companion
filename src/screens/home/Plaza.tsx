import type { MouseEvent, ReactNode } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { useStory } from '../../app/useStory';
import { Card } from '../../components';
import { HALL, SEED_POSTS } from '../../data/friends';
import { HALL_JOINED } from '../../data/hall';
import { ddayOf } from '../../domain/recommend';
import { recentJoined } from '../../domain/hallStage';
import { nearestDday } from '../../domain/homeStatus';
import { canUseSocial } from '../../domain/social';
import { ddayText } from '../../domain/text';
import { useFriends } from '../profile/useFriends';
import { enterHall } from './enterHall';
import { PlazaArt, type Building } from './PlazaArt';

type Door = { kind: Building; path: string; name: string; sub: string; facts: ReactNode; line?: ReactNode; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void };

/**
 * 광장: 들어가는 곳 셋을 건물 문 카드로. 카드마다 그 안에 지금 무엇이 있는지(개수·이름)를 담아 사이드바와 다른 '내용 카드'가 된다.
 * 순서는 퀘스트 받기 → 먼저 간 사람 → 함께할 사람.
 */
export function Plaza() {
  const { state, view } = useApp();
  const { incoming } = useFriends();
  const { next } = useStory();
  const open = canUseSocial(state.visibility);
  const picks = view.primary ? [view.primary, ...view.alternatives] : [];
  const near = nearestDday(picks.map(s => ddayOf(s.p, state.week)));
  const recent = recentJoined(HALL, HALL_JOINED, 3);
  const posts = state.recruitPosts.length + SEED_POSTS.length;

  const doors: Door[] = [
    {
      kind: 'board', path: 'recommend', name: '퀘스트 게시판', sub: '나에게 맞춘 추천 활동',
      facts: <>새 퀘스트 <b className="num">{view.newCount}</b>{near !== undefined && <> · 가까운 마감 <b className="num">{ddayText(near)}</b></>}</>,
      // 추천 퀘스트 = 이야기의 다음 한 걸음(나의 분석·추천과 같은 후보)
      line: next ? next.title : '관심 분야를 고르면 퀘스트가 생겨요'
    },
    {
      kind: 'hall', path: 'profile/hall', name: '명예의 전당', sub: '먼저 간 사람들의 길',
      facts: <><b className="num">{HALL.length}</b>명의 이야기</>,
      line: (
        <span className="home-door__faces" aria-label={`최근 오른 사람 ${recent.map(h => h.name).join(', ')}`}>
          {recent.map(h => <span key={h.id} className="home-door__face" aria-hidden="true">{h.name.slice(0, 1)}</span>)}
          <span className="home-door__faces-label" aria-hidden="true">최근 오른 사람</span>
        </span>
      ),
      onClick: e => enterHall(e, 'profile/hall')
    },
    {
      kind: 'square', path: 'profile/recruit', name: '광장 게시판', sub: '친구 · 팀원 모집',
      facts: <>모집 글 <b className="num">{posts}</b> · 친구 요청 <b className="num">{incoming.length}</b></>,
      line: open ? '함께할 사람을 찾아봐요' : '프로필을 공개하면 열려요'
    }
  ];

  return (
    <Card className="home-plaza" title="광장">
      <ul className="home-doors">
        {doors.map(d => (
          <li key={d.kind}>
            <a className="home-door" href={hrefOf(d.path)} onClick={d.onClick} data-door={d.kind}>
              <PlazaArt kind={d.kind} />
              <span className="home-door__name">{d.name}<span>{d.sub}</span></span>
              <span className="home-door__facts">{d.facts}</span>
              {d.line && <span className="home-door__line">{d.line}</span>}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
