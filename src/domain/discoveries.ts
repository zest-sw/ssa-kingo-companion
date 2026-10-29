import { josa } from './text';
import type { Confirm, DiscState, Discovery, Did, Program, RecordItem } from './types';
import { DID_LABEL, DID_LIST, ENERGY_SENTENCE, FREQ_STATEMENT, UP_STATEMENT } from './vocab';

/** 근거 기록의 id·버전 묶음. 학생이 확인한 뒤 이 값이 바뀌면 '근거 바뀜'이 된다. */
export const sigOf = (rs: RecordItem[]) => rs.map(r => `${r.id}@${r.v}`).sort();

/** 같은 일을 한 기록이 둘 이상이면 발견 후보가 된다. 에너지가 오른 기록이 둘 이상이면 'up', 아니면 'freq'. */
export function discoveriesOf(records: RecordItem[]): Discovery[] {
  const out: Discovery[] = [];
  for (const d of DID_LIST) {
    const all = records.filter(r => r.did === d.id);
    const ups = all.filter(r => r.energy === 'up');
    if (ups.length >= 2) out.push({ key: `up:${d.id}`, did: d.id, kind: 'up', statement: UP_STATEMENT[d.id], evidence: ups, sig: sigOf(ups) });
    else if (all.length >= 2) out.push({ key: `freq:${d.id}`, did: d.id, kind: 'freq', statement: FREQ_STATEMENT[d.id], evidence: all, sig: sigOf(all) });
  }
  return out.sort((a, b) => b.evidence.length - a.evidence.length);
}

/** 확인할 때 본 근거가 지금도 모두 남아 있으면 그 답을, 아니면 'changed'. */
export function discState(d: Discovery, confirm: Record<string, Confirm>): DiscState {
  const c = confirm[d.key];
  if (!c) return 'none';
  return c.sig.every(s => d.sig.includes(s)) ? c.status : 'changed';
}

/** 맞아요/아니에요를 누른 뒤의 확인 표. 같은 답을 다시 누르면 확인을 취소한다. */
export function nextConfirm(confirm: Record<string, Confirm>, d: Discovery, status: 'yes' | 'no'): Record<string, Confirm> {
  if (discState(d, confirm) === status) {
    const n = { ...confirm };
    delete n[d.key];
    return n;
  }
  return { ...confirm, [d.key]: { status, sig: d.sig } };
}

/** 학생이 확인한 것만 추천에 쓴다. */
export function didsByState(discoveries: Discovery[], confirm: Record<string, Confirm>, state: 'yes' | 'no'): Did[] {
  return discoveries.filter(d => discState(d, confirm) === state).map(d => d.did);
}

export const sentenceOf = (r: RecordItem, p?: Program) =>
  `${r.title}${p ? `(${p.durationLabel})` : ''}에서 ‘${DID_LABEL[r.did]}’${josa(DID_LABEL[r.did], '을', '를')} 주로 했고, ${ENERGY_SENTENCE[r.energy]}.`;
