// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TOAST_ACTION_MS, TOAST_GAP_MS, TOAST_MS, ToastProvider, useToast } from './Toast';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

function mountProvider() {
  const box: { show: ReturnType<typeof useToast> } = { show: () => {} };
  function Grab() { box.show = useToast(); return null; }
  const el = document.createElement('div');
  document.body.append(el);
  act(() => createRoot(el).render(<ToastProvider><Grab /></ToastProvider>));
  const text = () => el.querySelector('.ui-toast span')?.textContent ?? null;
  const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  return { show: (m: string, o?: Parameters<typeof box.show>[1]) => act(() => box.show(m, o)), text, wait, el };
}

it('결과 토스트가 닫힌 뒤에 달성 토스트가 뜬다', () => {
  const t = mountProvider();
  t.show('직접 입력으로 기록했어요.');
  t.show('달성했어요.', { after: true });
  expect(t.text()).toBe('직접 입력으로 기록했어요.');
  t.wait(TOAST_MS + TOAST_GAP_MS - 50);
  expect(t.text()).toBeNull();
  t.wait(100);
  expect(t.text()).toBe('달성했어요.');
});

it('달성이 먼저 불려도 같은 순간의 결과 토스트가 먼저 뜬다', () => {
  const t = mountProvider();
  t.show('달성했어요.', { after: true });
  t.show('기록했어요.');
  expect(t.text()).toBe('기록했어요.');
  t.wait(TOAST_MS + TOAST_GAP_MS + 10);
  expect(t.text()).toBe('달성했어요.');
});

it('달성이 떠 있을 때 결과가 오면 결과가 먼저, 밀려난 달성은 그 뒤에 다시 뜬다', () => {
  const t = mountProvider();
  t.show('달성했어요.', { after: true });
  t.wait(TOAST_GAP_MS + 10);
  expect(t.text()).toBe('달성했어요.');
  t.show('기록했어요.');
  expect(t.text()).toBe('기록했어요.');
  t.wait(TOAST_MS + TOAST_GAP_MS + 10);
  expect(t.text()).toBe('달성했어요.');
});

it('마우스를 올려 멈춘 결과 토스트도 기다린다', () => {
  const t = mountProvider();
  t.show('뺐어요.', { actionLabel: '되돌리기', onAction: () => {} });
  t.show('달성했어요.', { after: true });
  const box = t.el.querySelector('.ui-toast')!;
  act(() => { box.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })); });
  t.wait(TOAST_ACTION_MS * 3);
  expect(t.text()).toBe('뺐어요.');
  act(() => { box.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
  t.wait(TOAST_ACTION_MS + TOAST_GAP_MS + 10);
  expect(t.text()).toBe('달성했어요.');
});

it('줄 선 토스트 여러 개는 부른 순서대로 하나씩 뜬다', () => {
  const t = mountProvider();
  t.show('첫째', { after: true });
  t.show('둘째', { after: true });
  t.wait(TOAST_GAP_MS + 10);
  expect(t.text()).toBe('첫째');
  t.wait(TOAST_MS + TOAST_GAP_MS);
  expect(t.text()).toBe('둘째');
});

it('결과 토스트끼리는 새 것이 옛 것을 바꾼다', () => {
  const t = mountProvider();
  t.show('하나');
  t.show('둘');
  expect(t.text()).toBe('둘');
  t.wait(TOAST_MS + TOAST_GAP_MS + 10);
  expect(t.text()).toBeNull();
});
