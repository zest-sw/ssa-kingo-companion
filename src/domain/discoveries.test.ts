import { describe, expect, it } from 'vitest';
import { didsByState, discState, discoveriesOf, nextConfirm, sentenceOf } from './discoveries';
import { rec } from './fixtures.test-util';

describe('discoveriesOf · 발견 생성', () => {
  it('같은 일을 한 기록이 하나면 발견이 없다', () => {
    expect(discoveriesOf([rec('a', { did: 'make' })])).toEqual([]);
  });

  it('같은 일이 둘 이상이면 자주 맡는 역할(freq) 발견', () => {
    const [d] = discoveriesOf([rec('a', { did: 'organize' }), rec('b', { did: 'organize' })]);
    expect(d.key).toBe('freq:organize');
    expect(d.evidence.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('에너지가 오른 기록이 둘 이상이면 freq 대신 up 발견, 근거는 오른 기록만', () => {
    const [d] = discoveriesOf([rec('a', { did: 'listen', energy: 'up' }), rec('b', { did: 'listen', energy: 'up' }), rec('c', { did: 'listen' })]);
    expect(d.key).toBe('up:listen');
    expect(d.evidence.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('근거가 많은 발견부터', () => {
    const ds = discoveriesOf([rec('a', { did: 'ask' }), rec('b', { did: 'ask' }), rec('c', { did: 'make' }), rec('d', { did: 'make' }), rec('e', { did: 'make' })]);
    expect(ds.map(d => d.key)).toEqual(['freq:make', 'freq:ask']);
  });
});

describe('확인 상태 전이', () => {
  const records = [rec('a', { did: 'make' }), rec('b', { did: 'make' })];
  const [d] = discoveriesOf(records);

  it('처음에는 확인 전', () => {
    expect(discState(d, {})).toBe('none');
  });

  it('맞아요 → yes, 같은 답을 다시 누르면 확인 취소', () => {
    const yes = nextConfirm({}, d, 'yes');
    expect(discState(d, yes)).toBe('yes');
    expect(discState(d, nextConfirm(yes, d, 'yes'))).toBe('none');
  });

  it('맞아요 뒤 아니에요 → no', () => {
    expect(discState(d, nextConfirm(nextConfirm({}, d, 'yes'), d, 'no'))).toBe('no');
  });

  it('확인한 근거 기록을 고치면(버전이 오르면) 근거 바뀜', () => {
    const confirm = nextConfirm({}, d, 'yes');
    const [after] = discoveriesOf([{ ...records[0], v: 2 }, records[1]]);
    expect(discState(after, confirm)).toBe('changed');
  });

  it('근거가 늘기만 하면 확인은 그대로', () => {
    const confirm = nextConfirm({}, d, 'no');
    const [after] = discoveriesOf([...records, rec('c', { did: 'make' })]);
    expect(discState(after, confirm)).toBe('no');
  });

  it('확인한 것만 추천에 쓴다', () => {
    const ds = discoveriesOf([...records, rec('c', { did: 'ask' }), rec('d', { did: 'ask' })]);
    const confirm = nextConfirm({}, ds[0], 'yes');
    expect(didsByState(ds, confirm, 'yes')).toEqual([ds[0].did]);
    expect(didsByState(ds, confirm, 'no')).toEqual([]);
  });
});

describe('sentenceOf', () => {
  it('받침에 맞춰 조사를 고른다', () => {
    expect(sentenceOf(rec('x', { title: '스터디', did: 'ask', energy: 'up' }))).toBe('스터디에서 ‘질문하기’를 주로 했고, 끝난 뒤 에너지가 더 생겼다.');
    expect(sentenceOf(rec('x', { title: '특강', did: 'organize', energy: 'down' }))).toBe('특강에서 ‘의견 묶고 조율하기’를 주로 했고, 끝난 뒤 조금 지쳤다.');
  });
});
