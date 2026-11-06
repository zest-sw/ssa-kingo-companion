// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stepHref, useStepInUrl } from './stepUrl';

const STEPS = ['todo', 'draft', 'apply'] as const;
type S = (typeof STEPS)[number];
let el: HTMLDivElement;
let root: Root;
let setStep: (s: S) => void = () => {};
let popped: S[] = [];

function Flow({ start }: { start: S }) {
  const [step, set] = useState<S>(start);
  setStep = set;
  useStepInUrl(step, STEPS, s => { popped.push(s); set(s); });
  return <p>{step}</p>;
}
// 브라우저 뒤로 가기 대신: 주소를 바꾸고 hashchange 를 바로 보낸다
const goBackTo = (hash: string) => act(() => { history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); });
const mount = (start: S) => act(() => root.render(<Flow start={start} />));

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  history.replaceState(null, '', '#/recommend/prepare/p-1');
  popped = [];
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); });

describe('흐름 단계를 주소에', () => {
  it('화면이 단계를 바꾸면 ?step= 이 붙고, 첫 단계로 돌아오면 빠진다', () => {
    mount('todo');
    expect(location.hash).toBe('#/recommend/prepare/p-1');
    act(() => setStep('draft'));
    expect(location.hash).toBe('#/recommend/prepare/p-1?step=draft');
    act(() => setStep('todo'));
    expect(location.hash).toBe('#/recommend/prepare/p-1');
    expect(popped).toEqual([]);
  });

  it('주소가 앞 단계로 바뀌면(뒤로 가기) 화면이 그 단계를 그린다', () => {
    mount('todo');
    act(() => setStep('apply'));
    goBackTo('#/recommend/prepare/p-1?step=draft');
    expect(el.textContent).toBe('draft');
    goBackTo('#/recommend/prepare/p-1');
    expect(el.textContent).toBe('todo');
    expect(popped).toEqual(['draft', 'todo']);
  });

  it('이어 하기로 되살린 단계가 처음 주소를 이긴다(주소만 맞춘다)', () => {
    mount('draft');
    expect(el.textContent).toBe('draft');
    expect(location.hash).toBe('#/recommend/prepare/p-1?step=draft');
    expect(popped).toEqual([]);
  });

  it('주소의 다른 상태는 그대로 두고 모르는 step 은 첫 단계로 본다', () => {
    expect(stepHref('#/recommend/prepare/p-1?x=1', 'draft')).toBe('recommend/prepare/p-1?x=1&step=draft');
    expect(stepHref('#/recommend/prepare/p-1?step=draft&x=1', undefined)).toBe('recommend/prepare/p-1?x=1');
    history.replaceState(null, '', '#/recommend/prepare/p-1?step=nope');
    mount('todo');
    expect(location.hash).toBe('#/recommend/prepare/p-1?step=nope');
    expect(el.textContent).toBe('todo');
  });
});
