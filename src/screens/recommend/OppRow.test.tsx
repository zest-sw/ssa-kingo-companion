// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { PROGRAMS } from '../../data/catalog';
import { OppRow } from './OppRow';

const render = (node: React.ReactNode) => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div');
  act(() => createRoot(el).render(<ul>{node}</ul>));
  return el;
};

it('행 하나는 이름·D-n·둘째 줄 셋만 있고, 빠듯은 빠듯할 때만 보인다', () => {
  const p = PROGRAMS[0];
  const el = render(<OppRow p={p} week={1} line={{ kind: 'gain', text: '인터뷰 정리 노트' }} onOpen={() => {}} />);
  const btn = el.querySelector('button')!;
  expect(btn.textContent).toContain(p.title);
  expect(el.querySelector('.rec-row__line')!.textContent).toBe('인터뷰 정리 노트');
  expect(el.querySelector('.rec-row__tight')).toBeNull();
  expect(el.querySelectorAll('.rec-gain').length).toBe(0);
  const tight = render(<OppRow p={p} week={1} tight onOpen={() => {}} />);
  expect(tight.querySelector('.rec-row__tight')!.textContent).toBe('이번 주 빠듯');
});
