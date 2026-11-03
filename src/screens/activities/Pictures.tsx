import { ddayText } from '../../domain/text';
import type { RecordGrid } from './visual';
import type { MiniGantt, StatusBar, Week } from './visual';

// 내 활동 요약의 그림. 모든 표시는 그 학생의 활동·기록이고 이름표는 그림 안에 직접 붙인다.

/** 할 것·하는 중·끝난 것 상태 막대(라벨 + 개수). 길이는 가장 큰 칸 기준의 개수 비교다. */
export function StatusBarsPic({ bars }: { bars: StatusBar[] }) {
  const max = Math.max(1, ...bars.map(b => b.count));
  return (
    <ul className="act-sb" aria-label="상태별 활동 수">
      {bars.map(b => (
        <li key={b.id} className="act-sb__row">
          <span className="act-sb__label">{b.label}</span>
          <span className="act-sb__track"><span className={`act-sb__bar act-sb__bar--${b.id}`} style={{ width: `${(b.count / max) * 100}%` }} /></span>
          <b className="act-sb__n num">{b.count}</b>
        </li>
      ))}
    </ul>
  );
}

/** 이번 주 7일 타임라인. 마감 점은 눌러서 그 활동 서랍을 연다(요약 카드가 아니라 이 칸의 행동이다). */
export function WeekPic({ week, onOpen }: { week: Week; onOpen: (id: string) => void }) {
  return (
    <div className="act-wk">
      <div className="act-wk__days" aria-hidden="true">
        {week.days.map(d => <span key={d.offset} className={`act-wk__day${d.today ? ' is-today' : ''}`}>{d.label}</span>)}
      </div>
      <div className="act-wk__axis">
        {week.days.map(d => <span key={d.offset} className="act-wk__tick" style={{ left: `${((d.offset + 0.5) / week.days.length) * 100}%` }} />)}
        {week.dues.map((d, i) => (
          <button
            key={d.id}
            type="button"
            className={`act-wk__due${i % 2 ? ' is-low' : ''}${d.dday > 3 ? ' is-right' : ''}`}
            style={{ left: `${((d.dday + 0.5) / week.days.length) * 100}%` }}
            aria-label={`${d.title}, ${ddayText(d.dday)}`}
            onClick={() => onOpen(d.id)}
          >
            <span className="act-wk__dot" />
            <span className="act-wk__name">{d.title}<b className="num"> {ddayText(d.dday)}</b></span>
          </button>
        ))}
      </div>
    </div>
  );
}

const STATE_CLASS = { active: 'is-active', prep: 'is-prep', done: 'is-done' } as const;

/** 학기 전체 길이 위의 축소 간트 3줄. 오늘 선과 활동 이름. */
export function MiniGanttPic({ gantt }: { gantt: MiniGantt }) {
  if (gantt.bars.length === 0) return <p className="act-mg__none">날짜가 정해지면 막대로 보여요.</p>;
  return (
    <ul className="act-mg" aria-label="학기 일정 막대">
      {gantt.bars.map(b => (
        <li key={b.id} className="act-mg__row">
          <span className="act-mg__name">{b.label}</span>
          <span className="act-mg__track">
            <span className={`act-mg__bar ${STATE_CLASS[b.state]} an-g--${b.tone ?? 'other'}`} style={{ left: `${b.left * 100}%`, width: `${b.width * 100}%` }} />
            <span className="act-mg__today" style={{ left: `${gantt.today * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

const DOTS_MAX = 4;

/** 학기(열) × 분야(행) 점 격자. 한 칸의 점 수 = 그 학기 그 분야의 기록 수. */
export function RecordGridPic({ grid }: { grid: RecordGrid }) {
  return (
    <div className="act-rg" role="img" aria-label="학기별 분야별 기록 수" style={{ gridTemplateColumns: `max-content repeat(${grid.semesters.length}, minmax(0, 1fr))` }}>
      <span />
      {grid.semesters.map(s => <span key={s.id} className="act-rg__col">{s.label}</span>)}
      {grid.rows.map(r => (
        <span key={r.group} className={`act-rg__row an-g--${r.group}`}>
          <span className="act-rg__name">{r.label}</span>
          {r.counts.map((n, i) => (
            <span key={i} className="act-rg__cell">
              {n === 0 ? <span className="act-rg__dot is-empty" /> : Array.from({ length: Math.min(n, DOTS_MAX) }, (_, k) => <span key={k} className="act-rg__dot" />)}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
