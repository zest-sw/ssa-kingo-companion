import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { CountBadge } from './Badge';

export type TabItem<T extends string> = { id: T; label: string; count?: number };

function moveFocus<T extends string>(e: KeyboardEvent, items: TabItem<T>[], value: T, onChange: (id: T) => void, root: HTMLElement | null) {
  const i = items.findIndex(t => t.id === value);
  const next = e.key === 'ArrowRight' ? (i + 1) % items.length : e.key === 'ArrowLeft' ? (i - 1 + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
  if (next < 0) return;
  e.preventDefault();
  onChange(items[next].id);
  root?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
}

/**
 * 화면 안 탭(예: 나의 분석의 테크 트리·경험 지도). 탭 목록만 그리고, 내용은 TabPanel 로 감싼다.
 * 하위 경로와 맞추려면 value 를 route.sub 로, onChange 에서 navigate 를 부른다.
 */
export function Tabs<T extends string>({ id, label, items, value, onChange }: { id: string; label: string; items: TabItem<T>[]; value: T; onChange: (id: T) => void }) {
  const root = useRef<HTMLDivElement>(null);
  return (
    <div ref={root} className="ui-tabs" role="tablist" aria-label={label} onKeyDown={e => moveFocus(e, items, value, onChange, root.current)}>
      {items.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${id}-tab-${t.id}`}
          aria-selected={t.id === value}
          aria-controls={`${id}-panel`}
          tabIndex={t.id === value ? 0 : -1}
          className="ui-tabs__tab"
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <CountBadge count={t.count} label={t.label} />}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, active, children }: { id: string; active: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} className="ui-tabpanel">
      {children}
    </div>
  );
}

/** 보기 전환(보드/목록, 가장 추천/비교해서 고르기). 같은 내용을 다르게 보여 줄 때. */
export function SegmentedControl<T extends string>({ label, items, value, onChange }: { label: string; items: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="ui-seg" role="group" aria-label={label}>
      {items.map(t => (
        <button key={t.id} type="button" className="ui-seg__item" aria-pressed={t.id === value} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
