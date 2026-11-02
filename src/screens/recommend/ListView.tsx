import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { l1Of, navigate } from '../../app/router';
import { Badge, Button, Card, Chip, EmptyState, FieldTag, PageHeader, SegmentedControl } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { filterLabels, isEmptyFilter, matchesAsk, withoutKey, type AskFilter } from '../../domain/recommend-flow/ask';
import { isNearDeadline } from '../../domain/recommend-flow/flow';
import { takeListIntent, type ListIntent } from '../../domain/recommend-flow/intent';
import { ddayText } from '../../domain/text';
import type { Field } from '../../domain/types';
import { CandidateDetail, type CardActions } from './CandidateDetail';
import { CompareView } from './CompareView';

const VIEWS = [{ id: 'detail', label: '목록·상세' }, { id: 'table', label: '비교 표' }] as const;

type Props = { startTable: boolean; actions: CardActions; onOpenLater: () => void };

/** 추천 L2: 왼쪽 후보 목록, 오른쪽 상세. 비교 표는 보기 전환으로 본다. 홈의 질문은 필터 칩으로 들어온다. */
export function ListView({ startTable, actions, onOpenLater }: Props) {
  const { state, view } = useApp();
  // 홈·추천 L1 이 넘긴 값은 처음 한 번만 읽는다.
  const [intent] = useState<ListIntent>(() => takeListIntent() ?? {});
  const [filter, setFilter] = useState<AskFilter>(intent.filter ?? {});
  const [mode, setMode] = useState<'detail' | 'table'>(intent.view ?? (startTable ? 'table' : 'detail'));
  const [picked, setPicked] = useState<string | undefined>(intent.select);

  const tried = useMemo(() => new Set<Field>(state.records.map(r => r.field)), [state.records]);
  const list = useMemo(() => view.scored.filter(s => matchesAsk(s.p, filter, tried)), [view.scored, filter, tried]);
  const current = list.find(s => s.p.id === picked) ?? list[0];
  const chips = filterLabels(filter);

  return (
    <>
      <PageHeader
        parent={l1Of('recommend')}
        crumb="후보 목록"
        title="후보 목록"
        actions={
          <>
            {view.later.length > 0 && <Button variant="ghost" onClick={onOpenLater}>나중에 보기 <Badge>{view.later.length}</Badge></Button>}
            <SegmentedControl label="보기 전환" items={[...VIEWS]} value={mode} onChange={id => setMode(id as 'detail' | 'table')} />
          </>
        }
      />
      {!isEmptyFilter(filter) && (
        <div className="rec-filter" role="group" aria-label="걸러 본 조건">
          {chips.map(c => <Chip key={c.key} selected icon="x" aria-label={`${c.label} 조건 빼기`} onClick={() => setFilter(withoutKey(filter, c.key))}>{c.label}</Chip>)}
          <Button size="sm" variant="ghost" onClick={() => setFilter({})}>조건 모두 빼기</Button>
        </div>
      )}
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon="compass"
            message={view.scored.length === 0 ? '지금 추천할 후보가 없어요. 관심 분야나 시간을 바꿔 보세요.' : '이 조건에 맞는 후보가 없어요. 조건을 빼면 더 보여요.'}
            action={view.scored.length === 0 ? <Button variant="primary" onClick={() => navigate('settings/profile')}>관심 분야·시간 바꾸기</Button> : <Button variant="primary" onClick={() => setFilter({})}>조건 모두 빼기</Button>}
          />
        </Card>
      ) : mode === 'table' ? (
        <CompareView scored={list} week={state.week} records={state.records} interests={state.profile.interests} activities={state.activities} actions={actions} />
      ) : (
        <div className="rec-split">
          <ul className="rec-cands" aria-label={`후보 ${list.length}개`}>
            {list.map(s => {
              const d = ddayOf(s.p, state.week);
              const top = s.p.id === view.primary?.p.id;
              return (
                <li key={s.p.id}>
                  <button type="button" className="rec-cand" aria-pressed={current?.p.id === s.p.id} onClick={() => setPicked(s.p.id)}>
                    <span className="rec-cand__title">{s.p.title}</span>
                    <span className="rec-cand__meta">
                      <FieldTag field={s.p.field} />
                      {top && <Badge tone="lime">가장 추천</Badge>}
                      <Badge tone={isNearDeadline(d) ? 'orange' : 'neutral'}>{ddayText(d)}</Badge>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {current && <div className="rec-split__detail"><CandidateDetail key={current.p.id} primary={current} isPrimary={current.p.id === view.primary?.p.id} week={state.week} records={state.records} activities={state.activities} actions={actions} stacked /></div>}
        </div>
      )}
    </>
  );
}
