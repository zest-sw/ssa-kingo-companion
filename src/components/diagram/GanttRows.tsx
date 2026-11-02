import type { ReactNode } from 'react';
import { DateAxis, pct, TodayLine } from './Axis';
import { clamp01, dateLabel, edgeAlign, fractionOf, inRange, type DateRange } from './geometry';
import { Piece, toneClass, type DiagramTone } from './Piece';
import { useWidth } from './useWidth';

/** 막대 모양으로 상태를 말한다: 준비=빗금, 진행=채움, 끝=옅음. 색은 분야. */
export type GanttState = 'prep' | 'active' | 'done';
export const GANTT_STATE_LABEL: Record<GanttState, string> = { prep: '준비', active: '진행', done: '끝' };

export type GanttRow = {
  id: string;
  label: string;
  /** 'YYYY-MM-DD'. 막대 기간 */
  start: string;
  end: string;
  state: GanttState;
  tone?: DiagramTone;
  /** 신청 마감(◆) */
  deadline?: string;
  /** 결과 발표(○) */
  result?: string;
};

export type GanttPart = 'bar' | 'deadline' | 'result';

type Props = {
  label: string;
  range: DateRange;
  today?: string;
  rows: GanttRow[];
  onSelect: (id: string, part: GanttPart) => void;
  empty: ReactNode;
  selectedId?: string;
};

/** 행마다 기간 막대 하나와 마감 ◆·발표 ○. 범위를 벗어난 막대는 가장자리에서 자른다. */
export function GanttRows({ label, range, today, rows, onSelect, empty, selectedId }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    <div className="ui-dg ui-dg-gantt" role="group" aria-label={label}>
      {rows.length === 0 && <p className="ui-dg-empty ui-dg-empty--block">{empty}</p>}
      {rows.map(r => {
        const x0 = fractionOf(r.start, range);
        const x1 = fractionOf(r.end, range);
        const barShown = x1 >= 0 && x0 <= 1;
        const a = clamp01(x0);
        const b = clamp01(x1);
        const sel = selectedId === undefined ? undefined : selectedId === r.id;
        const marker = (part: 'deadline' | 'result', date: string | undefined) => {
          if (!date) return null;
          const x = fractionOf(date, range);
          if (!inRange(x)) return null;
          const what = part === 'deadline' ? '신청 마감' : '결과 발표';
          return (
            <Piece
              key={part} label={`${r.label}, ${what} ${dateLabel(date)}`} tip={`${what} · ${dateLabel(date)}`} tipAlign={edgeAlign(x)}
              className={`ui-dg-gantt__mark ui-dg-mark--${part === 'deadline' ? 'diamond' : 'circle'} ${toneClass('ink')}`} style={{ left: pct(x) }}
              onSelect={() => onSelect(r.id, part)}
            />
          );
        };
        const period = `${dateLabel(r.start)} ~ ${dateLabel(r.end)}`;
        return (
          <div key={r.id} className="ui-dg-gantt__row">
            <span className="ui-dg-gantt__label" title={r.label}>{r.label}</span>
            <div className="ui-dg-gantt__track">
              <TodayLine range={range} today={today} />
              {barShown && (
                <Piece
                  label={`${r.label}, ${GANTT_STATE_LABEL[r.state]}, ${period}`} tip={`${GANTT_STATE_LABEL[r.state]} · ${period}`} tipAlign={edgeAlign((a + b) / 2)}
                  className={`ui-dg-gantt__bar ui-dg-mark--${r.state === 'prep' ? 'hatch' : r.state === 'done' ? 'faded' : 'fill'} ${toneClass(r.tone)}`}
                  style={{ left: pct(a), width: pct(b - a) }} selected={sel}
                  onSelect={() => onSelect(r.id, 'bar')}
                />
              )}
              {marker('deadline', r.deadline)}
              {marker('result', r.result)}
            </div>
          </div>
        );
      })}
      <div className="ui-dg-gantt__row ui-dg-gantt__row--axis">
        <span />
        <div className="ui-dg-gantt__axis" ref={ref}><DateAxis range={range} width={width} /></div>
      </div>
    </div>
  );
}
