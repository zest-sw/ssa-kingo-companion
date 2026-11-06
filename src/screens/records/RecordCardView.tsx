import { useState } from 'react';
import { Badge, Button, Chip, ConfirmDot, ConfirmLegend, Icon, Switch } from '../../components';
import type { EvidenceRow } from '../../domain/interview/record';
import { CARD_STEPS, STEP_LABEL, type CardStep } from '../../domain/interview/schema';
import type { Axis, RecordCard, RecordVisibility } from '../../domain/types';

export function VerificationBadge({ v }: { v: 'school' | 'self' }) {
  return v === 'school' ? <Badge tone="green" icon="check">학교 확인</Badge> : <Badge icon="pencil">직접 입력</Badge>;
}

/** 칸 하나. 고칠 수 있으면 글을 눌러 그 자리에서 고친다. */
function Field({ step, value, current, onEdit }: { step: CardStep; value?: string; current: boolean; onEdit?: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const label = STEP_LABEL[step];
  const begin = () => { setText(value ?? ''); setEditing(true); };
  const commit = () => { onEdit?.(text); setEditing(false); };

  return (
    <div className="rec-field" data-current={current || undefined}>
      <dt>{label}</dt>
      <dd>
        {editing ? (
          <form className="rec-field__edit" onSubmit={e => { e.preventDefault(); commit(); }}>
            <textarea className="rec-input" rows={2} aria-label={`${label} 고치기`} value={text} autoFocus onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); } }} />
            <span className="rec-field__btns"><Button size="sm" variant="primary" type="submit">저장</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>취소</Button></span>
          </form>
        ) : onEdit ? (
          <button type="button" className="rec-field__value rec-field__value--edit" onClick={begin} aria-label={`${label} 고치기: ${value ?? '비어 있어요'}`}>
            <span className={value ? undefined : 'rec-field__empty'}>{value ?? '눌러서 채워요'}</span>
            <Icon name="pencil" size={14} />
          </button>
        ) : (
          <span className={value ? 'rec-field__value' : 'rec-field__value rec-field__empty'}>{value ?? '답하면 채워져요'}</span>
        )}
      </dd>
    </div>
  );
}

export type RecordCardViewProps = {
  title: string;
  /** 서랍처럼 제목이 이미 머리에 있으면 카드 머리의 제목은 생략 */
  bare?: boolean;
  meta: string;
  verification: 'school' | 'self';
  card: RecordCard;
  /** 인터뷰에서 지금 묻는 칸 */
  current?: CardStep;
  /** 주면 칸을 눌러 고칠 수 있다 */
  onEditField?: (step: CardStep, text: string) => void;
  evidence: EvidenceRow[];
  confirmed: Axis[];
  onToggleAxis?: (axis: Axis) => void;
  visibility: RecordVisibility;
  onVisibility: (v: RecordVisibility) => void;
  /** 프로필이 비공개면 친구 공개는 열리지 않는다 */
  profilePublic: boolean;
  useForRecommend: boolean;
  onUseForRecommend: (v: boolean) => void;
};

type Settings = Pick<RecordCardViewProps, 'visibility' | 'onVisibility' | 'profilePublic' | 'useForRecommend' | 'onUseForRecommend'>;
type Proof = Pick<RecordCardViewProps, 'verification' | 'evidence' | 'confirmed' | 'onToggleAxis'>;

/**
 * 경험 카드. 인터뷰 왼쪽 대화 옆(채워지는 6칸만: fieldsOnly)과 보관함 서랍(전부)이 함께 쓴다. 칸은 기준 문서 '기록 카드(안)' 순서 그대로.
 * 증빙·역량 근거·공개 범위·추천 설정은 인터뷰에서는 '저장 전 확인' 단계가 따로 그린다(ProofSection, SettingsSection).
 */
export function RecordCardView({ fieldsOnly, ...p }: RecordCardViewProps & { fieldsOnly?: boolean }) {
  return (
    <div className="rec-card">
      <header className="rec-card__head">
        {!p.bare && <><p className="rec-card__eyebrow">경험 카드</p><h2 className="rec-card__title">{p.title}</h2></>}
        <p className="rec-card__meta">{p.meta} <VerificationBadge v={p.verification} /></p>
      </header>

      <dl className="rec-fields">
        {CARD_STEPS.map(s => <Field key={s} step={s} value={p.card[s]} current={p.current === s} onEdit={p.onEditField && (t => p.onEditField?.(s, t))} />)}
      </dl>

      {!fieldsOnly && <><ProofSection {...p} /><SettingsSection {...p} /></>}
    </div>
  );
}

/** 증빙과 역량 근거. 근거마다 '맞아요'를 누르면 확인된 근거가 된다(AI 추정은 점선). */
export function ProofSection(p: Proof) {
  return (
      <section className="rec-evidence" aria-label="증빙과 역량 근거">
        <div className="rec-evidence__head"><h3>증빙</h3></div>
        <p className="rec-evidence__text">{p.verification === 'school' ? '학교 연동으로 확인된 활동이에요. 경험 카드로 낼 때도 학교 확인 표시가 붙어요.' : '직접 입력한 기록이에요. 올린 증빙 파일은 아직 없어요.'}</p>
        <div className="rec-evidence__head"><h3>역량 근거</h3><ConfirmLegend /></div>
        {p.evidence.length === 0 ? (
          <p className="rec-evidence__text rec-field__empty">한 일을 답하면 근거 문장이 생겨요.</p>
        ) : (
          <ul className="rec-evidence__list">
            {p.evidence.map(e => {
              const ok = p.confirmed.includes(e.axis);
              return (
                <li key={e.axis} className="rec-evidence__row" data-state={ok ? 'confirmed' : 'estimated'}>
                  <ConfirmDot state={ok ? 'confirmed' : 'estimated'} />
                  <span className="rec-evidence__label">{e.label}</span>
                  <span className="rec-evidence__sentence">{e.text}</span>
                  {p.onToggleAxis && <Chip selected={ok} onClick={() => p.onToggleAxis?.(e.axis)} aria-label={`${e.label} 근거 맞아요`}>맞아요</Chip>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
  );
}

/** 공개 범위와 추천에 쓰기. */
export function SettingsSection(p: Settings) {
  return (
      <footer className="rec-card__foot">
        <div className="rec-setting">
          <span id="rec-vis">공개 범위</span>
          <span className="rec-setting__chips" role="group" aria-labelledby="rec-vis">
            <Chip icon="lock" selected={p.visibility === 'me'} onClick={() => p.onVisibility('me')}>나만 보기</Chip>
            <Chip icon="friends" selected={p.visibility === 'friends'} disabled={!p.profilePublic} onClick={() => p.onVisibility('friends')}>친구 공개</Chip>
          </span>
        </div>
        {!p.profilePublic && <p className="rec-setting__hint">프로필을 공개하면 열려요.</p>}
        {/* 고려대 AI선배: 추천 근거에서 뺄 기록은 경험 카드에서 직접 고른다 */}
        <div className="rec-setting">
          <Switch checked={p.useForRecommend} onChange={p.onUseForRecommend} label="이 기록을 추천에 쓰기" />
        </div>
        <p className="rec-setting__hint rec-setting__hint--left">{p.useForRecommend ? '끄면 추천과 발견에서 빠져요.' : '추천과 발견에 쓰지 않는 기록이에요.'}</p>
      </footer>
  );
}
