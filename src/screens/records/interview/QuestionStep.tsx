import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { AiMark, Button, Chip, Panel, ProgressBar, useFocusOnChange } from '../../../components';
import { insertChip, QUESTION_COUNT, type Question } from '../../../domain/interview/questions';

type Props = {
  index: number;
  question: Question;
  value: string;
  chips: string[];
  /** 미리보기에서 고치러 왔으면 주 버튼이 미리보기로 바로 돌아간다 */
  returning: boolean;
  /** 질문을 넘긴 방향. 들어오는 움직임의 방향을 정한다 */
  dir: 'fwd' | 'back';
  note?: ReactNode;
  onChange: (text: string) => void;
  onNext: () => void;
  onPrev: () => void;
};

/** 질문 하나. 위에 얇은 진행 막대, 큰 질문, 답 조각(추정), 직접 쓰는 칸. 주 버튼은 늘 같은 자리다. */
export function QuestionStep({ index, question, value, chips, returning, dir, note, onChange, onNext, onPrev }: Props) {
  const qid = useId();
  const hid = useId();
  const field = useRef<HTMLTextAreaElement>(null);

  // 질문이 바뀌면 입력 칸으로 초점을 옮긴다. 칸 이름이 질문이라 화면 읽기도 질문부터 읽는다.
  useFocusOnChange(field, index, { onMount: true, caretEnd: true });

  const pick = (chip: string) => {
    onChange(insertChip(value, chip));
    field.current?.focus();
  };
  // Enter 는 다음으로, Shift+Enter 는 줄바꿈. 한글 조합 중 Enter 는 글자 확정이라 넘기지 않는다.
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onNext(); }
  };

  const empty = !value.trim();
  const last = index === QUESTION_COUNT - 1;
  const primary = returning ? '미리보기로' : empty ? '건너뛰기' : last ? '미리보기' : '다음 질문';

  return (
    <Panel
      as="section"
      className="iv-panel"
      aria-labelledby={qid}
      footer={
        <>
          {index > 0 && !returning && <Button variant="ghost" onClick={onPrev}>이전 질문</Button>}
          <Button variant={empty && !returning ? 'secondary' : 'primary'} className="iv-next" onClick={onNext}>{primary}</Button>
        </>
      }
      note={note}
    >
      <ProgressBar value={index + 1} max={QUESTION_COUNT} label="질문 순서" showText />
      <div key={index} className="iv-q" data-dir={dir}>
        <h2 id={qid} className="iv-q__ask">{question.ask}</h2>
        <p id={hid} className="iv-q__hint">{question.hint}</p>
        <div className="iv-chips" role="group" aria-label="답 조각">
          {chips.map(c => <Chip key={c} className="iv-chip" onClick={() => pick(c)}>{c}</Chip>)}
          <span className="iv-chips__src">활동 정보로 만든 답 조각<AiMark /></span>
        </div>
        <textarea
          ref={field}
          className="iv-input"
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKey}
          placeholder="말하듯 써도 돼요"
          aria-labelledby={qid}
          aria-describedby={hid}
        />
      </div>
    </Panel>
  );
}
