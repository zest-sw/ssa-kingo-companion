import { useMemo } from 'react';
import { useApp } from '../../app/AppState';
import { Chip, SegmentedControl } from '../../components';
import { weekLoad } from '../../domain/recommend-flow/load';
import { categoryCounts, inCategory, SORT_LABEL, sortOpen, type CategoryFilter, type OpenSort } from '../../domain/recommend-flow/opportunities';
import { traceNodes } from '../../domain/recommend-flow/trace';
import type { Program, Scored } from '../../domain/types';
import { OppRow } from './OppRow';
import { useBasis } from './useBasis';

/**
 * 추천 활동 탭: 서비스가 고른 활동만. '가장 추천' 하나를 맨 위 따로 두고(행 왼쪽 표시) 나머지는 대안으로 묶는다.
 * 이 칸만 안에서 스크롤한다.
 */
export function RecommendList({ list, primaryId, onOpen, label }: { list: Scored[]; primaryId?: string; onOpen: (p: Program) => void; label: string }) {
  const { state } = useApp();
  const basis = useBasis();
  const top = list[0]?.p.id === primaryId ? list[0] : undefined;
  const rest = top ? list.slice(1) : list;
  const row = (s: Scored, isTop = false) => {
    const n = traceNodes(s.reasons, basis.records, s.p, basis.newcomer)[0];
    return (
      <OppRow
        key={s.p.id} p={s.p} week={state.week} top={isTop} onOpen={onOpen}
        load={weekLoad(s.p, state.activities, state.week).label}
        why={n ? `${n.label} · ${n.detail}` : undefined}
      />
    );
  };
  return (
    <section className="rec-list" data-fill aria-label={label}>
      <div className="rec-list__scroll os-scroll">
        {top && (
          <>
            <h2 className="rec-list__head rec-list__head--top">가장 추천</h2>
            <ul className="rec-rows">{row(top, true)}</ul>
          </>
        )}
        {rest.length > 0 && (
          <>
            <h2 className="rec-list__head">{top ? `대안 ${rest.length}개` : label}</h2>
            <ul className="rec-rows">{rest.map(s => row(s))}</ul>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * 전체 기회 탭: 지금 열린 기회 모두. 위 한 줄은 종류 칩(개수와 함께), 목록 머리 오른쪽은 정렬 전환. 추천한 기회는 행에 '추천' 표시.
 */
export function AllList({ open, recommendedIds, cat, sort, onCat, onSort, onOpen }: {
  open: Program[]; recommendedIds: Set<string>; cat: CategoryFilter; sort: OpenSort;
  onCat: (c: CategoryFilter) => void; onSort: (s: OpenSort) => void; onOpen: (p: Program) => void;
}) {
  const { state } = useApp();
  const counts = useMemo(() => categoryCounts(open), [open]);
  // 고른 종류가 데이터에서 사라졌으면(새 주차 등) 전체로 본다.
  const current = counts.some(c => c.id === cat) ? cat : 'all';
  const shown = useMemo(() => sortOpen(open.filter(p => inCategory(p, current)), state.week, sort), [open, current, sort, state.week]);
  const label = counts.find(c => c.id === current)?.label ?? '전체';
  return (
    <>
      <div className="rec-tools">
        <div className="rec-cats" role="group" aria-label="종류로 보기">
          {counts.map(c => (
            <Chip key={c.id} selected={c.id === current} onClick={() => onCat(c.id)}>
              {c.label}<span className="rec-cats__n num">{c.count}</span>
            </Chip>
          ))}
        </div>
      </div>
      <section className="rec-list" data-fill aria-label={`${label} 기회 ${shown.length}개`}>
        <div className="rec-list__scroll os-scroll">
          <div className="rec-list__head rec-list__bar">
            <h2>{label} {shown.length}개</h2>
            <SegmentedControl label="정렬" items={(['deadline', 'new'] as const).map(id => ({ id, label: SORT_LABEL[id] }))} value={sort} onChange={onSort} />
          </div>
          <ul className="rec-rows">
            {shown.map(p => <OppRow key={p.id} p={p} week={state.week} mark={recommendedIds.has(p.id) ? '추천' : undefined} onOpen={onOpen} />)}
          </ul>
        </div>
      </section>
    </>
  );
}
