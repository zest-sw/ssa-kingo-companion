import { Fragment, useEffect, useMemo, useState } from 'react';
import { navigate } from '../../app/router';
import { useApp } from '../../app/AppState';
import { Button, Card, Drawer, EmptyState, GhostPic, Icon } from '../../components';
import { nextStep } from '../../domain/nextStep';
import {
  buildFlow, clampRange, defaultRange, flowCountNote, flowStory, legendGroups, moveRange, semesterPick, summarizeFlow, topGroups,
  type FlowRange, type FlowSegment
} from '../../domain/analysis/flow';
import { semesterAxis, semesterLabel } from '../../domain/analysis/semester';
import { flowHeadline } from '../../domain/analysis/visual';
import { josa } from '../../domain/text';
import type { RecordItem } from '../../domain/types';
import { GROUP_LABEL } from '../../domain/vocab';
import { SEMESTER_FROM, SEMESTER_NOW } from '../../data/analysis';
import { FlowPath } from './FlowPath';
import { RangePicker } from './RangePicker';
import { RecordSummary } from './RecordSummary';
import './flow.css';

/** 다시 보기에서 학기 한 칸을 보여 주는 시간(ms) */
const PLAY_STEP_MS = 900;
const pct = (share: number) => `${Math.round(share * 100)}%`;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function FlowTab({ records }: { records: RecordItem[] }) {
  const axis = useMemo(() => semesterAxis(records, SEMESTER_FROM, SEMESTER_NOW), [records]);
  const rows = useMemo(() => buildFlow(records, axis), [records, axis]);
  const last = axis.length - 1;
  const [range, setRange] = useState<FlowRange>(() => defaultRange(rows));
  const [from, to] = clampRange(range, last);
  // 구간 밖 학기는 그리지 않는다. 시작 학기 손잡이를 앞으로 당기면 그 학기가 다시 보인다.
  const shown = rows.slice(from, to + 1);
  const tops = topGroups(shown);
  const [playAt, setPlayAt] = useState<number | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [sumOpen, setSumOpen] = useState(false);
  const step = nextStep(useApp().state.activities);

  // Hero's Path: 학기를 한 칸씩 채우고, 끝 학기에서 잠깐 멈춘 뒤 전체 그림으로 돌아온다.
  useEffect(() => {
    if (playAt === null) return;
    const end = playAt >= shown.length - 1;
    const t = setTimeout(() => setPlayAt(end ? null : playAt + 1), end ? PLAY_STEP_MS * 2 : PLAY_STEP_MS);
    return () => clearTimeout(t);
  }, [playAt, shown.length]);

  if (records.length === 0) {
    return <Card><EmptyState pic={<GhostPic kind="bars" labels={[semesterLabel(SEMESTER_NOW)]} />} message={`${step.lead} 학기마다 어떤 분야를 했는지 보여요.`} action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>} /></Card>;
  }

  const story = flowStory(shown);
  const playing = playAt !== null;
  const play = () => setPlayAt(playing || reducedMotion() ? null : 0);
  const now = playAt !== null ? shown[playAt] : undefined;
  const nowPick = now && playAt !== null ? semesterPick(now, tops[playAt], records) : undefined;
  const picked = pick !== null ? shown[pick] : undefined;
  const summary = summarizeFlow(rows, from, to);

  return (
    <div className="fl">
      <Card
        title={flowHeadline(shown)} className="os-card fl-card"
        action={<>
          <Button size="sm" onClick={play} aria-pressed={playing}>{playing ? '멈추기' : '처음부터 보기'}</Button>
          <Button size="sm" variant="ghost" icon="chevron" aria-haspopup="dialog" onClick={() => setSumOpen(true)}>고른 구간 비율</Button>
        </>}
      >
        <div className="fl-intro">
          <ol className="fl-story" aria-label="학기 돌아보기">
            {story.map((s, i) => (
              <Fragment key={s.years}>
                {i > 0 && <li className="fl-story__arrow" aria-hidden="true"><Icon name="chevron" size={16} /></li>}
                <li className={`fl-story__step an-g--${s.group}`}><span className="fl-groups__dot" aria-hidden="true" /><span className="fl-story__years">{s.years}</span><b>{s.text}</b></li>
              </Fragment>
            ))}
          </ol>
          <p className="fl-how">{flowCountNote(shown)}</p>
        </div>

        <FlowPath rows={shown} groups={legendGroups(shown)} tops={tops} upto={playAt} onPick={setPick} />

        <p className="fl-status" aria-live="polite">
          {now
            ? <><b>{semesterLabel(now.semester)}</b>{nowPick ? <span>{nowPick.title}</span> : <span className="an-muted">쉬어 간 학기예요</span>}</>
            : <span className="an-muted">점 하나가 기록 하나예요. 선은 학기마다 가장 많이 한 분야를 이어요. 학기를 누르면 자세히 보여요.</span>}
        </p>

        <RangePicker axis={axis} from={from} to={to} onMove={(which, v) => { setPlayAt(null); setRange(moveRange([from, to], which, v, last)); }} />
      </Card>

      <Drawer open={sumOpen} onClose={() => setSumOpen(false)} eyebrow="고른 구간" title={`${semesterLabel(axis[from])}${from !== to ? ' ~ ' + semesterLabel(axis[to]) : ''}`}>
        {summary.total === 0
          ? <p className="an-muted">이 구간에는 기록이 없어요. 손잡이를 옮겨 다른 학기를 골라 보세요.</p>
          : <><Ratio segments={summary.segments} /><p className="an-muted">기록 <b className="num">{summary.total}</b>개를 모았어요.</p></>}
      </Drawer>

      <SemesterDrawer row={picked} top={pick !== null ? tops[pick] : null} records={records} onClose={() => setPick(null)} />
    </div>
  );
}

