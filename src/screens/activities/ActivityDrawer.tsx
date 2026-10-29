import { Badge, Button, Drawer, FieldTag, ProgressBar } from '../../components';
import { navigate } from '../../app/router';
import { useApp } from '../../app/AppState';
import { PROGRAM_BY_ID } from '../../data/catalog';
import type { Activity, ActivityStatus } from '../../domain/types';
import { STATUS_LABEL } from '../../domain/vocab';
import { ActivityMeta, StatusBadge, goInterview } from './ActivityCard';
import { canQuit, dueView, quitPatch } from './helpers';

const FLOW: ActivityStatus[] = ['preparing', 'applied', 'ongoing', 'ended', 'recorded'];
const DECLINED_FLOW: ActivityStatus[] = ['preparing', 'applied', 'declined'];

/** 단계 표시. 지금 단계만 강조하고 지난 단계는 채운 점. 점수나 속도는 없다. */
function Stages({ status }: { status: ActivityStatus }) {
  const flow = status === 'declined' ? DECLINED_FLOW : FLOW;
  const at = flow.indexOf(status);
  return (
    <ol className="act-stages" aria-label="활동 단계">
      {flow.map((s, i) => (
        <li key={s} className="act-stage" data-state={i < at ? 'past' : i === at ? 'now' : 'next'} aria-current={i === at ? 'step' : undefined}>
          <span className="act-stage__dot" aria-hidden="true" />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}

function DueLine({ due }: { due: NonNullable<Activity['due']> }) {
  const v = dueView(due);
  return v.kind === 'today' ? <><Badge tone="solid-orange">오늘</Badge> {v.label}</> : <>{v.text}</>;
}

function Facts({ a }: { a: Activity }) {
  const p = a.programId ? PROGRAM_BY_ID[a.programId] : undefined;
  return (
    <dl className="act-facts">
      <div><dt>분야</dt><dd><FieldTag field={a.field} detail /></dd></div>
      <div><dt>일정</dt><dd>{a.schedule}</dd></div>
      {a.due && <div><dt>마감</dt><dd><DueLine due={a.due} /></dd></div>}
      {a.prep && <div><dt>준비</dt><dd><ProgressBar value={a.prep.done} max={a.prep.total} label="준비 진행도" showText /></dd></div>}
      {p && <div><dt>장소</dt><dd>{p.place}</dd></div>}
      {p && <div><dt>대상</dt><dd>{p.target}</dd></div>}
    </dl>
  );
}

export function ActivityDrawer({ a, onClose }: { a: Activity | undefined; onClose: () => void }) {
  const { run } = useApp();
  const go = (path: string) => { onClose(); navigate(path); };
  // 전역 상태에 활동을 지우는 액션이 없어, 그만두면 '이번엔 안 됨'(끝난 것)으로 옮긴다. ponytail: 지우는 액션이 생기면 바꾼다
  const quit = () => {
    if (!a) return;
    run({ type: 'activity/update', id: a.id, patch: quitPatch() }, { toast: '활동을 그만뒀어요. 끝난 것에서 볼 수 있어요.', undoable: true });
    onClose();
  };

  return (
    <Drawer
      open={!!a}
      onClose={onClose}
      eyebrow={a && <StatusBadge status={a.status} />}
      title={a?.title ?? ''}
      footer={a && (
        <>
          {a.status === 'preparing' && <Button variant="primary" onClick={() => go(`recommend/prepare/${a.programId ?? a.id}`)}>신청 준비 이어서 하기</Button>}
          {a.status === 'ended' && <Button variant="primary" onClick={() => { onClose(); goInterview(a.id); }}>회고 쓰기</Button>}
          {a.status === 'recorded' && <Button variant="primary" onClick={() => go('records')}>기록 보관함에서 보기</Button>}
          {a && canQuit(a) && <Button variant="ghost" onClick={quit}>활동 그만두기</Button>}
        </>
      )}
    >
      {a && (
        <div className="act-drawer">
          <Stages status={a.status} />
          <p className="act-drawer__line"><ActivityMeta a={a} /></p>
          <Facts a={a} />
        </div>
      )}
    </Drawer>
  );
}
