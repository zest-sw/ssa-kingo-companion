import { useState } from 'react';
import { Button, Card, Chip, EmptyState, FieldTag, Icon, PageHeader } from '../../components';
import { l1Of, navigate } from '../../app/router';
import { openEntity } from '../../app/entity';
import { useApp } from '../../app/AppState';
import { filterRecords, groupBySemester, groupsPresent, previewOf, type ArchiveFilter } from '../../domain/interview/archive';
import type { RecordItem } from '../../domain/types';
import { GROUP_LABEL } from '../../domain/vocab';
import { AddRecordModal } from './AddRecordModal';
import { VerificationBadge } from './RecordCardView';

const ALL: ArchiveFilter = { group: 'all', verification: 'all' };

function RecordTile({ r, onOpen }: { r: RecordItem; onOpen: (id: string) => void }) {
  const lines = previewOf(r);
  return (
    <article className="rec-tile" aria-labelledby={`rec-${r.id}`}>
      <div className="rec-tile__top"><FieldTag field={r.field} /><span className="rec-tile__date">{r.date}</span></div>
      <h3 className="rec-tile__title"><button type="button" id={`rec-${r.id}`} className="rec-tile__open" aria-haspopup="dialog" onClick={() => onOpen(r.id)}>{r.title}</button></h3>
      <dl className="rec-tile__lines">
        {lines.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <div className="rec-tile__foot">
        <VerificationBadge v={r.verification} />
        <span className="rec-tile__flags">
          {!r.useForRecommend && <span>추천에 쓰지 않음</span>}
          <span><Icon name={r.visibility === 'me' ? 'lock' : 'friends'} size={14} />{r.visibility === 'me' ? '나만 보기' : '친구 공개'}</span>
        </span>
      </div>
    </article>
  );
}

export function Archive() {
  const { state } = useApp();
  const [filter, setFilter] = useState<ArchiveFilter>(ALL);
  const [adding, setAdding] = useState(false);

  const shown = filterRecords(state.records, filter);
  const groups = groupBySemester(shown);
  const open = (id: string) => openEntity({ kind: 'record', id });

  return (
    <>
      <PageHeader parent={l1Of('records')} crumb="보관함" title="기록 보관함" actions={<Button icon="plus" onClick={() => setAdding(true)}>직접 기록 추가</Button>} />
      <>
        {state.records.length === 0 ? (
          <Card><EmptyState icon="records" message="아직 기록이 없어요. 끝난 활동에서 회고를 쓰면 여기에 쌓여요." action={<Button variant="primary" onClick={() => navigate('records/interview')}>회고 쓰기</Button>} /></Card>
        ) : (
          <>
            <div className="rec-filters">
              <div className="rec-filters__group" role="group" aria-label="분야">
                <Chip selected={filter.group === 'all'} onClick={() => setFilter({ ...filter, group: 'all' })}>전체 분야</Chip>
                {groupsPresent(state.records).map(g => <Chip key={g} selected={filter.group === g} onClick={() => setFilter({ ...filter, group: g })}>{GROUP_LABEL[g]}</Chip>)}
              </div>
              <div className="rec-filters__group" role="group" aria-label="확인 방식">
                <Chip selected={filter.verification === 'all'} onClick={() => setFilter({ ...filter, verification: 'all' })}>전체</Chip>
                <Chip icon="check" selected={filter.verification === 'school'} onClick={() => setFilter({ ...filter, verification: 'school' })}>학교 확인</Chip>
                <Chip icon="pencil" selected={filter.verification === 'self'} onClick={() => setFilter({ ...filter, verification: 'self' })}>직접 입력</Chip>
              </div>
            </div>
            {groups.length === 0 ? (
              <Card><EmptyState icon="records" message="이 조건에 맞는 기록이 없어요. 필터를 바꿔 보세요." action={<Button onClick={() => setFilter(ALL)}>필터 지우기</Button>} /></Card>
            ) : groups.map(g => (
              <section key={g.semester} className="rec-sem" aria-labelledby={`sem-${g.semester}`}>
                <h2 id={`sem-${g.semester}`} className="rec-sem__title">{g.label} <span className="rec-sem__count num">{g.items.length}</span></h2>
                <ul className="rec-grid">{g.items.map(r => <li key={r.id}><RecordTile r={r} onOpen={open} /></li>)}</ul>
              </section>
            ))}
          </>
        )}
      </>
      <AddRecordModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
