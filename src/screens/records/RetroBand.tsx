import { Icon } from '../../components';
import { navigate } from '../../app/router';
import type { Activity } from '../../domain/types';

/** 한 줄에 보여 줄 회고 대기 활동 수. 넘치면 '외 n개'만 회고 목록으로 간다. */
export const RETRO_SHOWN = 3;

/**
 * 회고 대기 띠(Day One: 알림을 누르면 그 활동의 회고가 바로 열린다). 활동 이름마다 버튼이라 중간 목록을 거치지 않는다.
 */
export function RetroBand({ items }: { items: Activity[] }) {
  const shown = items.slice(0, RETRO_SHOWN);
  const more = items.length - shown.length;
  return (
    <div className="rec-band" role="group" aria-label="회고 대기">
      <Icon name="pencil" size={18} />
      <span className="rec-band__lead">회고 쓰기 <b className="num">{items.length}</b></span>
      <span className="rec-band__items">
        {shown.map(a => (
          <button key={a.id} type="button" className="rec-band__item" onClick={() => navigate(`activities/records/interview/${a.id}`)}>
            {a.title}<Icon name="chevron" size={14} />
          </button>
        ))}
        {more > 0 && <button type="button" className="rec-band__item rec-band__more" onClick={() => navigate('activities/records/interview')}>{more}개 더 보기</button>}
      </span>
    </div>
  );
}
