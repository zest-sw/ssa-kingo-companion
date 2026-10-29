import { useEffect, useRef, useState } from 'react';
import { Button, Card, Chip, Icon, LoadingState } from '../../components';
import { GOAL_SUGGESTIONS, ONBOARDING_WORK } from '../../data/home';
import { FORMAT_OPTIONS, INTEREST_OPTIONS } from '../../data/options';
import { EMPTY_PROFILE } from '../../data/seed';
import type { Interest, Profile } from '../../domain/types';
import { MAX_INTERESTS, toggleInterest } from '../../domain/recommend-flow/flow';
import { TIME_OPTIONS } from '../../domain/vocab';

const STEPS = 3;

/** 첫 실행에서 홈 자리에 그리는 가입 인터뷰: 관심 분야, 가능한 시간·방식, 목표. */
export function Onboarding({ onDone, onExample }: { onDone: (p: Profile) => void; onExample: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>(EMPTY_PROFILE);
  const [working, setWorking] = useState(false);
  const head = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // 단계가 바뀌면 질문으로 포커스를 옮겨 키보드 흐름이 끊기지 않게 한다.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    head.current?.focus({ preventScroll: true });
  }, [step, working]);

  useEffect(() => {
    if (!working) return;
    const t = window.setTimeout(() => onDone(draft), 1500);
    return () => window.clearTimeout(t);
  }, [working]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: Interest) => setDraft(d => ({ ...d, interests: toggleInterest(d.interests, id) }));

  const finish = () => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) onDone(draft); else setWorking(true);
  };

  if (working) {
    return (
      <Card className="home-onb" aria-labelledby="onb-q">
        <h1 id="onb-q" ref={head} tabIndex={-1} className="home-onb__q" data-page-title>이번 주 활동을 고르는 중이에요</h1>
        <LoadingState message="잠시만 기다려 주세요" lines={2} />
        <ul className="home-onb__work">
          {ONBOARDING_WORK.map(t => <li key={t}><Icon name="check" size={18} />{t}</li>)}
        </ul>
        <Button variant="ghost" size="sm" onClick={() => onDone(draft)}>바로 보기</Button>
      </Card>
    );
  }

  const canNext = step === 0 ? draft.interests.length > 0 : true;
  return (
    <Card className="home-onb" aria-labelledby="onb-q">
      <div className="home-onb__top">
        <p className="home-onb__intro">찾고 비교하는 일은 제가 할게요. 세 가지만 알려 주세요.</p>
        <span className="home-onb__count num" aria-label={`${STEPS}단계 중 ${step + 1}단계`}>{step + 1} / {STEPS}</span>
      </div>

      {step === 0 && (
        <section aria-labelledby="onb-q">
          <h1 id="onb-q" ref={head} tabIndex={-1} className="home-onb__q" data-page-title>요즘 관심 가는 걸 골라 주세요</h1>
          <p className="home-onb__sub">최대 {MAX_INTERESTS}개 · 몰라도 괜찮아요</p>
          <div className="home-onb__chips" role="group" aria-labelledby="onb-q">
            {INTEREST_OPTIONS.map(o => <Chip key={o.id} selected={draft.interests.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}</Chip>)}
          </div>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="onb-q">
          <h1 id="onb-q" ref={head} tabIndex={-1} className="home-onb__q" data-page-title>한 주에 쓸 수 있는 시간과 방식은요?</h1>
          <p className="home-onb__sub">이보다 긴 활동은 추천에서 빼 둘게요</p>
          <div className="home-onb__group">
            <p className="home-onb__label" id="onb-time">시간</p>
            <div className="home-onb__options" role="group" aria-labelledby="onb-time">
              {TIME_OPTIONS.map(o => (
                <button key={o.value} type="button" className="home-onb__option" aria-pressed={draft.time === o.value} onClick={() => setDraft(d => ({ ...d, time: o.value }))}>
                  <b>{o.label}</b><span>{o.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="home-onb__group">
            <p className="home-onb__label" id="onb-format">방식</p>
            <div className="home-onb__options" role="group" aria-labelledby="onb-format">
              {FORMAT_OPTIONS.map(o => (
                <button key={o.value} type="button" className="home-onb__option" aria-pressed={draft.format === o.value} onClick={() => setDraft(d => ({ ...d, format: o.value }))}>
                  <b>{o.label}</b><span>{o.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="onb-q">
          <h1 id="onb-q" ref={head} tabIndex={-1} className="home-onb__q" data-page-title>이루고 싶은 목표가 있나요?</h1>
          <p className="home-onb__sub">비워 둬도 돼요. 나중에 바꿀 수 있어요</p>
          <label className="home-onb__field">
            <span className="sr-only">목표</span>
            <input className="home-onb__input" value={draft.goal} maxLength={40} placeholder="예: 서비스 기획 직무" onChange={e => { const goal = e.target.value; setDraft(d => ({ ...d, goal })); }} />
          </label>
          <div className="home-onb__chips" role="group" aria-label="목표 예시">
            {GOAL_SUGGESTIONS.map(g => <Chip key={g} selected={draft.goal === g} onClick={() => setDraft(d => ({ ...d, goal: d.goal === g ? '' : g }))}>{g}</Chip>)}
          </div>
        </section>
      )}

      <div className="home-onb__actions">
        <Button variant="ghost" onClick={onExample}>예시로 둘러보기</Button>
        <span className="home-onb__spacer" />
        {step > 0 && <Button onClick={() => setStep(step - 1)}>이전</Button>}
        {step < STEPS - 1
          ? <Button variant="primary" disabled={!canNext} onClick={() => setStep(step + 1)}>다음</Button>
          : <Button variant="primary" onClick={finish}>이번 주 활동 보기</Button>}
      </div>
      {step === 0 && !canNext && <p className="home-onb__hint" role="status">하나 이상 고르면 다음으로 갈 수 있어요</p>}
    </Card>
  );
}
