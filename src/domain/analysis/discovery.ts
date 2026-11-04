import { discState } from '../discoveries';
import { josa } from '../text';
import type { Confirm, DiscState, Discovery, Did } from '../types';
import { DID_LABEL } from '../vocab';

/** 학생이 '맞아요'로 확인해서 지금 추천에 쓰는 발견 수. 근거가 바뀐 것(changed)은 세지 않는다. */
export const usedCount = (discoveries: Discovery[], confirm: Record<string, Confirm>) => discoveries.filter(d => discState(d, confirm) === 'yes').length;

/**
 * 확인할 발견을 한 장씩 보여 줄 때 다음 장. `fromKey` 다음부터 한 바퀴 돌며 아직 답하지 않은(isOpen) 첫 발견을 찾는다.
 * `fromKey` 자신은 건너뛴다(방금 답한 장으로 되돌아오지 않게). 남은 게 없으면 undefined.
 */
export function nextToAsk<T extends { key: string }>(list: T[], isOpen: (d: T) => boolean, fromKey?: string): T | undefined {
  const at = fromKey === undefined ? -1 : list.findIndex(d => d.key === fromKey);
  for (let i = 1; i <= list.length; i++) {
    const d = list[(at + i + list.length) % list.length];
    if (d.key !== fromKey && isOpen(d)) return d;
  }
  return undefined;
}

// 질문은 발견 문장(UP_STATEMENT·FREQ_STATEMENT)과 같은 말을 묻는 꼴로 쓴다. 활동 이름에 '맡나요'를 붙이면 어색해서 따로 둔다.
const UP_QUESTION: Record<Did, string> = {
  listen: '듣고 정리할 때 힘이 나나요?', ask: '질문하며 답을 찾을 때 힘이 나나요?', organize: '의견을 묶고 조율할 때 힘이 나나요?',
  make: '직접 만들 때 힘이 나나요?', idea: '아이디어를 낼 때 힘이 나나요?', present: '설명하고 발표할 때 힘이 나나요?'
};
const FREQ_QUESTION: Record<Did, string> = {
  listen: '듣고 정리하는 역할을 자주 맡나요?', ask: '질문을 던지는 역할을 자주 맡나요?', organize: '흩어진 의견을 묶는 역할을 자주 맡나요?',
  make: '직접 만드는 역할을 자주 맡나요?', idea: '아이디어 내는 역할을 자주 맡나요?', present: '설명·발표를 자주 맡나요?'
};

/** 발견 질문 한 줄 */
export const discoveryQuestion = (d: Pick<Discovery, 'did' | 'kind'>) => (d.kind === 'up' ? UP_QUESTION : FREQ_QUESTION)[d.did];

/** 어떻게 셌는지 한 줄(Segel·Heer 2010, Spotify Wrapped): '에너지가 더 생긴 회고 3개에서 찾았어요' */
export const discoverySource = (d: Pick<Discovery, 'kind' | 'evidence'>) =>
  `${d.kind === 'up' ? '에너지가 더 생긴' : '같은 일을 한'} 회고 ${d.evidence.length}개에서 찾았어요`;

/** 이 발견이 추천에 어떻게 쓰이는지 한 줄. 상태마다 다르다. 규칙은 recommend.ts 의 focusDids·rejectedDids 와 같다. */
export function discoveryUse(d: Pick<Discovery, 'did'>, state: DiscState): string {
  const did = `‘${DID_LABEL[d.did]}’${josa(DID_LABEL[d.did], '이', '가')}`;
  if (state === 'yes') return `${did} 들어간 활동을 먼저 추천하고 있어요`;
  if (state === 'no') return '추천 이유로 쓰지 않아요';
  if (state === 'changed') return '근거 기록이 바뀌어 지금은 추천에 쓰지 않아요';
  return `맞다고 하면 ${did} 들어간 활동을 먼저 추천해요`;
}

export type DiscoveryGroup = { id: 'open' | 'yes' | 'no'; label: string; items: Discovery[] };

/** 발견 전체 서랍: 확인할 것(답 없음·근거 바뀜) / 추천에 쓰는 것 / 쓰지 않는 것. 빈 묶음은 뺀다. 묶음 안은 원래 순서. */
export function groupDiscoveries(list: Discovery[], stateOf: (d: Discovery) => DiscState): DiscoveryGroup[] {
  const groups: DiscoveryGroup[] = [
    { id: 'open', label: '확인할 것', items: list.filter(d => ['none', 'changed'].includes(stateOf(d))) },
    { id: 'yes', label: '추천에 쓰는 것', items: list.filter(d => stateOf(d) === 'yes') },
    { id: 'no', label: '쓰지 않는 것', items: list.filter(d => stateOf(d) === 'no') }
  ];
  return groups.filter(g => g.items.length > 0);
}
