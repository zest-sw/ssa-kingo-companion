import { faceRow, initialOf } from '../../domain/social/glance';
import type { HallRoute, RecruitBar } from '../../domain/social/visual';
import { GROUP_LABEL } from '../../domain/vocab';

// 프로필 요약 소셜 카드의 그림. 카드 전체가 링크라서 누르는 요소를 두지 않는다.

const FACES = 4;

/** 친구 아바타 줄(이름 첫 글자 + 이름). 받은 요청은 주황 아바타로 이어 붙인다. 친구가 없으면 빈 점선 아바타. */
export function FacesPic({ friends, incoming }: { friends: string[]; incoming: string[] }) {
  const { shown, more } = faceRow(friends, FACES);
  return (
    <ul className="pf-faces" aria-label={`친구 ${friends.length}명, 요청 ${incoming.length}개`}>
      {shown.map(n => <li key={n} className="pf-faces__row"><span className="pf-face">{initialOf(n)}</span>{n}</li>)}
      {more > 0 && <li className="pf-faces__row"><span className="pf-face pf-face--more num">+{more}</span></li>}
      {friends.length === 0 && <li className="pf-faces__row"><span className="pf-face pf-face--empty">?</span></li>}
      {incoming.map(n => <li key={n} className="pf-faces__row is-req"><span className="pf-face pf-face--req">{initialOf(n)}</span>요청</li>)}
    </ul>
  );
}

/** 모집 글 수 막대: 종류(대회·해커톤·공모전)마다 한 줄. 길이는 글 수의 비교다. */
export function RecruitPic({ bars }: { bars: RecruitBar[] }) {
  const max = Math.max(1, ...bars.map(b => b.count));
  return (
    <ul className="pf-rb" aria-label="종류별 모집 글 수">
      {bars.map(b => (
        <li key={b.kind} className="pf-rb__row">
          <span className="pf-rb__kind">{b.kind}</span>
          <span className="pf-rb__track"><span className="pf-rb__bar" style={{ width: `${(b.count / max) * 100}%` }} /></span>
          <b className="pf-rb__n num">{b.count}</b>
        </li>
      ))}
    </ul>
  );
}

/** 명예의 전당 경로: 한 선배가 걸어온 활동 분야를 위에서 아래로 점으로 찍고 점선으로 잇는다. */
export function HallPic({ route }: { route: HallRoute }) {
  return (
    <ol className="pf-hp" aria-label={`${route.who}님이 걸어온 길 ${route.steps.length}단계`}>
      {route.steps.map((g, i) => <li key={i} className={`pf-hp__step an-g--${g}`}><span className="pf-hp__dot" />{GROUP_LABEL[g]}</li>)}
    </ol>
  );
}
