import { navigate } from '../../app/router';
import type { Activity } from '../../domain/types';

/** 한 줄에 보여 줄 회고 대기 활동 수. 넘치면 'n개 더 보기'만 회고 목록으로 간다. */
export const RETRO_SHOWN = 3;

/**
 * 회고 대기 한 줄(Day One: 이름을 누르면 그 활동의 회고가 바로 열린다). 기록 지도보다 옅게 둔다:
 * 테두리·아이콘·화살표 없이 작은 회색 글과 밑줄 이름만. 주인공은 아래 기록 지도다.
 */
export function RetroBand({ items }: { items: Activity[] }) {
  const shown = items.slice(0, RETRO_SHOWN);
  const more = items.length - shown.length;
  return (
    <div className="rec-band" role="group" aria-label="회고 대기">
      <span className="rec-band__lead">회고 대기 <b className="num">{items.length}</b></span>
      {shown.map(a => (
        <button key={a.id} type="button" className="rec-band__item" aria-label={`${a.title} 회고 쓰기`} onClick={() => navigate(`activities/records/interview/${a.id}`)}>{a.title}</button>
      ))}
      {more > 0 && <button type="button" className="rec-band__item rec-band__more" onClick={() => navigate('activities/records/interview')}>{more}개 더 보기</button>}
    </div>
  );
}
