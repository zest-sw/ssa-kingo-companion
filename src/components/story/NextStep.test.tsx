// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { NextStep } from './NextStep';

const render = (guide?: boolean) => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div');
  act(() => createRoot(el).render(
    <NextStep next={{ programId: 'p', title: '워크숍', why: '이유', same: true, guide }} href="#/" onPrepare={() => {}} />
  ));
  return el;
};

it('기록을 읽은 이유에는 추정 표시, 데이터가 없어 보여 주는 안내에는 붙이지 않는다', () => {
  expect(render().querySelector('.ui-ai-tag')).not.toBeNull();
  expect(render(true).querySelector('.ui-ai-tag')).toBeNull();
});
