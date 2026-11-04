import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { semesterLabel } from '../../domain/analysis/semester';

type Which = 'from' | 'to';

/**
 * 보여 줄 학기 구간: 막대 하나에 양 끝 손잡이 둘. 손잡이는 각각 슬라이더라 화살표·Home·End 로 움직이고, 끌어서도 옮긴다.
 * 막대를 누르면 가까운 손잡이가 그 학기로 온다.
 */
export function RangePicker({ axis, from, to, onMove }: { axis: string[]; from: number; to: number; onMove: (which: Which, v: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef<Which | null>(null);
  const last = axis.length - 1;
  const at = (i: number) => `${last > 0 ? (i / last) * 100 : 0}%`;

  const indexAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * last);
  };
  const nearest = (i: number): Which => (Math.abs(i - from) < Math.abs(i - to) || (i < from) ? 'from' : 'to');

  const down = (e: PointerEvent<HTMLDivElement>) => {
    const i = indexAt(e.clientX);
    const which = (e.target as HTMLElement).dataset.which as Which | undefined ?? nearest(i);
    dragging.current = which;
    track.current?.setPointerCapture(e.pointerId);
    onMove(which, i);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => { if (dragging.current) onMove(dragging.current, indexAt(e.clientX)); };
  const up = () => { dragging.current = null; };

  const key = (which: Which, value: number) => (e: KeyboardEvent) => {
    const next = { ArrowLeft: value - 1, ArrowDown: value - 1, ArrowRight: value + 1, ArrowUp: value + 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onMove(which, Math.min(last, Math.max(0, next)));
  };

  const thumb = (which: Which, value: number, label: string) => (
    <span
      role="slider" tabIndex={0} data-which={which} className="an-range__thumb" style={{ left: at(value) }}
      aria-label={label} aria-valuemin={0} aria-valuemax={last} aria-valuenow={value} aria-valuetext={semesterLabel(axis[value])}
      onKeyDown={key(which, value)}
    />
  );

  return (
    <div className="an-range">
      <p className="an-range__head"><span>보는 구간</span><b>{semesterLabel(axis[from])}{from !== to && ` ~ ${semesterLabel(axis[to])}`}</b></p>
      <div ref={track} className="an-range__track" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <span className="an-range__rail" aria-hidden="true" />
        <span className="an-range__sel" aria-hidden="true" style={{ left: at(from), width: `calc(${at(to)} - ${at(from)})` }} />
        {thumb('from', from, '시작 학기')}
        {thumb('to', to, '끝 학기')}
      </div>
      <p className="an-range__ends" aria-hidden="true"><span>{semesterLabel(axis[0])}</span><span>{semesterLabel(axis[last])}</span></p>
    </div>
  );
}
