import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Badge, Button, Card, ConfirmDot, Drawer, EmptyState, GhostPic } from '../../components';
import { nextStep } from '../../domain/nextStep';
import { usedCount } from '../../domain/analysis/discovery';
import { discoveryPic, type DiscoveryPic } from '../../domain/analysis/visual';
import type { Discovery } from '../../domain/types';
import { RecordSummary } from './RecordSummary';

const ROW_H = 22;
const PAD = 8;

/** 근거 기록 점 2~3개가 하나의 발견(이 일)으로 모이는 도식. 근거는 이름표만 달고 누르는 요소는 없다. */
function Converge({ pic }: { pic: DiscoveryPic }) {
  const n = pic.evidence.length + (pic.more ? 1 : 0);
  const h = PAD * 2 + ROW_H * n;
  const mid = h / 2;
  return (
    <svg className="an-dq__pic" viewBox={`0 0 300 ${h}`} preserveAspectRatio="xMinYMid meet" role="img" aria-label={`근거 기록 ${pic.evidence.length + pic.more}개가 ‘${pic.target}’ 발견으로 모여요`}>
      {pic.evidence.map((e, i) => {
        const y = PAD + ROW_H * i + ROW_H / 2;
        return (
          <g key={e.id}>
            <line x1={134} y1={y} x2={170} y2={mid} className="an-dpic__line" />
            <circle cx={6} cy={y} r={4} className="an-dpic__dot" />
            <text x={16} y={y} dominantBaseline="central" className="an-dpic__label">{e.label}</text>
          </g>
        );
      })}
      {pic.more > 0 && <text x={16} y={PAD + ROW_H * pic.evidence.length + ROW_H / 2} dominantBaseline="central" className="an-dpic__more">외 {pic.more}개</text>}
      <circle cx={178} cy={mid} r={8} className="an-dpic__target" />
      <text x={192} y={mid} dominantBaseline="central" className="an-dpic__name">{pic.target}</text>
    </svg>
  );
}

/** 확인할 발견. 맞아요/아니에요는 전역 상태의 확인 표를 바꾸고, 확인한 것만 추천에 쓰인다. */
export function DiscoveryCards() {
  const { state, view, discStateOf, run } = useApp();
  const [seeing, setSeeing] = useState<Discovery | null>(null);
  const used = usedCount(view.discoveries, state.confirm);
  const step = nextStep(state.activities);

  const answer = (d: Discovery, status: 'yes' | 'no') => {
    const cancel = discStateOf(d) === status;
    run({ type: 'discovery/confirm', discovery: d, status }, {
      toast: cancel ? '확인을 거뒀어요.' : status === 'yes' ? '맞다고 했어요. 추천에 반영할게요.' : '아니라고 했어요. 추천에 쓰지 않아요.'
    });
  };

  return (
    <Card className="os-card" title="확인할 발견" action={<span>확인한 것만 추천에 써요 · 지금 <b className="num">{used}</b>개 반영 중</span>} padding="md">
      {view.discoveries.length === 0 ? (
        <EmptyState pic={<GhostPic kind="network" />} message={`${step.lead} 같은 일을 한 기록끼리 묶어 발견을 보여 줘요.`} action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>} />
      ) : (
        <ul className="an-disc-grid os-scroll">
          {view.discoveries.map(d => {
            const st = discStateOf(d);
            return (
              <li key={d.key} className={`an-dq an-dq--${st}`}>
                <p className="an-dq__q">
                  <span>{discoveryPic(d).question}</span>
                  <span className="an-dq__state">
                    {st === 'changed' ? <Badge tone="orange" icon="refresh">다시 확인해 주세요</Badge> : st === 'none' ? <ConfirmDot state="estimated" label="확인 전" /> : <ConfirmDot state="confirmed" />}
                    {(st === 'yes' || st === 'no') && <span>{st === 'yes' ? '반영 중' : '쓰지 않음'}</span>}
                  </span>
                </p>
                {/* 근거 그림 자체가 '근거 보기'다. 버튼을 하나 줄여 1280×800 에서도 카드가 칸 안에 다 들어온다. */}
                <button type="button" className="an-dq__see" title="근거 기록 보기" aria-label={`근거 기록 ${d.evidence.length}개 보기`} onClick={() => setSeeing(d)}>
                  <Converge pic={discoveryPic(d)} />
                </button>
                <div className="an-dq__actions">
                  <Button size="sm" variant={st === 'yes' ? 'primary' : 'secondary'} aria-pressed={st === 'yes'} onClick={() => answer(d, 'yes')}>맞아요</Button>
                  <Button size="sm" variant={st === 'no' ? 'primary' : 'secondary'} aria-pressed={st === 'no'} onClick={() => answer(d, 'no')}>아니에요</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Drawer open={!!seeing} onClose={() => setSeeing(null)} eyebrow={`근거 기록 ${seeing?.evidence.length ?? 0}개`} title={seeing ? `${seeing.statement}?` : ''}>
        <div className="an-stack">{seeing?.evidence.map(r => <RecordSummary key={r.id} record={r} />)}</div>
      </Drawer>
    </Card>
  );
}
