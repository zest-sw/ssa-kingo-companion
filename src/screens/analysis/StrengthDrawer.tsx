import { useApp } from '../../app/AppState';
import { Button, ConfirmDot, Drawer } from '../../components';
import { answerAxis, chancesFor, usableSentences, whenOf, type Strength } from '../../domain/analysis/strengths';
import { semesterLabel } from '../../domain/analysis/semester';
import type { Program, RecordItem } from '../../domain/types';
import { GROUP_LABEL } from '../../domain/vocab';
import { ChanceList, EvidenceDots, WhenPic } from './StrengthParts';

type Props = { strength?: Strength; records: RecordItem[]; programs: Program[]; onClose: () => void };

/** 강점 하나의 자세히: 근거 문장(확인 전은 맞아요/아니에요), 언제·어디서 드러났나, 쓸 수 있는 곳. */
export function StrengthDrawer({ strength, records, programs, onClose }: Props) {
  const { run } = useApp();
  const s = strength;
  const answer = (recordId: string, yes: boolean) => {
    const r = records.find(x => x.id === recordId);
    if (!r || !s) return;
    run({ type: 'record/setFlags', id: r.id, flags: answerAxis(r, s.axis, yes) }, yes ? {} : { toast: `${s.label} 근거에서 뺐어요.`, undoable: true });
  };
  const when = s ? whenOf(s) : [];
  const groups = s ? [...new Set(s.evidence.map(e => e.group))] : [];
  const sentences = s ? usableSentences(s) : [];

  return (
    <Drawer open={!!s} onClose={onClose} eyebrow="나의 강점" title={s?.label ?? ''}>
      {s && (
        <div className="an-sd">
          <section aria-labelledby="an-sd-ev">
            <h3 id="an-sd-ev" className="an-sub an-sd__head">근거가 된 기록 <EvidenceDots strength={s} /></h3>
            {s.evidence.length === 0 ? <p className="an-muted">근거를 모두 뺐어요. 회고를 더 쓰면 다시 모여요.</p> : (
              <ul className="an-sd__list">
                {s.evidence.map(e => (
                  <li key={e.recordId} className={`an-sd__ev${e.confirmed ? '' : ' is-est'}`}>
                    <ConfirmDot state={e.confirmed ? 'confirmed' : 'estimated'} />
                    <span className="an-sd__body">
                      <span className="an-sd__text">{e.text}</span>
                      <span className="an-sd__meta">{e.title} · {semesterLabel(e.semester)}</span>
                      {!e.confirmed && (
                        <span className="an-sd__ask" role="group" aria-label={`${e.title}이 ${s.label} 근거가 맞나요?`}>
                          <Button size="sm" onClick={() => answer(e.recordId, true)}>맞아요</Button>
                          <Button size="sm" variant="ghost" onClick={() => answer(e.recordId, false)}>아니에요</Button>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="an-sd__note">확인한 근거만 추천 이유와 신청서 초안에 써요.</p>
          </section>
          {when.length > 0 && (
            <section aria-labelledby="an-sd-when">
              <h3 id="an-sd-when" className="an-sub">언제·어디서 드러났나</h3>
              <WhenPic rows={when} />
              <p className="an-sd__groups">{groups.map(g => <span key={g} className={`an-sd__group an-g--${g}`}><span className="an-swhen__dot" />{GROUP_LABEL[g]}</span>)}</p>
            </section>
          )}
          <section aria-labelledby="an-sd-use">
            <h3 id="an-sd-use" className="an-sub">쓸 곳</h3>
            <ChanceList axis={s.axis} label={s.label} chances={chancesFor(s.axis, programs, 2)} />
            <h4 className="an-sd__h4">신청서에 쓸 문장</h4>
            {sentences.length > 0
              ? <ul className="an-sd__quotes">{sentences.map(t => <li key={t}>{t}</li>)}</ul>
              : <p className="an-muted">근거를 '맞아요'로 확인하면 여기 모여요.</p>}
          </section>
        </div>
      )}
    </Drawer>
  );
}
