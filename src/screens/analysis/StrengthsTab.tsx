import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { nextStep } from '../../domain/nextStep';
import { josa } from '../../domain/text';
import { Button, Card, ConfirmLegend, EmptyState, GhostPic } from '../../components';
import { buildStrengths, chancesFor, leadStrengths, samplesOf, splitStrengths, strengthHeadline, withAnswers, fewLine } from '../../domain/analysis/strengths';
import { AXES } from '../../domain/vocab';
import type { Axis, RecordItem } from '../../domain/types';
import { ChanceList, DOTS_MAX, EvidenceDots } from './StrengthParts';
import { StrengthDrawer } from './StrengthDrawer';

/** 줄로 그릴 강점 수. 나머지는 한 줄로 모아 덩어리 안 항목을 5개 안으로 둔다. */
const SHOWN = 4;

/**
 * 나의 강점: 덩어리 둘. 강점별 근거 기록 점 행(기록 하나 = 점 하나, 확인 = 채운 점, AI 추정 = 점선)과,
 * 가장 자주 드러난 강점을 쓸 수 있는 기회. 강점을 누르면 서랍에서 근거를 확인하고 쓸 곳을 본다.
 */
export default function StrengthsTab({ records }: { records: RecordItem[] }) {
  const { state, view } = useApp();
  // 근거 답(맞아요/아니에요)은 기록 버전을 올리지 않아 다시 분석하지 않는다. 분석한 기록에 지금 답만 덧입힌다.
  const live = useMemo(() => withAnswers(records, state.records), [records, state.records]);
  const rows = useMemo(() => buildStrengths(live), [live]);
  const { shown, few } = splitStrengths(rows, SHOWN);
  const samples = useMemo(() => samplesOf(shown), [shown]);
  const [open, setOpen] = useState<Axis | null>(null);
  const step = nextStep(state.activities);
  const programs = view.scored.map(s => s.p);
  const top = shown[0];
  // 기회는 학생이 확인한 강점 기준. 확인한 것이 없으면 AI 후보 기준이고 제목에서 그렇다고 밝힌다.
  const lead = leadStrengths(rows);
  const pick = lead.rows[0] ?? top;
  const chances = pick ? chancesFor(pick.axis, programs, 2) : [];
  const head = strengthHeadline(rows);
  const max = Math.max(1, ...shown.map(r => r.evidence.length));

  if (!top) {
    return (
      <Card className="os-card" title="기록에서 드러난 강점">
        <EmptyState
          pic={<GhostPic kind="branches" labels={AXES.slice(0, 3).map(a => a.label)} cols={['', '', '', '']} />}
          message="회고를 쓰면 어떤 강점이 드러났는지 보여 줘요"
          action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="an-str-cols">
      <Card className="os-card" title="기록에서 드러난 강점" action={<ConfirmLegend />}>
        <p className={`an-shead${head.estimated ? ' is-est' : ''}`}>{head.estimated && <span className="ui-dot ui-dot--estimated" aria-hidden="true" />}{head.text}</p>
        <div className="os-scroll">
          <ul className="an-srows" style={{ ['--an-dots' as string]: Math.min(max, DOTS_MAX + 1) }}>
            {shown.map(r => {
              const s = samples[r.axis];
              return (
                <li key={r.axis}>
                  <button type="button" className="an-srow" aria-haspopup="dialog" onClick={() => setOpen(r.axis)}>
                    <b className="an-srow__name">{r.label}</b>
                    <EvidenceDots strength={r} />
                    {s && (
                      <span className="an-srow__ev">
                        <span className="an-srow__text">{s.text}</span>
                        <span className="an-srow__meta">{s.title}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {few.length > 0 && <p className="an-sfew">{fewLine(few)}</p>}
      </Card>
      <Card className="os-card" title={lead.confirmed ? `${pick.label}${josa(pick.label, '을', '를')} 살릴 기회` : `강점 후보 ${pick.label}${josa(pick.label, '을', '를')} 써 볼 기회`}>
        <ChanceList axis={pick.axis} label={pick.label} chances={chances} />
      </Card>
      <StrengthDrawer strength={rows.find(r => r.axis === open)} records={live} programs={programs} onClose={() => setOpen(null)} />
    </div>
  );
}

