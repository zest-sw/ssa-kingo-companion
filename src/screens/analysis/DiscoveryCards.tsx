import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Badge, Button, Card, ConfirmDot, Drawer, EmptyState, Icon, useToast } from '../../components';
import { nextStep } from '../../domain/nextStep';
import { discoverySource, discoveryUse, groupDiscoveries, nextToAsk, usedCount } from '../../domain/analysis/discovery';
import { discoveryPic, type DiscoveryPic } from '../../domain/analysis/visual';
import type { DiscState, Discovery } from '../../domain/types';
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
            <line x1={150} y1={y} x2={186} y2={mid} className="an-dpic__line" />
            <circle cx={6} cy={y} r={4} className="an-dpic__dot" />
            <text x={16} y={y} dominantBaseline="central" className="an-dpic__label">{e.full !== e.label && <title>{e.full}</title>}{e.label}</text>
          </g>
        );
      })}
      {pic.more > 0 && <text x={16} y={PAD + ROW_H * pic.evidence.length + ROW_H / 2} dominantBaseline="central" className="an-dpic__more">{pic.more}개 더</text>}
      <circle cx={194} cy={mid} r={8} className="an-dpic__target" />
      <text x={208} y={mid} dominantBaseline="central" className="an-dpic__name">{pic.target}</text>
    </svg>
  );
}

/** 빈 상태 그림 틀: 회고 셋이 발견 하나로 모이는 자리. 값 없이 점선 윤곽만 그린다. */
function ConvergeGhost() {
  const ys = [16, 40, 64];
  return (
    <svg className="an-dq__ghost" viewBox="0 0 240 80" aria-hidden="true">
      {ys.map(y => (
        <g key={y}>
          <circle cx={20} cy={y} r={6} className="an-dghost__dot" />
          <text x={34} y={y} dominantBaseline="central" className="an-dghost__label">회고</text>
          <line x1={72} y1={y} x2={150} y2={40} className="an-dghost__line" />
        </g>
      ))}
      <circle cx={162} cy={40} r={10} className="an-dghost__dot" />
      <text x={180} y={40} dominantBaseline="central" className="an-dghost__label">발견</text>
    </svg>
  );
}

const STATE_WORD: Record<DiscState, string> = { none: '확인 전', changed: '다시 확인해 주세요', yes: '추천에 쓰는 중', no: '쓰지 않음' };

/** 상태 표시: 확인 전은 점선 원, 확인한 것은 채운 점, 근거가 바뀐 것은 주황 배지 */
function StateMark({ state }: { state: DiscState }) {
  if (state === 'changed') return <Badge tone="orange" icon="refresh">{STATE_WORD.changed}</Badge>;
  return <><ConfirmDot state={state === 'none' ? 'estimated' : 'confirmed'} label={STATE_WORD[state]} /><b>{STATE_WORD[state]}</b></>;
}

/**
 * 확인할 발견 한 장씩(Huang 외 2015, Elsden 외 2016: 패턴은 시스템이 찾고 해석은 학생이 한다).
 * 질문 → 어떻게 셌는지 + 근거 그림(누르면 근거 기록) → 답하면 추천에 어떻게 쓰이는지 → 답.
 * 맞아요/아니에요는 전역 확인 표를 바꾸고 확인한 것만 추천에 쓴다. 잘 모르겠어요는 답을 남기지 않고 다음 장으로 넘긴다.
 * 이미 답한 발견은 '모두 보기' 서랍에서 상태별로 다시 본다.
 */
