import { useMemo, useRef, type KeyboardEvent } from 'react';
import { useApp } from '../../../app/AppState';
import { navigate } from '../../../app/router';
import { Button, FieldTag, useFocusOnChange } from '../../../components';
import { ONB_STEPS, onboardingResult } from '../../../domain/onboarding';
import { ddayOf } from '../../../domain/recommend';
import { isNearDeadline, prepareHref } from '../../../domain/recommend-flow/flow';
import { ddayText } from '../../../domain/text';

/**
 * 가입 인터뷰의 끝 장면. 할 일을 마친 화면을 막다른 곳으로 두지 않고 다음 경험의 시작점으로(토스 「디자이너가 시안 대신 앱을 만든 이유」).
 * 무엇이 준비됐는지(이번 주 추천 수)와 가장 추천 하나(이름 + 이유 한 줄)만.
 * 주 버튼은 그 가장 추천의 '신청 준비'(카드를 보고 바로 가려는 곳), 보조는 '홈으로'. 추천이 없으면 '홈으로' 하나.
 * 계산은 홈·추천과 같은 후보(view)에서 바로 꺼낸다. 로딩 연출 없음.
 */
export function OnboardingResult({ onHome }: { onHome: () => void }) {
  const { state, view } = useApp();
  const r = useMemo(() => onboardingResult(view), [view]);
  const head = useRef<HTMLHeadingElement>(null);
  // 질문에서 넘어온 포커스를 결과 제목으로. Enter 한 번이면 주 버튼(신청 준비, 없으면 홈으로).
  useFocusOnChange(head, null, { onMount: true });
  const program = r.top ? view.scored.find(s => s.p.id === r.top!.programId)?.p : undefined;
  const prepare = program ? () => navigate(prepareHref(program.id)) : undefined;
  const primary = prepare ?? onHome;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || (e.target as HTMLElement).closest('button, a')) return;
    e.preventDefault();
    primary();
  };

  return (
    <div className="onb onb--done" onKeyDown={onKey}>
      {/* 세 칸이 다 찬 막대: 끝났다는 표시이자, 버튼 자리를 질문 화면과 같게 지키는 머리 */}
      <div className="onb__bar">
        <div className="onb__progress" role="progressbar" aria-label="가입 인터뷰" aria-valuemin={1} aria-valuemax={ONB_STEPS.length} aria-valuenow={ONB_STEPS.length} aria-valuetext="끝났어요">
          {ONB_STEPS.map(s => <span key={s} className="onb__seg" data-on />)}
        </div>
      </div>
      <section className="onb__stage" aria-labelledby="onb-done">
        <h1 id="onb-done" ref={head} tabIndex={-1} className="onb__q" data-page-title>
          {r.count > 0 ? `이번 주 추천 ${r.count}개를 골랐어요` : '이번 주에 맞는 활동을 아직 못 찾았어요'}
        </h1>
        <p className="onb__why">{r.count > 0 ? '방금 고른 답으로 골랐어요. 신청은 내가 직접 눌러요' : '설정에서 시간이나 관심 분야를 넓히면 다시 골라 드려요'}</p>
        {r.top && (
          <article className="onb-pick" aria-labelledby="onb-pick-title">
            <p className="ui-subhead onb-pick__label">가장 추천</p>
            <h2 id="onb-pick-title" className="onb-pick__title">{r.top.title}</h2>
            <p className="onb-pick__why">{r.top.reason}</p>
            {program && (
              <p className="onb-pick__meta">
                <FieldTag field={program.field} />
                <span className="ui-dday num" data-near={isNearDeadline(ddayOf(program, state.week)) || undefined}>{ddayText(ddayOf(program, state.week))} 마감</span>
                <span>{program.durationLabel}</span>
              </p>
            )}
          </article>
        )}
      </section>
      <div className="onb__actions">
        <p className="onb__hint" />
        {prepare && <Button onClick={onHome}>홈으로</Button>}
        <Button variant="primary" onClick={primary}>{prepare ? '신청 준비' : '홈으로'}</Button>
      </div>
    </div>
  );
}
