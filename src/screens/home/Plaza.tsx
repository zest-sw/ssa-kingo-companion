import type { MouseEvent } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { Card } from '../../components';
import { HALL, SEED_POSTS } from '../../data/friends';
import { enterHall } from './enterHall';
import { PlazaArt, type Building } from './PlazaArt';

type Door = { kind: Building; path: string; name: string; what: string; n: number; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void };

/**
 * 광장: 들어가는 곳 셋. 문마다 작은 건물 그림, 이름, 숫자 하나. 기회 이름은 '다음 한 걸음'이 말하니 문에는 숫자만 둔다.
 * 순서는 퀘스트 받기, 먼저 간 사람, 함께할 사람.
 */
export function Plaza() {
  const { state, view } = useApp();
  const doors: Door[] = [
    { kind: 'board', path: 'recommend', name: '퀘스트 게시판', what: '새 퀘스트', n: view.newCount },
    { kind: 'hall', path: 'profile/hall', name: '명예의 전당', what: '걸어온 길', n: HALL.length, onClick: e => enterHall(e, 'profile/hall') },
    { kind: 'square', path: 'profile/recruit', name: '광장 게시판', what: '모집 글', n: state.recruitPosts.length + SEED_POSTS.length }
  ];

  return (
    <Card className="home-plaza" title="광장">
      <ul className="home-doors">
        {doors.map(d => (
          <li key={d.kind}>
            <a className="home-door" href={hrefOf(d.path)} onClick={d.onClick} data-door={d.kind}>
              <PlazaArt kind={d.kind} />
              <span className="home-door__text">
                <span className="home-door__name">{d.name}</span>
                <span className="home-door__n">{d.what} <b className="num">{d.n}</b></span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
