import type { ReactNode } from 'react';
import { Badge, Button, Card, EmptyState } from '../../components';
import { navigate } from '../../app/router';
import { ddayOf, diffLabel, mainReason } from '../../domain/recommend';
import { dateLabel, formatText, needsTeam, overlapsSchedule, prepItemsFor } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import type { Activity, Interest, Program, RecordItem, Scored } from '../../domain/types';
import { DID_LABEL, FIELD_LABEL } from '../../domain/vocab';
import type { CardActions } from './TopView';

const MAX_COLUMNS = 5;

/** 후보를 열로 놓고 같은 항목끼리 한 행에 맞춰 보여 준다. 점수는 없다. */
export function CompareView({ scored, week, records, interests, activities, actions }: {
  scored: Scored[]; week: number; records: RecordItem[]; interests: Interest[]; activities: Activity[]; actions: CardActions;
}) {
  const cols = scored.slice(0, MAX_COLUMNS);
  if (cols.length === 0) {
    return <Card><EmptyState icon="compass" message="비교할 후보가 없어요. 추천으로 돌아가 관심 분야나 시간을 바꿔 보세요." action={<Button onClick={() => navigate('recommend')}>추천으로 가기</Button>} /></Card>;
  }
  const base = cols[0].p;
  const tried = new Set(records.map(r => r.field));
  const allFit = cols.every(c => c.p.eligible && !overlapsSchedule(c.p, activities));

  const rows: { label: string; cell: (p: Program, s: Scored) => ReactNode }[] = [
    { label: '마감', cell: p => { const d = ddayOf(p, week); return <><b className={d <= 3 ? 'rec-fact__accent num' : 'num'}>{ddayText(d)}</b> · {dateLabel(d, week)}</>; } },
    { label: '활동 기간', cell: p => p.when },
    { label: '방식', cell: p => { const f = formatText(p); return f.sub ? `${f.main} · ${f.sub}` : f.main; } },
    { label: '필요한 시간', cell: p => p.durationLabel },
    { label: '신청 대상', cell: p => `${p.target}${p.eligible ? ' · 맞음' : ''}` },
    { label: '준비할 것', cell: p => `${prepItemsFor(p, week).filter(i => i.by === 'me').length}개${needsTeam(p) ? ' · 팀 필요' : ''}` },
    { label: '일정 겹침', cell: p => (overlapsSchedule(p, activities) ? '겹쳐요' : '안 겹침') },
    { label: '나와 맞는 이유', cell: (_p, s) => mainReason(s.reasons)?.text ?? '이번 주 모집 중이에요' }
  ];

  return (
    <>
      <Card className="rec-compare" aria-label="후보 비교">
        <div className="rec-compare__scroll">
          <table className="rec-table">
            <caption className="sr-only">후보 {cols.length}개 비교</caption>
            <thead>
              <tr>
                <td />
                {cols.map((c, i) => (
                  <th key={c.p.id} scope="col" className={i === 0 ? 'rec-col--top' : undefined}>
                    <Badge tone={i === 0 ? 'lime' : 'neutral'}>{i === 0 ? '가장 추천' : '대안'}</Badge>
                    <span className="rec-table__title">{c.p.title}</span>
                    <span className="rec-table__kind">{FIELD_LABEL[c.p.field]} · {DID_LABEL[c.p.did[0]]}</span>
                    {i > 0 && <span className="rec-table__diff">{diffLabel(c.p, base, tried, interests)}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {cols.map((c, i) => <td key={c.p.id} className={i === 0 ? 'rec-col--top' : undefined}>{r.cell(c.p, c)}</td>)}
                </tr>
              ))}
              <tr className="rec-table__acts">
                <td />
                {cols.map((c, i) => (
                  <td key={c.p.id} className={i === 0 ? 'rec-col--top' : undefined}>
                    <Button variant={i === 0 ? 'primary' : 'secondary'} block aria-label={`${c.p.title} 신청 준비`} onClick={() => actions.onPrepare(c.p)}>신청 준비</Button>
                    <div className="rec-table__sub">
                      <Button size="sm" variant="ghost" aria-label={`${c.p.title} 나중에 보기`} onClick={() => actions.onLater(c.p)}>나중에 보기</Button>
                      <Button size="sm" variant="ghost" aria-label={`${c.p.title} 관심 없음`} onClick={() => actions.onDismiss(c.p)}>관심 없음</Button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {allFit && <p className="rec-compare__ok"><Badge tone="green" icon="check">{cols.length === 1 ? '신청 대상이고 시간표와 겹치지 않아요' : `${cols.length}개 모두 신청 대상이고 시간표와 겹치지 않아요`}</Badge></p>}
      </Card>
      <p className="rec-foot">같은 항목끼리 나란히 놓아요. 고르는 건 내가 해요.</p>
    </>
  );
}
