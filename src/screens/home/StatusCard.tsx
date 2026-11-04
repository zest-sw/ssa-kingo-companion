import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { hrefOf } from '../../app/router';
import { interestLine } from '../../app/student';
import { setStoryAnswer, useStory } from '../../app/useStory';
import { Button, Card, Icon, Radar, type IconName, type RadarVertex } from '../../components';
import { PROGRAM_BY_ID } from '../../data/catalog';
import { buildStrengths, radarScale, radarSpots } from '../../domain/analysis/strengths';
import { inventoryOf, situationOf } from '../../domain/homeStatus';

/**
 * 상태창(웹소설 상태창·소셜 스탯처럼): 누구인지 · 칭호(정체성 가설) · 스탯(역량 육각형, 값은 근거 기록 수) · 가진 것 · 지금 상황.
 * 숫자는 모두 센 개수다. 점수·레벨·다른 학생 비교는 없다.
 */
export function StatusCard() {
  const { state } = useApp();
  const challenges = useChallenges();
  const rows = useMemo(() => buildStrengths(state.records), [state.records]);
  const spots = useMemo(() => radarSpots(rows), [rows]);
  const scale = radarScale(spots);
  const inv = useMemo(() => inventoryOf(state.records, challenges.filter(c => c.achieved).length, PROGRAM_BY_ID), [state.records, challenges]);
  const now = situationOf(state.activities);
  // 칭호 = 이야기의 정체성 문장(나의 분석과 같은 문장·같은 확인 상태). 대안 고르기는 나의 분석 요약에서 한다.
  const { identity, newStudent } = useStory();

  const who = state.demo ? { name: '예시 학생', sub: '소프트웨어학과 · 3학년' } : { name: '나', sub: interestLine(state.profile) || '관심 분야를 골라 보세요' };
  const empty = spots.every(s => s.total === 0);
  const vertices: RadarVertex[] = spots.map(s => ({ key: s.axis, name: s.label, solid: s.confirmed, dashed: s.total, sub: empty ? '' : `확인 ${s.confirmed}` }));
  const items: { icon: IconName; n: number; label: string }[] = [
    { icon: 'records', n: inv.records, label: '기록' },
    { icon: 'doc', n: inv.cards, label: '경험 카드' },
    { icon: 'check', n: inv.school, label: '학교 확인' },
    { icon: 'trophy', n: inv.challenges, label: '도전 과제' }
  ];
  const estimated = identity.status === 'estimate';
  const canAnswer = !newStudent && estimated && identity.alternatives.length > 0;

  return (
    <Card className="home-status" aria-label="상태창" data-fill>
      <div className="home-who">
        <span className="home-who__avatar" aria-hidden="true">{who.name.slice(0, 1)}</span>
        <div className="home-who__text">
          <p className="home-who__eyebrow">상태창</p>
          <p className="home-who__name">{who.name}<span>{who.sub}</span></p>
        </div>
      </div>

      <div className="home-title">
        <p className="home-title__text" data-est={estimated || undefined} data-empty={newStudent || undefined}>
          <span className="sr-only">칭호{estimated ? '(AI 추정)' : ''}: </span>{identity.text}
        </p>
        {canAnswer && (
          <div className="home-title__ask">
            <Button size="sm" onClick={() => setStoryAnswer(identity.text)}>맞아요</Button>
            <a className="home-title__alt" href={hrefOf('analysis')}>다르게 볼래요</a>
          </div>
        )}
      </div>

      <div className="home-stat">
        <Radar
          vertices={vertices}
          max={scale.max}
          ticks={scale.ticks}
          empty={empty}
          label={empty ? '역량 여섯 개의 빈 육각형' : '역량별 근거 기록 수: 실선은 확인한 것, 점선은 AI 추정까지'}
          radius={64}
          fit
        />
      </div>

      <ul className="home-inv" aria-label="가진 것">
        {items.map(i => (
          <li key={i.label} className="home-inv__cell">
            <Icon name={i.icon} size={16} />
            <b className="num">{i.n}</b>
            <span>{i.label}</span>
          </li>
        ))}
        <li className="home-inv__cell home-inv__cell--deep">
          <Icon name="flag" size={16} />
          <b>{inv.deepest ?? '아직 없어요'}</b>
          <span>가장 깊이 간 분야</span>
        </li>
      </ul>

      <p className="home-now" aria-label="지금 상황">
        <span>하는 중 <b className="num">{now.doing}</b></span>
        <span data-hot={now.dueThisWeek > 0 || undefined}>이번 주 마감 <b className="num">{now.dueThisWeek}</b></span>
        <span data-hot={now.reviewWaiting > 0 || undefined}>회고 대기 <b className="num">{now.reviewWaiting}</b></span>
      </p>
    </Card>
  );
}
