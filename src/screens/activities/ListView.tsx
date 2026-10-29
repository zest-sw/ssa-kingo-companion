import { useState } from 'react';
import { Button, Card, Chip, EmptyState, FieldTag } from '../../components';
import { navigate } from '../../app/router';
import type { Activity } from '../../domain/types';
import { ActivityMeta, StatusBadge, goInterview } from './ActivityCard';
import { sortActivities, type SortKey } from './sort';

const SORTS: { id: SortKey; label: string }[] = [{ id: 'due', label: '마감순' }, { id: 'recent', label: '최근순' }];

export function ListView({ activities, onOpen }: { activities: Activity[]; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<SortKey>('due');
  if (activities.length === 0) {
    return <Card><EmptyState icon="board" message="추천에서 신청 준비를 누르면 여기에 생겨요." action={<Button variant="primary" onClick={() => navigate('recommend')}>추천 보러 가기</Button>} /></Card>;
  }
  return (
    <Card padding="md">
      <div className="act-list__tools" role="group" aria-label="정렬">
        {SORTS.map(s => <Chip key={s.id} selected={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</Chip>)}
      </div>
      <table className="act-table">
        <caption className="sr-only">내 활동 목록, {SORTS.find(s => s.id === sort)?.label}</caption>
        <thead>
          <tr><th scope="col">활동</th><th scope="col">분야</th><th scope="col">상태</th><th scope="col">일정·마감</th><th scope="col"><span className="sr-only">행동</span></th></tr>
        </thead>
        <tbody>
          {sortActivities(activities, sort).map(a => (
            <tr key={a.id}>
              <th scope="row"><button type="button" className="act-table__open" aria-haspopup="dialog" onClick={() => onOpen(a.id)}>{a.title}</button></th>
              <td><FieldTag field={a.field} /></td>
              <td><StatusBadge status={a.status} /></td>
              <td className="act-table__meta"><ActivityMeta a={a} /></td>
              <td className="act-table__act">{a.status === 'ended' && <Button size="sm" variant="primary" onClick={() => goInterview(a.id)}>회고 쓰기</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
