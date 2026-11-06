import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { nextStep } from '../../domain/nextStep';
import { josa } from '../../domain/text';
import { AiMark, Button, Card, ConfirmDot, EmptyState, Radar, SegmentedControl, type RadarVertex } from '../../components';
import {
  buildStrengths, chancesFor, defaultRadarAxis, leadStrengths, radarMoments, radarScale, radarSpots, radarSub, strengthHeadline, withAnswers
} from '../../domain/analysis/strengths';
import { semesterKey, semesterLabel } from '../../domain/analysis/semester';
import type { Axis, RecordItem } from '../../domain/types';
import { EvidenceBar } from './EvidenceBar';
import { ChanceList } from './StrengthParts';
import { StrengthDrawer } from './StrengthDrawer';
import './strengths.css';

/** 낮은 노트북(세로 760px 이하)에서는 레이더와 옆 칸을 한 단계 줄인다. */
function useLow() {
  const q = '(max-height: 760px)';
  const [low, setLow] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(q);
    const on = () => setLow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return low;
}

/**
 * 나의 강점: 머리 키워드 한 줄 + 육각형 레이더(주인공) + 고른 역량의 대표 근거와 살릴 기회.
 * 축 6개 = 역량 6개, 값은 점수가 아니라 근거 기록 수. 시점 전환은 지난 나와만 비교한다.
 */
export default function StrengthsTab({ records }: { records: RecordItem[] }) {
  const { state, view } = useApp();
  // 근거 답(맞아요/아니에요)은 기록 버전을 올리지 않아 다시 분석하지 않는다. 분석한 기록에 지금 답만 덧입힌다.
  const live = useMemo(() => withAnswers(records, state.records), [records, state.records]);
  const rows = useMemo(() => buildStrengths(live), [live]);
  const low = useLow();
  const [momentId, setMomentId] = useState('now');
  const [picked, setPicked] = useState<Axis | null>(null);
  const [open, setOpen] = useState<Axis | null>(null);
  const step = nextStep(state.activities);
  const programs = view.scored.map(s => s.p);

  const moments = useMemo(() => radarMoments(rows), [rows]);
  const moment = moments.find(m => m.id === momentId) ?? moments[0];
  const now = useMemo(() => radarSpots(rows), [rows]);
  const spots = useMemo(() => radarSpots(rows, moment.upTo), [rows, moment]);
  const scale = radarScale(now);
  const lead = leadStrengths(rows);
  const head = strengthHeadline(rows);
  const axis = picked ?? defaultRadarAxis(rows);
  const past = moment.upTo !== null;

  if (axis === null) {
    return (
      <Card className="os-card" title="기록에서 드러난 강점">
        <EmptyState
          pic={<Radar empty vertices={now.map(s => ({ key: s.axis, name: s.label, solid: 0, dashed: 0, sub: '' }))} max={4} ticks={[2, 4]} label="역량 여섯 개의 빈 육각형" radius={low ? 64 : 80} />}
          message="회고를 쓰면 어떤 강점이 드러났는지 육각형으로 보여 줘요"
          action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>}
        />
      </Card>
    );
  }

  const strongAxes = new Set(lead.confirmed ? lead.rows.map(r => r.axis) : []);
  const vertices: RadarVertex[] = spots.map(s => ({
    key: s.axis, name: s.label, solid: s.confirmed, dashed: past ? s.confirmed : s.total,
    sub: past ? `확인 ${s.confirmed}` : radarSub(s), strong: strongAxes.has(s.axis)
  }));
  const trace = past ? now.map(s => s.confirmed) : undefined;
  const cur = rows.find(r => r.axis === axis)!;
  // 고른 시점까지 쓴 기록만 보여 준다(그림과 옆 칸이 같은 수를 말해야 한다)
  const evidence = cur.evidence.filter(e => moment.upTo === null || semesterKey(e.semester) <= moment.upTo);
  const chances = chancesFor(axis, programs, 2);
  const headText = past ? `${moment.label}까지 확인한 근거 ${spots.reduce((n, x) => n + x.confirmed, 0)}개` : head.text;
  const label = `${moment.label} 기준 역량별 근거 기록 수`;

  return (
    <div className="an-str-cols">
      <Card className="os-card an-rcard" data-fill title="기록에서 드러난 강점" action={moments.length > 1 ? <SegmentedControl label="보는 시점" items={moments.map(m => ({ id: m.id, label: m.label }))} value={moment.id} onChange={setMomentId} /> : undefined}>
        {/* 지금 시점의 해석은 머리 한 줄(이야기)이 말한다. 여기서는 지난 시점이나 확인 전일 때만 덧붙인다 */}
        {(past || head.estimated) && <p className={`an-shead${!past && head.estimated ? ' is-est' : ''}`}>{headText}{!past && head.estimated && <AiMark />}</p>}
        <Radar vertices={vertices} max={scale.max} ticks={scale.ticks} label={label} trace={trace} selected={axis} onSelect={k => setPicked(k as Axis)} radius={low ? 108 : 132} fit />
        <p className="an-rlegend">
          <span><i className="an-rlegend__own" aria-hidden="true" />{past ? `${moment.label} 확인한 근거` : '확인한 근거'}</span>
          {past ? <span><i className="an-rlegend__trace" aria-hidden="true" />지금 확인한 근거(윤곽)</span> : <span><i className="an-rlegend__est" aria-hidden="true" />AI 추정까지 전체</span>}
        </p>
      </Card>
      {/* 오른쪽 칸은 레이더 카드와 아래 끝을 맞춘다. 늘어난 높이는 근거 목록(칸 안 스크롤)이 쓰고, 기회는 그 아래 */}
      <Card className="os-card an-rside" title={cur.label} action={<Button size="sm" variant="ghost" aria-haspopup="dialog" onClick={() => setOpen(axis)}>근거 자세히</Button>}>
        {/* 위계: 근거 문장(본문) > 어느 활동에서 나왔나(옅은 작은 글씨). 수는 맨 위 얇은 막대 한 줄 */}
        <div className="an-rcount"><EvidenceBar confirmed={evidence.filter(e => e.confirmed).length} total={evidence.length} /></div>
        {evidence.length === 0 ? <p className="an-muted">근거가 아직 없어요. 회고를 쓰면 여기에 모여요.</p> : (
          <div className="os-scroll an-rev-scroll" data-fill tabIndex={0} aria-label={`${cur.label} 근거 문장 ${evidence.length}개`}>
            <ul className="an-rev">
              {evidence.map(e => (
                <li key={e.recordId} className={e.confirmed ? '' : 'is-est'}>
                  <ConfirmDot state={e.confirmed ? 'confirmed' : 'estimated'} />
                  <span><span className="an-rev__text">{e.text}</span><span className="an-rev__meta">{e.title} · {semesterLabel(e.semester)}</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h3 className="an-sub an-rsub">{cur.label}{josa(cur.label, '을', '를')} {cur.confirmed > 0 ? '살릴' : '써 볼'} 기회</h3>
        <ChanceList axis={axis} label={cur.label} chances={chances} />
      </Card>
      <StrengthDrawer strength={rows.find(r => r.axis === open)} records={live} programs={programs} onClose={() => setOpen(null)} />
    </div>
  );
}
