import { Badge, Button, Card, EmptyState, FieldTag, PageHeader } from '../../components';
import { navigate } from '../../app/router';
import { useApp } from '../../app/AppState';
import { RecordsTabs } from './RecordsTabs';
import { useDraftIds } from './stores';

/** 활동 없이 '회고 쓰기'를 열었을 때: 회고 대기 활동 목록 */
export function Pending() {
  const { state } = useApp();
  const drafts = useDraftIds();
  const list = state.activities.filter(a => a.status === 'ended');
  return (
    <>
      <PageHeader eyebrow="기록" title="회고 쓰기" />
      <RecordsTabs value="interview">
        {list.length === 0 ? (
          <Card><EmptyState icon="records" message="회고를 기다리는 활동이 없어요. 활동이 끝나면 여기에 나타나요." action={<Button variant="primary" onClick={() => navigate('activities')}>내 활동 보기</Button>} /></Card>
        ) : (
          <ul className="rec-pending">
            {list.map(a => (
              <li key={a.id}>
                <Card padding="md" as="div" className="rec-pending__row">
                  <div className="rec-pending__text">
                    <FieldTag field={a.field} />
                    <h2 className="rec-pending__title">{a.title}</h2>
                    <p className="rec-pending__sub">{a.schedule}</p>
                  </div>
                  {drafts.includes(a.id) && <Badge tone="dashed">쓰던 초안 있어요</Badge>}
                  <Button variant="primary" onClick={() => navigate(`records/interview/${a.id}`)}>{drafts.includes(a.id) ? '이어서 쓰기' : '회고 쓰기'}</Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </RecordsTabs>
    </>
  );
}
