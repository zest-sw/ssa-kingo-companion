import { useMemo } from 'react';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Chip, EmptyState } from '../../components';
import { buildStrengths, differences, levelLabel, levelOfSeen, LEVELS, type Level, type StrengthRow } from '../../domain/analysis/strengths';
import type { Axis, RecordItem } from '../../domain/types';

type Props = { records: RecordItem[]; self: Record<Axis, Level>; setSelf: (next: (prev: Record<Axis, Level>) => Record<Axis, Level>) => void };

export default function StrengthsTab({ records, self, setSelf }: Props) {
  const rows = useMemo(() => buildStrengths(records, self), [records, self]);
  const diffs = differences(rows);
  const set = (axis: Axis, level: Level) => setSelf(prev => ({ ...prev, [axis]: level }));

  return (
    <div className="an-stack an-stack--lg">
      <Card title="내 생각과 기록" action={<span>내 생각은 눌러서 고칠 수 있어요</span>}>
        <table className="an-str">
          <thead>
            <tr><th scope="col">역량</th><th scope="col">내 생각</th><th scope="col">기록에서 보이는 것 <span className="an-str__hint">(기록 수로 어림해요)</span></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.axis}>
                <th scope="row">{r.label}</th>
                <td>
                  <div className="an-str__chips" role="group" aria-label={`${r.label} 내 생각`}>
                    {LEVELS.map(l => <Chip key={l.id} selected={r.self === l.id} onClick={() => set(r.axis, l.id)}>{l.label}</Chip>)}
                  </div>
                </td>
                <td><DotRow row={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <EmptyState icon="records" message="기록이 쌓이면 내 생각과 나란히 볼 수 있어요. 회고를 하나 써 보세요." action={<Button size="sm" onClick={() => navigate('records')}>회고 쓰러 가기</Button>} />}
      </Card>

      <Card title="내 생각과 기록이 달라요">
        {diffs.length === 0 ? (
          <p className="an-muted">내 생각과 기록이 같아요. 기록이 늘면 달라지는 게 있는지 알려 드릴게요.</p>
        ) : (
          <ul className="an-diff">
            {diffs.map(r => (
              <li key={r.axis} className="an-diff__item">
                <div className="an-diff__head">
                  <b>{r.label}</b>
                  {r.gap === 'seen-more' ? <Badge tone="lime">기록에서 더 보여요</Badge> : <Badge tone="orange">기록에는 아직 적어요</Badge>}
                </div>
                <p>내 생각은 ‘{levelLabel(r.self)}’이고, {r.count === 0 ? '기록에서는 아직 보이지 않아요' : `기록 ${r.count}개를 보면 ‘${levelLabel(levelOfSeen(r.seen) ?? 'low')}’쯤으로 보여요`}.</p>
                {r.evidence.length > 0 && (
                  <ul className="an-diff__ev" aria-label={`${r.label} 근거 기록`}>
                    {r.evidence.map(e => <li key={e.id}><b>{e.title}</b><span>“{e.quote}”</span></li>)}
                  </ul>
                )}
                <div className="an-diff__act">
                  <FixButton row={r} set={set} />
                  {r.gap === 'self-more' && <Button size="sm" onClick={() => navigate('records')}>경험 추가하기</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** 적음·중간·많음 세 점 중 기록에서 보이는 수준을 채운다. 기록이 없으면 점선 점 셋. */
function DotRow({ row }: { row: StrengthRow }) {
  const at = row.seen === 'none' ? -1 : LEVELS.findIndex(l => l.id === row.seen);
  return (
    <div className="an-dots" role="img" aria-label={row.seen === 'none' ? `${row.label}: 기록에 아직 없어요` : `${row.label}: 기록 ${row.count}개, ${levelLabel(levelOfSeen(row.seen) ?? 'low')}쯤`}>
      <span className="an-dots__row" aria-hidden="true">
        {LEVELS.map((l, i) => <span key={l.id} className={`an-dot${i === at ? ' is-on' : ''}${at < 0 ? ' is-none' : ''}`} />)}
      </span>
      <span className="an-dots__text" aria-hidden="true">{row.seen === 'none' ? '기록 없음' : `기록 ${row.count}개 · ${levelLabel(levelOfSeen(row.seen) ?? 'low')}쯤`}</span>
    </div>
  );
}

/** 기록 쪽이 더 많이 보일 때만, 내 생각을 기록이 가리키는 수준에 맞추는 버튼 */
function FixButton({ row, set }: { row: StrengthRow; set: (axis: Axis, level: Level) => void }) {
  const level = row.gap === 'seen-more' ? levelOfSeen(row.seen) : null;
  return level ? <Button size="sm" onClick={() => set(row.axis, level)}>기록에 맞춰 고치기</Button> : null;
}
