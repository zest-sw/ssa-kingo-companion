import { useId, useRef, type ReactNode } from 'react';
import { Button, Chip, ErrorState, Panel, ProgressBar, useFocusOnChange } from '../../../components';
import { QUESTION_COUNT, type QuestionKey } from '../../../domain/interview/questions';
import type { Energy, RecordCard, RecordVisibility } from '../../../domain/types';
import { ENERGY } from '../../../domain/vocab';
import { SettingsSection } from '../RecordCardView';
import { CardSheet } from './CardSheet';

type Props = {
  title: string;
  meta: string;
  verification: 'school' | 'self';
  card: RecordCard;
  energy?: Energy;
  onEnergy: (e: Energy) => void;
  visibility: RecordVisibility;
  onVisibility: (v: RecordVisibility) => void;
  profilePublic: boolean;
  useForRecommend: boolean;
  onUseForRecommend: (v: boolean) => void;
  saving: boolean;
  failed: boolean;
  canSave: boolean;
  note?: ReactNode;
  onEdit: (key: QuestionKey) => void;
  onPrev: () => void;
  onSave: () => void;
};

/** 저장 전 미리보기: 완성될 경험 카드 한 장 + 끝난 뒤 에너지 + 공개 범위. 저장은 학생이 누를 때만. */
export function PreviewStep(p: Props) {
  const hid = useId();
  const cardTitle = useId();
  const head = useRef<HTMLHeadingElement>(null);
  useFocusOnChange(head, null, { onMount: true });

  const hint = !p.canSave ? '한 칸은 채워야 경험 카드가 돼요.' : !p.energy ? '끝난 뒤 에너지를 고르면 저장돼요.' : p.saving ? '저장하는 중이에요' : '저장하면 기록에 쌓여요.';
  return (
    <Panel
      as="section"
      className="iv-panel"
      aria-labelledby={hid}
      footer={
        <>
          <Button variant="ghost" disabled={p.saving} onClick={p.onPrev}>이전 질문</Button>
          {/* 저장 중에는 disabled 대신 aria-disabled: 버튼이 꺼지면 초점이 body로 떨어진다. 두 번 누름은 save() 가 막는다 */}
          <Button variant="primary" className="iv-next" disabled={!p.canSave || !p.energy} aria-disabled={p.saving || undefined} aria-busy={p.saving || undefined} aria-describedby={`${hid}-hint`} onClick={p.onSave}>
            {p.saving ? '저장하는 중' : '경험 카드 저장'}
          </Button>
        </>
      }
      note={<span id={`${hid}-hint`} role="status">{p.note ?? hint}</span>}
    >
      <ProgressBar value={QUESTION_COUNT} max={QUESTION_COUNT} label="질문 순서" />
      <div className="iv-q" data-dir="fwd">
        <h2 ref={head} id={hid} tabIndex={-1} className="iv-q__ask">이렇게 남아요</h2>
        <p className="iv-q__hint">쓴 말만 담았어요. 칸을 누르면 고쳐요.</p>
        {p.failed && <ErrorState message="경험 카드를 저장하지 못했어요. 쓴 답은 그대로예요." onRetry={p.onSave} />}
        <CardSheet title={p.title} meta={p.meta} verification={p.verification} card={p.card} onEdit={p.saving ? undefined : p.onEdit} titleId={cardTitle} />
        <div className="iv-energy">
          <span id={`${hid}-en`} className="iv-energy__label">끝난 뒤 에너지는 어땠어요?</span>
          <span className="iv-energy__chips" role="group" aria-labelledby={`${hid}-en`}>
            {ENERGY.map(e => (
              <Chip key={e.id} selected={p.energy === e.id} disabled={p.saving} onClick={() => p.onEnergy(e.id)} aria-describedby={`${hid}-en-${e.id}`}>
                {e.label}<span id={`${hid}-en-${e.id}`} className="sr-only">{e.sub}</span>
              </Chip>
            ))}
          </span>
        </div>
        <SettingsSection visibility={p.visibility} onVisibility={p.onVisibility} profilePublic={p.profilePublic} useForRecommend={p.useForRecommend} onUseForRecommend={p.onUseForRecommend} />
      </div>
    </Panel>
  );
}
