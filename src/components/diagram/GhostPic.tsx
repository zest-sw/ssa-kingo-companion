import type { ReactNode } from 'react';

export type GhostKind = 'bars' | 'grid' | 'timeline' | 'network' | 'rows';

type Props = {
  /** 그림 모양. 데이터가 생기면 들어설 그림과 같은 꼴이다 */
  kind: GhostKind;
  /** 축 이름(분야 묶음, 학기 등). 값이 아니라 틀의 이름이라 그대로 보여 준다 */
  labels?: string[];
  /** 열 이름(grid 의 위쪽 축) */
  cols?: string[];
  /** 틀 가운데 놓을 다음 행동 한 줄. 요약 카드처럼 아래 문장이 따로 있으면 비운다 */
  message?: ReactNode;
};

const ROWS = 3;
const POINTS = [0.12, 0.38, 0.62, 0.86];

/**
 * 아직 데이터가 없을 때의 그림 틀(첫 사용 상태). 축·칸을 옅은 점선 윤곽으로만 그리고 값은 그리지 않는다.
 * 속이 찬 회색 막대는 로딩 뼈대로 보여 쓰지 않는다(LoadingState 와 모양이 달라야 한다). 스크린 리더에는 message 만 읽힌다.
 */
export function GhostPic({ kind, labels = [], cols = [], message }: Props) {
  const rows = labels.length ? labels : Array.from({ length: ROWS }, () => '');
  return (
    <div className={`ui-ghost ui-ghost--${kind}`}>
      <div className="ui-ghost__pic" aria-hidden="true">
        {kind === 'bars' && rows.map((l, i) => (
          <span key={i} className="ui-ghost__bar"><span className="ui-ghost__label">{l}</span><span className="ui-ghost__track" /></span>
        ))}
        {kind === 'rows' && rows.map((l, i) => (
          <span key={i} className="ui-ghost__row"><span className="ui-ghost__dot" /><span className="ui-ghost__line">{l}</span></span>
        ))}
        {kind === 'grid' && (
          <span className="ui-ghost__grid" style={{ gridTemplateColumns: `auto repeat(${Math.max(1, cols.length || 3)}, minmax(0, 1fr))` }}>
            <span />
            {(cols.length ? cols : ['', '', '']).map((c, i) => <span key={`c${i}`} className="ui-ghost__col">{c}</span>)}
            {rows.map((l, r) => [
              <span key={`l${r}`} className="ui-ghost__label">{l}</span>,
              ...(cols.length ? cols : ['', '', '']).map((_, c) => <span key={`${r}-${c}`} className="ui-ghost__cell" />)
            ])}
          </span>
        )}
        {kind === 'timeline' && (
          <span className="ui-ghost__axis">
            {(labels.length ? labels : ['', '', '', '']).map((l, i) => <span key={i} className="ui-ghost__tick">{l}</span>)}
          </span>
        )}
        {kind === 'network' && (
          <svg className="ui-ghost__net" viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet">
            {POINTS.slice(1).map((x, i) => <line key={i} x1={POINTS[i] * 100} y1={i % 2 ? 28 : 12} x2={x * 100} y2={i % 2 ? 12 : 28} />)}
            {POINTS.map((x, i) => <circle key={i} cx={x * 100} cy={i % 2 ? 28 : 12} r="3.2" />)}
          </svg>
        )}
      </div>
      {message && <p className="ui-ghost__msg">{message}</p>}
    </div>
  );
}
