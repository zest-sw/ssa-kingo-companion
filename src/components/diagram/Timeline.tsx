import type { ReactNode } from 'react';
import { DateAxis, pct, TodayLine } from './Axis';
import { assignLanes, clamp01, dateLabel, edgeAlign, fractionOf, groupIndices, spreadPoints, textWidth, type DateRange } from './geometry';
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
  /** 한 활동 묶음. 같은 값인 점들(예: 그 활동의 마감 ◆와 활동 날짜 ●)은 한 줄에 놓고 이름표는 하나만 붙인다 */
  group?: string;
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
  // 한 활동 묶음(group)은 한 줄에 표식 여럿 + 이름표 하나. 구간(막대)은 늘 혼자다.
  const dx = shown.map(() => 0);
  const units = groupIndices(shown.length, i => (shown[i].it.end ? undefined : shown[i].it.group)).map(idx => {
    const first = shown[idx[0]];
    if (first.it.end) return { idx, span: { from: first.x0 * width, to: first.x1 * width } };
    const order = [...idx].sort((a, b) => shown[a].x0 - shown[b].x0);
    const moved = spreadPoints(order.map(i => shown[i].x0 * width), half * 2);
    order.forEach((i, k) => { dx[i] = moved[k]; });
    const lo = order[0], hi = order[order.length - 1];
    const loX = shown[lo].x0 * width + dx[lo], hiX = shown[hi].x0 * width + dx[hi];
    // 이름표는 묶음에서 이름이 있는 마지막 표식의 이름. 오른쪽 끝 표식 옆에 붙이고, 넘치면 왼쪽 끝 표식 앞에 붙인다.
    const named = [...order].reverse().find(i => shown[i].it.short ?? shown[i].it.label);
    const text = labels && named !== undefined ? (shown[named].it.short ?? shown[named].it.label) : '';
    const w = text ? Math.min(LABEL_MAX, textWidth(text, LABEL_PX)) : 0;
    const start = w > 0 && hiX + half + LABEL_GAP + w > width;
    const span = start ? { from: loX - LABEL_GAP - w, to: hiX + half } : { from: loX - half, to: hiX + (w ? LABEL_GAP + w : half) };
    // 묶음의 첫 표식과 끝 표식을 잇는 선(한 활동이라는 표시). 표식이 하나면 없다.
    const link = lo !== hi ? { from: lo, to: hi } : undefined;
    return { idx, span, link, tag: text && named !== undefined ? { text, start, anchor: start ? lo : hi, id: shown[named].it.id } : undefined };
  });
  const unitLanes = assignLanes(units.map(u => u.span), 4);
  const laneCount = Math.max(1, ...unitLanes.map(l => l + 1));
  const leftOf = (i: number) => (dx[i] ? `calc(${pct(shown[i].x0)} + ${dx[i].toFixed(1)}px)` : pct(shown[i].x0));

  return (
    <div className="ui-dg ui-dg-tl" role="group" aria-label={label}>
      <div ref={ref} className="ui-dg-tl__track" style={shown.length ? { height: `calc(var(--dg-lane-h) * ${laneCount})` } : undefined}>
        {/* 비었을 때는 문장이 주인공이라 오늘 선을 긋지 않는다(글자를 가로지르지 않게) */}
        {shown.length > 0 && <TodayLine range={range} today={today} />}
        {shown.length === 0 && <p className="ui-dg-empty ui-dg-empty--block">{empty}</p>}
        {units.map((u, n) => {
          const top = `calc(var(--dg-lane-h) * ${unitLanes[n]})`;
          return (
            <span key={shown[u.idx[0]].it.id} className="ui-dg-tl__slot">
              {u.link && <span className="ui-dg-tl__link" aria-hidden="true" style={{ left: leftOf(u.link.from), width: `calc(${leftOf(u.link.to)} - ${leftOf(u.link.from)})`, top }} />}
              {u.idx.map(i => {
                const { it, x0, x1 } = shown[i];
                const value = `${it.label}, ${valueOf(it)}`;
                const common = {
                  label: value, tip: it.tip ?? `${it.label} · ${valueOf(it)}`, tipAlign: edgeAlign(it.end ? (x0 + x1) / 2 : x0),
                  onSelect: () => onSelect(it.id), selected: selectedId === undefined ? undefined : selectedId === it.id
                };
                return it.end
                  ? <Piece key={it.id} {...common} className={`ui-dg-tl__span ${toneClass(it.tone)}`} style={{ left: pct(x0), width: pct(x1 - x0), top }} />
                  : <Piece key={it.id} {...common} className={`ui-dg-tl__pt ui-dg-mark--${it.mark ?? 'dot'} ${toneClass(it.tone)}`} style={{ left: leftOf(i), top }} />;
              })}
              {u.tag && (
                // 마우스로 이름을 눌러도 같은 일을 한다. 키보드·스크린 리더는 표식(버튼)이 맡아 이름은 숨긴다.
                <span className="ui-dg-tl__label" data-side={u.tag.start ? 'start' : 'end'} style={{ left: leftOf(u.tag.anchor), top }} aria-hidden="true" onClick={() => onSelect(u.tag!.id)}>{u.tag.text}</span>
              )}
            </span>
          );
        })}
      </div>
      <DateAxis range={range} width={width} />
    </div>
  );
}
