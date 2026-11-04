import { Badge, Button, Card, EmptyState, FieldTag, GhostPic, PageHeader } from '../../components';
import { nextStep } from '../../domain/nextStep';
import { navigate, parentLink } from '../../app/router';
import { useApp } from '../../app/AppState';
import { factsOf } from '../../data/activities';
import { CURRENT_TERM } from '../../data/records';
import { skippedRecord } from '../../domain/interview/record';
import type { Activity } from '../../domain/types';

/** 활동 없이 '회고 쓰기'를 열었을 때: 회고 대기 활동 목록. 회고는 건너뛰어도 확인된 사실만으로 기록이 남는다(잃는 것 없음). */
export function Pending() {
  const { state, run } = useApp();
  const skip = (a: Activity) => {
    const facts = factsOf(a);
    const record = skippedRecord({
      activityId: a.id, title: a.title, field: a.field, programId: a.programId, kind: facts.kind, verification: facts.verified ? 'school' : 'self',
      date: CURRENT_TERM.date, semester: CURRENT_TERM.semester, card: facts.situation ? { situation: facts.situation } : {}
    });
    run({ type: 'record/add', record, activityId: a.id }, { toast: '기록만 남겼어요. 기록에서 언제든 채울 수 있어요.', undoable: true });
  };
  const drafts = Object.keys(state.drafts);
  const list = state.activities.filter(a => a.status === 'ended');
  // 여기가 비면 끝난 활동이 없다는 뜻이라, 하는 활동이 있으면 일정, 없으면 추천으로 보낸다.
  const step = nextStep(state.activities);
  return (
    <div className="os">
      <PageHeader parent={parentLink('activities/records')} crumb="회고 인터뷰" title="회고 쓰기" />
      <>
        {list.length === 0 ? (
          <Card className="rec-hold"><EmptyState pic={<GhostPic kind="rows" labels={['', '', '']} />} message={step.to === 'recommend' ? '활동을 고르고, 끝나면 여기서 회고를 써요.' : '하는 활동이 끝나면 여기서 회고를 써요.'} action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>} /></Card>
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
                  <Button onClick={() => navigate(`activities/records/interview/${a.id}`)}>{drafts.includes(a.id) ? '이어서 쓰기' : '회고 쓰기'}</Button>
                  <Button variant="ghost" onClick={() => skip(a)}>기록만 남기기</Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </>
    </div>
  );
}
