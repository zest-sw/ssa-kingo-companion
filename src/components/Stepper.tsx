import { josaRo } from '../domain/text';
import { Icon } from './Icon';

export type StepItem<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  /** 무엇의 단계인지(스크린 리더용). 예: '신청 단계' */
  label: string;
  steps: StepItem<T>[];
  current: T;
  /** 주면 지난 단계를 눌러 돌아간다. 다음 단계로 건너뛰지는 않는다 */
  onStep?: (id: T) => void;
};

/**
 * 흐름을 나눈 작은 단계 표시: ① 고르기 › ② 자세히 › ③ 준비 › ④ 신청. 지금 단계만 진하고, 지난 단계는 체크로 바뀌어 누르면 돌아간다.
 * 한 화면에서 한 가지 결정만 하게 단계를 나눌 때 머리(PageHeader actions 또는 제목 아래)에 한 줄로 둔다.
 *
 *   <Stepper label="신청 단계" steps={STEPS} current={step} onStep={id => navigate(`recommend/${id}`)} />
 */
export function Stepper<T extends string>({ label, steps, current, onStep }: Props<T>) {
  const at = steps.findIndex(s => s.id === current);
  return (
    <nav aria-label={label}>
      <ol className="ui-stepper">
        {steps.map((s, i) => {
          const done = i < at;
          const body = (
            <>
              <span className="ui-stepper__num" aria-hidden="true">{done ? <Icon name="check" size={12} /> : i + 1}</span>
              <span>{s.label}</span>
            </>
          );
          const cls = `ui-stepper__step${done ? ' ui-stepper__step--done' : ''}`;
          return (
            <li key={s.id} className="ui-stepper__item">
              {done && onStep ? (
                <button type="button" className={cls} onClick={() => onStep(s.id)} aria-label={`${i + 1}단계 ${s.label}${josaRo(s.label)} 돌아가기`}>{body}</button>
              ) : (
                <span className={cls} aria-current={i === at ? 'step' : undefined}>
                  {body}
                  {i !== at && <span className="sr-only">{done ? ' (끝남)' : ' (다음)'}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
