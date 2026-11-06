import { useRef } from 'react';
import { navigate } from '../../app/router';
import { Button, Card, Icon, useFocusOnChange } from '../../components';

/**
 * 학생이 '신청했어요'를 누른 뒤의 완료 장면. 끝이 아니라 다음 경험의 시작점이다:
 * 일정에 넣었다는 것과 활동 날짜, 끝나면 회고를 묻겠다는 다음 걸음 한 줄, 갈 곳은 '내 활동에서 보기' 하나.
 */
export function PrepDone({ when }: { when: string }) {
  const title = useRef<HTMLHeadingElement>(null);
  // 버튼이 사라진 자리에서 초점을 잃지 않게 완료 제목으로 옮긴다(화면 읽기 프로그램도 결과를 읽는다).
  useFocusOnChange(title, null, { onMount: true, scroll: true });
  return (
    <Card className="rec-pdone" aria-labelledby="rec-pdone-title">
      <span className="rec-pdone__mark" aria-hidden="true"><Icon name="check" size={24} /></span>
      <h2 id="rec-pdone-title" ref={title} tabIndex={-1} className="rec-pdone__title">신청했어요</h2>
      <ul className="rec-pdone__rows">
        <li><Icon name="calendar" size={16} /><span>일정에 넣었어요</span><b className="num">{when}</b></li>
        <li><Icon name="doc" size={16} /><span>활동이 끝나면 회고를 물어볼게요</span></li>
      </ul>
      <Button variant="primary" onClick={() => navigate('activities')}>내 활동에서 보기</Button>
    </Card>
  );
}
