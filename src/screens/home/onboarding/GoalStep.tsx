import { Chip } from '../../../components';
import { GOAL_SUGGESTIONS } from '../../../data/home';

/** 목표: 입력 + 예시 칩. 비워도 끝낼 수 있다. 입력에서 Enter 는 흐름이 받아 끝내기로 쓴다. */
export function GoalStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label className="onb-goal">
        <span className="sr-only">목표</span>
        <input className="onb-goal__input" name="goal" autoComplete="off" value={value} maxLength={40} placeholder="예: 서비스 기획 직무" onChange={e => onChange(e.target.value)} data-enter-next />
      </label>
      <div className="onb-goal__chips" role="group" aria-label="목표 예시">
        {GOAL_SUGGESTIONS.map(g => <Chip key={g} selected={value === g} onClick={() => onChange(value === g ? '' : g)}>{g}</Chip>)}
      </div>
    </>
  );
}
