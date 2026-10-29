/** 진행도 막대. 활동 횟수·준비 진행도에만 쓴다(점수·완성률 아님). 폭은 부모를 따른다. */
export function ProgressBar({ value, max, label, showText }: { value: number; max: number; label: string; showText?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="ui-progress">
      <div className="ui-progress__track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${value} / ${max}`}>
        <span className="ui-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      {showText && <span className="ui-progress__text num">{value} / {max}</span>}
    </div>
  );
}
