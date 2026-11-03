import { deadlineRatio } from '../../domain/recommend-flow/trace';
import { isNearDeadline } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';

/** 마감까지 남은 날을 막대 길이로. 누를 수 없는 그림이라 목록 줄 안에도 놓는다. 값 라벨(D-2)이 막대 오른쪽에 붙는다. */
export function Meter({ dday }: { dday: number }) {
  const near = isNearDeadline(dday);
  return (
    <span className="rec-meter" role="img" aria-label={`마감까지 ${Math.max(0, dday)}일`}>
      <span className="rec-meter__track"><span className={`rec-meter__fill${near ? ' rec-meter__fill--near' : ''}`} style={{ width: `${deadlineRatio(dday) * 100}%` }} /></span>
      <span className={`rec-meter__text num${near ? ' rec-meter__text--near' : ''}`}>{ddayText(dday)}</span>
    </span>
  );
}
