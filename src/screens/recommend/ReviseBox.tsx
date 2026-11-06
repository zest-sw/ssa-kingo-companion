import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Chip } from '../../components';
import { REVISE_OPTIONS, type Revision } from '../../domain/recommend-flow/draft';

/**
 * '고쳐 줘'를 누르면 열리는 칸: 무엇을 고칠지 칩 셋과 한 줄 요청. 칩을 누르면 바로 고치고, 한 줄은 보내기로 고친다.
 * 한 줄만 적고 보내면 방향 없이 그 말만 넣는다(더 구체적으로와 같은 틀).
 */
export function ReviseBox({ onRevise, onClose }: { onRevise: (r: Revision) => void; onClose: () => void }) {
  const [note, setNote] = useState('');
  const first = useRef<HTMLDivElement>(null);
  // 열리면 첫 칩으로 포커스를 옮겨 키보드로 바로 고를 수 있게 한다.
  useEffect(() => { first.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, []);
  const send = (r: Revision) => { onRevise(r); setNote(''); };
  const submit = (e: FormEvent) => { e.preventDefault(); if (note.trim()) send({ kind: 'specific', note }); };
  return (
    // Esc 로 닫는다(서랍·모달과 같은 약속)
    <div className="rec-revise" role="group" aria-label="무엇을 고칠까요" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
      <div className="rec-revise__head">
        <b>무엇을 고칠까요?</b>
        <Button size="sm" variant="ghost" onClick={onClose}>닫기</Button>
      </div>
      <div className="rec-revise__chips" ref={first}>
        {REVISE_OPTIONS.map(o => <Chip key={o.id} onClick={() => send({ kind: o.id, note: note.trim() || undefined })}>{o.label}</Chip>)}
      </div>
      <form className="rec-revise__form" onSubmit={submit}>
        <input className="rec-revise__input" name="revise-note" autoComplete="off" value={note} maxLength={60} placeholder="한 줄로 요청하기 (예: 팀장 경험을 넣어 주세요)" aria-label="고칠 점 한 줄" onChange={e => setNote(e.target.value)} />
        <Button type="submit" size="sm" disabled={!note.trim()}>보내기</Button>
      </form>
    </div>
  );
}
