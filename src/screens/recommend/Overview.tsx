import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Chip, EmptyState, Icon, PageHeader, TabPanel, Tabs } from '../../components';
import { CATALOG } from '../../data/catalog';
import { filterLabels, isEmptyFilter, matchesAsk, withoutKey, type AskFilter } from '../../domain/recommend-flow/ask';
import { emptyReason } from '../../domain/recommend-flow/flow';
import { takeListIntent, type ListIntent } from '../../domain/recommend-flow/intent';
import { weekLoad } from '../../domain/recommend-flow/load';
import { openPrograms } from '../../domain/recommend-flow/opportunities';
import { traceLine, traceNodes } from '../../domain/recommend-flow/trace';
import type { RecSel } from '../../domain/recommend-flow/url';
import type { Field, Program } from '../../domain/types';
import { HowPicked } from './HowPicked';
import { AllList, RecommendList } from './OppLists';
import { TopPick } from './TopPick';
import { useBasis } from './useBasis';

/**
 * 추천: 머리 아래 탭 두 개. [추천 활동] 가장 추천 카드 하나(주인공) + 다른 후보 목록, [전체 기회] 지금 열린 기회 모두(종류 칩·정렬).
 * 탭·칩·정렬·연 모달은 주소에 남는다(index.tsx). 홈의 질문은 추천 활동 탭의 조건 칩으로 들어온다.
 */
export function Overview({ sel, onSel, onOpen, onPrepare, onOpenLater }: {
  sel: RecSel; onSel: (next: RecSel) => void; onOpen: (p: Program) => void; onPrepare: (p: Program) => void; onOpenLater: () => void;
}) {
  const { state, view } = useApp();
  const basis = useBasis();
  const [howOpen, setHowOpen] = useState(false);
  // 홈이 넘긴 값은 처음 한 번만 읽는다.
  const [intent] = useState<ListIntent>(() => takeListIntent() ?? {});
  const [filter, setFilter] = useState<AskFilter>(intent.filter ?? {});
  const tab = sel.tab;
  const modalOpen = !!sel.open;

  const open = useMemo(() => openPrograms(CATALOG.programs, state.week), [state.week]);
  const recommendedIds = useMemo(() => new Set(view.scored.map(s => s.p.id)), [view.scored]);
  const tried = useMemo(() => new Set<Field>(state.records.map(r => r.field)), [state.records]);
  const filtering = !isEmptyFilter(filter);
  const list = useMemo(() => (filtering ? view.scored.filter(s => matchesAsk(s.p, filter, tried)) : view.scored), [filtering, filter, tried, view.scored]);
  const top = list.find(s => s.p.id === view.primary?.p.id);
  const rest = list.filter(s => s !== top);

  let picks;
  if (view.scored.length === 0) {
    picks = (
      <Card className="rec-empty" aria-label="추천 활동">
        <EmptyState icon="compass" title="지금 추천할 활동이 없어요" message={emptyReason(view.funnel)} action={<Button variant="primary" onClick={() => onSel({ ...sel, tab: 'all' })}>전체 기회 보기</Button>} />
      </Card>
    );
  } else if (list.length === 0) {
    picks = (
      <Card className="rec-empty">
        <EmptyState icon="compass" message="이 조건에 맞는 추천이 없어요. 조건을 빼면 더 보여요." action={<Button variant="primary" onClick={() => setFilter({})}>조건 모두 빼기</Button>} />
      </Card>
    );
  } else {
    const node = top && traceNodes(top.reasons, basis.records, top.p, basis.newcomer)[0];
    picks = (
      <>
        {top && (
          <TopPick
            p={top.p} week={state.week} why={node && traceLine(node)} tight={weekLoad(top.p, state.activities, state.week).tight}
            onOpen={onOpen} onPrepare={onPrepare}
          />
        )}
        {rest.length > 0 ? (
          <RecommendList list={rest} onOpen={onOpen} modalOpen={modalOpen} label={top ? `다른 후보 ${rest.length}개` : `맞는 추천 ${rest.length}개`} />
        ) : (
          <p className="rec-muted rec-rest-empty">다른 후보는 아직 없어요. 전체 기회에서 더 둘러볼 수 있어요.</p>
        )}
      </>
    );
  }

  return (
    <div className="os">
      <PageHeader
        title="추천"
        actions={view.later.length > 0 ? <Button variant="ghost" onClick={onOpenLater}>나중에 보기 <Badge>{view.later.length}</Badge></Button> : undefined}
      />
      <div className="rec-tabs">
        <Tabs id="rec" label="추천 보기" value={tab} onChange={t => onSel({ ...sel, tab: t })} items={[{ id: 'picks', label: '추천 활동' }, { id: 'all', label: '전체 기회', count: open.length }]} />
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
            open={open} recommendedIds={recommendedIds} cat={sel.cat} sort={sel.sort} onOpen={onOpen} modalOpen={modalOpen}
            onCat={cat => onSel({ ...sel, cat })} onSort={sort => onSel({ ...sel, sort })}
          />
        )}
      </TabPanel>
      <HowPicked open={howOpen} onClose={() => setHowOpen(false)} onOpen={p => { setHowOpen(false); onOpen(p); }} />
    </div>
  );
}
