import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { hrefOf, navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Card, Icon, PageHeader, SummaryCard } from '../../components';
import { CURRENT_TERM } from '../../data/records';
import { ddayText } from '../../domain/text';
import { nextDues, ongoingTitles, pendingRetros, recordSentence, scheduleSentence, todoSentence } from './summary';

/**
 * 내 활동 요약: 지금 상태를 문장으로(할 것·다음 마감·회고 대기·진행 중), 아래에 일정·기록 카드.
 * 카드를 누르면 그 하위 화면으로 간다. 같은 곳으로 가는 다른 버튼은 두지 않는다.
 */
export function Overview() {
  const { state } = useApp();
  useOverviewState<null>('activities', null);
  const dues = nextDues(state.activities);
  const retros = pendingRetros(state.activities);
  const going = ongoingTitles(state.activities);
  const empty = state.activities.length === 0;

  const toRetro = () => navigate(retros.length === 1 ? `activities/records/interview/${retros[0].id}` : 'activities/records/interview');

  return (
    <>
      <PageHeader title="내 활동" />
      <Card className="act-now">
        <p className="act-now__sentence">{empty ? '추천에서 신청 준비를 누르면 활동이 생겨요' : todoSentence(state.activities)}</p>
        {dues.length > 0 && (
          <ul className="act-now__list" aria-label="다음 마감">
            {dues.map(d => (
              <li key={d.id}>
                <button type="button" className="act-now__row" onClick={() => openEntity({ kind: 'activity', id: d.id })}>
                  <span className="act-now__name">{d.title}</span>
                  <span className="act-now__dday num">{ddayText(d.dday)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {retros.length > 0 && (
          <button type="button" className="act-now__row act-now__row--retro" onClick={toRetro}>
            <Icon name="pencil" size={18} />
            <span className="act-now__name">회고 쓸 활동 <b className="num">{retros.length}</b>개</span>
            <Icon name="chevron" size={16} />
          </button>
        )}
        {going.length > 0 && <p className="act-now__going"><span className="act-now__label">진행 중</span>{going.join(', ')}</p>}
      </Card>
      <div className="act-sums">
        <SummaryCard href={hrefOf('activities/schedule')} title="일정" sentence={scheduleSentence(state.activities)} />
        <SummaryCard href={hrefOf('activities/records')} title="기록" sentence={recordSentence(state.records, CURRENT_TERM.semester)} />
      </div>
    </>
  );
}
