import { openEntity } from '../../app/entity';
import { hrefOf, navigate } from '../../app/router';
import { Card, EmptyState, FieldTag } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { candidateHref } from '../../domain/recommend-flow/flow';
import { MAX_TODAY_TASKS, timelineOrder, type TodayTask } from '../../domain/recommend-flow/summary';
import { ddayText } from '../../domain/text';
import type { Scored } from '../../domain/types';

/**
 * 오늘의 퀘스트(오늘·내일 할 일): 가까운 날·이른 시각 순의 세로 타임라인. 3개까지 그리고 나머지는 개수만.
 * 챙길 일이 없는 새 학생에게는 첫 추천 하나를 첫 퀘스트로 보인다.
 */
export function TodayList({ tasks, first, week }: { tasks: TodayTask[]; first?: Scored; week: number }) {
  const go = (t: TodayTask) => ('path' in t.target ? navigate(t.target.path) : openEntity(t.target));
  // 고르기는 급한 순(todayTasks 순서), 그리기는 시간순.
  const shown = timelineOrder(tasks.slice(0, MAX_TODAY_TASKS));
  const more = tasks.length - shown.length;
  return (
    <Card title="오늘의 퀘스트" className="home-today">
      {tasks.length === 0 && first ? (
        <div className="home-first">
          <p className="home-first__lead">첫 퀘스트로 이걸 받아 보세요</p>
          <a className="home-first__row" href={hrefOf(candidateHref(first.p.id))}>
            <span className="home-first__title">{first.p.title}</span>
            <FieldTag field={first.p.field} />
            <span className="home-first__dday num">{ddayText(ddayOf(first.p, week))}</span>
          </a>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState icon="check" message="오늘은 받은 퀘스트가 없어요. 광장의 퀘스트 게시판을 둘러보세요." />
      ) : (
        <ol className="home-rail">
          {shown.map(t => (
            <li key={t.id} className="home-rail__item">
              <span className="home-rail__when num" data-urgent={t.urgent || t.kind === 'review' || undefined}>
                <b>{t.day === 0 ? '오늘' : '내일'}</b>
                {t.at && <span>{t.at}</span>}
              </span>
              <span className="home-rail__dot" data-kind={t.kind} aria-hidden="true" />
              <button type="button" className="home-rail__task" aria-label={t.text} onClick={() => go(t)}>
                <span className="home-rail__title">{t.title}</span>
                <span className="home-rail__what" data-kind={t.kind}>{t.what}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {more > 0 && <p className="home-more">외 {more}개 · 내 활동에서 볼 수 있어요</p>}
    </Card>
  );
}
