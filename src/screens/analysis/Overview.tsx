import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Card, ErrorState, FieldTag, GapLine, Icon, LoadingState, NextStep, PageHeader, ProofRow, StoryHero } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { candidateHref } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import { useTriage } from '../recommend/useTriage';
import { DiscoveryCards } from './DiscoveryCards';
import type { useAnalysis } from './useAnalysis';
import { setStoryAnswer, useStory } from './useStory';

/**
 * 나의 분석 요약: 저자가 이끄는 이야기 먼저, 탐색은 나중(martini glass, Segel·Heer 2010).
 * 위에서 아래로 이야기(정체성 가설) → 근거(네 분석이 한 줄씩, 누르면 그 화면) → 비어 있는 곳 → 그래서 이번 주.
 * 옆에는 확인할 발견: 확인할수록 이야기가 단단해진다. 같은 곳으로 가는 다른 버튼은 두지 않는다.
 */
export function Overview({ analysis }: { analysis: ReturnType<typeof useAnalysis> }) {
  const { state, view } = useApp();
  useOverviewState<null>('analysis', null);
  const story = useStory(analysis.records);
  const { actions } = useTriage();
  const next = story.next;
  const program = next ? view.scored.find(s => s.p.id === next.programId)?.p : undefined;

  return (
    <div className="os">
      <PageHeader title="나의 분석" actions={<p className="an-private"><Icon name="eye" size={16} />여기 있는 분석은 나에게만 보여요.</p>} />
      <div className="os__body an-sum">
        {analysis.status === 'loading' && <Card><LoadingState message="새 기록을 분석하는 중이에요" lines={5} /></Card>}
        {analysis.status === 'error' && <Card><ErrorState message="새 기록을 분석하지 못했어요. 지난 분석은 그대로예요." onRetry={analysis.retry} /></Card>}
        {analysis.status === 'ready' && (
          <>
            <Card className="an-story" aria-label="나의 이야기">
              <StoryHero identity={story.identity} onAnswer={story.newStudent ? undefined : setStoryAnswer} />
              <section aria-labelledby="an-story-proof-h">
                <h2 id="an-story-proof-h" className="an-story__h">{story.newStudent ? '기록이 쌓이면 근거가 생길 자리' : '왜 이렇게 읽었나'}</h2>
                <ProofRow proofs={story.proofs} hrefOf={hrefOf} layout="list" />
              </section>
              {story.gap && <GapLine gap={story.gap} />}
              {next && program && (
                <NextStep
                  next={next}
                  href={hrefOf(candidateHref(program.id))}
                  meta={<><FieldTag field={program.field} /><span className="num">{ddayText(ddayOf(program, state.week))} 마감</span></>}
                  onPrepare={() => actions.onPrepare(program)}
                />
              )}
            </Card>
            <div className="an-sum__side">
              <DiscoveryCards />
              <p className="an-sum__hint">{story.newStudent ? '발견이 생기면 확인할수록 이야기가 단단해져요' : '발견을 확인할수록 이야기가 단단해져요. 맞다고 한 것만 추천에 써요'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
