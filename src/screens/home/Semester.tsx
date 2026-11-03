import { Card, GhostPic } from '../../components';
import { GROUP_LABEL, GROUP_ORDER } from '../../domain/vocab';
import type { Interest } from '../../domain/types';
import { semesterBars, semesterTag } from '../../domain/recommend-flow/summary';
import type { Activity } from '../../domain/types';

const ghostRows = (interests: Interest[]) => {
  const mine = GROUP_ORDER.filter(g => interests.includes(g));
  return (mine.length ? mine : GROUP_ORDER.slice(0, 3)).map(g => GROUP_LABEL[g]);
};

/** 이번 학기: 분야 묶음별 활동 수 막대. 막대마다 분야 이름과 개수를 바로 붙이고, 색은 분야 색이다. */
export function Semester({ activities, interests }: { activities: Activity[]; interests: Interest[] }) {
  const bars = semesterBars(activities);
  const max = Math.max(1, ...bars.map(b => b.count));
  return (
    <Card title="이번 학기" action={bars.length > 0 && <span>{semesterTag(bars)}</span>} className="home-sem">
      {bars.length === 0 ? (
        // 첫 사용: 관심 분야(없으면 앞의 세 묶음) 막대 틀만
        <GhostPic kind="bars" labels={ghostRows(interests)} message="활동을 하나 시작하면 막대가 생겨요" />
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
