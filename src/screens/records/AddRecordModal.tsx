import { useState } from 'react';
import { Button, Chip, Modal } from '../../components';
import { useApp } from '../../app/AppState';
import { QUOTE_HINTS } from '../../data/options';
import { CURRENT_TERM } from '../../data/records';
import { inferDid } from '../../domain/interview/record';
import type { Energy } from '../../domain/types';
import { DID_AXES, ENERGY } from '../../domain/vocab';

/** 직접 기록 추가: 제목, 한 일, 에너지 정도, 한마디. 학교가 확인하지 않은 기록이라 '직접 입력'으로 표시된다. */
export function AddRecordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { run } = useApp();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [energy, setEnergy] = useState<Energy>();
  const [quote, setQuote] = useState('');
  const ready = title.trim() && note.trim() && energy;

  const close = () => { setTitle(''); setNote(''); setEnergy(undefined); setQuote(''); onClose(); };
  const submit = () => {
    if (!ready) return;
    const did = inferDid(note);
    run({
      type: 'record/add',
      record: {
        id: `m-${Date.now()}`, v: 1, title: title.trim(), kind: '직접 기록', date: CURRENT_TERM.date, semester: CURRENT_TERM.semester, field: 'etc', did, energy,
        quote: quote.trim(), note: note.trim(), axes: DID_AXES[did], source: 'manual', verification: 'self', visibility: 'me', useForRecommend: true,
        card: { action: note.trim(), ...(quote.trim() ? { learned: quote.trim() } : {}) }
      }
    }, { toast: '직접 입력으로 기록했어요.' });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="직접 기록 추가"
      actions={<><Button onClick={close}>취소</Button><Button variant="primary" type="submit" form="rec-add" disabled={!ready}>추가</Button></>}
    >
      <form id="rec-add" className="rec-form" onSubmit={e => { e.preventDefault(); submit(); }}>
        <label className="rec-form__field">제목
          <input className="rec-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 학과 스터디" />
        </label>
        <label className="rec-form__field">한 일
          <textarea className="rec-input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="한 문장이면 돼요" />
        </label>
        <div className="rec-form__field" role="group" aria-label="에너지 정도">
          끝난 뒤 에너지
          <span className="rec-quick">{ENERGY.map(e => <Chip key={e.id} selected={energy === e.id} onClick={() => setEnergy(e.id)}>{e.label}</Chip>)}</span>
        </div>
        <label className="rec-form__field"><span>한마디 <span className="rec-form__opt">(선택)</span></span>
          <input className="rec-input" value={quote} onChange={e => setQuote(e.target.value)} placeholder={QUOTE_HINTS[inferDid(note)][0]} />
        </label>
      </form>
    </Modal>
  );
}
