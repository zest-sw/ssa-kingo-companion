import './activities.css';

export type DashedKind = 'status' | 'week' | 'retro' | 'list' | 'map';

/**
 * 첫 사용 빈 상태의 그림 틀. 그 칸에 데이터가 생기면 들어설 모양을 옅은 점선 윤곽으로만 보여 준다.
 * 속이 찬 회색 막대(로딩 뼈대)를 쓰지 않으려고 공용 GhostPic 대신 쓴다. EmptyState 의 pic 자리에 넣는다.
 * 축 이름(labels, cols)은 값이 아니라 틀의 이름이다.
 */
export function DashedPic({ kind, labels = [], cols = [] }: { kind: DashedKind; labels?: string[]; cols?: string[] }) {
  return (
    <div className={`dp dp--${kind}`} aria-hidden="true">
      {kind === 'status' && labels.map(l => (
        <span key={l} className="dp__bar"><span className="dp__label">{l}</span><span className="dp__track" /></span>
      ))}
      {kind === 'week' && (
        <>
          <span className="dp__days">{labels.map((l, i) => <span key={i}>{l}</span>)}</span>
          <span className="dp__axis"><span className="dp__ring" style={{ left: '28%' }} /><span className="dp__ring" style={{ left: '71%' }} /></span>
        </>
      )}
      {kind === 'retro' && (
        <span className="dp__retro"><span className="dp__ring" /><span className="dp__lines"><span className="dp__line" /><span className="dp__line dp__line--short" /></span></span>
      )}
      {kind === 'list' && [0, 1, 2].map(i => (
        <span key={i} className="dp__item"><span className="dp__ring" /><span className="dp__line" /><span className="dp__pill" /></span>
      ))}
      {kind === 'map' && (
        <span className="dp__map" style={{ gridTemplateColumns: `auto repeat(${cols.length}, minmax(0, 1fr))` }}>
          <span />
          {cols.map(c => <span key={c} className="dp__col">{c}</span>)}
          {labels.map(l => [
            <span key={l} className="dp__label">{l}</span>,
            ...cols.map(c => <span key={`${l}-${c}`} className="dp__cell" />)
          ])}
        </span>
      )}
    </div>
  );
}
