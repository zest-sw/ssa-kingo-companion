import { useState } from 'react';
import { Button, SegmentedControl, useToast } from '../../components';
import { answerReady, missingStar, starAnswer } from '../../domain/interview/answer';
import { STEP_LABEL, type CardStep } from '../../domain/interview/schema';
import { josa } from '../../domain/text';
import type { RecordCard } from '../../domain/types';

/** 경험(STAR)과 돌아보기(Gibbs 결론·실행 계획). 면접 답변 틀의 이름을 옆에 작게 단다. */
const GROUPS: { title: string; steps: CardStep[] }[] = [
  { title: '경험', steps: ['situation', 'role', 'action', 'result'] },
  { title: '돌아보기', steps: ['learned', 'next'] }
];
const STAR_NAME: Partial<Record<CardStep, string>> = { role: '과제', action: '행동' };

/** 글을 클립보드에 넣고 알린다. 대리 제출은 없다: 붙여 넣는 건 학생이 한다. */
export function useCopy() {
  const toast = useToast();
  return (text: string, done = '복사했어요. 붙여 넣고 말투를 다듬어 주세요.') => {
    const fail = () => toast('복사하지 못했어요. 글을 직접 골라 복사해 주세요.');
    if (!navigator.clipboard) { fail(); return; }
    navigator.clipboard.writeText(text).then(() => toast(done), fail);
  };
}

/** 경험 카드 칸들. 묶음 화면도 같이 쓴다(compact: 내보낼 글이라 빈 칸은 빼고 채운 칸만). */
export function StarFields({ card, compact }: { card: RecordCard; compact?: boolean }) {
  const groups = GROUPS.map(g => ({ ...g, steps: compact ? g.steps.filter(s => card[s]?.trim()) : g.steps })).filter(g => g.steps.length);
  return (
    <div className="xc-groups" data-compact={compact || undefined}>
      {groups.map(g => (
        <section key={g.title} className="xc-group" aria-label={g.title}>
          <h3 className="xc-group__title">{g.title}</h3>
          <dl className="xc-rows">
            {g.steps.map(s => (
              <div key={s} className="xc-row">
                <dt>{STEP_LABEL[s]}{STAR_NAME[s] && <span className="xc-row__star"> {STAR_NAME[s]}</span>}</dt>
                <dd className={card[s] ? undefined : 'xc-row__empty'}>{card[s] ?? '고치기에서 채울 수 있어요'}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** '상황·결과' + 을/를 */
const josaList = (labels: string[]) => { const t = labels.join('·'); return t + josa(t, '을', '를'); };

type Mode = 'card' | 'answer';
const MODES: { id: Mode; label: string }[] = [{ id: 'card', label: '경험 카드' }, { id: 'answer', label: '면접 답변' }];

/** 기록 서랍의 본문: 경험 카드 ↔ 면접 답변(STAR 순서 문단 + 복사) */
export function ExperienceCard({ card }: { card: RecordCard }) {
  const [mode, setMode] = useState<Mode>('card');
  const copy = useCopy();
  const ready = answerReady(card);
  const answer = starAnswer(card);
  const missing = missingStar(card);
  return (
    <div className="xc">
      <SegmentedControl<Mode> label="기록 보기 방식" value={mode} onChange={setMode} items={MODES} />
      {mode === 'card' ? <StarFields card={card} /> : (
        <section className="xc-answer" aria-label="면접 답변">
          {ready ? (
            <>
              <p className="xc-answer__text readable">{answer}</p>
              <div className="xc-answer__foot">
                <p className="xc-answer__hint">{missing.length ? `쓴 말을 STAR 순서로 이었어요. ${josaList(missing.map(s => STEP_LABEL[s]))} 채우면 더 단단해져요.` : '쓴 말을 상황·역할·한 일·결과 순서로 이었어요.'}</p>
                <Button size="sm" icon="doc" onClick={() => copy(answer)}>복사</Button>
              </div>
            </>
          ) : (
            <p className="xc-answer__hint">상황·역할·한 일·결과 중 한 칸을 채우면 답변이 생겨요. 아래 고치기에서 채워 주세요.</p>
          )}
        </section>
      )}
    </div>
  );
}
