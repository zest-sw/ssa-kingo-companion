import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Badge, Button, Card, ConfirmDot, Drawer, EmptyState } from '../../components';
import type { Discovery } from '../../domain/types';
import { DISC_STATE_TEXT } from '../../domain/vocab';
import { RecordSummary } from './RecordSummary';

const EVIDENCE_SHOWN = 3;

/** 확인할 발견. 맞아요/아니에요는 전역 상태의 확인 표를 바꾸고, 확인한 것만 추천에 쓰인다. */
export function DiscoveryCards() {
  const { view, discStateOf, run } = useApp();
  const [seeing, setSeeing] = useState<Discovery | null>(null);
  const used = view.discoveries.filter(d => discStateOf(d) === 'yes').length;

  const answer = (d: Discovery, status: 'yes' | 'no') => {
    const cancel = discStateOf(d) === status;
    run({ type: 'discovery/confirm', discovery: d, status }, {
      toast: cancel ? '확인을 거뒀어요.' : status === 'yes' ? '맞다고 했어요. 추천에 반영할게요.' : '아니라고 했어요. 추천에 쓰지 않아요.'
    });
  };

  return (
    <Card title="확인할 발견" action={<span>확인한 것만 추천에 써요 · 지금 <b className="num">{used}</b>개 반영 중</span>}>
      {view.discoveries.length === 0 ? (
        <EmptyState icon="sparkle" message="같은 일을 한 기록이 둘 이상이면 발견이 생겨요. 회고를 더 남겨 보세요." action={<Button size="sm" onClick={() => navigate('records')}>회고 쓰러 가기</Button>} />
      ) : (
        <ul className="an-disc">
          {view.discoveries.map(d => {
            const st = discStateOf(d);
            return (
              <li key={d.key} className={`an-disc__card an-disc__card--${st}`}>
                <div className="an-disc__q">
                  {/* 서술문 끝에 물음표만 붙여 질문으로 읽는다 */}
                  <p className="an-disc__text">{d.statement}?</p>
                  <p className="an-disc__state">
                    {st === 'changed' ? <Badge tone="orange" icon="refresh">다시 확인해 주세요</Badge> : st === 'none' ? <ConfirmDot state="estimated" label="아직 확인 전" /> : <ConfirmDot state="confirmed" />}
                    <span>{DISC_STATE_TEXT[st]}</span>
                  </p>
                </div>
                <p className="an-disc__evidence" aria-label="근거 기록">
                  {d.evidence.slice(0, EVIDENCE_SHOWN).map(r => <Badge key={r.id} tone="neutral">{r.title}</Badge>)}
                  {d.evidence.length > EVIDENCE_SHOWN && <Badge tone="neutral">외 {d.evidence.length - EVIDENCE_SHOWN}개</Badge>}
                </p>
                <div className="an-disc__actions">
                  <Button size="sm" variant={st === 'yes' ? 'primary' : 'secondary'} aria-pressed={st === 'yes'} onClick={() => answer(d, 'yes')}>맞아요</Button>
                  <Button size="sm" variant={st === 'no' ? 'primary' : 'secondary'} aria-pressed={st === 'no'} onClick={() => answer(d, 'no')}>아니에요</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSeeing(d)}>근거 보기</Button>
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
