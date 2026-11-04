import { navigate } from '../../app/router';
import { Button, Card, Icon } from '../../components';

/**
 * 신청을 연 뒤의 완료 상태: 준비 → 신청 화면 열기 → 결과 세 단계 그림과 '일정에서 보기' 하나.
 * 결과는 학교 사이트에서 나오고 일정 화면에 결과 대기로 보인다. 에이전트가 일정에 넣은 활동 일시를 한 줄로 확인시킨다.
 */
export function PrepDone({ when }: { when: string }) {
  const steps = [
    { label: '준비 끝', sub: '체크리스트·초안', done: true },
    { label: '신청 화면 열기', sub: '내가 눌렀어요', done: true },
    { label: '결과', sub: '기다리는 중', done: false }
  ];
  return (
    <Card className="rec-done" aria-labelledby="rec-done-title">
      <ol className="rec-done__steps" aria-label="신청 단계">
        {steps.map(s => (
          <li key={s.label} className="rec-done__step" data-done={s.done || undefined}>
            <span className="rec-done__mark" aria-hidden="true">{s.done ? <Icon name="check" size={18} /> : <Icon name="clock" size={18} />}</span>
            <b>{s.label}</b>
            <span>{s.sub}</span>
          </li>
        ))}
      </ol>
      <h2 id="rec-done-title" className="rec-done__title">신청 화면을 열었어요. 결과는 일정에 나와요</h2>
      <p className="rec-done__cal"><Icon name="calendar" size={16} />에이전트가 일정에 넣었어요<b className="num">{when}</b></p>
      <Button variant="primary" onClick={() => navigate('activities/schedule')}>일정에서 보기</Button>
    </Card>
  );
}
