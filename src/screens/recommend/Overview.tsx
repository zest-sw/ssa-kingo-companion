import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, Button, Card, Chip, EmptyState, Icon, PageHeader, TabPanel, Tabs } from '../../components';
import { CATALOG } from '../../data/catalog';
import { filterLabels, isEmptyFilter, matchesAsk, withoutKey, type AskFilter } from '../../domain/recommend-flow/ask';
import { candidateHref, emptyReason } from '../../domain/recommend-flow/flow';
import { takeListIntent, type ListIntent } from '../../domain/recommend-flow/intent';
import { CATEGORY_ORDER, openPrograms, type CategoryFilter, type OpenSort } from '../../domain/recommend-flow/opportunities';
import type { Field, Program } from '../../domain/types';
import { HowPicked } from './HowPicked';
import { AllList, RecommendList } from './OppLists';

type Tab = 'picks' | 'all';
type Sel = { tab: Tab; cat: CategoryFilter; sort: OpenSort };
const isSel = (v: unknown): v is Sel => {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Sel;
  return (s.tab === 'picks' || s.tab === 'all') && (s.cat === 'all' || CATEGORY_ORDER.includes(s.cat)) && (s.sort === 'deadline' || s.sort === 'new');
};

/**
 * 추천: 머리 아래 탭 두 개. [추천 활동] 서비스가 고른 활동만(가장 추천 + 대안), [전체 기회] 지금 열린 기회 모두(종류 칩·정렬).
 * 행을 누르면 #/recommend/<id> 로 바뀌고 같은 목록 위에 가운데 모달이 열린다(index.tsx). 홈의 질문은 추천 활동 탭의 조건 칩으로 들어온다.
 */
export function Overview({ onOpenLater }: { onOpenLater: () => void }) {
  const { state, view } = useApp();
  const [sel, setSel] = useOverviewState<Sel>('recommend', { tab: 'picks', cat: 'all', sort: 'deadline' }, isSel);
  const [howOpen, setHowOpen] = useState(false);
  // 홈이 넘긴 값은 처음 한 번만 읽는다.
  const [intent] = useState<ListIntent>(() => takeListIntent() ?? {});
  const [filter, setFilter] = useState<AskFilter>(intent.filter ?? {});
  const tab: Tab = intent.filter && !isEmptyFilter(intent.filter) && sel.tab === 'all' ? 'picks' : sel.tab;

  const open = useMemo(() => openPrograms(CATALOG.programs, state.week), [state.week]);
  const recommendedIds = useMemo(() => new Set(view.scored.map(s => s.p.id)), [view.scored]);
  const tried = useMemo(() => new Set<Field>(state.records.map(r => r.field)), [state.records]);
  const filtering = !isEmptyFilter(filter);
  // 가장 추천이 맨 위. 조건이 있으면 맞는 것만.
  const list = useMemo(() => {
    const base = filtering ? view.scored.filter(s => matchesAsk(s.p, filter, tried)) : view.scored;
    const top = base.find(s => s.p.id === view.primary?.p.id);
    return top ? [top, ...base.filter(s => s !== top)] : base;
  }, [filtering, filter, tried, view.scored, view.primary]);

  const openOne = (p: Program) => navigate(candidateHref(p.id));

  let picks;
  if (view.scored.length === 0) {
    picks = (
      <Card className="rec-empty" aria-label="추천 활동">
        <EmptyState icon="compass" title="지금 추천할 활동이 없어요" message={emptyReason(view.funnel)} action={<Button variant="primary" onClick={() => setSel({ ...sel, tab: 'all' })}>전체 기회 보기</Button>} />
      </Card>
    );
  } else if (list.length === 0) {
    picks = (
      <Card className="rec-empty">
        <EmptyState icon="compass" message="이 조건에 맞는 추천이 없어요. 조건을 빼면 더 보여요." action={<Button variant="primary" onClick={() => setFilter({})}>조건 모두 빼기</Button>} />
      </Card>
    );
  } else {
    picks = <RecommendList list={list} primaryId={view.primary?.p.id} onOpen={openOne} label={filtering ? `맞는 추천 ${list.length}개` : `추천 ${list.length}개`} />;
  }

  return (
    <div className="os">
      <PageHeader
        title="추천"
        actions={view.later.length > 0 ? <Button variant="ghost" onClick={onOpenLater}>나중에 보기 <Badge>{view.later.length}</Badge></Button> : undefined}
      />
      <div className="rec-tabs">
        <Tabs id="rec" label="추천 보기" value={tab} onChange={t => setSel({ ...sel, tab: t })} items={[{ id: 'picks', label: '추천 활동' }, { id: 'all', label: '전체 기회', count: open.length }]} />
        {tab === 'picks' && view.scored.length > 0 && <button type="button" className="rec-link rec-tabs__how" aria-haspopup="dialog" onClick={() => setHowOpen(true)}><Icon name="info" size={14} />어떻게 골랐나</button>}
      </div>
      <TabPanel id="rec" active={tab}>
        {tab === 'picks' ? (
          <>
            {filtering && (
              <div className="rec-filter" role="group" aria-label="걸러 본 조건">
                {filterLabels(filter).map(c => <Chip key={c.key} selected icon="x" aria-label={`${c.label} 조건 빼기`} onClick={() => setFilter(withoutKey(filter, c.key))}>{c.label}</Chip>)}
                <Button size="sm" variant="ghost" onClick={() => setFilter({})}>조건 모두 빼기</Button>
              </div>
            )}
            {picks}
          </>
        ) : open.length === 0 ? (
          <Card className="rec-empty">
            <EmptyState icon="compass" message="이번 주에 열린 기회가 아직 없어요. 새 모집이 열리면 여기에 모여요." action={<Button variant="primary" onClick={() => navigate('settings/notifications')}>새 기회 알림 켜기</Button>} />
          </Card>
        ) : (
          <AllList
            open={open} recommendedIds={recommendedIds} cat={sel.cat} sort={sel.sort} onOpen={openOne}
            onCat={cat => setSel({ ...sel, cat })} onSort={sort => setSel({ ...sel, sort })}
          />
        )}
      </TabPanel>
      <HowPicked open={howOpen} onClose={() => setHowOpen(false)} onOpen={p => { setHowOpen(false); openOne(p); }} />
    </div>
  );
}
