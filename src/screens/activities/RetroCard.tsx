import { navigate } from '../../app/router';
import { Button, Card, EmptyState, FieldTag, GhostPic, Icon } from '../../components';
import type { Activity } from '../../domain/types';
import { goInterview } from './ActivityCard';
import { endedText } from './week';

/** 한눈에서 이름을 보여 줄 회고 대기 수. 넘치면 'n개 더 보기'가 회고 목록으로 간다. */
const SHOWN = 4;

/**
 * 회고 대기. 가장 오래 기다린 활동 하나만 '회고 쓰기' 주 버튼을 두고, 나머지는 줄 전체가 그 활동의 회고로 간다(Day One).
 * 줄마다 같은 버튼 글자를 되풀이하지 않고 끝에 작은 화살표 아이콘 하나만 둔다.
 */
export function RetroCard({ queue, hasActivities }: { queue: Activity[]; hasActivities: boolean }) {
  if (queue.length === 0) {
    return (
      <Card className="os-card act-retro" title="회고 대기" data-fill>
        <EmptyState pic={<GhostPic kind="rows" labels={['', '']} />} message={hasActivities ? '하는 활동이 끝나면 여기서 회고를 써요.' : '활동이 끝나면 여기서 회고를 써요.'} />
      </Card>
    );
  }
  const [first, ...rest] = queue;
  const shown = rest.slice(0, SHOWN - 1);
  const more = rest.length - shown.length;
  return (
    <Card className="os-card act-retro" title={`회고를 기다리는 활동 ${queue.length}개`} data-fill>
      <div className="act-retro__first">
        <FieldTag field={first.field} />
        <p className="act-retro__title">{first.title}</p>
        <p className="act-retro__when">{endedText(first)}</p>
        <Button variant="primary" aria-label={`${first.title} 회고 쓰기`} onClick={() => goInterview(first.id)}>회고 쓰기</Button>
      </div>
      {shown.length > 0 && (
        <ul className="act-retro__list">
          {shown.map(a => (
            <li key={a.id}>
              <button type="button" className="act-retro__item" aria-label={`${a.title} 회고 쓰기`} onClick={() => goInterview(a.id)}>
                <span className="act-retro__name">{a.title}<small>{endedText(a)}</small></span>
                <Icon name="chevron" size={16} />
              </button>
            </li>
          ))}
          {more > 0 && <li><button type="button" className="act-retro__item act-retro__more" onClick={() => navigate('activities/records/interview')}>{more}개 더 보기</button></li>}
        </ul>
      )}
    </Card>
  );
}
