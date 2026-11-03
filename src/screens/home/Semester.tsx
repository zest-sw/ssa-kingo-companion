import { Card, EmptyState } from '../../components';
import { semesterBars, semesterTag } from '../../domain/recommend-flow/summary';
import type { Activity } from '../../domain/types';

/** 이번 학기: 분야 묶음별 활동 수 막대. 막대마다 분야 이름과 개수를 바로 붙이고, 색은 분야 색이다. */
export function Semester({ activities }: { activities: Activity[] }) {
  const bars = semesterBars(activities);
  const max = Math.max(1, ...bars.map(b => b.count));
  return (
    <Card title="이번 학기" action={<span>{semesterTag(bars)}</span>} className="home-sem">
      {bars.length === 0 ? (
        <EmptyState icon="flag" message="이번 학기 활동이 아직 없어요. 추천에서 하나 골라 보세요." />
      ) : (
        <ul className="home-bars" aria-label="이번 학기 분야별 활동 수">
          {bars.map(b => (
            <li key={b.group} className="home-bars__row">
              <span className="home-bars__label">{b.label}</span>
              <span className="home-bars__track"><span className="home-bars__fill" data-tone={b.group} style={{ width: `${(b.count / max) * 100}%` }} /></span>
              <span className="home-bars__count num">{b.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
