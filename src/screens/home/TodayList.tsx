import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Card, EmptyState, GhostPic } from '../../components';
import { MAX_TODAY_TASKS, timelineOrder, type TodayTask } from '../../domain/recommend-flow/summary';

/** 오늘 할 일(오늘·내일): 가까운 날·이른 시각 순의 세로 타임라인. 3개까지 그리고 나머지는 개수만. 점 하나가 한 일이고, 이름과 무슨 일인지만 짧게 붙인다. 누르면 그 일을 하는 화면이나 서랍으로 간다. */
export function TodayList({ tasks, fresh }: { tasks: TodayTask[]; fresh: boolean }) {
  const go = (t: TodayTask) => ('path' in t.target ? navigate(t.target.path) : openEntity(t.target));
  const shown = timelineOrder(tasks).slice(0, MAX_TODAY_TASKS);
  const more = tasks.length - shown.length;
  return (
    <Card title="오늘 할 일" className="home-today">
      {tasks.length === 0 && fresh ? (
        <GhostPic kind="rows" labels={['', '']} message="신청 준비를 누르면 할 일이 여기에 생겨요" />
      ) : tasks.length === 0 ? (
        <EmptyState icon="check" message="오늘·내일 할 일은 다 했어요. 오른쪽 추천을 살펴보세요." />
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
