import { useState } from 'react';
import { Button, Drawer } from '../../components';
import { useApp } from '../../app/AppState';
import { evidenceOf } from '../../domain/interview/record';
import { semesterLabel } from '../../domain/interview/archive';
import { CARD_STEPS, STEP_LABEL, type CardStep } from '../../domain/interview/schema';
import type { RecordCard, RecordItem } from '../../domain/types';
import { FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';
import { RecordCardView } from './RecordCardView';
import { setConfirmedAxes, toggleAxis, useConfirmedAxes } from './stores';

/** 인터뷰를 거치지 않은 기록(예시·직접 입력)은 메모를 '한 일', 한마디를 '배운 점'으로 보여 준다. */
export const cardOf = (r: RecordItem): RecordCard => r.card ?? { ...(r.note && { action: r.note }), ...(r.quote && { learned: r.quote }) };

type Props = { record: RecordItem | undefined; onClose: () => void; onDelete: (r: RecordItem) => void };

export function RecordDrawer({ record, onClose, onDelete }: Props) {
  return (
    <Drawer open={!!record} onClose={onClose} eyebrow="기록" title={record?.title ?? ''}>
      {record && <Body key={record.id} r={record} onClose={onClose} onDelete={onDelete} />}
    </Drawer>
  );
}

function Body({ r, onClose, onDelete }: { r: RecordItem } & Pick<Props, 'onClose' | 'onDelete'>) {
  const { state, run } = useApp();
  const confirmed = useConfirmedAxes(r.id);
  const [editing, setEditing] = useState(false);
  const card = cardOf(r);
  const meta = `${semesterLabel(r.semester)} · ${GROUP_LABEL[FIELD_GROUP[r.field]]} · ${r.kind}`;
  // 이 기록으로 확인한 발견이 있으면, 고쳤을 때 그 확인이 풀린다고 미리 알린다.
  const usedByConfirmed = Object.values(state.confirm).some(c => c.sig.some(s => s.startsWith(`${r.id}@`)));

  if (editing) {
    return <EditForm r={r} card={card} warn={usedByConfirmed} onCancel={() => setEditing(false)} onSave={next => {
      run({ type: 'record/update', record: next }, { toast: '기록을 고쳤어요.' });
      setEditing(false);
    }} />;
  }
  return (
    <div className="rec-drawer">
      <RecordCardView
        bare
        title={r.title}
        meta={meta}
        verification={r.verification}
        card={card}
        evidence={evidenceOf(r.axes, card.action)}
        confirmed={confirmed}
        onToggleAxis={a => setConfirmedAxes(r.id, toggleAxis(confirmed, a))}
        visibility={r.visibility}
        onVisibility={visibility => run({ type: 'record/setFlags', id: r.id, flags: { visibility } })}
        profilePublic={state.visibility.profilePublic}
        useForRecommend={r.useForRecommend}
        onUseForRecommend={useForRecommend => run({ type: 'record/setFlags', id: r.id, flags: { useForRecommend } })}
      />
      <div className="rec-drawer__actions">
        <Button icon="pencil" onClick={() => setEditing(true)}>고치기</Button>
        <Button variant="ghost" onClick={() => { onClose(); onDelete(r); }}>삭제</Button>
      </div>
    </div>
  );
}

function EditForm({ r, card, warn, onCancel, onSave }: { r: RecordItem; card: RecordCard; warn: boolean; onCancel: () => void; onSave: (r: RecordItem) => void }) {
  const [title, setTitle] = useState(r.title);
  const [draft, setDraft] = useState<RecordCard>(card);
  const set = (s: CardStep, v: string) => setDraft({ ...draft, [s]: v });
  const submit = () => {
    const next: RecordCard = {};
    for (const s of CARD_STEPS) if (draft[s]?.trim()) next[s] = draft[s]?.trim();
    onSave({ ...r, title: title.trim() || r.title, card: next, note: next.action ?? '', quote: next.learned ?? '' });
  };
  return (
    <form className="rec-form" onSubmit={e => { e.preventDefault(); submit(); }}>
      {warn && <p className="rec-form__warn">이 기록으로 확인한 발견이 있어요. 고치면 그 확인이 풀리고 다시 물어봐요.</p>}
      <label className="rec-form__field">제목
        <input className="rec-input" value={title} onChange={e => setTitle(e.target.value)} />
      </label>
      {CARD_STEPS.map(s => (
        <label key={s} className="rec-form__field">{STEP_LABEL[s]}
          <textarea className="rec-input" rows={2} value={draft[s] ?? ''} onChange={e => set(s, e.target.value)} />
        </label>
      ))}
      <div className="rec-drawer__actions">
        <Button variant="primary" type="submit" disabled={!title.trim()}>저장</Button>
        <Button variant="ghost" onClick={onCancel}>취소</Button>
      </div>
    </form>
  );
}
