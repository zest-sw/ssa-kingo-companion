import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Card, EmptyState } from '../../components';
import { timelineOrder, type TodayTask } from '../../domain/recommend-flow/summary';

/** 오늘 할 일: 가까운 날·이른 시각 순의 세로 타임라인. 점 하나가 한 일이고, 이름과 무슨 일인지만 짧게 붙인다. 누르면 그 일을 하는 화면이나 서랍으로 간다. */
export function TodayList({ tasks }: { tasks: TodayTask[] }) {
  const go = (t: TodayTask) => ('path' in t.target ? navigate(t.target.path) : openEntity(t.target));
  return (
    <Card title="오늘 할 일" className="home-today">
      {tasks.length === 0 ? (
        <EmptyState icon="check" message="오늘 할 일은 다 했어요. 오른쪽 추천을 살펴보세요." />
      ) : (
        <ol className="home-rail">
          {timelineOrder(tasks).map(t => (
            <li key={t.id} className="home-rail__item">
              <span className="home-rail__when num" data-urgent={t.urgent || t.kind === 'review' || undefined}>
                <b>{t.day === 0 ? '오늘' : `D-${t.day}`}</b>
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
    </Card>
  );
}
