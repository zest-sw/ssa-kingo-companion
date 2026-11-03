import { Badge, Button, Card, EmptyState, FieldTag, PageHeader } from '../../components';
import { DashedPic } from '../activities/DashedPic';
import { nextStep } from '../../domain/nextStep';
import { navigate, parentLink } from '../../app/router';
import { useApp } from '../../app/AppState';

/** 활동 없이 '회고 쓰기'를 열었을 때: 회고 대기 활동 목록 */
export function Pending() {
  const { state } = useApp();
  const drafts = Object.keys(state.drafts);
  const list = state.activities.filter(a => a.status === 'ended');
  // 여기가 비면 끝난 활동이 없다는 뜻이라, 하는 활동이 있으면 일정, 없으면 추천으로 보낸다.
  const step = nextStep(state.activities);
  return (
    <div className="os">
      <PageHeader parent={parentLink('activities/records')} crumb="회고 인터뷰" title="회고 쓰기" />
      <>
        {list.length === 0 ? (
          <Card className="rec-hold"><EmptyState pic={<DashedPic kind="list" />} message={step.to === 'recommend' ? '활동을 고르고, 끝나면 여기서 회고를 써요.' : '하는 활동이 끝나면 여기서 회고를 써요.'} action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>} /></Card>
        ) : (
          <ul className="rec-pending os-scroll">
            {list.map(a => (
              <li key={a.id}>
                <Card padding="md" as="div" className="rec-pending__row">
                  <div className="rec-pending__text">
                    <FieldTag field={a.field} />
                    <h2 className="rec-pending__title">{a.title}</h2>
                    <p className="rec-pending__sub">{a.schedule}</p>
                  </div>
                  {drafts.includes(a.id) && <Badge tone="dashed">쓰던 초안 있어요</Badge>}
                  <Button variant="primary" onClick={() => navigate(`activities/records/interview/${a.id}`)}>{drafts.includes(a.id) ? '이어서 쓰기' : '회고 쓰기'}</Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </>
    </div>
  );
}
