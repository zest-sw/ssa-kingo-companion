import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '../../components';
import { EMPTY_PROFILE } from '../../data/seed';
import { canAdvance, ONB_STEPS, stepDirection } from '../../domain/onboarding';
import { MAX_INTERESTS } from '../../domain/recommend-flow/flow';
import type { Profile } from '../../domain/types';
import { QUESTIONS } from './onboarding/copy';
import { GoalStep } from './onboarding/GoalStep';
import { InterestStep } from './onboarding/InterestStep';
import { PlanStep } from './onboarding/PlanStep';
import './onboarding/onboarding.css';

const STEPS = ONB_STEPS.length;

/**
 * 첫 실행에서 홈 자리에 그리는 가입 인터뷰. 한 화면 한 질문(관심 분야 → 시간·방식 → 목표).
 * 위: 얇은 진행 막대 3칸 + 출구 하나(예시로 둘러보기). 가운데: 질문과 왜 묻는지 한 줄. 아래: 주 버튼, 세 화면 모두 같은 자리.
 * 마지막 버튼을 누르면 기다림 없이 바로 저장한다(onDone). 끝 장면은 부모(HomeScreen)가 그린다.
 */
export function Onboarding({ onDone, onExample }: { onDone: (p: Profile) => void; onExample: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'next' | 'back' | undefined>();
  const [draft, setDraft] = useState<Profile>(EMPTY_PROFILE);
  const head = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // 단계가 바뀌면 질문으로 포커스를 옮겨 키보드 흐름이 끊기지 않게 한다(첫 화면은 앱 틀이 옮긴다).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    head.current?.focus({ preventScroll: true });
  }, [step]);

  const canNext = canAdvance(step, draft);
  const go = (to: number) => { setDir(stepDirection(step, to)); setStep(to); };
  const next = () => {
    if (!canNext) return;
    if (step < STEPS - 1) go(step + 1); else onDone({ ...draft, goal: draft.goal.trim() });
  };

  // Enter 로 다음. 버튼 위에서는 버튼 자신의 동작(고르기)을 지키고, 한글 조합 중인 Enter 는 넘기지 않는다.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    e.preventDefault();
    next();
  };

  const { q, why } = QUESTIONS[step];
  const set = (patch: Partial<Profile>) => setDraft(d => ({ ...d, ...patch }));
  return (
    <div className="onb" onKeyDown={onKey}>
      <div className="onb__bar">
        <div className="onb__progress" role="progressbar" aria-label="가입 인터뷰" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-valuetext={`${STEPS}단계 중 ${step + 1}단계`}>
          {ONB_STEPS.map((s, i) => <span key={s} className="onb__seg" data-on={i <= step || undefined} />)}
        </div>
        <Button variant="ghost" size="sm" onClick={onExample}>예시로 둘러보기</Button>
      </div>

      <section key={step} className="onb__stage" data-dir={dir} aria-labelledby="onb-q">
        {step === 0 && <p className="onb__lead">찾고 비교하는 일은 제가 할게요. 세 가지만 알려 주세요</p>}
        <h1 id="onb-q" ref={head} tabIndex={-1} className="onb__q" data-page-title>{q}</h1>
        <p className="onb__why">{why}</p>
        <div className="onb__body">
          {step === 0 && <InterestStep value={draft.interests} onChange={interests => set({ interests })} labelledBy="onb-q" />}
          {step === 1 && <PlanStep time={draft.time} format={draft.format} onTime={time => set({ time })} onFormat={format => set({ format })} />}
          {step === 2 && <GoalStep value={draft.goal} onChange={goal => set({ goal })} />}
        </div>
      </section>

      <div className="onb__actions">
        <p className="onb__hint" role="status">
          {step === 0 && !canNext ? '하나 이상 고르면 다음으로 갈 수 있어요'
            : step === 0 && draft.interests.length >= MAX_INTERESTS ? `${MAX_INTERESTS}개까지 골랐어요. 바꾸려면 하나를 빼 주세요`
            : step === STEPS - 1 ? '학교 데이터는 동의한 것만 써요' : ''}
        </p>
        {step > 0 && <Button onClick={() => go(step - 1)}>이전</Button>}
        <Button variant="primary" disabled={!canNext} onClick={next} aria-keyshortcuts="Enter">
          {step < STEPS - 1 ? '다음' : '이번 주 활동 보기'}
        </Button>
      </div>
    </div>
  );
}
