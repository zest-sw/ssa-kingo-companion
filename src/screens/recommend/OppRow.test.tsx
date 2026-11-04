// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { PROGRAMS } from '../../data/catalog';
import { OppRow } from './OppRow';

it('행 버튼 이름은 활동 제목이고, 얻는 것은 칩 묶음의 이름이다', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const p = PROGRAMS[0];
  const el = document.createElement('div');
  act(() => createRoot(el).render(<ul><OppRow p={p} week={1} onOpen={() => {}} /></ul>));
  const name = el.querySelector('button')!.getAttribute('aria-label')!;
  expect(name).toContain(p.title);
  expect(name).not.toBe('얻는 것');
  expect(el.querySelector('.rec-row__gains')!.getAttribute('aria-label')).toBe('얻는 것');
});
