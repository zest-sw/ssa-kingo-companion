import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { hrefOf } from '../../app/router';
import { interestLine } from '../../app/student';
import { setStoryAnswer, useStory } from '../../app/useStory';
import { AiMark, Button, Card, Icon, Radar, type IconName, type RadarVertex } from '../../components';
import { buildStrengths, radarScale, radarSpots } from '../../domain/analysis/strengths';
import { inventoryOf } from '../../domain/homeStatus';

/** 육각형 반지름. 이름표까지 합쳐 높이 200px 안팎(낮은 화면) ~ 260px(높은 화면). 띠를 낮게 둔다 */
const TALL = '(min-height: 760px)';
function useRadarR() {
  const [tall, setTall] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(TALL).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(TALL);
    const on = () => setTall(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return tall ? 76 : 48;
}

/**
 * 내 상태(첫째 층): 화면 위를 가로로 쓰는 낮은 띠. 왼쪽 누구·칭호(정체성 가설), 가운데 작은 육각형(확인 근거 수), 오른쪽 가진 것.
 * 숫자는 모두 센 개수다. 점수·레벨·다른 학생 비교는 없다. 할 일과 제안은 다른 카드(다른 층)에 둔다.
 */
export function StatusCard() {
  const { state } = useApp();
  const challenges = useChallenges();
  const rows = useMemo(() => buildStrengths(state.records), [state.records]);
  const spots = useMemo(() => radarSpots(rows), [rows]);
  const scale = radarScale(spots);
  const inv = useMemo(() => inventoryOf(state.records, challenges.filter(c => c.achieved).length), [state.records, challenges]);
  // 칭호 = 이야기의 정체성 문장(나의 분석과 같은 문장·같은 확인 상태)
  const { identity, newStudent } = useStory();
  const radius = useRadarR();

  const who = state.demo ? { name: '예시 학생', sub: '소프트웨어학과 3학년' } : { name: '나', sub: interestLine(state.profile) || '관심 분야를 골라 보세요' };
  const empty = spots.every(s => s.total === 0);
  const vertices: RadarVertex[] = spots.map(s => ({ key: s.axis, name: s.label, solid: s.confirmed, dashed: s.total, sub: `확인 ${s.confirmed}` }));
  const items: { icon: IconName; n: number; label: string }[] = [
    { icon: 'doc', n: inv.cards, label: '경험 카드' },
    { icon: 'check', n: inv.school, label: '학교 확인' },
    { icon: 'trophy', n: inv.challenges, label: '도전 과제' }
  ];
  const nothing = items.every(i => i.n === 0);
  const estimated = identity.status === 'estimate';
  const canAnswer = !newStudent && estimated && identity.alternatives.length > 0;

  return (
    <Card className="home-band" aria-label="내 상태">
      <div className="home-me">
        <p className="home-me__who">{who.name}<span>{who.sub}</span></p>
        <p className="home-me__title">
          <span className="sr-only">칭호: </span>
          {estimated ? <AiMark variant="line">{identity.text}</AiMark> : identity.text}
        </p>
        {canAnswer && (
          <div className="home-me__ask">
            <Button size="sm" onClick={() => setStoryAnswer(identity.text)}>맞아요</Button>
            <a className="home-me__alt" href={hrefOf('analysis')}>다르게 볼래요</a>
          </div>
        )}
      </div>

      <div className="home-hex">
        {empty ? (
          <div className="home-hex__empty">
            <EmptyHex />
            <p>첫 활동을 마치면 근거가 쌓여요</p>
          </div>
        ) : (
          <Radar vertices={vertices} max={scale.max} ticks={scale.ticks} label="역량별 근거 기록 수: 실선은 확인한 것, 점선은 AI 추정까지" radius={radius} />
        )}
      </div>

      <section className="home-inv" aria-labelledby="home-inv-h">
        <h2 id="home-inv-h" className="ui-subhead home-inv__h">가진 것</h2>
        {nothing ? (
          <p className="home-inv__wait">첫 경험 카드를 기다려요</p>
        ) : (
          <ul className="home-inv__list">
            {items.map(i => (
              <li key={i.label}>
                <Icon name={i.icon} size={16} />
                <span>{i.label}</span>
                <b className="num">{i.n}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}

/** 근거가 생길 자리: 옅은 점선 육각형 하나(AI 추정 점선과 같은 옅은 선) */
function EmptyHex() {
  const r = 40;
  const pts = Array.from({ length: 6 }, (_, k) => {
    const a = ((-90 + 60 * k) * Math.PI) / 180;
    return `${(48 + r * Math.cos(a)).toFixed(1)},${(48 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="home-hex__pic" viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
      <polygon points={pts} />
    </svg>
  );
}
