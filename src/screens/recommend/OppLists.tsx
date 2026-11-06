import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { useApp } from '../../app/AppState';
import { Chip, SegmentedControl, useListPresence } from '../../components';
import { weekLoad } from '../../domain/recommend-flow/load';
import { CATEGORY_LABEL, categoryCounts, categoryOf, inCategory, SORT_LABEL, sortOpen, type CategoryFilter, type OpenSort } from '../../domain/recommend-flow/opportunities';
import type { RowLine } from '../../domain/recommend-flow/reasons';
import { keyGain } from '../../domain/recommend-flow/row';
import type { Program, Scored } from '../../domain/types';
import { OppRow } from './OppRow';

// 접히며 빠지는 행(inert)은 건너뛴다.
const ROW = 'li:not([inert]) > button.rec-row';

/**
 * 행 목록의 키보드: 위아래 화살표로 행 사이를 옮기고(Home·End 는 처음·끝), Enter 는 버튼이라 그대로 모달을 연다.
 * 연 행이 목록에서 빠지면(관심 없음·나중에 보기) 같은 자리의 다음 행으로 초점을 옮긴다. 초점이 갈 곳을 잃지 않게.
 */
function useRowKeys(ids: string, modalOpen: boolean) {
  const list = useRef<HTMLUListElement>(null);
  const last = useRef<number | undefined>(undefined);
  useEffect(() => {
    const rows = list.current ? [...list.current.querySelectorAll<HTMLElement>(ROW)] : [];
    // 닫히는 모달 안에 초점이 남아 있거나(움직임 동안) 이미 몸통으로 빠졌으면 잃은 것이다.
    const a = document.activeElement;
    const lost = !a || a === document.body || !!a.closest('.ui-scrim');
    if (!modalOpen && lost && last.current !== undefined && rows.length) rows[Math.min(last.current, rows.length - 1)].focus();
  }, [ids, modalOpen]);
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const rows = [...e.currentTarget.querySelectorAll<HTMLElement>(ROW)];
    const i = rows.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: rows.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, to))].focus();
  };
  const onFocus = (e: React.FocusEvent<HTMLUListElement>) => {
    const i = [...e.currentTarget.querySelectorAll<HTMLElement>(ROW)].indexOf(e.target as HTMLElement);
    if (i >= 0) last.current = i;
  };
  return { ref: list, onKeyDown, onFocus };
}

/**
 * 추천 활동 탭의 나머지 후보(가장 추천은 위 카드). 묶음 머리는 작은 제목 글자. 이 칸만 안에서 스크롤한다.
 */
export function RecommendList({ list, lines, onOpen, label, modalOpen }: {
  list: Scored[]; lines: (RowLine | undefined)[]; onOpen: (p: Program) => void; label: string; modalOpen: boolean;
}) {
  const { state } = useApp();
  const keys = useRowKeys(list.map(s => s.p.id).join(), modalOpen);
  // 이유는 목록 단위로 정해져 자리로 짝지어진다. 접히며 빠지는 행이 끼어도 제 이유를 들고 가게 먼저 묶는다.
  const rows = useListPresence(list.map((s, i) => ({ s, line: lines[i] })), x => x.s.p.id);
  return (
    <section className="rec-list" data-fill aria-labelledby="rec-list-h">
      <div className="rec-list__scroll os-scroll">
        <h2 id="rec-list-h" className="ui-subhead rec-list__head">{label}</h2>
        <ul className="rec-rows" {...keys}>
          {rows.map(({ key, item: { s, line }, presence }) => (
            <OppRow
              key={key} presence={presence} p={s.p} week={state.week} onOpen={onOpen} prefix={CATEGORY_LABEL[categoryOf(s.p)]}
              tight={weekLoad(s.p, state.activities, state.week).tight}
              line={line}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * 전체 기회 탭: 지금 열린 기회 모두. 위 한 줄은 종류 칩(개수와 함께)이라 행에는 분류를 또 쓰지 않는다.
 * 추천한 기회는 이름 앞에 작은 '추천', 둘째 줄은 가장 구체적인 얻는 것.
 */
export function AllList({ open, recommendedIds, cat, sort, onCat, onSort, onOpen, modalOpen }: {
  open: Program[]; recommendedIds: Set<string>; cat: CategoryFilter; sort: OpenSort;
  onCat: (c: CategoryFilter) => void; onSort: (s: OpenSort) => void; onOpen: (p: Program) => void; modalOpen: boolean;
}) {
  const { state } = useApp();
  const counts = useMemo(() => categoryCounts(open), [open]);
  // 고른 종류가 데이터에서 사라졌으면(새 주차 등) 전체로 본다.
  const current = counts.some(c => c.id === cat) ? cat : 'all';
  const shown = useMemo(() => sortOpen(open.filter(p => inCategory(p, current)), state.week, sort), [open, current, sort, state.week]);
  const label = counts.find(c => c.id === current)?.label ?? '전체';
  const keys = useRowKeys(shown.map(p => p.id).join(), modalOpen);
  const rows = useListPresence(shown, p => p.id);
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
        <SegmentedControl label="정렬" items={(['deadline', 'new'] as const).map(id => ({ id, label: SORT_LABEL[id] }))} value={sort} onChange={onSort} />
      </div>
      <section className="rec-list" data-fill aria-labelledby="rec-all-h">
        <div className="rec-list__scroll os-scroll">
          <h2 id="rec-all-h" className="ui-subhead rec-list__head">{label} {shown.length}개</h2>
          <ul className="rec-rows" {...keys}>
            {rows.map(({ key, item: p, presence }) => {
              const g = keyGain(p);
              // 관심 없음으로 뺀 것은 전체 기회에서 그 상태를 앞에 단다(되돌리러 온 학생이 찾게)
              const choice = state.choices[p.id];
              const prefix = choice === 'dismissed' ? '관심 없음' : recommendedIds.has(p.id) ? '추천' : undefined;
              return <OppRow key={key} presence={presence} p={p} week={state.week} prefix={prefix} line={g && { kind: 'gain', text: g.label, source: 'gain' }} onOpen={onOpen} />;
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
