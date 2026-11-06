// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Flash } from './Flash';
import { diffOne, useListPresence } from './useListPresence';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

function mount(node: React.ReactNode) {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  act(() => root.render(node));
  return { el, root };
}

it('행 하나만 빠지거나 들어올 때만 움직인다', () => {
  expect(diffOne(['a', 'b', 'c'], ['a', 'c'])).toEqual({ removed: { key: 'b', index: 1 } });
  expect(diffOne(['a', 'c'], ['a', 'b', 'c'])).toEqual({ added: 'b' });
  expect(diffOne(['a', 'b', 'c'], ['c'])).toEqual({});
  expect(diffOne(['a', 'b'], ['c', 'd'])).toEqual({});
  expect(diffOne(['a', 'b'], ['b', 'a'])).toEqual({});
});

let setList: (l: string[]) => void = () => {};
function List({ start }: { start: string[] }) {
  const [list, set] = useState(start);
  setList = set;
  const rows = useListPresence(list, k => k);
  return <ul>{rows.map(r => <li key={r.key} data-presence={r.presence}>{r.item}</li>)}</ul>;
}
const rows = (el: HTMLElement) => [...el.querySelectorAll('li')].map(li => `${li.textContent}${li.dataset.presence ? ':' + li.dataset.presence : ''}`);

it('빠진 행은 접히는 동안 제자리에 남고, 되돌리면 같은 자리로 펼쳐진다', () => {
  const { el } = mount(<List start={['a', 'b', 'c']} />);
  expect(rows(el)).toEqual(['a', 'b', 'c']);
  act(() => setList(['a', 'c']));
  expect(rows(el)).toEqual(['a', 'b:leave', 'c']);
  act(() => { vi.advanceTimersByTime(500); });
  expect(rows(el)).toEqual(['a', 'c']);
  act(() => setList(['a', 'b', 'c']));
  expect(rows(el)).toEqual(['a', 'b:enter', 'c']);
  act(() => { vi.advanceTimersByTime(500); });
  expect(rows(el)).toEqual(['a', 'b', 'c']);
});

it('접히는 중에 되돌리면 남겨 둔 행이 아니라 다시 들어온 행 하나만 그린다', () => {
  const { el } = mount(<List start={['a', 'b', 'c']} />);
  act(() => setList(['a', 'c']));
  act(() => setList(['a', 'b', 'c']));
  expect(rows(el)).toEqual(['a', 'b:enter', 'c']);
});

it('바뀐 숫자만 강조하고 처음 그릴 때는 가만히 있다', () => {
  let set: (n: number) => void = () => {};
  function N() { const [n, s] = useState(2); set = s; return <Flash value={n} />; }
  const { el } = mount(<N />);
  expect(el.querySelector('.ui-flash')!.hasAttribute('data-changed')).toBe(false);
  act(() => set(3));
  const f = el.querySelector('.ui-flash')!;
  expect(f.hasAttribute('data-changed')).toBe(true);
  expect(f.textContent).toBe('3');
});
