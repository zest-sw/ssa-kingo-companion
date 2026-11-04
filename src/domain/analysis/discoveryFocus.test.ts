import { describe, expect, it } from 'vitest';
import { discoveriesOf } from '../discoveries';
import { rec } from '../fixtures.test-util';
import type { DiscState, Discovery } from '../types';
import { discoveryQuestion, discoverySource, discoveryUse, groupDiscoveries, nextToAsk } from './discovery';

const list = ['a', 'b', 'c', 'd'].map(key => ({ key }));
const openIf = (open: string[]) => (d: { key: string }) => open.includes(d.key);

describe('nextToAsk', () => {
  it('처음에는 답하지 않은 첫 발견', () => expect(nextToAsk(list, openIf(['b', 'c']))?.key).toBe('b'));
  it('지금 장 다음부터 찾는다', () => expect(nextToAsk(list, openIf(['a', 'c']), 'a')?.key).toBe('c'));
  it('끝에 닿으면 처음으로 돌아간다', () => expect(nextToAsk(list, openIf(['a']), 'd')?.key).toBe('a'));
  it('지금 장 자신은 건너뛴다', () => expect(nextToAsk(list, openIf(['b']), 'b')).toBeUndefined());
  it('남은 게 없으면 undefined', () => expect(nextToAsk(list, openIf([]))).toBeUndefined());
  it('빈 목록', () => expect(nextToAsk([], openIf(['a']))).toBeUndefined());
});

describe('발견 카드 문장', () => {
  const ds = discoveriesOf([
    rec('a', { did: 'make', energy: 'up' }), rec('b', { did: 'make', energy: 'up' }), rec('c', { did: 'make' }),
    rec('d', { did: 'ask' }), rec('e', { did: 'ask' })
  ]);
  const up = ds.find(d => d.kind === 'up')!;
  const freq = ds.find(d => d.kind === 'freq')!;
  it('질문은 발견 문장과 같은 말을 묻는다', () => {
    expect(discoveryQuestion(up)).toBe('직접 만들 때 힘이 나나요?');
    expect(discoveryQuestion(freq)).toBe('질문을 던지는 역할을 자주 맡나요?');
  });
  it('어떻게 셌는지 밝힌다', () => {
    expect(discoverySource(up)).toBe('에너지가 더 생긴 회고 2개에서 찾았어요');
    expect(discoverySource(freq)).toBe('같은 일을 한 회고 2개에서 찾았어요');
  });
  it('상태마다 추천에 어떻게 쓰이는지 말한다', () => {
    expect(discoveryUse(up, 'none')).toBe('맞다고 하면 ‘직접 만들기’가 들어간 활동을 먼저 추천해요');
    expect(discoveryUse(up, 'yes')).toBe('‘직접 만들기’가 들어간 활동을 먼저 추천하고 있어요');
    expect(discoveryUse(up, 'no')).toBe('추천 이유로 쓰지 않아요');
    expect(discoveryUse(up, 'changed')).toContain('지금은 추천에 쓰지 않아요');
  });
  it('서랍은 확인할 것·쓰는 것·쓰지 않는 것으로 나누고 빈 묶음은 뺀다', () => {
    const state = (d: Discovery): DiscState => (d.key === up.key ? 'yes' : 'changed');
    const g = groupDiscoveries(ds, state);
    expect(g.map(x => x.id)).toEqual(['open', 'yes']);
    expect(g[0].items).toEqual([freq]);
    expect(groupDiscoveries([], state)).toEqual([]);
  });
});
