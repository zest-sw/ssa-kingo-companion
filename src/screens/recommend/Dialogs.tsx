import { Button, Drawer, EmptyState, Modal } from '../../components';
import { DISLIKES } from '../../data/options';
import { dateLabel, laterDateLabel, LATER_CHOICES } from '../../domain/recommend-flow/flow';
import type { DislikeKind, Program } from '../../domain/types';

/** 관심 없음: 이유를 고르면 추천 규칙에 반영된다 */
export function DismissModal({ program, onPick, onClose }: { program?: Program; onPick: (p: Program, kind: DislikeKind) => void; onClose: () => void }) {
  return (
    <Modal open={!!program} title="왜 관심이 없나요?" onClose={onClose} actions={<Button onClick={onClose}>취소</Button>}>
      <p className="rec-dialog__sub">고른 이유는 다음 추천에 반영해요.</p>
      <ul className="rec-reasons">
        {DISLIKES.map(d => (
          <li key={d.id}>
            <button type="button" className="rec-reason" onClick={() => program && onPick(program, d.id)}>
              <b>{d.label}</b><span>{d.effect}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** 나중에 보기: 다시 볼 날을 고른다 */
export function LaterModal({ week, program, onPick, onClose }: { week: number; program?: Program; onPick: (p: Program, days: number) => void; onClose: () => void }) {
  return (
    <Modal open={!!program} title="언제 다시 볼까요?" onClose={onClose} actions={<Button onClick={onClose}>취소</Button>}>
      <p className="rec-dialog__sub">고른 날까지 추천에서 숨겨요.</p>
      <ul className="rec-reasons">
        {LATER_CHOICES.map(c => (
          <li key={c.days}>
            <button type="button" className="rec-reason" onClick={() => program && onPick(program, c.days)}>
              <b>{c.label}</b><span>{dateLabel(c.days, week)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** 나중에 보기로 미룬 활동 목록 */
export function LaterDrawer({ open, programs, laterUntil, onClose, onBack, onPrepare }: { open: boolean; programs: Program[]; laterUntil: Record<string, number>; onClose: () => void; onBack: (p: Program) => void; onPrepare: (p: Program) => void }) {
  return (
    <Drawer open={open} title="나중에 보기" eyebrow="미뤄 둔 활동" onClose={onClose}>
      {programs.length === 0 ? (
        <EmptyState icon="clock" message="미뤄 둔 활동이 없어요. 추천에서 ‘나중에 보기’를 누르면 여기에 모여요." />
      ) : (
        <ul className="rec-later">
          {programs.map(p => {
            const until = laterUntil[p.id];
            return (
              <li key={p.id} className="rec-later__item">
                <div>
                  <p className="rec-later__title">{p.title}</p>
                  <p className="rec-later__sub">{until !== undefined ? `${laterDateLabel(until)}에 다시 보여요` : '다시 볼 날을 안 골랐어요'}</p>
                </div>
                <div className="rec-later__btns">
                  <Button size="sm" onClick={() => onBack(p)}>다시 보기</Button>
                  <Button size="sm" variant="primary" onClick={() => onPrepare(p)}>신청 준비</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}

