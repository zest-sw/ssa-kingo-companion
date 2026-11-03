import { useEffect, useRef, useState } from 'react';
import { Button, Chip, EmptyState, FieldTag, Icon } from '../../components';
import { openEntity } from '../../app/entity';
import { filterRecords, groupBySemester, groupsPresent, previewOf, type ArchiveFilter } from '../../domain/interview/archive';
import type { RecordItem } from '../../domain/types';
import { GROUP_LABEL } from '../../domain/vocab';
import { VerificationBadge } from './RecordCardView';

const ALL: ArchiveFilter = { group: 'all', verification: 'all' };

function Row({ r, open, onToggle }: { r: RecordItem; open: boolean; onToggle: (id: string) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  // 지도에서 점을 고르면 이 줄이 보이는 자리로 온다.
  useEffect(() => { if (open) ref.current?.scrollIntoView({ block: 'nearest' }); }, [open]);
  return (
    <li ref={ref} className="ra-row" data-open={open}>
      <button type="button" className="ra-row__head" aria-expanded={open} onClick={() => onToggle(r.id)}>
        <span className="ra-row__title">{r.title}</span>
        <span className="ra-row__meta"><FieldTag field={r.field} /><span>{r.date}</span><Icon name={r.verification === 'school' ? 'check' : 'pencil'} size={14} /><span className="sr-only">{r.verification === 'school' ? '학교 확인' : '직접 입력'}</span></span>
      </button>
      {open && (
        <div className="ra-row__body">
          <dl className="ra-row__lines">{previewOf(r).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <div className="ra-row__foot">
            <VerificationBadge v={r.verification} />
            <span className="ra-row__flags">
              {!r.useForRecommend && <span>추천에 쓰지 않음</span>}
              <span><Icon name={r.visibility === 'me' ? 'lock' : 'friends'} size={14} />{r.visibility === 'me' ? '나만 보기' : '친구 공개'}</span>
            </span>
            <Button size="sm" onClick={() => openEntity({ kind: 'record', id: r.id })}>자세히</Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** 기록 화면 오른쪽 보관함: 학기별 기록 줄. 이 칸만 안에서 스크롤한다. 줄을 누르면 한 일·한마디가 펼쳐진다. */
export function Archive({ records, selectedId, onSelect }: { records: RecordItem[]; selectedId?: string; onSelect: (id: string | undefined) => void }) {
  const [filter, setFilter] = useState<ArchiveFilter>(ALL);
  const shown = filterRecords(records, filter);
  const groups = groupBySemester(shown);
  const toggle = (id: string) => onSelect(selectedId === id ? undefined : id);

  return (
    <section className="ra" aria-labelledby="ra-title">
      <div className="ra__head">
        <h2 id="ra-title" className="ra__title">보관함 <span className="num">{shown.length}</span></h2>
        {records.length > 0 && (
          <div className="ra__filters">
            <div className="ra__chips" role="group" aria-label="분야">
              <Chip selected={filter.group === 'all'} onClick={() => setFilter({ ...filter, group: 'all' })}>전체</Chip>
              {groupsPresent(records).map(g => <Chip key={g} selected={filter.group === g} onClick={() => setFilter({ ...filter, group: g })}>{GROUP_LABEL[g]}</Chip>)}
            </div>
            <div className="ra__chips" role="group" aria-label="확인 방식">
              <Chip selected={filter.verification === 'all'} onClick={() => setFilter({ ...filter, verification: 'all' })}>전체</Chip>
              <Chip icon="check" selected={filter.verification === 'school'} onClick={() => setFilter({ ...filter, verification: 'school' })}>학교 확인</Chip>
              <Chip icon="pencil" selected={filter.verification === 'self'} onClick={() => setFilter({ ...filter, verification: 'self' })}>직접 입력</Chip>
            </div>
          </div>
        )}
      </div>
      <div className="ra__list os-scroll">
        {records.length === 0 ? (
          <EmptyState icon="records" message="기록이 생기면 학기별로 여기에 모여요." />
        ) : groups.length === 0 ? (
          <EmptyState icon="records" message="이 조건에 맞는 기록이 없어요. 필터를 바꿔 보세요." action={<Button onClick={() => setFilter(ALL)}>필터 지우기</Button>} />
        ) : groups.map(g => (
          <section key={g.semester} aria-labelledby={`sem-${g.semester}`}>
            <h3 id={`sem-${g.semester}`} className="ra__sem">{g.label} <span className="num">{g.items.length}</span></h3>
            <ul>{g.items.map(r => <Row key={r.id} r={r} open={selectedId === r.id} onToggle={toggle} />)}</ul>
          </section>
        ))}
      </div>
    </section>
  );
}
