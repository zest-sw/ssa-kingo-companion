import { useApp } from '../../app/AppState';
import { hrefOf, navigate } from '../../app/router';
import { useStory } from '../../app/useStory';
import { Button, Card, EmptyState, FieldTag, NextStep } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { candidateHref, isNearDeadline } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import { useTriage } from '../recommend/useTriage';

/**
 * 제안(셋째 층): 다음 한 걸음 하나. 나의 분석 요약의 '그래서 이번 주'와 같은 후보·같은 이유(이야기 모델 story.next).
 * 홈의 주 버튼은 여기 '신청 준비' 하나다. 신청은 학생이 직접 누른다.
 * 다른 층과 구별되게 얇은 외곽선 + 옅은 그림자로 띄우고, 색 면은 쓰지 않는다(토스뱅크: 제안은 내용이 먼저 보이게).
 */
export function NextCard() {
  const { state, view } = useApp();
  const { next } = useStory();
  const { actions } = useTriage();
  const program = next ? view.scored.find(s => s.p.id === next.programId)?.p : undefined;

  return (
    <Card className="home-next" aria-label="다음 한 걸음">
      {next && program ? (
        <NextStep
          next={next}
          href={hrefOf(candidateHref(program.id))}
          meta={<><FieldTag field={program.field} /><span className="ui-dday num" data-near={isNearDeadline(ddayOf(program, state.week)) || undefined}>{ddayText(ddayOf(program, state.week))} 마감</span></>}
          onPrepare={() => actions.onPrepare(program)}
        />
      ) : (
        // 비었을 때 주 버튼 자리는 조건 바꾸기 하나(설정은 홈 다른 곳에서 가지 않는 목적지다)
        <EmptyState icon="compass" message="관심 분야나 시간을 바꾸면 다음 활동을 골라 드려요" action={<Button onClick={() => navigate('settings/profile')}>추천 조건 바꾸기</Button>} />
      )}
    </Card>
  );
}
