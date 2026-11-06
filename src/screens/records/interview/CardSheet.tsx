import { Icon } from '../../../components';
import { QUESTIONS, type QuestionKey } from '../../../domain/interview/questions';
import { STEP_LABEL } from '../../../domain/interview/schema';
import type { RecordCard } from '../../../domain/types';
import { VerificationBadge } from '../RecordCardView';

type Props = {
  title: string;
  meta: string;
  verification: 'school' | 'self';
  card: RecordCard;
  /** 주면 칸을 눌러 그 질문으로 돌아가 고친다(미리보기). 없으면 읽기만(결과 장면, 빈 칸은 숨김) */
  onEdit?: (key: QuestionKey) => void;
  titleId?: string;
};

/** 경험 카드 한 장. 학생이 쓴 글만 담는다. 건너뛴 칸은 빈칸으로 둔다. */
export function CardSheet({ title, meta, verification, card, onEdit, titleId }: Props) {
  const rows = onEdit ? QUESTIONS : QUESTIONS.filter(q => card[q.key]?.trim());
  return (
    <article className="iv-sheet" aria-labelledby={titleId}>
      <header className="iv-sheet__head">
        <h3 id={titleId} className="iv-sheet__title">{title}</h3>
        <p className="iv-sheet__meta">{meta} <VerificationBadge v={verification} /></p>
      </header>
      <dl className="iv-sheet__rows">
        {rows.map(q => {
          const v = card[q.key]?.trim();
          const label = STEP_LABEL[q.key];
          return (
            <div key={q.key} className="iv-row">
              <dt>{label}</dt>
              <dd>
                {onEdit ? (
                  <button type="button" className="iv-row__edit" onClick={() => onEdit(q.key)} aria-label={`${label} ${v ? '고치기' : '채우기'}: ${v ?? '건너뛴 칸이에요'}`}>
                    <span className={v ? undefined : 'iv-row__empty'}>{v ?? '건너뛴 칸이에요'}</span>
                    <Icon name="pencil" size={14} />
                  </button>
                ) : v}
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
