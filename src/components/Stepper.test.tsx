// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { Stepper } from './Stepper';

it('받침에 맞는 조사로 돌아가기 이름을 만든다', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div');
  act(() => createRoot(el).render(
    <Stepper label="단계" steps={[{ id: 'a', label: '준비할 것' }, { id: 'b', label: '신청' }, { id: 'c', label: '끝' }]} current="c" onStep={() => {}} />
  ));
  const names = [...el.querySelectorAll('button')].map(b => b.getAttribute('aria-label'));
  expect(names).toEqual(['1단계 준비할 것으로 돌아가기', '2단계 신청으로 돌아가기']);
});
