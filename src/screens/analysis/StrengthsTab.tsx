import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { nextStep } from '../../domain/nextStep';
import { Badge, Button, Card, Chip, Drawer, EmptyState } from '../../components';
import { buildStrengths, levelLabel, levelOfSeen, LEVELS, type Level, type StrengthRow } from '../../domain/analysis/strengths';
import type { Axis, RecordItem } from '../../domain/types';

type Props = { records: RecordItem[]; self: Record<Axis, Level>; setSelf: (next: (prev: Record<Axis, Level>) => Record<Axis, Level>) => void };

const THREE = [1, 2, 3] as const;
const RANK: Record<string, number> = { none: 0, low: 1, mid: 2, high: 3 };

/**
 * 나의 강점: 그림 하나(역량마다 기록 점 vs 내 생각 점). 행을 누르면 서랍에서 내 생각을 고치고 근거 기록을 본다.
 * 다른 점은 행의 배지로 보이고, 근거·고치기는 서랍(다음 단계)에 있다.
 */
export default function StrengthsTab({ records, self, setSelf }: Props) {
  const rows = useMemo(() => buildStrengths(records, self), [records, self]);
  const [open, setOpen] = useState<Axis | null>(null);
  const step = nextStep(useApp().state.activities);
  const none = records.length === 0;
  const picked = rows.find(r => r.axis === open);

  return (
    <Card className="os-card" title="내 생각과 기록" action={
      <span className="an-sp__legend"><span className="an-gdot is-done" />기록<span className="an-gdot is-self" />내 생각</span>
    }>
      <div className="os-scroll">
        <ul className="an-srows">
          {rows.map(r => (
            <li key={r.axis}>
              <button type="button" className={`an-srow${r.gap !== 'same' && !none ? ' is-diff' : ''}`} aria-haspopup="dialog" onClick={() => setOpen(r.axis)}>
                <b className="an-srow__name">{r.label}</b>
                <span className="an-srow__dots" role="img" aria-label={`기록 ${r.count}개, ${r.seen === 'none' ? '없음' : levelLabel(levelOfSeen(r.seen) ?? 'low')}. 내 생각 ${levelLabel(r.self)}`}>
                  <span className="an-srow__set">{THREE.map(n => <span key={n} className={`an-gdot${RANK[r.seen] >= n ? ' is-done' : ' is-blank'}`} />)}</span>
                  <span className="an-srow__set">{THREE.map(n => <span key={n} className={`an-gdot${RANK[r.self] >= n ? ' is-self' : ' is-blank'}`} />)}</span>
                </span>
                <span className="an-srow__tag">
                  {none ? null : r.gap === 'seen-more' ? <Badge tone="lime">기록이 더 많아요</Badge> : r.gap === 'self-more' ? <Badge tone="orange">기록은 아직 적어요</Badge> : <span className="an-muted">같아요</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {none && <EmptyState icon="records" message={`${step.lead} 내 생각 옆에 기록에서 보이는 수준이 채워져요.`} action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>} />}
      <StrengthDrawer row={picked} onClose={() => setOpen(null)} set={(axis, level) => setSelf(prev => ({ ...prev, [axis]: level }))} none={none} />
    </Card>
  );
}

function StrengthDrawer({ row, onClose, set, none }: { row?: StrengthRow; onClose: () => void; set: (axis: Axis, level: Level) => void; none: boolean }) {
  const fix = row && row.gap === 'seen-more' ? levelOfSeen(row.seen) : null;
  return (
    <Drawer open={!!row} onClose={onClose} eyebrow="나의 강점" title={row?.label ?? ''}>
      {row && (
        <>
          <h3 className="an-sub">내 생각</h3>
          <div className="an-str__chips" role="group" aria-label={`${row.label} 내 생각`}>
            {LEVELS.map(l => <Chip key={l.id} selected={row.self === l.id} onClick={() => set(row.axis, l.id)}>{l.label}</Chip>)}
          </div>
          <h3 className="an-sub">기록에서 보이는 것</h3>
          <p>{row.count === 0 ? '아직 기록에 없어요.' : `기록 ${row.count}개 · ${levelLabel(levelOfSeen(row.seen) ?? 'low')}쯤 보여요.`}</p>
          {row.evidence.length > 0 && (
            <ul className="an-diff__ev" aria-label={`${row.label} 근거 기록`}>
              {row.evidence.map(e => <li key={e.id}><Badge tone="neutral">{e.title}</Badge></li>)}
            </ul>
          )}
          {fix && <Button onClick={() => set(row.axis, fix)}>기록에 맞춰 고치기</Button>}
          {!none && row.gap === 'self-more' && <Button onClick={() => navigate('activities/records')}>경험 추가하기</Button>}
        </>
      )}
    </Drawer>
  );
}
