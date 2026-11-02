import { useEffect, useState } from 'react';
import { Button, Modal } from '../../components';
import { registerEntityView } from '../../app/entity';
import { useApp } from '../../app/AppState';
import type { RecordItem } from '../../domain/types';
import { RecordDrawer } from './RecordDrawer';

/**
 * 어디서 기록을 눌러도 이 서랍이 열린다(openEntity). 지우기 확인창도 여기서 연다:
 * 서랍을 닫아도 확인창은 남아야 해서 서랍과 같은 컴포넌트에 둔다.
 */
function RecordEntity({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, run } = useApp();
  const [deleting, setDeleting] = useState<RecordItem | null>(null);
  const record = state.records.find(r => r.id === id);
  useEffect(() => { if (!record && !deleting) onClose(); }, [record, deleting, onClose]);

  const remove = () => {
    if (!deleting) return;
    // 기록을 지우면 그 활동은 회고 대기로 돌아간다(reducer). 되돌리기는 기록·활동·역량 근거 확인을 함께 되돌린다.
    run({ type: 'record/delete', id: deleting.id }, { toast: `‘${deleting.title}’ 기록을 지웠어요.`, undoable: true });
    setDeleting(null);
    onClose();
  };

  return (
    <>
      <RecordDrawer record={deleting ? undefined : record} onClose={onClose} onDelete={setDeleting} />
      <Modal open={!!deleting} onClose={() => { setDeleting(null); onClose(); }} title="이 기록을 지울까요?" actions={<><Button onClick={() => { setDeleting(null); onClose(); }}>취소</Button><Button variant="primary" onClick={remove}>지우기</Button></>}>
        지우면 추천과 분석에서도 빠져요. 지운 뒤 바로 되돌릴 수 있어요.
      </Modal>
    </>
  );
}

registerEntityView('record', RecordEntity);
