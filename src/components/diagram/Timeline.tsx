import type { ReactNode } from 'react';
import { DateAxis, pct, TodayLine } from './Axis';
import { assignLanes, clamp01, dateLabel, edgeAlign, fractionOf, textWidth, type DateRange } from './geometry';
import { Piece, toneClass, type DiagramTone } from './Piece';
import { useWidth } from './useWidth';

export type TimelineItem = {
  id: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 있으면 구간(막대), 없으면 점 */
  end?: string;
  label: string;
  /** 점 모양: 채운 점(기본), 테두리 점, 마름모(마감) */
  mark?: 'dot' | 'ring' | 'diamond';
  tone?: DiagramTone;
  /** 툴팁 한 줄. 없으면 '이름 · 날짜' */
  tip?: string;
  /** 점 옆에 바로 붙일 짧은 이름. Timeline 의 labels 가 켜져 있을 때만 보인다(없으면 label) */
  short?: string;
};

type Props = {
  /** 그림 전체 이름(스크린 리더) */
  label: string;
  range: DateRange;
  today?: string;
  items: TimelineItem[];
  onSelect: (id: string) => void;
  /** 범위 안에 항목이 없을 때 문장. 다음 행동을 안내한다 */
  empty: ReactNode;
  selectedId?: string;
  /** 점마다 짧은 이름을 옆에 직접 붙인다. 겹치면 아래 줄로 나눈다 */
  labels?: boolean;
};

const valueOf = (it: TimelineItem) => it.end ? `${dateLabel(it.date)} ~ ${dateLabel(it.end)}` : dateLabel(it.date);

/**
 * 가로 날짜 축 위에 점·구간. 겹치는 조각은 아래 줄로 내린다. 범위 밖 항목은 그리지 않는다.
 * 위치는 % 라서 폭에 맞춰 늘고, 폭은 눈금 간격과 줄 나누기에만 쓴다.
 */
/** 라벨 칸의 글자 크기·최대 폭·점과의 간격(px). CSS 의 --dg-tl-label-* 와 같은 값이다 */
const LABEL_PX = 12;
const LABEL_MAX = 168;
const LABEL_GAP = 10;

export function Timeline({ label, range, today, items, onSelect, empty, selectedId, labels }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const shown = items
    .map(it => ({ it, x0: fractionOf(it.date, range), x1: fractionOf(it.end ?? it.date, range) }))
    .filter(({ x0, x1 }) => x1 >= 0 && x0 <= 1)
    .map(s => ({ ...s, x0: clamp01(s.x0), x1: clamp01(s.x1) }));
  // 점은 누르는 칸(32px)만큼 폭을 차지한다고 보고 줄을 나눈다.
  const half = 18;
  // 라벨은 점 오른쪽에 붙이고, 오른쪽 끝을 넘으면 왼쪽에 붙인다. 라벨 폭까지 차지한다고 보고 줄을 나눈다.
  const sides = shown.map(({ it, x0 }) => {
    const w = Math.min(LABEL_MAX, textWidth(it.short ?? it.label, LABEL_PX));
    return { w, start: x0 * width + half + LABEL_GAP + w > width };
  });
  const lanes = assignLanes(shown.map(({ it, x0, x1 }, i) => {
    if (it.end) return { from: x0 * width, to: x1 * width };
    const x = x0 * width;
    if (!labels) return { from: x - half, to: x + half };
    const { w, start } = sides[i];
    return start ? { from: x - LABEL_GAP - w, to: x + half } : { from: x - half, to: x + LABEL_GAP + w };
  }), 4);
  const laneCount = Math.max(1, ...lanes.map(l => l + 1));

  return (
    <div className="ui-dg ui-dg-tl" role="group" aria-label={label}>
      <div ref={ref} className="ui-dg-tl__track" style={shown.length ? { height: `calc(var(--dg-lane-h) * ${laneCount})` } : undefined}>
        {/* 비었을 때는 문장이 주인공이라 오늘 선을 긋지 않는다(글자를 가로지르지 않게) */}
        {shown.length > 0 && <TodayLine range={range} today={today} />}
        {shown.length === 0 && <p className="ui-dg-empty ui-dg-empty--block">{empty}</p>}
        {shown.map(({ it, x0, x1 }, i) => {
          const value = `${it.label}, ${valueOf(it)}`;
          const common = {
            label: value, tip: it.tip ?? `${it.label} · ${valueOf(it)}`, tipAlign: edgeAlign(it.end ? (x0 + x1) / 2 : x0),
            onSelect: () => onSelect(it.id), selected: selectedId === undefined ? undefined : selectedId === it.id
          };
          const top = `calc(var(--dg-lane-h) * ${lanes[i]})`;
          return it.end ? (
            <Piece key={it.id} {...common} className={`ui-dg-tl__span ${toneClass(it.tone)}`} style={{ left: pct(x0), width: pct(x1 - x0), top }} />
          ) : (
            <span key={it.id} className="ui-dg-tl__slot">
              <Piece {...common} className={`ui-dg-tl__pt ui-dg-mark--${it.mark ?? 'dot'} ${toneClass(it.tone)}`} style={{ left: pct(x0), top }} />
              {labels && (
                // 마우스로 이름을 눌러도 같은 일을 한다. 키보드·스크린 리더는 점(버튼)이 맡아 이름은 숨긴다.
                <span className="ui-dg-tl__label" data-side={sides[i].start ? 'start' : 'end'} style={{ left: pct(x0), top }} aria-hidden="true" onClick={() => onSelect(it.id)}>{it.short ?? it.label}</span>
              )}
            </span>
          );
        })}
      </div>
      <DateAxis range={range} width={width} />
    </div>
  );
}
