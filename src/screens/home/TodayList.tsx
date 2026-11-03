import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Badge, Card, EmptyState, Icon } from '../../components';
import type { TodayTask } from '../../domain/recommend-flow/summary';

/** 오늘 할 일: 한 줄씩. 누르면 그 일을 하는 화면(회고 인터뷰, 신청 준비)이나 서랍으로 간다. */
export function TodayList({ tasks }: { tasks: TodayTask[] }) {
  const go = (t: TodayTask) => ('path' in t.target ? navigate(t.target.path) : openEntity(t.target));
  return (
    <Card title="오늘 할 일" className="home-today">
      {tasks.length === 0 ? (
        <EmptyState icon="check" message="오늘 할 일은 다 했어요. 아래 추천을 살펴보세요." />
      ) : (
        <ul className="home-today__list">
          {tasks.map(t => (
            <li key={t.id}>
              <button type="button" className="home-task" onClick={() => go(t)}>
                <span className="home-task__text">{t.text}</span>
                {t.badge && <Badge tone={t.urgent || t.kind === 'review' ? 'orange' : 'neutral'}>{t.badge}</Badge>}
                <span className="home-task__arrow" aria-hidden="true"><Icon name="chevron" size={16} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
