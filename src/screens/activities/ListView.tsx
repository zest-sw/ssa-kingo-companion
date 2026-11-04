import { Badge, Button, Card, EmptyState, FieldTag } from '../../components';
import { navigate } from '../../app/router';
import type { Activity } from '../../domain/types';
import { StatusBadge, goInterview } from './ActivityCard';
import { dueView } from './helpers';
import { listGroups } from './sort';

const COLS = 6;

/** 마감(◆)과 활동 날짜를 칸으로 나눠, 타임라인과 같은 구분을 목록에서도 지킨다. */
function DueCell({ due }: { due: Activity['due'] }) {
  if (!due) return null;
  const v = dueView(due);
  return v.kind === 'today' ? <><Badge tone="solid-orange">오늘</Badge> {v.label}</> : <>{v.text}</>;
}

/** 목록 보기: 보드와 같은 세 칸으로 묶고 칸 안은 날짜 순. 활동이 많아도 머리 줄은 두고 표 안에서만 스크롤한다. */
export function ListView({ activities, onOpen }: { activities: Activity[]; onOpen: (id: string) => void }) {
  if (activities.length === 0) {
    return <Card><EmptyState icon="board" message="추천에서 신청 준비를 누르면 여기에 생겨요." action={<Button size="sm" variant="primary" onClick={() => navigate('recommend')}>추천에서 활동 고르기</Button>} /></Card>;
  }
  return (
    <Card padding="md" className="os-card">
      <div className="os-scroll"><table className="act-table">
        <caption className="sr-only">내 활동 목록, 할 것·하는 중·끝난 것 순서, 칸 안은 날짜 순</caption>
        <thead>
          <tr>
            <th scope="col">활동</th><th scope="col">분야</th><th scope="col">상태</th>
            <th scope="col"><span aria-hidden="true">◆ </span>마감</th><th scope="col">활동 날짜</th><th scope="col"><span className="sr-only">행동</span></th>
          </tr>
        </thead>
        {listGroups(activities).filter(g => g.items.length > 0).map(g => (
          <tbody key={g.id}>
            <tr className="act-table__group"><th scope="colgroup" colSpan={COLS}>{g.label} <span className="num">{g.items.length}</span></th></tr>
            {g.items.map(a => (
              <tr key={a.id}>
                <th scope="row"><button type="button" className="act-table__open" aria-haspopup="dialog" onClick={() => onOpen(a.id)}>{a.title}</button></th>
                <td><FieldTag field={a.field} /></td>
                <td><StatusBadge status={a.status} /></td>
                <td className="act-table__meta"><DueCell due={a.due} /></td>
                <td className="act-table__meta">{a.schedule}</td>
                <td className="act-table__act">{a.status === 'ended' && <Button size="sm" onClick={() => goInterview(a.id)}>회고 쓰기</Button>}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table></div>
    </Card>
  );
}
