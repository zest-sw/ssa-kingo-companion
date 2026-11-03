import { useState } from 'react';
import { Button, Chip, EmptyState, FieldTag, Icon } from '../../components';
import { filterRecords, groupBySemester, groupsPresent, type ArchiveFilter } from '../../domain/interview/archive';
import type { RecordItem } from '../../domain/types';
import { GROUP_LABEL } from '../../domain/vocab';

const ALL: ArchiveFilter = { group: 'all', verification: 'all' };

/** 보관함 한 줄: 제목 · 분야 · 날짜 · 확인 방식만. 누르면 기록 서랍(상세)이 열린다. */
function Row({ r, selected, onOpen }: { r: RecordItem; selected: boolean; onOpen: (id: string) => void }) {
  return (
    <li className="ra-row" data-open={selected}>
      <button type="button" className="ra-row__head" aria-pressed={selected} onClick={() => onOpen(r.id)}>
        <span className="ra-row__title">{r.title}</span>
        <span className="ra-row__meta"><FieldTag field={r.field} /><span>{r.date}</span><Icon name={r.verification === 'school' ? 'check' : 'pencil'} size={14} /><span className="sr-only">{r.verification === 'school' ? '학교 확인' : '직접 입력'}</span></span>
      </button>
    </li>
  );
}

/** 기록 › 보관함 보기: 학기별 기록 줄. 지도와 한 화면에 두지 않는다. 이 칸만 안에서 스크롤한다. */
export function Archive({ records, selectedId, onOpen }: { records: RecordItem[]; selectedId?: string; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<ArchiveFilter>(ALL);
  const shown = filterRecords(records, filter);
  const groups = groupBySemester(shown);

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
              <Chip icon="check" selected={filter.verification === 'school'} onClick={() => setFilter({ ...filter, verification: filter.verification === 'school' ? 'all' : 'school' })}>학교 확인</Chip>
              <Chip icon="pencil" selected={filter.verification === 'self'} onClick={() => setFilter({ ...filter, verification: filter.verification === 'self' ? 'all' : 'self' })}>직접 입력</Chip>
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
            <ul>{g.items.map(r => <Row key={r.id} r={r} selected={selectedId === r.id} onOpen={onOpen} />)}</ul>
          </section>
        ))}
      </div>
    </section>
  );
}

