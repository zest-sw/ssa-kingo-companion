import { useEffect } from 'react';
import { registerEntityView } from '../../app/entity';
import { useApp } from '../../app/AppState';
import { ActivityDrawer } from './ActivityDrawer';

/** 어디서 활동을 눌러도 이 서랍이 열린다(openEntity). 활동이 없으면 바로 닫는다. */
function ActivityEntity({ id, onClose }: { id: string; onClose: () => void }) {
  const { state } = useApp();
  const a = state.activities.find(x => x.id === id);
  useEffect(() => { if (!a) onClose(); }, [a, onClose]);
  return <ActivityDrawer a={a} onClose={onClose} />;
}

registerEntityView('activity', ActivityEntity);