export function DiscoveryCards() {
  const { state, view, discStateOf, run } = useApp();
  const toast = useToast();
  const [focus, setFocus] = useState<string>();
  // ponytail: '잘 모르겠어요'는 이 화면에 머무는 동안만 기억한다. 저장하면 다음 분석 때 다시 묻는 규칙이 필요해서 미룬다.
  const [skipped, setSkipped] = useState<string[]>([]);
  const [seeing, setSeeing] = useState<Discovery | null>(null);
  const [listing, setListing] = useState(false);
  const list = view.discoveries;
  const isOpen = (x: Discovery) => ['none', 'changed'].includes(discStateOf(x));
  const fresh = (x: Discovery) => isOpen(x) && !skipped.includes(x.key);
  const d = list.find(x => x.key === focus) ?? nextToAsk(list, fresh) ?? nextToAsk(list, isOpen) ?? list[0];
  const used = usedCount(list, state.confirm);
  const pending = list.filter(isOpen).length;
  const step = nextStep(state.activities);

  /** 방금 본 장 다음: 아직 안 넘긴 확인할 것 → 넘겼던 확인할 것 → (넘기기만) 다음 장 */
  const moveOn = (from: Discovery, skip: boolean) => {
    const others = (ok: (x: Discovery) => boolean) => nextToAsk(list, x => x.key !== from.key && ok(x), from.key);
    const next = others(fresh) ?? others(isOpen) ?? (skip ? others(() => true) : undefined);
    setFocus(next?.key ?? from.key);
  };

  const answer = (target: Discovery, status: 'yes' | 'no') => {
    const cancel = discStateOf(target) === status;
    run({ type: 'discovery/confirm', discovery: target, status }, {
      toast: cancel ? '확인을 거뒀어요.' : status === 'yes' ? '맞다고 했어요. 추천에 반영할게요.' : '아니라고 했어요. 추천에 쓰지 않아요.'
    });
    if (!cancel) moveOn(target, false);
  };

  const unsure = (target: Discovery) => {
    setSkipped(s => (s.includes(target.key) ? s : [...s, target.key]));
    toast('나중에 다시 물어볼게요. 그동안 추천에 쓰지 않아요.');
    moveOn(target, true);
  };

  const st = d ? discStateOf(d) : 'none';
  const groups = groupDiscoveries(list, discStateOf);
  return (
    <Card
      className="os-card an-disc-card"
      title="확인할 발견"
      padding="md"
      action={list.length > 0 ? <span className="an-disc-card__count">{pending ? <>확인할 것 <b className="num">{pending}</b>개</> : '모두 확인했어요'}</span> : undefined}
    >
      {!d ? (
        <EmptyState pic={<ConvergeGhost />} message={state.records.length > 0 ? '기록이 더 쌓이면 발견이 생겨요. 같은 일을 한 회고끼리 묶어 보여 줘요.' : `${step.lead} 같은 일을 한 회고끼리 묶어 발견을 보여 줘요.`} action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>} />
      ) : (
        <>
          <div className={`an-dq an-dq--${st}`}>
            <p className="an-dq__q">{discoveryPic(d).question}</p>
            {/* 근거 그림 자체가 '근거 보기'다. 셈 한 줄이 그 버튼의 이름이다. */}
            <button type="button" className="an-dq__see" aria-label={`${discoverySource(d)}. 근거 기록 보기`} onClick={() => setSeeing(d)}>
              <span className="an-dq__src">{discoverySource(d)}<Icon name="chevron" size={16} /></span>
              <Converge pic={discoveryPic(d)} />
            </button>
            <div className="an-dq__meta">
              <p className="an-dq__state"><StateMark state={st} /></p>
              <p className="an-dq__use">{discoveryUse(d, st)}</p>
            </div>
            <div className="an-dq__actions">
              <Button variant={st === 'yes' ? 'primary' : 'secondary'} aria-pressed={st === 'yes'} onClick={() => answer(d, 'yes')}>맞아요</Button>
              <Button variant={st === 'no' ? 'primary' : 'secondary'} aria-pressed={st === 'no'} onClick={() => answer(d, 'no')}>아니에요</Button>
              {isOpen(d) && <Button variant="ghost" className="an-dq__unsure" onClick={() => unsure(d)}>잘 모르겠어요</Button>}
            </div>
          </div>
          <Button variant="ghost" icon="chevron" onClick={() => setListing(true)}>발견 {list.length}개 모두 보기</Button>
        </>
      )}
      <Drawer open={listing} onClose={() => setListing(false)} eyebrow="내가 맞다고 한 발견만 추천에 써요" title="발견 모두 보기">
        <div className="an-dlist">
          {groups.map(g => (
            <section key={g.id} className="an-dlist__group" aria-label={g.label}>
              <h3 className="ui-subhead an-dlist__head">{g.label} <span className="num">{g.items.length}</span></h3>
              <ul>
                {g.items.map(x => {
                  const s = discStateOf(x);
                  return (
                    <li key={x.key}>
                      <button type="button" className="an-dlist__row" onClick={() => { setFocus(x.key); setListing(false); }}>
                        <span className="an-dlist__text">
                          <span className="an-dlist__q">{discoveryPic(x).question}</span>
                          <span className="an-dlist__src">{discoverySource(x)}</span>
                        </span>
                        <span className="an-dq__state"><StateMark state={s} /></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Drawer>
      <Drawer open={!!seeing} onClose={() => setSeeing(null)} eyebrow={seeing ? discoverySource(seeing) : ''} title={seeing ? discoveryPic(seeing).question : ''}>
        <div className="an-stack">{seeing?.evidence.map(r => <RecordSummary key={r.id} record={r} />)}</div>
      </Drawer>
    </Card>
  );
}
