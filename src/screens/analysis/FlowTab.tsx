import { useMemo, useState } from 'react';
import { navigate } from '../../app/router';
import { Button, Card, Drawer, EmptyState } from '../../components';
import { buildFlow, summarizeFlow, type FlowSegment } from '../../domain/analysis/flow';
import { semesterAxis, semesterLabel } from '../../domain/analysis/semester';
import { TREE_GROUPS } from '../../domain/analysis/techtree';
import type { FieldGroup, RecordItem } from '../../domain/types';
import { GROUP_LABEL } from '../../domain/vocab';
import { SEMESTER_FROM, SEMESTER_NOW } from '../../data/analysis';
import { RecordSummary } from './RecordSummary';

const pct = (share: number) => `${Math.round(share * 100)}%`;
type Pick = { semester: string; segment: FlowSegment };

export default function FlowTab({ records }: { records: RecordItem[] }) {
  const axis = useMemo(() => semesterAxis(records, SEMESTER_FROM, SEMESTER_NOW), [records]);
  const rows = useMemo(() => buildFlow(records, axis), [records, axis]);
  const last = axis.length - 1;
  const [range, setRange] = useState<[number, number]>([0, last]);
  const [from, to] = [Math.min(range[0], last), Math.min(range[1], last)];
  const [pick, setPick] = useState<Pick | null>(null);
  const summary = summarizeFlow(rows, from, to);
  const inRange = (i: number) => i >= from && i <= to;

  if (records.length === 0) {
    return <Card><EmptyState icon="analysis" title="아직 기록이 없어요" message="회고를 쓰면 학기마다 어떤 분야에 시간을 썼는지 보여 줘요." action={<Button variant="primary" onClick={() => navigate('records')}>회고 쓰러 가기</Button>} /></Card>;
  }

  return (
    <div className="an-flow">
      <Card title="학기별 분야 비율">
        <ol className="an-flow__rows">
          {rows.map((r, i) => (
            <li key={r.semester} className={`an-flow__row${inRange(i) ? '' : ' is-out'}`}>
              <span className="an-flow__sem">{semesterLabel(r.semester)}</span>
              {r.total === 0 ? (
                <span className="an-flow__track an-flow__track--empty" role="img" aria-label={`${semesterLabel(r.semester)}: 기록이 없는 학기예요`}></span>
              ) : (
                <span className="an-flow__track">
                  {r.segments.map(s => (
                    <button
                      key={s.group}
                      type="button"
                      disabled={!inRange(i)}
                      className={`an-flow__seg an-g--${s.group}`}
                      style={{ flexGrow: s.count }}
                      aria-label={`${semesterLabel(r.semester)} ${GROUP_LABEL[s.group]} ${s.count}개, ${pct(s.share)}. 활동 목록 보기`}
                      onClick={() => setPick({ semester: r.semester, segment: s })}
                    >
                      <span className="num">{s.count}</span>
                    </button>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ol>
        <Legend groups={TREE_GROUPS.filter(g => records.some(r => rows.some(w => w.segments.some(s => s.group === g))))} />
        {rows.some(r => r.total === 0) && <p className="an-note">비어 있는 칸은 기록이 없는 학기예요. 쉬어 간 학기도 흐름의 일부예요.</p>}
        <div className="an-range">
          <label>시작 학기 <b>{semesterLabel(axis[from])}</b>
            <input type="range" min={0} max={last} value={from} onChange={e => setRange([Number(e.target.value), Math.max(Number(e.target.value), to)])} aria-valuetext={semesterLabel(axis[from])} />
          </label>
          <label>끝 학기 <b>{semesterLabel(axis[to])}</b>
            <input type="range" min={0} max={last} value={to} onChange={e => setRange([Math.min(from, Number(e.target.value)), Number(e.target.value)])} aria-valuetext={semesterLabel(axis[to])} />
          </label>
        </div>
      </Card>

      <Card title="고른 구간" tone="alt" padding="md">
        <p className="an-muted">{semesterLabel(axis[from])}{from !== to && ` ~ ${semesterLabel(axis[to])}`}</p>
        {summary.total === 0 ? (
          <p className="an-muted an-flow__none">이 구간에는 기록이 없어요. 다른 학기를 골라 보세요.</p>
        ) : (
          <>
            <span className="an-flow__track an-flow__track--sum" role="img" aria-label={summary.segments.map(s => `${GROUP_LABEL[s.group]} ${pct(s.share)}`).join(', ')}>
              {summary.segments.map(s => <span key={s.group} className={`an-flow__fill an-g--${s.group}`} style={{ flexGrow: s.count }} />)}
            </span>
            <ul className="an-sumlist">
              {summary.segments.map(s => (
                <li key={s.group} className={`an-g--${s.group}`}><span className="an-sumlist__dot" aria-hidden="true" />{GROUP_LABEL[s.group]}<b className="num">{pct(s.share)}</b></li>
              ))}
            </ul>
            <p className="an-muted">기록 <b className="num">{summary.total}</b>개를 모았어요.</p>
          </>
        )}
      </Card>

      <Drawer open={!!pick} onClose={() => setPick(null)} eyebrow={pick ? semesterLabel(pick.semester) : undefined} title={pick ? `${GROUP_LABEL[pick.segment.group]} 활동` : ''}>
        <div className="an-stack">{pick?.segment.recordIds.map(id => records.find(r => r.id === id)).map(r => r && <RecordSummary key={r.id} record={r} />)}</div>
      </Drawer>
    </div>
  );
}

function Legend({ groups }: { groups: FieldGroup[] }) {
  return (
    <ul className="an-legend" aria-label="분야 색">
      {groups.map(g => <li key={g} className={`an-g--${g}`}><span className="an-sumlist__dot" aria-hidden="true" />{GROUP_LABEL[g]}</li>)}
    </ul>
  );
}
