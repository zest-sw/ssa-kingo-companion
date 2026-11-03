import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Button, Drawer, EmptyState, FieldTag } from '../components';
import { PROGRAM_BY_ID } from '../data/catalog';
import { useApp } from './AppState';
import { entitySummary, ENTITY_LABEL, type EntityKind, type EntityRef } from './entitySummary';
import { navigate, useRoute } from './router';

export type { EntityKind, EntityRef } from './entitySummary';

/**
 * 화면이 가진 서랍. 기존 서랍 컴포넌트를 그대로 감싸 등록한다(서랍 틀 <Drawer> 를 직접 그린다).
 *   registerEntityView('activity', ({ id, onClose }) => <ActivityDrawer a={find(id)} onClose={onClose} />)
 * 등록하지 않은 종류는 기본 서랍(요약 + '자세히 보기')이 열린다.
 */
export type EntityView = ComponentType<{ id: string; onClose: () => void }>;
const VIEWS: Partial<Record<EntityKind, EntityView>> = {};
export function registerEntityView(kind: EntityKind, view: EntityView) {
  VIEWS[kind] = view;
}

type Ctx = { current: EntityRef | null; open: (ref: EntityRef) => void; close: () => void };
const EntityContext = createContext<Ctx | null>(null);
// React 밖(다이어그램 onSelect 같은 콜백)에서도 부를 수 있게 공급자의 open 을 붙잡아 둔다.
let openOutside: ((ref: EntityRef) => void) | undefined;

/** 기회·활동·기록 서랍을 연다. 어디서 불러도 같은 서랍 하나가 열린다. */
export function openEntity(ref: EntityRef) {
  openOutside?.(ref);
}

export function useEntity(): Ctx {
  const v = useContext(EntityContext);
  if (!v) throw new Error('useEntity 는 EntityProvider 안에서만 쓴다');
  return v;
}

// ponytail: 열린 서랍은 주소에 남기지 않는다(새로고침하면 닫힘). 서랍을 링크로 공유할 일이 생기면 ?open=kind:id 로 옮긴다.
export function EntityProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<EntityRef | null>(null);
  const open = useCallback((ref: EntityRef) => setCurrent(ref), []);
  const close = useCallback(() => setCurrent(null), []);
  const route = useRoute();

  useEffect(() => {
    openOutside = open;
    return () => { if (openOutside === open) openOutside = undefined; };
  }, [open]);
  // 다른 화면으로 가면 닫는다(서랍 안 링크로 옮겨 갈 때 포함).
  useEffect(() => { setCurrent(null); }, [route.name, route.sub]);

  const value = useMemo(() => ({ current, open, close }), [current, open, close]);
  const View = current ? VIEWS[current.kind] : undefined;
  return (
    <EntityContext.Provider value={value}>
      {children}
      {current && (View ? <View key={`${current.kind}:${current.id}`} id={current.id} onClose={close} /> : <EntityDrawer key={`${current.kind}:${current.id}`} target={current} onClose={close} />)}
    </EntityContext.Provider>
  );
}

/** 기본 서랍: 요약 사실 몇 줄과 상세(L2)로 가는 버튼 하나 */
export function EntityDrawer({ target, onClose }: { target: EntityRef; onClose: () => void }) {
  const { state } = useApp();
  const s = entitySummary(target, { programs: PROGRAM_BY_ID, activities: state.activities, records: state.records });
  if (!s) {
    return (
      <Drawer open eyebrow={ENTITY_LABEL[target.kind]} title="항목을 찾지 못했어요" onClose={onClose}>
        <EmptyState message="지워졌거나 아직 불러오지 못했어요. 목록에서 다시 골라 주세요." action={<Button size="sm" onClick={onClose}>닫기</Button>} />
      </Drawer>
    );
  }
  return (
    <Drawer open eyebrow={s.eyebrow} title={s.title} onClose={onClose} footer={<Button variant="primary" onClick={() => navigate(s.href)}>자세히 보기</Button>}>
      <div className="app-entity">
        <FieldTag field={s.field} />
        <dl className="app-entity__facts">
          {s.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {s.note && <p className="app-entity__note readable">{s.note}</p>}
      </div>
    </Drawer>
  );
}
