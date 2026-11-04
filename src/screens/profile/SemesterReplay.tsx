import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Button } from '../../components';
import { semesterLabel } from '../../domain/analysis/semester';
import { semesterReplay } from '../../domain/challenges/replay';
import { CURRENT_TERM } from '../../data/records';

/**
 * 학기 돌아보기(Steam Replay 대신): 다른 학생이 아니라 지난 학기의 나와만 견준다.
 * 항목마다 막대 둘(지난 학기 회색, 이번 학기 네이비). 막대 길이는 세 항목이 같은 눈금을 쓴다. 점수·등급은 없다.
 */
export function SemesterReplay() {
  const { state } = useApp();
  const replay = semesterReplay(state.records, CURRENT_TERM.semester);

  if (!replay) {
    return (
      <section className="pf-replay pf-replay--empty" aria-label="학기 돌아보기">
        <p className="pf-replay__title">학기 돌아보기</p>
        <div className="pf-replay__ghost" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} />)}</div>
        <p className="fr-empty">기록이 쌓이면 지난 학기의 나와 견줘 보여 줘요.</p>
        <Button size="sm" onClick={() => navigate('activities')}>내 활동 보기</Button>
      </section>
    );
  }

  const top = Math.max(1, ...replay.metrics.flatMap(m => [m.before, m.now]));
  const w = (n: number) => `${(n / top) * 100}%`;
  return (
    <section className="pf-replay" aria-label="학기 돌아보기">
      <p className="pf-replay__title">
        학기 돌아보기
        <span className="pf-replay__legend">
          <span className="pf-replay__key pf-replay__key--before" aria-hidden="true" />{semesterLabel(replay.before)}
          <span className="pf-replay__key pf-replay__key--now" aria-hidden="true" />{semesterLabel(replay.now)}
        </span>
      </p>
      <ul className="pf-replay__grid">
        {replay.metrics.map(m => (
          <li key={m.id} className="pf-replay__metric" aria-label={`${m.label}: 지난 학기 ${m.before}, 이번 학기 ${m.now}`}>
            <span className="pf-replay__label">{m.label}</span>
            <span className="pf-replay__row" aria-hidden="true">
              <span className="pf-replay__track"><span className="pf-replay__bar pf-replay__bar--before" style={{ width: w(m.before) }} /></span>
              <span className="num">{m.before}</span>
            </span>
            <span className="pf-replay__row" aria-hidden="true">
              <span className="pf-replay__track"><span className="pf-replay__bar pf-replay__bar--now" style={{ width: w(m.now) }} /></span>
              <span className="num">{m.now}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
