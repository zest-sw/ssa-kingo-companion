import { useState } from 'react';
import { Button, Drawer } from '../../components';
import { useApp } from '../../app/AppState';
import { editedRecord, evidenceOf, usesRecord } from '../../domain/interview/record';
import { semesterLabel } from '../../domain/interview/archive';
import { CARD_STEPS, STEP_LABEL, type CardStep } from '../../domain/interview/schema';
import type { RecordCard, RecordItem } from '../../domain/types';
import { FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';
import { cardOf } from '../../domain/interview/record';
import { RecordCardView } from './RecordCardView';
import { toggleAxis } from '../../domain/interview/draft';

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
  const confirmed = r.confirmedAxes ?? [];
  const [editing, setEditing] = useState(false);
  const card = cardOf(r);
  const meta = `${semesterLabel(r.semester)} · ${GROUP_LABEL[FIELD_GROUP[r.field]]} · ${r.kind}`;
  // 이 기록으로 확인한 발견이 있으면, 고쳤을 때 그 확인이 풀린다고 미리 알린다.
  const usedByConfirmed = usesRecord(state.confirm, r.id);

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
        onToggleAxis={a => run({ type: 'record/setFlags', id: r.id, flags: { confirmedAxes: toggleAxis(confirmed, a) } })}
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
  const submit = () => onSave(editedRecord(r, title, draft));
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
