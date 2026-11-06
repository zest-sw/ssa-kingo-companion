import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { Button, IconButton } from '../../components';
import { joinedLabel, pathLine, wrapOffset } from '../../domain/hallStage';
import type { HallEntry } from '../../data/friends';

/** 한 장이 지나가는 속도(px/초). 천천히: 카드 한 장(약 260px)이 10초쯤 */
const SPEED = 26;
/** 같은 줄을 세 번 이어 그려 끝없이 보이게 한다. 첫 줄만 키보드·스크린 리더가 읽는다 */
const COPIES = 3;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = { people: HallEntry[]; joined: Record<string, string>; onOpen: (h: HallEntry) => void };

/**
 * 전당 무대: 오른 사람 카드가 가로로 천천히 지나간다. 마우스를 올리거나 포커스하면 멈추고, 이전·다음 버튼과 방향키로 한 장씩 넘긴다.
 * 움직임 줄이기면 스스로 움직이지 않고 넘김만 된다. 순위·번호는 없다.
 */
export function HallStage({ people, joined, onOpen }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const firstSet = useRef<HTMLUListElement>(null);
  const x = useRef(0);
  const target = useRef<number | null>(null);
  const [hold, setHold] = useState(false);
  const [stopped, setStopped] = useState(reducedMotion);
  const moving = !hold && !stopped;
  const movingRef = useRef(moving);
  movingRef.current = moving;

  const setWidth = () => firstSet.current?.offsetWidth ?? 0;
  const cardStep = () => {
    const items = firstSet.current?.children;
    return items && items.length > 1 ? (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft : 0;
  };
  const paint = useCallback(() => {
    if (track.current) track.current.style.transform = `translateX(${-wrapOffset(x.current, setWidth())}px)`;
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (target.current !== null) {
        const d = target.current - x.current;
        x.current = Math.abs(d) < 0.5 ? target.current : x.current + d * Math.min(1, dt * 10);
        if (x.current === target.current) target.current = null;
      } else if (movingRef.current) {
        x.current += SPEED * dt;
      }
      paint();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paint]);

  const step = (dir: 1 | -1) => {
    const s = cardStep();
    if (!s) return;
    const base = target.current ?? x.current;
    const next = Math.round(base / s) * s + dir * s;
    if (reducedMotion()) { x.current = next; target.current = null; paint(); } else target.current = next;
  };

  // 포커스한 카드가 무대 가운데 오게(첫 줄 안의 위치로)
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('.hall-card')?.parentElement;
    if (!li) return;
    setHold(true);
    if (!li || !viewport.current) return;
    const goal = li.offsetLeft - (viewport.current.clientWidth - li.offsetWidth) / 2;
    const set = setWidth();
    const from = wrapOffset(x.current, set);
    x.current = from;
    target.current = from + ((((goal - from) % set) + set * 1.5) % set) - set / 2;
  };
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  };

  const card = (h: HallEntry, live: boolean) => (
    <li key={h.id}>
      <button type="button" className="hall-card" aria-haspopup="dialog" tabIndex={live ? 0 : -1} onClick={() => onOpen(h)}>
        <span className="hall-card__who">
          <span className="hall-card__avatar" aria-hidden="true">{h.name.slice(0, 1)}</span>
          <span className="hall-card__name">{h.name}<span>{h.dept} · {h.year}학년</span></span>
        </span>
        <span className="hall-card__path">{pathLine(h.path)}</span>
        <span className="hall-card__quote">“{h.retro ?? h.reason}”</span>
        {joinedLabel(joined[h.id]) && <span className="hall-card__when">{joinedLabel(joined[h.id])}</span>}
      </button>
    </li>
  );

  return (
    <div className="hall-stage" data-fill data-moving={moving || undefined}>
      {/* data-allow-marquee: 행렬은 일부러 칸 밖으로 이어져 가로로 잘린다(검사는 세로 잘림만 본다) */}
      <div
        data-allow-marquee
        ref={viewport}
        className="hall-stage__viewport"
        role="region"
        aria-roledescription="회전 목록"
        aria-label="전당에 오른 학생, 오른 날짜순. 방향키로 넘겨요"
        // 화면이 바뀌며 포인터 아래에 놓인 것만으로는 멈추지 않게, 실제로 움직였을 때 멈춘다
        onMouseMove={() => { if (!hold) setHold(true); }}
        onMouseLeave={() => { if (!viewport.current?.contains(document.activeElement)) setHold(false); }}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKey}
        // 포커스할 때 브라우저가 칸을 가로로 스크롤하면 행렬 위치와 어긋난다. 위치는 transform 만 맡는다.
        onScroll={e => { e.currentTarget.scrollLeft = 0; }}
      >
        <div ref={track} className="hall-stage__track">
          {Array.from({ length: COPIES }, (_, i) => (
            <ul key={i} ref={i === 0 ? firstSet : undefined} className="hall-stage__set" aria-hidden={i > 0 || undefined}>
              {people.map(h => card(h, i === 0))}
            </ul>
          ))}
        </div>
      </div>
      <div className="hall-stage__controls">
        <IconButton icon="back" label="앞 사람" onClick={() => step(-1)} />
        <Button size="sm" variant="ghost" aria-pressed={stopped} onClick={() => setStopped(s => !s)}>{stopped ? '다시 지나가게' : '멈추기'}</Button>
        <IconButton icon="chevron" label="다음 사람" onClick={() => step(1)} />
      </div>
    </div>
  );
}