/** 학기 하나: 분야 비율, 대표 회고 한 줄, 그 학기 활동 */
function SemesterDrawer({ row, top, records, onClose }: { row?: ReturnType<typeof buildFlow>[number]; top: ReturnType<typeof topGroups>[number]; records: RecordItem[]; onClose: () => void }) {
  const lead = row && semesterPick(row, top, records);
  const list = row?.segments.flatMap(s => s.recordIds).map(id => records.find(r => r.id === id)).filter((r): r is RecordItem => !!r) ?? [];
  const name = top ? GROUP_LABEL[top] : '';
  return (
    <Drawer open={!!row} onClose={onClose} eyebrow={row ? semesterLabel(row.semester) : undefined} title={top ? `${name}${josa(name, '을', '를')} 가장 많이 했어요` : ''}>
      {row && <>
        <Ratio segments={row.segments} />
        {lead?.quote && <figure className="fl-quote"><blockquote>“{lead.quote}”</blockquote><figcaption>{lead.title}</figcaption></figure>}
        <h3 className="fl-sub">활동 <span className="num">{list.length}</span>개</h3>
        <div className="an-stack">{list.map(r => <RecordSummary key={r.id} record={r} />)}</div>
      </>}
    </Drawer>
  );
}

function Ratio({ segments }: { segments: FlowSegment[] }) {
  return (
    <>
      <span className="fl-ratio" role="img" aria-label={segments.map(s => `${GROUP_LABEL[s.group]} ${pct(s.share)}`).join(', ')}>
        {segments.map(s => <span key={s.group} className={`fl-ratio__fill an-g--${s.group}`} style={{ flexGrow: s.count }} />)}
      </span>
      <ul className="fl-sumlist" aria-hidden="true">
        {segments.map(s => <li key={s.group} className={`an-g--${s.group}`}><span className="fl-groups__dot" />{GROUP_LABEL[s.group]}<b className="num">{pct(s.share)}</b></li>)}
      </ul>
    </>
  );
}
